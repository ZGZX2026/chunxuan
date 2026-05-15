const app = getApp()

Page({
  data: {
    timeRange: 'week',
    weekDays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    totalAIUsage: 0,
    totalAppOpen: 0,
    totalEmergency: 0,
    avgHealthScore: 0,
    aiUsageData: [0, 0, 0, 0, 0, 0, 0],
    appOpenData: [0, 0, 0, 0, 0, 0, 0],
    healthScoreData: [0, 0, 0, 0, 0, 0, 0],
    linkedElders: [],
    isLoading: true,
    userInfo: null
  },

  onShow: function() {
    this.checkLoginStatus()
    this.loadData()
  },

  onLoad: function() {
    this.checkLoginStatus()
    this.loadData()
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

  loadData: function() {
    if (!this.checkLoginStatus()) return

    this.setData({ isLoading: true })

    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'getGuardianRelations',
        childUserId: this.data.userInfo.id
      },
      success: res => {
        console.log('获取关联老人数据:', res.result)
        if (res.result && res.result.success) {
          const elders = res.result.data || []
          this.setData({
            linkedElders: elders
          })
          this.calculateTotalStats(elders)
        } else {
          this.setData({
            linkedElders: [],
            totalAIUsage: 0,
            totalAppOpen: 0,
            totalEmergency: 0,
            avgHealthScore: 0
          })
        }
        this.setData({ isLoading: false })
        this.drawLineChart()
        this.drawBarChart()
        this.drawHealthChart()
      },
      fail: err => {
        console.error('获取数据失败:', err)
        this.setData({
          isLoading: false,
          linkedElders: [],
          totalAIUsage: 0,
          totalAppOpen: 0,
          totalEmergency: 0,
          avgHealthScore: 0
        })
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        })
      }
    })
  },

  calculateTotalStats: function(elders) {
    let totalAI = 0
    let totalAppOpen = 0
    let totalEmergency = 0
    let healthScoreCount = 0
    let totalHealthScore = 0

    elders.forEach(elder => {
      totalAI += elder.ai_usage_count || 0
      totalAppOpen += elder.app_open_count || 0
      totalEmergency += elder.emergency_count || 0
      if (elder.health_score) {
        totalHealthScore += elder.health_score
        healthScoreCount++
      }
    })

    const avgHealth = healthScoreCount > 0 ? Math.round(totalHealthScore / healthScoreCount) : 0

    this.setData({
      totalAIUsage: totalAI,
      totalAppOpen: totalAppOpen,
      totalEmergency: totalEmergency,
      avgHealthScore: avgHealth,
      aiUsageData: [Math.floor(totalAI/7), Math.floor(totalAI/7), Math.floor(totalAI/7), Math.floor(totalAI/7), Math.floor(totalAI/7), Math.floor(totalAI/7), totalAI],
      appOpenData: [Math.floor(totalAppOpen/7), Math.floor(totalAppOpen/7), Math.floor(totalAppOpen/7), Math.floor(totalAppOpen/7), Math.floor(totalAppOpen/7), Math.floor(totalAppOpen/7), totalAppOpen],
      healthScoreData: [avgHealth, avgHealth, avgHealth, avgHealth, avgHealth, avgHealth, avgHealth]
    })
  },

  setTimeRange: function(e) {
    const range = e.currentTarget.dataset.range
    this.setData({ timeRange: range })
    this.loadData()
  },

  refreshData: function() {
    this.loadData()
  },

  drawLineChart: function() {
    const ctx = wx.createCanvasContext('lineChart')
    const data1 = this.data.aiUsageData
    const data2 = this.data.appOpenData
    const width = 620
    const height = 300
    const padding = 40
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    ctx.setFillStyle('#ffffff')
    ctx.fillRect(0, 0, width, height)

    ctx.setStrokeStyle('#EEEEEE')
    ctx.setLineWidth(1)
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    const maxValue = Math.max(...data1, ...data2, 1)
    const stepX = chartWidth / (data1.length - 1)

    ctx.setStrokeStyle('#4CAF50')
    ctx.setLineWidth(3)
    ctx.beginPath()
    data1.forEach((value, index) => {
      const x = padding + stepX * index
      const y = padding + chartHeight - (value / maxValue) * chartHeight
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    ctx.setStrokeStyle('#2196F3')
    ctx.setLineWidth(3)
    ctx.beginPath()
    data2.forEach((value, index) => {
      const x = padding + stepX * index
      const y = padding + chartHeight - (value / maxValue) * chartHeight
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    data1.forEach((value, index) => {
      const x = padding + stepX * index
      const y = padding + chartHeight - (value / maxValue) * chartHeight
      ctx.setFillStyle('#4CAF50')
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, 2 * Math.PI)
      ctx.fill()
    })

    data2.forEach((value, index) => {
      const x = padding + stepX * index
      const y = padding + chartHeight - (value / maxValue) * chartHeight
      ctx.setFillStyle('#2196F3')
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, 2 * Math.PI)
      ctx.fill()
    })

    ctx.draw()
  },

  drawBarChart: function() {
    const ctx = wx.createCanvasContext('barChart')
    const data = this.data.aiUsageData
    const width = 620
    const height = 280
    const padding = 40
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    ctx.setFillStyle('#ffffff')
    ctx.fillRect(0, 0, width, height)

    ctx.setStrokeStyle('#EEEEEE')
    ctx.setLineWidth(1)
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    const maxValue = Math.max(...data, 1)
    const barWidth = chartWidth / data.length * 0.6
    const gap = chartWidth / data.length * 0.4

    data.forEach((value, index) => {
      const x = padding + gap / 2 + (barWidth + gap) * index
      const barHeight = (value / maxValue) * chartHeight
      
      const gradient = ctx.createLinearGradient(x, padding + chartHeight - barHeight, x, padding + chartHeight)
      gradient.addColorStop(0, '#4CAF50')
      gradient.addColorStop(1, '#2E7D32')
      
      ctx.setFillStyle(gradient)
      ctx.beginPath()
      ctx.roundRect(x, padding + chartHeight - barHeight, barWidth, barHeight, 8)
      ctx.fill()
    })

    ctx.draw()
  },

  drawHealthChart: function() {
    const ctx = wx.createCanvasContext('healthChart')
    const data = this.data.healthScoreData
    const width = 620
    const height = 200
    const padding = 30
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    ctx.setFillStyle('#ffffff')
    ctx.fillRect(0, 0, width, height)

    const maxValue = 100
    const minValue = 60
    const stepX = chartWidth / (data.length - 1)

    ctx.setStrokeStyle('#FFEBEE')
    ctx.setFillStyle('#FFEBEE')
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, padding + chartHeight * (1 - (70 - minValue) / (maxValue - minValue)))
    ctx.lineTo(width - padding, padding + chartHeight * (1 - (70 - minValue) / (maxValue - minValue)))
    ctx.lineTo(width - padding, padding)
    ctx.closePath()
    ctx.fill()

    ctx.setStrokeStyle('#E8F5E9')
    ctx.setFillStyle('#E8F5E9')
    ctx.beginPath()
    ctx.moveTo(padding, padding + chartHeight * (1 - (70 - minValue) / (maxValue - minValue)))
    ctx.lineTo(padding, padding + chartHeight * (1 - (90 - minValue) / (maxValue - minValue)))
    ctx.lineTo(width - padding, padding + chartHeight * (1 - (90 - minValue) / (maxValue - minValue)))
    ctx.lineTo(width - padding, padding + chartHeight * (1 - (70 - minValue) / (maxValue - minValue)))
    ctx.closePath()
    ctx.fill()

    ctx.setStrokeStyle('#2196F3')
    ctx.setLineWidth(3)
    ctx.beginPath()
    data.forEach((value, index) => {
      const x = padding + stepX * index
      const y = padding + chartHeight * (1 - (value - minValue) / (maxValue - minValue))
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    data.forEach((value, index) => {
      const x = padding + stepX * index
      const y = padding + chartHeight * (1 - (value - minValue) / (maxValue - minValue))
      
      let color = '#2196F3'
      if (value >= 90) color = '#4CAF50'
      else if (value < 70) color = '#E53935'
      
      ctx.setFillStyle(color)
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, 2 * Math.PI)
      ctx.fill()
      
      ctx.setFillStyle('#ffffff')
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fill()
    })

    ctx.draw()
  },

  goHome: function() {
    wx.switchTab({ url: '/pages/children/home/index' })
  },

  goMessages: function() {
    wx.switchTab({ url: '/pages/children/messages/index' })
  },

  goProfile: function() {
    wx.switchTab({ url: '/pages/children/profile/index' })
  }
})
