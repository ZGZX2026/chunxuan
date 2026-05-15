const app = getApp()

Page({
  data: {
    currentTime: '',
    guardianStatus: false,
    guardianData: {
      duration: '0小时',
      alerts: '0次',
      accpanies: '0次'
    },
    medicineReminder: true,
    
    healthMonitoring: true,
    deviceInfo: {
      batteryLevel: '--',
      batteryStatus: '无法获取',
      networkType: '未知',
      screenBrightness: '--',
      deviceModel: '',
      systemVersion: '',
      isRealData: false
    },
    
    aiReminder: {
      show: false,
      title: '',
      text: ''
    },
    
    hasNewMessages: false,
    unreadMessageCount: 0,
    currentMessage: null,
    showMessageModal: false,
    
    isListening: false,
    isSpeaking: false,
    
    isLoggedIn: false,
    userInfo: null,
    
    guardianStartTime: null,
    aiUsageCount: 0,
    emergencyCount: 0,
    
    lastBatteryWarningTime: 0,
    lastNetworkWarningTime: 0
  },

  onShow: function () {
    this.checkLoginStatus()
  },

  onLoad: function () {
    this.checkLoginStatus()
    this.innerAudioContext = null
  },

  onUnload: function () {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
    }
    if (this.timeInterval) {
      clearInterval(this.timeInterval)
    }
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval)
    }
    if (this.messageInterval) {
      clearInterval(this.messageInterval)
    }
  },

  checkLoginStatus: function () {
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      this.setData({
        isLoggedIn: false,
        userInfo: null
      })
      return
    }
    
    this.setData({
      isLoggedIn: true,
      userInfo: userInfo
    })
    
    this.updateTime()
    this.startTimeUpdate()
    
    this.loadGuardianData()
    this.startDeviceMonitoring()
    this.startAutoReminder()
    this.startMessagePolling()
  },

  startTimeUpdate: function () {
    this.timeInterval = setInterval(() => {
      this.updateTime()
    }, 1000)
  },

  updateTime: function () {
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    const seconds = now.getSeconds().toString().padStart(2, '0')
    this.setData({
      currentTime: `${hours}:${minutes}:${seconds}`
    })
    
    this.updateGuardianDuration()
  },

  updateGuardianDuration: function () {
    if (!this.data.guardianStartTime) {
      return
    }
    
    const start = new Date(this.data.guardianStartTime)
    const now = new Date()
    const diffMs = now - start
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    let durationText = ''
    if (hours > 0) {
      durationText = hours + '小时' + minutes + '分钟'
    } else {
      durationText = minutes + '分钟'
    }
    
    this.setData({
      guardianData: Object.assign({}, this.data.guardianData, {
        duration: durationText
      })
    })
  },

  loadGuardianData: function () {
    if (!this.data.userInfo) return
    
    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'getStats',
        userId: this.data.userInfo.id
      },
      success: res => {
        if (res.result && res.result.success && res.result.data) {
          const stats = res.result.data
          this.setData({
            guardianData: {
              duration: this.data.guardianData.duration || '0小时',
              alerts: (stats.emergency_count || 0) + '次',
              accpanies: (stats.ai_usage_count || 0) + '次'
            },
            aiUsageCount: stats.ai_usage_count || 0,
            emergencyCount: stats.emergency_count || 0
          })
        } else {
          this.initGuardianData()
        }
      },
      fail: err => {
        console.error('获取统计数据失败:', err)
        this.initGuardianData()
      }
    })
  },

  initGuardianData: function () {
    if (!this.data.userInfo) return
    
    const now = new Date().toISOString()
    this.setData({
      guardianStartTime: now
    })
    
    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'updateStats',
        userId: this.data.userInfo.id,
        callCount: 0,
        appOpenCount: 1,
        aiUsageCount: 0,
        emergencyCount: 0
      },
      success: res => {
        console.log('初始化统计数据成功')
      }
    })
  },

  callDatabaseAPI: function (action, data) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'mysql',
        data: Object.assign({ action: action }, data),
        success: res => {
          if (res.result && res.result.success) {
            resolve(res.result)
          } else {
            reject(res.result || { message: '操作失败' })
          }
        },
        fail: err => {
          console.error('数据库操作失败:', err)
          reject({ message: '网络错误' })
        }
      })
    })
  },

  startDeviceMonitoring: function () {
    this.setData({ healthMonitoring: true })
    this.fetchDeviceInfo()
    
    this.monitorInterval = setInterval(() => {
      this.fetchDeviceInfo()
      this.checkHealthStatus()
    }, 10000)
  },

  fetchDeviceInfo: function () {
    const deviceInfo = {}
    
    wx.getDeviceInfo({
      success: (res) => {
        deviceInfo.deviceModel = res.deviceModel || '未知设备'
        deviceInfo.systemVersion = res.system || '未知系统'
      },
      fail: () => {
        deviceInfo.deviceModel = '获取失败'
        deviceInfo.systemVersion = '获取失败'
      }
    })
    
    wx.getSystemInfo({
      success: (res) => {
        deviceInfo.screenBrightness = Math.round((res.screenBrightness || 0) * 100) + '%'
        deviceInfo.deviceModel = deviceInfo.deviceModel || res.model || '未知设备'
        deviceInfo.systemVersion = deviceInfo.systemVersion || res.system || '未知系统'
      },
      fail: () => {
        deviceInfo.screenBrightness = '获取失败'
      }
    })
    
    wx.getNetworkType({
      success: (res) => {
        deviceInfo.networkType = this.getNetworkTypeName(res.networkType)
      },
      fail: () => {
        deviceInfo.networkType = '未知'
      }
    })
    
    wx.getBatteryInfo({
      success: (res) => {
        deviceInfo.batteryLevel = res.level + '%'
        deviceInfo.batteryStatus = res.isCharging ? '充电中' : '使用电池'
        deviceInfo.isRealData = true
      },
      fail: () => {
        deviceInfo.batteryLevel = '不支持'
        deviceInfo.batteryStatus = '无法获取'
      }
    })
    
    this.setData({
      deviceInfo: deviceInfo
    })
  },

  getNetworkTypeName: function (type) {
    const typeMap = {
      'wifi': 'WiFi',
      '4g': '4G',
      '5g': '5G',
      '3g': '3G',
      '2g': '2G',
      'unknown': '未知',
      'none': '无网络'
    }
    return typeMap[type] || '未知'
  },

  checkHealthStatus: function () {
    const deviceInfo = this.data.deviceInfo
    const currentHour = new Date().getHours()
    const now = Date.now()
    
    const batteryLevel = parseInt(deviceInfo.batteryLevel) || 100
    
    if (batteryLevel < 20) {
      if (now - this.data.lastBatteryWarningTime > 600000) {
        this.showAIreminder('电量警告', `您的设备电量只有${deviceInfo.batteryLevel}，请及时充电！`)
        this.logEmergency('电量警告', `电量过低: ${deviceInfo.batteryLevel}`)
        this.setData({ lastBatteryWarningTime: now })
      }
    } else if (batteryLevel < 40) {
      this.showAIreminder('电量提醒', `您的设备电量还有${deviceInfo.batteryLevel}，建议尽快充电`)
    }
    
    if (deviceInfo.networkType === '无网络') {
      if (now - this.data.lastNetworkWarningTime > 600000) {
        this.showAIreminder('网络警告', '您的设备当前没有网络连接，请检查网络设置')
        this.logEmergency('网络警告', '网络断开')
        this.setData({ lastNetworkWarningTime: now })
      }
    }
    
    if (currentHour >= 23 || currentHour < 6) {
      this.showAIreminder('休息提醒', '夜深了，请注意休息，保持充足的睡眠对健康很重要')
    } else if (currentHour >= 12 && currentHour < 14) {
      this.showAIreminder('午休提醒', '中午好！建议您休息一会儿，下午精神更好')
    }
  },

  logEmergency: function (type, detail) {
    if (!this.data.userInfo) return
    
    const newCount = this.data.emergencyCount + 1
    this.setData({
      emergencyCount: newCount
    })
    
    this.callDatabaseAPI('logUsage', {
      userId: this.data.userInfo.id,
      actionType: 'emergency',
      actionDetail: type + ': ' + detail
    })
    
    this.callDatabaseAPI('updateStats', {
      userId: this.data.userInfo.id,
      emergencyCount: newCount
    })
  },

  showAIreminder: function (title, text) {
    if (this.data.aiReminder.show && this.data.aiReminder.title === title) {
      return
    }
    
    this.setData({
      aiReminder: {
        show: true,
        title: title,
        text: text
      }
    })
    
    this.speakText(text)
  },

  acknowledgeReminder: function () {
    this.setData({
      aiReminder: {
        show: false,
        title: '',
        text: ''
      }
    })
  },

  startAutoReminder: function () {
    this.reminderInterval = setInterval(() => {
      this.checkAutoReminder()
    }, 60000)
  },

  checkAutoReminder: function () {
    if (this.data.medicineReminder) {
      const currentHour = new Date().getHours()
      const currentMinute = new Date().getMinutes()
      
      if (currentHour === 8 && currentMinute === 0) {
        this.showAIreminder('早提醒', '早上好！该起床活动一下了，记得吃早餐和服药')
      }
      if (currentHour === 12 && currentMinute === 0) {
        this.showAIreminder('午提醒', '中午好！该吃午饭了，记得按时服药')
      }
      if (currentHour === 20 && currentMinute === 0) {
        this.showAIreminder('晚提醒', '晚上好！该休息了，记得按时服药')
      }
    }
  },

  goToLogin: function () {
    wx.navigateTo({
      url: '/pages/login/index'
    })
  },

  logout: function () {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmText: '确定',
      confirmColor: '#E53935',
      success: (res) => {
        if (res.confirm) {
          app.setUserInfo(null)
          wx.removeStorageSync('userData')
          
          if (this.monitorInterval) clearInterval(this.monitorInterval)
          if (this.timeInterval) clearInterval(this.timeInterval)
          if (this.reminderInterval) clearInterval(this.reminderInterval)
          if (this.messageInterval) clearInterval(this.messageInterval)
          
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            guardianStatus: false,
            medicineReminder: true,
            healthMonitoring: false,
            aiReminder: { show: false, title: '', text: '' },
            lastBatteryWarningTime: 0,
            lastNetworkWarningTime: 0
          })
          
          wx.showToast({ title: '已退出登录', icon: 'success', duration: 1500 })
          
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/login/index' })
          }, 1500)
        }
      }
    })
  },

  openGuardian: function () {
    const newStatus = !this.data.guardianStatus
    
    this.setData({
      guardianStatus: newStatus
    })
    
    app.toggleGuardian(newStatus)
    
    if (newStatus) {
      const now = new Date().toISOString()
      this.setData({
        guardianStartTime: now
      })
      
      wx.showToast({
        title: '守护已开启',
        icon: 'success',
        duration: 1500
      })
    } else {
      wx.showToast({
        title: '守护已关闭',
        icon: 'success',
        duration: 1500
      })
    }
  },

  handleEmergency: function () {
    this.logEmergency('紧急呼叫', '用户触发了紧急呼叫')
    
    const newCount = this.data.emergencyCount + 1
    this.setData({
      emergencyCount: newCount,
      guardianData: Object.assign({}, this.data.guardianData, {
        alerts: newCount + '次'
      })
    })
    
    wx.showModal({
      title: '紧急呼叫',
      content: '已通知家人和紧急联系人！',
      showCancel: false,
      confirmText: '知道了'
    })
    
    this.speakText('紧急呼叫已触发，已通知家人和紧急联系人')
  },

  confirmMedicine: function () {
    this.setData({ medicineReminder: false })
    this.speakText('已确认用药提醒')
    wx.showToast({ title: '已确认', icon: 'success', duration: 1500 })
  },

  speakReminder: function (e) {
    const type = e.currentTarget.dataset.type
    if (type === 'medicine') {
      this.speakText('用药提醒，该吃降压药了，每天2次，每次1片')
    } else if (type === 'ai') {
      const text = this.data.aiReminder.title + '，' + this.data.aiReminder.text
      this.speakText(text)
    }
  },

  callSon: function () {
    wx.makePhoneCall({
      phoneNumber: '13800138000',
      success: () => {
        this.logCall('儿子')
      }
    })
  },

  callDaughter: function () {
    wx.makePhoneCall({
      phoneNumber: '13900139000',
      success: () => {
        this.logCall('女儿')
      }
    })
  },

  logCall: function (relation) {
    if (!this.data.userInfo) return
    
    this.callDatabaseAPI('logUsage', {
      userId: this.data.userInfo.id,
      actionType: 'call',
      actionDetail: '拨打给' + relation
    })
    
    wx.showToast({
      title: '正在拨打...',
      icon: 'success',
      duration: 1500
    })
  },

  openChat: function () {
    wx.navigateTo({
      url: '/pages/elder/chat'
    })
  },

  voiceControl: function () {
    wx.showToast({
      title: '语音控制功能开发中',
      icon: 'none'
    })
  },

  speakText: function (text) {
    if (this.data.isSpeaking) {
      return
    }
    
    this.setData({ isSpeaking: true })
    
    if (!this.innerAudioContext) {
      this.innerAudioContext = wx.createInnerAudioContext()
      this.innerAudioContext.onEnded(() => {
        this.setData({ isSpeaking: false })
      })
      this.innerAudioContext.onError(() => {
        this.setData({ isSpeaking: false })
      })
    }
    
    wx.cloud.callFunction({
      name: 'tts',
      data: {
        text: text
      },
      success: res => {
        if (res.result && res.result.audioUrl) {
          this.innerAudioContext.src = res.result.audioUrl
          this.innerAudioContext.play()
        } else {
          this.setData({ isSpeaking: false })
        }
      },
      fail: () => {
        this.setData({ isSpeaking: false })
      }
    })
  },

  incrementAIUsage: function () {
    if (!this.data.userInfo) return
    
    const newCount = this.data.aiUsageCount + 1
    this.setData({
      aiUsageCount: newCount,
      guardianData: Object.assign({}, this.data.guardianData, {
        accpanies: newCount + '次'
      })
    })
    
    this.callDatabaseAPI('updateStats', {
      userId: this.data.userInfo.id,
      aiUsageCount: newCount
    })
  },

  startMessagePolling: function () {
    this.checkNewMessages()
    
    this.messageInterval = setInterval(() => {
      this.checkNewMessages()
    }, 15000)
  },

  checkNewMessages: function () {
    const userInfo = this.data.userInfo
    if (!userInfo) return

    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'getUnreadMessagesForElder',
        elderUserId: userInfo.id
      },
      success: res => {
        console.log('检查新消息:', res.result)
        if (res.result && res.result.success && res.result.data) {
          const messages = res.result.data
          if (messages.length > 0) {
            const latestMessage = messages[0]
            this.setData({
              hasNewMessages: true,
              unreadMessageCount: messages.length,
              currentMessage: latestMessage,
              showMessageModal: true
            })
            
            this.speakText('您有新消息：' + latestMessage.content)
            
            wx.showModal({
              title: '📨 新消息',
              content: latestMessage.content,
              confirmText: '我知道了',
              cancelText: '稍后查看',
              success: (res) => {
                if (res.confirm) {
                  this.confirmMessage(latestMessage.id)
                }
              }
            })
          }
        }
      },
      fail: err => {
        console.error('检查新消息失败:', err)
      }
    })
  },

  confirmMessage: function (messageId) {
    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'confirmMessage',
        messageId: messageId,
        elderUserId: this.data.userInfo.id
      },
      success: res => {
        console.log('确认消息:', res.result)
        this.setData({
          showMessageModal: false,
          hasNewMessages: false
        })
        
        wx.cloud.callFunction({
          name: 'mysql',
          data: {
            action: 'sendMessage',
            senderId: this.data.userInfo.id,
            receiverId: this.data.currentMessage.sender_id,
            senderType: 'elder',
            content: '我已收到消息，谢谢！',
            messageType: 'confirm'
          },
          success: res => {
            console.log('发送确认消息:', res.result)
            wx.showToast({
              title: '已回复',
              icon: 'success'
            })
          }
        })
      },
      fail: err => {
        console.error('确认消息失败:', err)
      }
    })
  }
})
