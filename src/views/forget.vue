<template>
  <div class="forget_container">
    <div class="title">
      <p v-text="transIndex === 4 ? '修改成功' : '找回您的密码'"></p>
      <div
        :class="{prevStepEmail: transIndex !== 2,
        prevStepCode: [2,3].includes(transIndex)}"
        v-text="transIndex === 1 ? '请输入您的邮箱' : (transIndex === 4 ? '' : inputObj_Email.inputText)">
      </div>
    </div>
    <div class="forget_box"
         :style="{transform : transIndex === 2 ? 'translateX(-33.33%)' : [3,4].includes(transIndex) ? 'translateX(-66.66%)' : 'translateX(-0%)'}">
      <!--  输入邮箱页面 s transIndex=1 -->
      <div class="forget_box_inputEmail" @keyup.enter="sendData">
        <inputCommon class="email" :inputObj="inputObj_Email" @inputChange="emailInputChange"/>
        <div class="bottom_Bar">
          <span class="turnLogin" @click="goLogin">回到登录</span>
          <button class="submitData" @click="sendData">下一步</button>
        </div>
      </div>
      <!--  输入邮箱页面 e -->
      <!--  输入验证码 s transIndex=2 -->
      <div class="forget_box_inputCode" @keyup.enter="resend">
        <inputCommon class="email" :inputObj="inputObj_Code" @inputChange="codeInputChange"/>
        <div class="bottom_Bar">
          <span class="resend" @click="resend">没有收到邮件？重新发送</span>
          <button class="submitData" @click="checkCode">下一步</button>
        </div>
      </div>
      <!--  输入验证码 e -->
      <!--  新密码 s transIndex=3 -->
      <div class="forget_box_inputChangePwd" @keyup.enter="changePwd">
        <inputCommon class="email" :inputObj="inputObj_newPwd" @inputChange="pwdInputChange" v-if="transIndex !== 4"/>
        <div class="bottom_Bar">
          <div v-if="transIndex !== 4">
            <span class="resend"></span>
            <button class="submitData" @click="changePwd">下一步</button>
          </div>
          <div v-if="transIndex === 4" class="sucImg">
            <figure></figure>
          </div>
          <div v-if="transIndex === 4">
            <span class="turnLogin"></span>
            <button class="submitData" @click="goLogin">开始登录</button>
          </div>
        </div>
      </div>
      <!--  新密码 e transIndex=3 -->
    </div>
  </div>
</template>

<script>
import inputCommon from '../components/login/input_common'
import { apiService } from '@/assets/js/Functions'
import { API_LOGIN } from '@/assets/js/api'

export default {
  name: 'forget',
  components: {
    inputCommon
  },
  data () {
    return {
      inputObj_Email: {
        inputText: '',
        tips: '邮件地址',
        errStatus: false,
        errInfo: ''
      },
      inputObj_Code: {
        inputText: '',
        tips: '验证码',
        errStatus: false,
        errInfo: ''
      },
      inputObj_newPwd: {
        inputText: '',
        tips: '新密码',
        errStatus: false,
        errInfo: ''
      },
      code: '', // 返回的验证码
      transIndex: 1
    }
  },
  methods: {
    // 放回登录页
    goLogin () {
      this.$router.replace('login')
    },
    sendData () {
      if (this.inputObj_Email.errStatus === false) { // 检查邮件格式，格式正确则发送到服务器验证用户是否存在
        apiService.postData(API_LOGIN.POST_LOGIN_FORGET, {
          email: this.inputObj_Email.inputText
        }).then(res => {
          if (res.data.error) {
            this.inputObj_Email.errStatus = true
            this.inputObj_Email.errInfo = res.data.msg
          } else {
            this.$message({
              type: 'success',
              message: `验证码发送成功！悄悄告诉你，是 ${res.data.code}`
            })
            this.code = res.data.code
            this.transIndex = 2
          }
        })
      }
    },
    // 重新发送邮件
    resend () {
      this.sendData()
    },
    // 检查验证码
    checkCode () {
      if (this.inputObj_Code.inputText === this.code) {
        this.transIndex = 3 // 跳转到第三个页面，输入新密码
        this.inputObj_Code.errStatus = false
        this.inputObj_Code.errInfo = ''
      } else {
        this.inputObj_Code.errStatus = true
        this.inputObj_Code.errInfo = '验证码无效，请重试'
      }
    },
    changePwd () {
      if (this.inputObj_newPwd.errStatus === false) {
        apiService.updateData(API_LOGIN.PUT_LOGIN_MODIFY_PWD, {
          email: this.inputObj_Email.inputText,
          pwd: this.inputObj_newPwd.inputText
        }).then(res => {
          this.transIndex = 4
          this.$message({
            type: 'success',
            message: res.data.msg
          })
        })
      }
    },
    // 同步邮箱输入框
    emailInputChange (inputText) {
      this.inputObj_Email.inputText = inputText
      if (this.$store.state.signStore.regExp.regEmail.test(this.inputObj_Email.inputText)) { // 检查邮件格式
        this.inputObj_Email.errStatus = false
        this.inputObj_Email.errInfo = ''
      } else {
        this.inputObj_Email.errStatus = true
        this.inputObj_Email.errInfo = '该邮件地址无效，请重试'
      }
    },
    // 同步验证码输入框
    codeInputChange (inputText) {
      this.inputObj_Code.inputText = inputText
    },
    // 新密码输入框
    pwdInputChange (inputText) {
      this.inputObj_newPwd.inputText = inputText
      if (this.$store.state.signStore.regExp.pwdCommon.test(this.inputObj_newPwd.inputText)) {
        this.inputObj_newPwd.errStatus = false
        this.inputObj_newPwd.errInfo = ''
      } else {
        this.inputObj_newPwd.errStatus = true
        this.inputObj_newPwd.errInfo = '请选择安全系数更高的密码。建议使用以字母开头，长度在6~18之间，只能包含字母、数字和下划线的组合'
      }
    }
  }
}
</script>

<style scoped>
.forget_container {
  height: calc(530px - 100px - 30px);
  width: var(--loginCont-height);
  padding-top: 20px;
  position: absolute;
  --input-width: 32px;
  overflow: hidden;
}

.prevStepEmail {
  padding: 4px 16px 4px 16px;
  font-size: 15px;
  margin-left: 50%;
  display: inline-block;
  transform: translateX(-50%);
}

.prevStepCode {
  display: inline-block;
  margin-left: 50%;
  transform: translateX(-50%);
  font-size: 15px;
  padding: 4px 16px 4px 36px;
  border-radius: 20px;
  border: 1px solid #cccccc;
  box-sizing: border-box;
  cursor: pointer;
  position: relative;
}

.prevStepCode::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 10px;
  transform: translate(0%, -50%);
  height: 20px;
  width: 20px;
  background: url("../assets/img/user_.png") no-repeat 50%;
  background-size: 90%;
}

.forget_box {
  width: 300%;
  display: flex;
  transition: all .2s;
}

.forget_box_inputEmail, .forget_box_inputCode, .forget_box_inputChangePwd {
  width: 33.33%;
  padding: 0 6%;
}

.turnLogin, .resend {
  display: inline-block;
  color: #1A73E8;
  font-size: 15px;
  cursor: pointer;
  height: 100%;
  line-height: 36px;
  margin: 60px 0 0 50%;
  transform: translateX(-50%);
}

.submitData {
  display: block;
  margin: auto;
  height: 36px;
  width: 100px;
  border-radius: 20px;
  color: #ffffff;
  font-size: 16px;
  letter-spacing: 0.25px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  margin-top: 10px;
  background: var(--common-color);
}

.sucImg {
}

.sucImg figure {
  margin: auto;
  height: 150px;
  width: 150px;
  background: url("../assets/ginger-cat/ginger-cat-749.png") no-repeat 50%;
  background-size: 100%;
}
</style>
