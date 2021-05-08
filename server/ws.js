const WebSocket = require('ws')
const MongoDB = require('./mongodb.js')
const db = new MongoDB()

module.exports = (port) => {
  const wss = new WebSocket.Server({
    port: port
  })
  console.log(`WebSocketServer listen at ws://localhost:${port}`)
  let clientsArr = []
  /** wss.clients为 set集合，转换为数组便于操作 */
  wss.on('connection', async (ws) => {
    ws.on('close', () => {
      // 有客户端离线时，更新在线客户端
      clientsArr = Array.from(wss.clients)
    })
    ws.on('message', (msg) => {
      clientsArr = Array.from(wss.clients)
      console.log('ws.js > ws.on ---- 在线人数：' + clientsArr.length)
      // const _that = this
      const MsgObj = JSON.parse(msg)
      const route = {
        chat,
        online,
        clearUnReadMsg,
        navSearch,
        addFriend,
        addFriendReply
      }
      const routeArr = ['chat', 'online', 'clearUnReadMsg', 'navSearch', 'addFriend', 'addFriendReply']
      if (routeArr.includes(MsgObj.type)) return route[MsgObj.type](MsgObj, wss, ws)
    })
  })
}

/**
 * 用户模糊搜索功能
 * @param MsgObj
 * @param wss
 * @param _that
 * @returns {Promise<void>}
 */
async function navSearch (MsgObj, wss, _that) {
  const Query = {}
  const q1 = {}
  const q2 = {}
  // 模糊查询条件
  q1.nickName = { $regex: new RegExp(MsgObj.msg) }
  q2.email = { $regex: new RegExp(MsgObj.msg) }
  Query.$or = [q1, q2]
  const result = await db.likeFind('user', Query)
  const resultArr = []
  result.forEach(value => {
    if (MsgObj.uid !== value.email) {
      resultArr.push({
        nickName: value.nickName,
        email: value.email,
        avatar: value.avatar
      })
    }
  })
  _that.send(JSON.stringify({
    uid: MsgObj.uid,
    resultArr: resultArr,
    type: 'navSearch'
  }))
}

/**
 * 清除未读消息
 * @param MsgObj
 * @param wss
 * @param _that
 * @returns {Promise<void>}
 */
async function clearUnReadMsg (MsgObj, wss, _that) {
  const Query = {}
  Query.userID = MsgObj.uid
  Query.chatObj = MsgObj.chatObj
  const result = await db.find('chatRecord', Query)
  const chat = result[0].chat
  chat.forEach(value => {
    if (value) value.status = true
  })
  db.clearUnReadMsg('chatRecord', {
    Query,
    chat
  })
}

/**
 * 上线
 * 将 userID 写入到客户端对象中，并判断是否有重复的客户端
 */
function online (MsgObj, wss, _that) {
  let userIDStatus = true
  wss.clients.forEach((client) => {
    if (client.userID === MsgObj.uid) {
      userIDStatus = false
    }
  })
  /** userIDStatus为false则用户没有重复在线 */
  if (userIDStatus) {
    _that.userID = MsgObj.uid
  }
}

/**
 *   向数据库写入双方聊天记录
 *   对方在线保存聊天记录到聊天记录表
 *   不可靠插入！ 不需要等待返回结果
 */
async function chat (MsgObj, wss, _that, type) {
  if (type === 'agree') { // 同意好友申请后，假装成系统发送一条消息给双方
    let sendStatus1 = false
    let sendStatus2 = false
    wss.clients.forEach((client) => {
      if (client.userID === MsgObj.uid1) {
        client.send(JSON.stringify(MsgObj))
        sendStatus1 = true
      }
      if (client.userID === MsgObj.uid2) {
        client.send(JSON.stringify(MsgObj))
        sendStatus2 = true
      }
    })
    const myChat = {
      time: MsgObj.time,
      say: 'you',
      msg: MsgObj.msg,
      status: sendStatus1
    }
    const youChat = {
      time: MsgObj.time,
      say: 'you',
      msg: MsgObj.msg,
      status: sendStatus2
    }
    /** 判断数据库中是否有两人的聊天记录集合，如果没有则插入新的 */
    const result = await db.find('chatRecord', {
      userID: MsgObj.uid1,
      chatObj: MsgObj.uid2
    })
    console.log('ws.js > chat ---- agree: 看看存不存在聊天记录集合', result)
    if (result.length === 0) {
      console.log('ws.js > chat ---- agree: 开始写入')
      db.insertManyData('chatRecord', [
        {
          chat: [
            myChat
          ],
          userID: MsgObj.uid1,
          chatObj: MsgObj.uid2
        }, {
          chat: [
            youChat
          ],
          userID: MsgObj.uid2,
          chatObj: MsgObj.uid1
        }
      ]).then()
    }
  } else {
    /**
     * 当聊天记录不存在的时候，要创建一个新的聊天记录，睡醒觉再说
     * @type {boolean}
     */
    let sendStatus = false // 消息是否发出，如果未发出则保存到未读消息表
    wss.clients.forEach((client) => {
      if (client.userID === MsgObj.chatObj) {
        client.send(JSON.stringify(MsgObj))
        console.log(`ws.js > chat() ---- 成功发送 ${MsgObj.uid} 消息到 ${client.userID}，消息内容：${MsgObj.msg}`)
        sendStatus = true
      }
    })
    const myQuery = {}
    const youQuery = {}
    myQuery.userID = MsgObj.uid
    myQuery.chatObj = MsgObj.chatObj
    youQuery.userID = MsgObj.chatObj
    youQuery.chatObj = MsgObj.uid
    const myChat = {
      time: MsgObj.time,
      say: 'me',
      msg: MsgObj.msg,
      status: true
    }
    const youChat = {
      time: MsgObj.time,
      say: 'you',
      msg: MsgObj.msg,
      status: sendStatus
    }
    db.insertChatRecord('chatRecord', {
      myQuery,
      myChat,
      youQuery,
      youChat
    }, 'chat')
  }
}

/**
 * 添加好友申请
 * @param MsgObj
 * @param wss
 * @param _that
 * @returns {Promise<void>}
 */
async function addFriend (MsgObj, wss, _that) {
  let sendStatus = false // 消息是否发出，如果未发出则保存到未读消息表
  wss.clients.forEach((client) => {
    if (client.userID === MsgObj.to.nickName) {
      client.send(JSON.stringify(MsgObj))
      sendStatus = true
    }
  })
  if (!sendStatus) {
    const result = await db.find('friendApply', {
      'to.email': MsgObj.to.email,
      'from.email': MsgObj.from.email
    })
    if (result.length > 0) {
      _that.send(JSON.stringify({
        msg: '请勿重复添加',
        type: 'addFriend',
        error: true
      }))
    } else {
      await db.insertOneData('friendApply', MsgObj)
      _that.send(JSON.stringify({
        msg: '已发送请求',
        type: 'addFriend',
        error: false
      }))
    }
  }
}

/**
 * 同意或拒绝好友申请
 * @param MsgObj
 * @param wss
 * @param _that
 * @returns {Promise<void>}
 */
async function addFriendReply (MsgObj, wss, _that) {
  if (MsgObj.flag) { /** 同意好友申请的操作 */
    /** 防止重复写入好友关系 */
    const result = await db.find('friend', {
      UID: MsgObj.uid,
      Friend: MsgObj.friend
    })
    if (result.length === 0) {
      await db.insertManyData('friend', [
        {
          UID: MsgObj.uid,
          Friend: MsgObj.friend,
          time: MsgObj.time
        }, {
          UID: MsgObj.friend,
          Friend: MsgObj.uid,
          time: MsgObj.time
        }
      ])
    }
    /** 同意好友申请后，假装成系统发送一条消息给双方 */
    const date = new Date()
    const formatTime = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    const agreeMsg = {
      msg: '已通过好友申请',
      time: formatTime,
      uid1: MsgObj.uid,
      uid2: MsgObj.friend,
      type: 'agree'
    }
    await this.chat(agreeMsg, wss, _that, 'agree')

    /** 数据库好友申请表状态改为status: true */
    db.updateOne('friendApply', {
      'to.email': MsgObj.uid,
      'from.email': MsgObj.friend
    }, {
      $set: {
        status: true
      }
    }).then()
  }
}
