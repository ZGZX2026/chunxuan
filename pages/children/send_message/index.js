const app = getApp()

Page({
  data: {
    elderId: '',
    elderName: '',
    messageContent: '',
    quickMessages: [
      '爸爸，记得按时吃药',
      '妈妈，今天天气不错，记得出去走走',
      '爸，注意身体，有不舒服要及时告诉我',
      '妈，晚上早点休息',
      '爸爸，今天感觉怎么样？',
      '妈，我今天很忙，有事打电话给我'
    ],
    historyMessages: []
  },

  onLoad: function(options) {
    if (options.elderId) {
      this.setData({
        elderId: options.elderId,
        elderName: options.elderName || '老人'
      })
      this.loadHistoryMessages()
    }
  },

  onInput: function(e) {
    this.setData({
      messageContent: e.detail.value
    })
  },

  selectQuickMessage: function(e) {
    const message = e.currentTarget.dataset.message
    this.setData({
      messageContent: message
    })
  },

  loadHistoryMessages: function() {
    const userInfo = app.globalData.childrenUserInfo
    if (!userInfo || !this.data.elderId) return

    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'getMessages',
        userId: userInfo.id,
        otherUserId: this.data.elderId
      },
      success: res => {
        console.log('获取历史消息:', res.result)
        if (res.result && res.result.success) {
          this.setData({
            historyMessages: res.result.data || []
          })
        }
      },
      fail: err => {
        console.error('获取历史消息失败:', err)
      }
    })
  },

  sendMessage: function() {
    const content = this.data.messageContent.trim()
    
    if (!content) {
      wx.showToast({
        title: '请输入消息内容',
        icon: 'none'
      })
      return
    }

    const userInfo = app.globalData.childrenUserInfo
    if (!userInfo || !this.data.elderId) {
      wx.showToast({
        title: '用户信息错误',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '发送中...'
    })

    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'sendMessage',
        senderId: userInfo.id,
        receiverId: this.data.elderId,
        senderType: 'children',
        content: content,
        messageType: 'text'
      },
      success: res => {
        wx.hideLoading()
        console.log('发送消息结果:', res.result)
        
        if (res.result && res.result.success) {
          wx.showToast({
            title: '发送成功',
            icon: 'success'
          })
          this.setData({
            messageContent: ''
          })
          this.loadHistoryMessages()
        } else {
          wx.showToast({
            title: res.result.message || '发送失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('发送消息失败:', err)
        wx.showToast({
          title: '发送失败，请重试',
          icon: 'none'
        })
      }
    })
  }
})
