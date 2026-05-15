const app = getApp()

Page({
  data: {
    phone: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    isElder: true,
    agreeTerms: false
  },

  onPhoneInput: function (e) {
    this.setData({
      phone: e.detail.value
    })
  },

  onPasswordInput: function (e) {
    this.setData({
      password: e.detail.value
    })
  },

  onConfirmPasswordInput: function (e) {
    this.setData({
      confirmPassword: e.detail.value
    })
  },

  onNicknameInput: function (e) {
    this.setData({
      nickname: e.detail.value
    })
  },

  toggleRole: function (e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      isElder: type === 'elder'
    })
  },

  toggleAgree: function () {
    this.setData({
      agreeTerms: !this.data.agreeTerms
    })
  },

  register: function () {
    const { phone, password, confirmPassword, nickname, isElder, agreeTerms } = this.data

    if (!phone || phone.length !== 11) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    if (!password || password.length < 6) {
      wx.showToast({
        title: '密码至少6位',
        icon: 'none'
      })
      return
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'none'
      })
      return
    }

    if (!nickname) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    if (!agreeTerms) {
      wx.showToast({
        title: '请同意服务条款',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '注册中...'
    })

    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'register',
        phone: phone,
        password: password,
        nickname: nickname,
        isElder: isElder
      },
      success: res => {
        wx.hideLoading()
        console.log('注册结果:', res.result)

        if (res.result.success) {
          const user = res.result.data
          const userData = {
            id: user.id,
            phone: user.phone,
            nickname: user.nickname,
            userType: user.is_elder ? 'elder' : 'children',
            status: user.status
          }

          wx.showToast({
            title: '注册成功',
            icon: 'success',
            duration: 2000
          })

          if (user.is_elder) {
            app.setUserInfo(userData)
            app.setChildrenUserInfo(null)
          } else {
            app.setChildrenUserInfo(userData)
            app.setUserInfo(null)
          }

          wx.setStorageSync('userData', userData)

          setTimeout(() => {
            if (user.is_elder) {
              wx.redirectTo({
                url: '/pages/elder/index'
              })
            } else {
              wx.switchTab({
                url: '/pages/children/home/index'
              })
            }
          }, 2000)
        } else {
          wx.showToast({
            title: res.result.message || '注册失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('注册失败:', err)
        wx.showToast({
          title: '注册失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  goToLogin: function () {
    wx.navigateBack()
  },

  openTerms: function () {
    wx.showModal({
      title: '服务条款',
      content: '欢迎使用椿萱语音安全守护服务。请您仔细阅读以下条款...',
      showCancel: false,
      confirmText: '我知道了'
    })
  }
})