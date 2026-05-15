const app = getApp()

Page({
  data: {
    loginType: 'sms',
    account: '',
    password: '',
    isSending: false,
    countdown: 0,
    agreeTerms: false,
    userType: 'elder'
  },

  onLoad: function () {
    this.checkLoginStatus()
  },

  checkLoginStatus: function () {
    if (app.globalData.userInfo) {
      wx.redirectTo({
        url: '/pages/elder/index'
      })
    } else if (app.globalData.childrenUserInfo) {
      wx.switchTab({
        url: '/pages/children/home/index'
      })
    }
  },

  switchUserType: function(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ userType: type })
  },

  switchLoginType: function (e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      loginType: type,
      account: '',
      password: ''
    })
  },

  onAccountInput: function (e) {
    this.setData({
      account: e.detail.value
    })
  },

  onPasswordInput: function (e) {
    this.setData({
      password: e.detail.value
    })
  },

  sendVerifyCode: function () {
    const phone = this.data.account
    if (!phone || phone.length !== 11) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    if (this.data.isSending) return

    this.setData({
      isSending: true,
      countdown: 60
    })

    wx.showToast({
      title: '验证码已发送',
      icon: 'success',
      duration: 2000
    })

    const timer = setInterval(() => {
      const newCountdown = this.data.countdown - 1
      this.setData({
        countdown: newCountdown
      })

      if (newCountdown <= 0) {
        clearInterval(timer)
        this.setData({
          isSending: false
        })
      }
    }, 1000)
  },

  toggleAgree: function () {
    this.setData({
      agreeTerms: !this.data.agreeTerms
    })
  },

  handleLogin: function () {
    if (this.data.loginType === 'sms') {
      this.smsLogin()
    } else {
      this.passwordLogin()
    }
  },

  smsLogin: function () {
    const { account, password, agreeTerms, userType } = this.data

    if (!account || account.length !== 11) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    if (!password || password.length !== 6) {
      wx.showToast({
        title: '请输入6位验证码',
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
      title: '登录中...'
    })

    const userData = {
      id: 'user_' + Date.now(),
      phone: account,
      nickname: '用户',
      userType: userType,
      status: 1
    }

    setTimeout(() => {
      wx.hideLoading()
      
      if (userType === 'children') {
        app.setChildrenUserInfo(userData)
        app.setUserInfo(null)
      } else {
        app.setUserInfo(userData)
        app.setChildrenUserInfo(null)
      }

      wx.setStorageSync('userData', userData)

      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 1500
      })

      setTimeout(() => {
        if (userType === 'children') {
          wx.switchTab({
            url: '/pages/children/home/index'
          })
        } else {
          wx.redirectTo({
            url: '/pages/elder/index'
          })
        }
      }, 1500)
    }, 1000)
  },

  passwordLogin: function () {
    const { account, password, agreeTerms, userType } = this.data

    if (!account) {
      wx.showToast({
        title: '请输入账号',
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

    if (!agreeTerms) {
      wx.showToast({
        title: '请同意服务条款',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '登录中...'
    })

    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'login',
        phone: account,
        password: password
      },
      success: res => {
        wx.hideLoading()
        console.log('登录结果:', res.result)

        if (res.result.success) {
          const user = res.result.data
          const userData = {
            id: user.id,
            phone: user.phone,
            nickname: user.nickname,
            userType: user.is_elder ? 'elder' : 'children',
            status: user.status
          }

          if (user.is_elder) {
            app.setUserInfo(userData)
            app.setChildrenUserInfo(null)
          } else {
            app.setChildrenUserInfo(userData)
            app.setUserInfo(null)
          }

          wx.setStorageSync('userData', userData)

          wx.showToast({
            title: '登录成功',
            icon: 'success',
            duration: 1500
          })

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
          }, 1500)
        } else {
          wx.showToast({
            title: res.result.message || '登录失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('登录失败:', err)
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  handleLoginSuccess: function (userData) {
    if (userData.userType === 'children') {
      app.setChildrenUserInfo(userData)
      app.setUserInfo(null)
    } else {
      app.setUserInfo(userData)
      app.setChildrenUserInfo(null)
    }

    wx.setStorageSync('userData', userData)

    wx.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 1500
    })

    setTimeout(() => {
      if (userData.userType === 'children') {
        wx.switchTab({
          url: '/pages/children/home/index'
        })
      } else {
        wx.redirectTo({
          url: '/pages/elder/index'
        })
      }
    }, 1500)
  },

  quickLogin: function () {
    wx.showLoading({
      title: '快速登录...'
    })

    const userData = {
      id: 'test_elder',
      phone: 'test',
      nickname: '测试用户',
      userType: 'elder',
      status: 1
    }

    setTimeout(() => {
      wx.hideLoading()
      
      app.setUserInfo(userData)
      app.setChildrenUserInfo(null)
      wx.setStorageSync('userData', userData)

      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 1500
      })

      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/elder/index'
        })
      }, 1500)
    }, 800)
  },

  navigateToRegister: function () {
    wx.navigateTo({
      url: '/pages/register/index'
    })
  },

  forgotPassword: function () {
    wx.showToast({
      title: '忘记密码功能开发中',
      icon: 'none'
    })
  },

  openTerms: function () {
    wx.showModal({
      title: '服务条款',
      content: '欢迎使用椿萱语音安全守护服务。请您仔细阅读以下条款...',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  testDBConnection: function () {
    wx.showLoading({
      title: '测试连接中...'
    })

    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'testConnection'
      },
      success: res => {
        wx.hideLoading()
        console.log('数据库连接测试结果:', res.result)
        
        if (res.result.success) {
          wx.showModal({
            title: '✅ 连接成功',
            content: `数据库版本: ${res.result.data.version}\n主机: ${res.result.data.host}\n端口: ${res.result.data.port}\n数据库: ${res.result.data.database}`,
            showCancel: false,
            confirmText: '确定'
          })
        } else {
          let content = `错误信息: ${res.result.message}\n错误码: ${res.result.error}\n错误类型: ${res.result.errorType || '未知'}`
          if (res.result.suggestion) {
            content += `\n\n💡 建议: ${res.result.suggestion}`
          }
          wx.showModal({
            title: '❌ 连接失败',
            content: content,
            showCancel: false,
            confirmText: '确定'
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('调用云函数失败:', err)
        wx.showModal({
          title: '调用失败',
          content: '云函数调用失败，请检查云开发环境配置',
          showCancel: false,
          confirmText: '确定'
        })
      }
    })
  },

  testWithUser: function () {
    wx.showLoading({
      title: '正在测试账号...'
    })

    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'createAndQuery'
      },
      success: res => {
        wx.hideLoading()
        console.log('测试账号结果:', res.result)
        
        if (res.result.success) {
          let userList = ''
          if (res.result.data.users && res.result.data.users.length > 0) {
            userList = '\n\n数据库中的用户：\n'
            res.result.data.users.forEach((user, index) => {
              userList += (index + 1) + '. ' + user.nickname + ' (' + user.phone + ')\n'
            })
          }
          
          wx.showModal({
            title: '✅ 数据库连接成功',
            content: '数据库读写测试通过！\n\n测试时间: ' + res.result.data.testTime + '\n用户数量: ' + res.result.data.userCount + userList,
            showCancel: false,
            confirmText: '确定'
          })
        } else {
          let content = '错误信息: ' + res.result.message + '\n\n错误类型: ' + (res.result.errorType || '未知')
          if (res.result.suggestion) {
            content += '\n\n💡 建议: ' + res.result.suggestion
          }
          wx.showModal({
            title: '❌ 数据库测试失败',
            content: content,
            showCancel: false,
            confirmText: '确定'
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('调用云函数失败:', err)
        wx.showModal({
          title: '❌ 云函数调用失败',
          content: '无法调用云函数，请检查：\n1. 云函数是否已部署\n2. 云开发环境是否正确配置\n\n错误信息: ' + JSON.stringify(err),
          showCancel: false,
          confirmText: '确定'
        })
      }
    })
  }
})