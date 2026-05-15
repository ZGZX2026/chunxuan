const app = getApp()

Page({
  data: {
    userInfo: null,
    linkedCount: 2,
    messageCount: 3,
    careDays: 15
  },

  onShow: function() {
    this.checkLoginStatus()
    this.loadUserInfo()
    this.loadStats()
  },

  checkLoginStatus: function() {
    const userInfo = app.globalData.childrenUserInfo
    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.navigateTo({ url: '/pages/children/login/index' })
        }
      })
    }
  },

  loadUserInfo: function() {
    const userInfo = app.globalData.childrenUserInfo
    this.setData({ userInfo })
  },

  loadStats: function() {
    const childrenUserInfo = app.globalData.childrenUserInfo
    wx.request({
      url: 'https://your-backend-api.com/api/user/get_stats',
      method: 'POST',
      data: { userId: childrenUserInfo && childrenUserInfo.id ? childrenUserInfo.id : '' },
      success: (res) => {
        if (res.data.success) {
          this.setData(res.data.data)
        }
      },
      fail: () => {
        this.setData({
          linkedCount: 2,
          messageCount: 3,
          careDays: 15
        })
      }
    })
  },

  editProfile: function() {
    wx.showToast({ title: '编辑资料功能开发中', icon: 'none' })
  },

  goToRelate: function() {
    wx.navigateTo({ url: '/pages/children/relate/index' })
  },

  goToChat: function() {
    wx.showActionSheet({
      itemList: ['爸爸', '妈妈'],
      success: (res) => {
        wx.makePhoneCall({
          phoneNumber: res.tapIndex === 0 ? '13800138001' : '13800138002'
        })
      }
    })
  },

  goToEmergency: function() {
    wx.showModal({
      title: '紧急联系',
      content: '确定要触发紧急呼叫吗？将立即通知所有紧急联系人。',
      confirmText: '确定',
      confirmColor: '#E53935',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已通知紧急联系人', icon: 'success' })
        }
      }
    })
  },

  goToReport: function() {
    wx.navigateTo({ url: '/pages/children/data/index' })
  },

  goToNotification: function() {
    wx.showActionSheet({
      itemList: ['开启所有通知', '仅紧急通知', '关闭所有通知'],
      success: (res) => {
        const options = ['开启所有通知', '仅紧急通知', '关闭所有通知']
        wx.showToast({ title: `已设置：${options[res.tapIndex]}`, icon: 'success' })
      }
    })
  },

  goToPrivacy: function() {
    wx.showModal({
      title: '隐私设置',
      content: '您可以管理您的数据隐私设置...',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  goToAbout: function() {
    wx.showModal({
      title: '关于我们',
      content: '椿萱语音安全守护 v1.0.0\n\n用心守护，温暖陪伴\n为老年人提供安全守护服务',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  goToFeedback: function() {
    wx.showModal({
      title: '意见反馈',
      content: '感谢您的反馈！\n\n如有任何问题或建议，请发送邮件至：support@chunxuan.com',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  handleLogout: function() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmText: '确定',
      confirmColor: '#E53935',
      success: (res) => {
        if (res.confirm) {
          app.globalData.childrenUserInfo = null
          app.globalData.userInfo = null
          wx.removeStorageSync('userData')
          wx.reLaunch({ url: '/pages/login/index' })
        }
      }
    })
  },

  goHome: function() {
    wx.navigateTo({ url: '/pages/children/home/index' })
  },

  goData: function() {
    wx.navigateTo({ url: '/pages/children/data/index' })
  },

  goMessages: function() {
    wx.navigateTo({ url: '/pages/children/messages/index' })
  }
})
