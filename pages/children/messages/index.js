const app = getApp()

Page({
  data: {
    activeTab: 'all',
    messages: [],
    filteredMessages: [],
    showDetail: false,
    selectedMessage: null,
    allCount: 0,
    elderCount: 0,
    aiCount: 0,
    userInfo: null,
    isLoading: true,
    linkedElders: [],
    aiAnalysis: []
  },

  onShow: function() {
    this.checkLoginStatus()
    this.loadMessages()
    this.loadLinkedElders()
    this.loadAiAnalysis()
  },

  onLoad: function() {
    this.checkLoginStatus()
    this.loadMessages()
    this.loadLinkedElders()
    this.loadAiAnalysis()
  },

  checkLoginStatus: function() {
    const userInfo = app.globalData.childrenUserInfo
    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.reLaunch({ url: '/pages/login/index' })
        }
      })
      return false
    }
    this.setData({
      userInfo: userInfo
    })
    return true
  },

  loadLinkedElders: function() {
    const userInfo = this.data.userInfo
    if (!userInfo) return

    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'getGuardianRelations',
        childUserId: userInfo.id
      },
      success: res => {
        if (res.result && res.result.success) {
          this.setData({
            linkedElders: res.result.data || []
          })
        }
      }
    })
  },

  loadMessages: function() {
    const userInfo = this.data.userInfo
    if (!userInfo) return

    this.setData({ isLoading: true })

    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'getMessagesForChild',
        childUserId: userInfo.id
      },
      success: res => {
        console.log('获取消息:', res.result)
        this.setData({ isLoading: false })
        
        if (res.result && res.result.success) {
          const messages = res.result.data || []
          this.processMessages(messages)
        } else {
          this.processMessages([])
        }
      },
      fail: err => {
        console.error('获取消息失败:', err)
        this.setData({ isLoading: false })
        this.processMessages([])
      }
    })
  },

  loadAiAnalysis: function() {
    const userInfo = this.data.userInfo
    if (!userInfo) return

    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'getAiAnalysisForChild',
        childUserId: userInfo.id
      },
      success: res => {
        console.log('获取AI分析:', res.result)
        if (res.result && res.result.success) {
          this.setData({
            aiAnalysis: res.result.data || []
          })
        }
      },
      fail: err => {
        console.error('获取AI分析失败:', err)
      }
    })
  },

  processMessages: function(messages) {
    const elderCount = messages.filter(m => m.sender_type === 'elder' && !m.is_read).length
    const aiCount = messages.filter(m => m.sender_type === 'ai' && !m.is_read).length
    
    this.setData({
      messages,
      filteredMessages: messages,
      allCount: elderCount + aiCount,
      elderCount,
      aiCount
    })
  },

  setTab: function(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    
    let filtered = this.data.messages
    if (tab === 'elder') {
      filtered = filtered.filter(m => m.sender_type === 'elder')
    } else if (tab === 'ai') {
      filtered = filtered.filter(m => m.sender_type === 'ai')
    }
    
    this.setData({ filteredMessages: filtered })
  },

  viewMessage: function(e) {
    const id = e.currentTarget.dataset.id
    const message = this.data.messages.find(m => m.id === id)
    
    if (message) {
      this.markAsRead(id)
      this.setData({
        selectedMessage: message,
        showDetail: true
      })
    }
  },

  markAsRead: function(id) {
    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'markMessageRead',
        messageId: id
      },
      success: res => {
        console.log('标记已读:', res.result)
      }
    })
    
    const messages = this.data.messages.map(m => {
      if (m.id === id) {
        return { ...m, is_read: 1 }
      }
      return m
    })
    
    const elderCount = messages.filter(m => m.sender_type === 'elder' && !m.is_read).length
    const aiCount = messages.filter(m => m.sender_type === 'ai' && !m.is_read).length
    
    this.setData({
      messages,
      filteredMessages: this.data.filteredMessages.map(m => m.id === id ? { ...m, is_read: 1 } : m),
      allCount: elderCount + aiCount,
      elderCount,
      aiCount
    })
  },

  markAllRead: function() {
    const messages = this.data.messages.map(m => ({ ...m, is_read: 1 }))
    
    this.setData({
      messages,
      filteredMessages: this.data.filteredMessages.map(m => ({ ...m, is_read: 1 })),
      allCount: 0,
      elderCount: 0,
      aiCount: 0
    })

    wx.showToast({ title: '已全部标记为已读', icon: 'success' })
  },

  closeDetail: function() {
    this.setData({ showDetail: false, selectedMessage: null })
  },

  stopPropagation: function() {},

  handleMessage: function() {
    const message = this.data.selectedMessage
    
    if (message && message.sender_type === 'elder') {
      wx.showActionSheet({
        itemList: ['打电话', '回复消息'],
        success: (res) => {
          if (res.tapIndex === 0) {
            wx.makePhoneCall({ phoneNumber: message.sender_phone || '13800138000' })
          } else if (res.tapIndex === 1) {
            wx.navigateTo({
              url: '/pages/children/send_message/index?elderId=' + message.sender_id
            })
          }
          this.closeDetail()
        }
      })
    }
  },

  sendMessage: function() {
    const elders = this.data.linkedElders
    
    if (elders.length === 0) {
      wx.showModal({
        title: '提示',
        content: '您还未关联任何老人，请先在"关联"页面添加关联',
        showCancel: false
      })
      return
    }

    const choices = elders.map(e => e.elder_name + ' (' + e.elder_phone + ')')
    
    wx.showActionSheet({
      itemList: choices,
      success: (res) => {
        if (res.tapIndex >= 0) {
          const elder = elders[res.tapIndex]
          wx.navigateTo({
            url: '/pages/children/send_message/index?elderId=' + elder.elder_user_id + '&elderName=' + elder.elder_name
          })
        }
      }
    })
  },

  getElderName: function(elderId) {
    const elder = this.data.linkedElders.find(e => e.elder_user_id === elderId)
    return elder ? elder.elder_name : '未知老人'
  },

  goHome: function() {
    wx.switchTab({ url: '/pages/children/home/index' })
  },

  goData: function() {
    wx.switchTab({ url: '/pages/children/data/index' })
  },

  goRelate: function() {
    wx.switchTab({ url: '/pages/children/relate/index' })
  },

  goProfile: function() {
    wx.switchTab({ url: '/pages/children/profile/index' })
  }
})