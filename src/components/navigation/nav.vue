<template>
  <div class="nav">
    <!--  设置页面  s -->
    <setting
      class="noSelect"
      :style="{transform: navSettingActive ? 'translateY(0%)' : 'translateY(-100%)', opacity: navSettingActive ? 1 : 0.2}"
    />
    <!--  设置页面  e -->
    <div class="nav_main">
      <div class="top_bar">
        <div class="logo">
          <figure></figure>
        </div>
        <button class="addFriend" :class="{'addFriendActive': btnActive}"
                @click="btnActive = !btnActive; navSettingActive = !navSettingActive">
          <span class="add_1"></span>
          <span class="add_2"></span>
          <span class="add_3"></span>
        </button>
      </div>
      <!--  搜索栏  s -->
      <div class="search">
        <span class="search_bt"></span>
        <input type="text"
               name="search"
               autocomplete="off"
               placeholder="搜索"
               @keyup="searchChange"
               @focus="searchActive = true"
               @blur="!searchContent ? searchActive = false : searchActive = true;"
               v-model="searchContent">
        <el-popover
          placement="bottom"
          width="200"
          trigger="manual"
          content="只允许输入数字、字母、字符@，不允许输入特殊字符。"
          v-if="popoverVisible">
        </el-popover>
        <div class="search_list" v-if="searchActive">
          {{ searchTips }}
          <ul class="searchResult" @click="addFriend">
            <li class="result_Title">全网搜索</li>
            <li v-for="(item, i) in $store.state.globe.navigation.searchResult" :key="i">
              <div class="searchResultMask" :data-email="item.email" :data-nickname="item.nickName"
                   :data-avatar="item.avatar"></div>
              <figure><img :src="item.avatar" alt=""></figure>
              <div class="resultName">
                <div>{{ item.nickName }}</div>
                <div>{{ item.email }}</div>
              </div>
            </li>
          </ul>
        </div>
      </div>
      <ul class="class_list" @click="switchClass" v-if="!searchActive">
        <li>
          <input type="radio"
                 class="classList_btn"
                 name="classList"
                 data-link="chatHistory"
                 checked/>
          <span class="classList_btn"></span>
        </li>
        <li>
          <input type="radio"
                 class="classList_btn"
                 name="classList"
                 data-link="contacts"/>
          <span class="classList_btn"></span>
        </li>
        <li>
          <input type="radio"
                 class="classList_btn"
                 name="classList"
                 data-link="group"/>
          <span class="classList_btn"></span>
        </li>
      </ul>
      <div class="list_container" ref="listContainer" v-if="!searchActive">
        <chatHistory class="list_container_chatHistory noSelect"/>
        <contact class="list_container_contact noSelect"/>
        <group class="list_container_group noSelect"/>
      </div>
    </div>
  </div>
</template>

<script>
import chatHistory from './nav_chatHistory'
import contact from './nav_contact'
import group from './nav_group'
import setting from './nav_setting'
import { apiService } from '@/assets/js/Functions'
import { API_COMMON } from '@/assets/js/api'

export default {
  name: 'indexNav',
  components: {
    chatHistory,
    contact,
    group,
    setting
  },
  data () {
    return {
      uid: window.sessionStorage.getItem('uid'),
      searchContent: '',
      searchActive: false,
      searchTips: '查找好友开始聊天吧',
      btnActive: false,
      navSettingActive: false,
      chatObj: '',
      popoverVisible: false // 输入提示
    }
  },
  mounted () {
    this.$store.commit('navInit')
    // 获取菜单配置
    apiService.getData(API_COMMON.GET_COMMON_USER_CONFIG, {
      uid: this.uid
    }).then(res => {
      if (!res.data.error) {
        this.$store.state.globe.userConfig = res.data.config
      }
    })
  },
  methods: {
    /** 搜索好友 */
    searchChange () {
      clearTimeout(this.timer)
      if (this.searchContent.length === 0) {
        this.$store.state.globe.navigation.searchResult = '' // 清除搜索结果
      } else {
        this.searchTips = ''
        this.timer = setTimeout(() => {
          apiService.getData(API_COMMON.GET_COMMON_NAV_SEARCH, {
            email: this.searchContent,
            nickName: this.searchContent,
            userID: this.uid
          }).then(res => {
            this.$store.state.globe.navigation.searchResult = res.data.result
          })
        }, 200)
      }
    },
    /** 切换菜单面板的分类时 */
    switchClass (e) {
      if (e.target.nodeName === 'INPUT') {
        const link = e.target.attributes['data-link'].value
        const listContainer = this.$refs.listContainer
        switch (link) {
          case 'chatHistory':
            listContainer.style.transform = 'translateX(0)'
            break
          case 'contacts':
            listContainer.style.transform = 'translateX(-33.33%)'
            break
          case 'group':
            listContainer.style.transform = 'translateX(-66.66%)'
            break
        }
      }
    },
    /** 添加好友 */
    addFriend (e) {
      /** 事件委托，点击UL时不触发click */
      // 点击的不是UL && 且li的类名不是“全网搜索”的标题 && 且点击的对象名字不是自己
      if (e.target.nodeName !== 'UL' && e.target.className !== 'result_Title' && e.target.innerHTML !== this.$store.state.uid) {
        // 当点击的对象已经是好友时，跳转到聊天界面
        if (Object.keys(this.$store.state.globe.navigation.contactList.nameList).includes(e.target.dataset.email)) {
          this.chatObj = e.target.dataset.email
          this.$store.commit('chatObjChange', this.chatObj)
          // 选中该好友时，清除该好友的未读消息列表
          if (this.$store.state.globe.unReadMsg[this.chatObj] > 0) this.$store.commit('clearUnRead', this.chatObj)
        } else if (!Object.keys(this.$store.state.globe.navigation.contactList.nameList).includes(e.target.dataset.email)) {
          // 当点击的对象不属于好友时，发送好友请求
          this.$store.state.globe.addFriend.friendInfo = { // 先设置好友信息
            email: e.target.dataset.email,
            avatar: e.target.dataset.avatar,
            nickName: e.target.dataset.nickname
          }
          this.$store.state.globe.addFriend.addFriPanelState = true // 开始添加好友，展开面板
        }
      }
    }
  },
  watch: {
    searchActive () {
      if (!this.searchActive) {
        this.$store.state.globe.navigation.searchResult = '' // 清除搜索结果
        this.searchTips = ''
      } else {
        this.searchTips = '查找好友开始聊天吧'
      }
    }
  }
}
</script>

<style scoped>
.nav {
  min-width: 280px;
  width: calc(22% - var(--common-margin));
  height: calc(100% - var(--common-margin) * 2);
  margin: var(--common-margin) 0 var(--common-margin) var(--common-margin);
  z-index: var(--mainNav-Zindex);
  border-radius: var(--common-radius);
  overflow: hidden;
}

.nav_main {
  background: rgba(180, 190, 200, .3);
  position: relative;
  height: 100%;
  width: 100%;
}

.top_bar {
  /*logo高度*/
  height: var(--logo-height);
  width: 100%;
  display: flex;
  justify-content: space-between;
  position: relative;
}

.logo {
  margin: 0 0 0 calc(var(--logo-height) / 5);
  height: var(--logo-height);
  width: var(--logo-height);
}

.logo figure {
  height: var(--logo-height);
  width: var(--logo-height);
  background: url("../../assets/img/logo.svg") no-repeat 50%;
  background-size: 100%;
}

.addFriend {
  height: 20px;
  width: 30px;
  border-radius: 50%;
  background: transparent;
  border: none;
  outline: none;
  cursor: pointer;
  transform: translate(0, -50%);
  top: 50%;
  right: calc(var(--logo-height) / 5);
  position: absolute;
  padding: 0 !important;
  margin: 0 !important;
  z-index: 1001 !important;
}

.addFriend:hover {
  will-change: contents;
}

.top_bar .addFriend span {
  display: block;
  height: 4px;
  width: 24px;
  position: absolute;
  left: 50%;
  background: #555555;
  border-radius: 2px;
  transform: translate(-50%, -50%);
  transition: all .3s;
}

.addFriend .add_1 {
  top: 0;
}

.addFriend .add_2 {
  top: 50%;
}

.addFriend .add_3 {
  top: 100%;
}

.addFriendActive .add_1 {
  top: 0;
  left: 25% !important;
  transform: rotate(45deg) translateX(6%) !important;
  transform-origin: left;
}

.addFriendActive .add_2 {
  top: 50%;
  opacity: 0;
}

.addFriendActive .add_3 {
  top: 100%;
  left: 25% !important;
  transform: rotate(-45deg) translateX(10%) !important;
  transform-origin: left;
}

.search {
  height: 38px;
  width: 100%;
  padding: 0 calc(var(--logo-height) / 5);
  box-sizing: border-box;
  position: relative;
}

.search_bt {
  position: absolute;
  top: 0;
  left: calc(var(--logo-height) / 5);
  height: 38px;
  width: 38px;
  background: url("../../assets/img/search.png") no-repeat 50%;
  background-size: 50%;
}

.search input[name=search] {
  height: 100%;
  width: 100%;
  border: none;
  outline: none;
  border-radius: 3px;
  background: rgba(190, 190, 190, .3);
  padding-left: calc(18px + var(--logo-height) / 5);
  box-sizing: border-box;
}

.search_list {
  width: 100%;
  height: calc(100vh - var(--classIcon-height) - var(--logo-height));
  line-height: calc(60vh - var(--classIcon-height) - var(--logo-height));
  text-align: center;
  position: absolute;
  color: #888888;
  z-index: 999;
  top: 100%;
  left: 0;
}

.search_list .searchResult {
  padding: calc(var(--logo-height) / 5);
  box-sizing: border-box;
  position: absolute;
  height: 100%;
  width: 100%;
  left: 0;
  top: 0;
}

.search_list .searchResult li {
  line-height: var(--search-li-height);
  height: var(--search-li-height);
  --search-li-height: 60px;
  width: 100%;
  display: flex;
  overflow: hidden;
  position: relative;
}

.search_list .searchResult li:not(:first-child) {
  cursor: pointer;
}

.search_list .searchResult li:not(:first-child):hover {
  background: rgba(200, 200, 200, .7);
}

.search_list .result_Title {
  height: 40px !important;
  line-height: 40px !important;
  font-size: 14px;
  font-weight: 600;
  color: #444444;
  box-sizing: border-box;
  padding-left: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, .1);
}

.search_list .searchResult li figure,
.search_list .searchResult li figure img {
  height: var(--search-li-height);
  width: var(--search-li-height);
}

.search_list .searchResult .resultName {
  line-height: var(--search-li-height);
  height: var(--search-li-height);
  width: calc(100% - var(--search-li-height));
  border-bottom: 1px solid rgba(0, 0, 0, .1);
  box-sizing: border-box;
  padding-left: 13px;
  text-align: left;
  font-size: 14px;
  color: #444444;
}

.resultName div {
  width: 100%;
  height: calc(var(--search-li-height) / 2);
  /*line-height: calc(var(--search-li-height) / 2);*/
}

.resultName div:nth-of-type(1) {
  font-size: 18px;
  line-height: 40px !important;
}

.resultName div:nth-of-type(2) {
  font-size: 12px;
  color: #888888;
  line-height: 30px !important;
}

.search_list .searchResult li:last-child .resultName {
  border-bottom: none;
}

.search_list .searchResult li:last-child {
  border-bottom: 1px solid rgba(0, 0, 0, .1);
}

.class_list {
  height: var(--classIcon-height);
  width: 100%;
  margin: calc(var(--classIcon-height) / 4) 0 calc(var(--classIcon-height) / 3) 0;
  box-sizing: border-box;
  padding: 0 calc(var(--logo-height) / 5);
  display: flex;
  justify-content: space-between;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.class_list li {
  line-height: var(--classIcon-height);
  height: var(--classIcon-height);
  width: 33.33%;
  max-width: 84px;
  text-align: center;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
}

.class_list li .classList_btn {
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  display: block;
  position: absolute;
}

.class_list li input {
  z-index: 2;
  opacity: 0;
  cursor: pointer;
}

.class_list li input:checked + .classList_btn {
  background: #65C564;
  mask-repeat: no-repeat;
}

.class_list li input + span {
  background: rgba(100, 100, 100, 0.6);
  mask-repeat: no-repeat;
  transition: background-color .16s;
}

.class_list > li:nth-of-type(1) > input + span {
  mask-image: url("../../assets/img/chatHistory.png");
  mask-size: 32%;
  mask-position: 0 50%;
}

.class_list > li:nth-of-type(2) > input + span {
  mask-image: url("../../assets/img/contacts.png");
  mask-size: 36%;
  mask-position: 50%;
}

.class_list > li:nth-of-type(3) > input + span {
  mask-image: url("../../assets/img/group.png");
  mask-size: 35%;
  mask-position: 100% 50%;
}

.list_container {
  height: calc(100% - var(--logo-height) - var(--classIcon-height) - 38px - calc(var(--classIcon-height) / 4) - calc(var(--classIcon-height) / 3));
  width: 300%;
  box-sizing: border-box;
  display: flex;
  overflow: hidden;
}

.list_container_chatHistory,
.list_container_contact,
.list_container_group {
  width: 33.3333%;
  height: 100%;
}

.searchResultMask {
  position: absolute;
  height: 100%;
  width: 100%;
  z-index: 9999;
}

</style>
