const app = getApp()

const API_BASE = 'https://your-backend-api.com/api'
const DB_NAME = 'nodejs_demo'

Page({
  data: {
    userInfo: null,
    linkedElders: [],
    selectedElderId: null,
    
    aiAnalysis: {
      show: false,
      id: '',
      title: '',
      content: '',
      level: 'normal',
      levelText: '正常',
      time: ''
    },
    
    elderStats: {
      aiUsageCount: 0,
      appOpenCount: 0,
      emergencyCount: 0,
      healthScore: 85,
      appOpenTrend: 0,
      healthTrend: 0
    },
    
    todayDate: '',
    todayTimeline: [],
    unreadCount: 0
  },

  onShow: function() {
    this.checkLoginStatus()
    this.loadData()
  },

  onLoad: function() {
    this.checkLoginStatus()
    this.initData()
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
      return
    }
    this.setData({ userInfo })
  },

  initData: function() {
    const now = new Date()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    this.setData({
      todayDate: `${month}月${day}日`
    })
  },

  loadData: function() {
    this.fetchLinkedElders()
    this.fetchElderStats()
    this.fetchAIAnalysis()
    this.fetchTodayTimeline()
    this.fetchUnreadCount()
  },

  fetchLinkedElders: function() {
    const userInfo = this.data.userInfo
    if (!userInfo) return

    wx.request({
      url: `${API_BASE}/family/get_linked_elders`,
      method: 'POST',
      data: { childrenId: userInfo.id },
      success: (res) => {
        if (res.data.success) {
          const elders = res.data.data || this.getMockElders()
          this.setData({
            linkedElders: elders,
            selectedElderId: elders.length > 0 ? elders[0].id : null
          })
        }
      },
      fail: () => {
        this.setData({
          linkedElders: this.getMockElders(),
          selectedElderId: 'elder_001'
        })
      }
    })
  },

  getMockElders: function() {
    return [
      { id: 'elder_001', name: '爸爸', gender: 'male', phone: '13800138001', online: true, status: '活动正常' },
      { id: 'elder_002', name: '妈妈', gender: 'female', phone: '13800138002', online: true, status: '在家休息' }
    ]
  },

  fetchElderStats: function() {
    const elderId = this.data.selectedElderId
    if (!elderId) return

    wx.request({
      url: `${API_BASE}/stats/get_elder_stats`,
      method: 'POST',
      data: {
        elderId,
        date: new Date().toISOString().split('T')[0]
      },
      success: (res) => {
        if (res.data.success) {
          this.setData({ elderStats: res.data.data })
        }
      },
      fail: () => {
        this.setData({
          elderStats: {
            aiUsageCount: 12,
            appOpenCount: 5,
            emergencyCount: 0,
            healthScore: 88,
            appOpenTrend: 2,
            healthTrend: 3
          }
        })
      }
    })
  },

  fetchAIAnalysis: function() {
    const elderId = this.data.selectedElderId
    if (!elderId) return

    wx.request({
      url: `${API_BASE}/ai/get_latest_analysis`,
      method: 'POST',
      data: { elderId },
      success: (res) => {
        if (res.data.success && res.data.data) {
          this.setData({ aiAnalysis: { ...res.data.data, show: true } })
        }
      },
      fail: () => {
        this.setData({
          aiAnalysis: {
            show: true,
            id: 'analysis_001',
            title: '情绪状态分析',
            content: '今天心情不错，与小银对话活跃度较高。建议多陪伴老人，关注其心理健康。',
            level: 'good',
            levelText: '良好',
            time: '10分钟前'
          }
        })
      }
    })
  },

  fetchTodayTimeline: function() {
    const elderId = this.data.selectedElderId
    if (!elderId) return

    wx.request({
      url: `${API_BASE}/timeline/get_today`,
      method: 'POST',
      data: { elderId },
      success: (res) => {
        if (res.data.success) {
          this.setData({ todayTimeline: res.data.data })
        }
      },
      fail: () => {
        this.setData({
          todayTimeline: [
            { id: 1, time: '08:30', type: 'ai', typeText: 'AI陪伴', content: '询问了今天天气情况' },
            { id: 2, time: '09:15', type: 'health', typeText: '健康', content: '用药提醒已确认' },
            { id: 3, time: '10:00', type: 'ai', typeText: 'AI陪伴', content: '和小银聊天15分钟' },
            { id: 4, time: '11:30', type: 'activity', typeText: '活动', content: '打开小程序查看天气' }
          ]
        })
      }
    })
  },

  fetchUnreadCount: function() {
    const userInfo = this.data.userInfo
    wx.request({
      url: `${API_BASE}/message/get_unread_count`,
      method: 'POST',
      data: { childrenId: userInfo && userInfo.id ? userInfo.id : '' },
      success: (res) => {
        if (res.data.success) {
          this.setData({ unreadCount: res.data.count || 0 })
        }
      },
      fail: () => {
        this.setData({ unreadCount: 3 })
      }
    })
  },

  selectElder: function(e) {
    const elderId = e.currentTarget.dataset.id
    this.setData({ selectedElderId: elderId })
    this.fetchElderStats()
    this.fetchAIAnalysis()
    this.fetchTodayTimeline()
  },

  goToRelate: function() {
    wx.navigateTo({ url: '/pages/children/relate/index' })
  },

  showSettings: function() {
    wx.showActionSheet({
      itemList: ['通知设置', '隐私设置', '退出登录'],
      success: (res) => {
        if (res.tapIndex === 2) {
          this.handleLogout()
        }
      }
    })
  },

  handleLogout: function() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.globalData.childrenUserInfo = null
          wx.removeStorageSync('childrenUserInfo')
          wx.removeStorageSync('childrenToken')
          wx.redirectTo({ url: '/pages/children/login/index' })
        }
      }
    })
  },

  viewDetail: function(e) {
    const analysisId = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/children/analysis_detail/index?id=${analysisId}` })
  },

  dismissAnalysis: function() {
    this.setData({ 'aiAnalysis.show': false })
  },

  viewAllTimeline: function() {
    const elderId = this.data.selectedElderId
    wx.navigateTo({ url: `/pages/children/timeline/index?elderId=${elderId}` })
  },

  sendMessage: function() {
    const elderId = this.data.selectedElderId
    if (!elderId) {
      wx.showToast({ title: '请先选择老人', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/pages/children/chat/index?elderId=${elderId}` })
  },

  makeCall: function() {
    const elders = this.data.linkedElders
    if (elders.length === 0) {
      wx.showToast({ title: '暂无关联老人', icon: 'none' })
      return
    }

    const phones = elders.map(e => `${e.name}: ${e.phone}`)
    wx.showActionSheet({
      itemList: phones,
      success: (res) => {
        const elder = elders[res.tapIndex]
        wx.makePhoneCall({ phoneNumber: elder.phone })
      }
    })
  },

  viewHealth: function() {
    const elderId = this.data.selectedElderId
    wx.navigateTo({ url: `/pages/children/health_report/index?elderId=${elderId}` })
  },

  setReminder: function() {
    wx.navigateTo({ url: '/pages/children/set_reminder/index' })
  },

  goToData: function() {
    wx.navigateTo({ url: '/pages/children/data/index' })
  },

  goToMessages: function() {
    wx.navigateTo({ url: '/pages/children/messages/index' })
  },

  goToProfile: function() {
    wx.navigateTo({ url: '/pages/children/profile/index' })
  }
})