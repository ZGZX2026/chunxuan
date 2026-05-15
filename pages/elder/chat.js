const app = getApp()

Page({
  data: {
    messageList: [],
    inputText: '',
    scrollTopValue: 0,
    isLoggedIn: false,
    isLoading: false,
    isListening: false,
    currentSpeakingId: null,
    isSpeaking: false,
    scrollKey: 0
  },

  onShow: function () {
    this.checkLoginStatus()
  },

  onLoad: function () {
    this.checkLoginStatus()
    this.innerAudioContext = null
    this.typingIntervals = {}
    this.scrollTimer = null
  },

  checkLoginStatus: function () {
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      this.setData({
        isLoggedIn: false,
        messageList: []
      })
      return
    }
    
    this.setData({
      isLoggedIn: true
    })
  },

  onInput: function (e) {
    this.setData({
      inputText: e.detail.value
    })
  },

  sendText: function () {
    const text = this.data.inputText.trim()
    if (!text) return
    if (this.data.isLoading) return
    
    this.addUserMessage(text)
    this.setData({ inputText: '' })
    this.callZhipuAPI(text)
  },

  addUserMessage: function (content) {
    const newMessage = {
      id: Date.now(),
      role: 'user',
      content: content,
      botContent: '',
      displayContent: ''
    }
    this.setData({
      messageList: [...this.data.messageList, newMessage]
    })
    
    setTimeout(() => {
      this.scrollToBottom()
    }, 50)
  },

  scrollToBottom: function () {
    const newKey = this.data.scrollKey + 1
    this.setData({
      scrollKey: newKey,
      scrollTopValue: newKey * 999999
    })
  },

  toggleVoice: function () {
    if (this.data.isListening) {
      this.stopVoice()
    } else {
      this.startVoice()
    }
  },

  startVoice: function () {
    this.setData({ isListening: true })
    
    wx.showToast({
      title: '正在听...',
      icon: 'none',
      duration: 5000
    })

    setTimeout(() => {
      this.simulateVoiceResult()
    }, 3000)
  },

  stopVoice: function () {
    this.setData({ isListening: false })
    wx.hideToast()
  },

  simulateVoiceResult: function () {
    this.setData({ isListening: false })
    wx.hideToast()
    
    const voiceInputs = [
      '今天天气怎么样',
      '给我讲个笑话',
      '讲个故事',
      '今天新闻'
    ]
    
    const randomInput = voiceInputs[Math.floor(Math.random() * voiceInputs.length)]
    this.addUserMessage(randomInput)
    this.callZhipuAPI(randomInput)
  },

  sendQuickTag: function (e) {
    const tag = e.currentTarget.dataset.tag
    this.addUserMessage(tag)
    this.callZhipuAPI(tag)
  },

  callZhipuAPI: function (message) {
    this.setData({ isLoading: true })
    
    wx.showLoading({
      title: '小银思考中...'
    })
    
    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'chatAI',
        message: message,
        provider: 'zhipu',
        temperature: 0.7,
        max_tokens: 2048
      },
      success: (res) => {
        wx.hideLoading()
        this.setData({ isLoading: false })
        
        console.log('AI响应:', res.result)
        
        if (res.result && res.result.success && res.result.data) {
          const response = res.result.data.content
          this.typeWriterEffect(response)
          this.updateAIUsage()
        } else if (res.result && res.result.error) {
          this.showInstantResponse('服务暂时不可用，请稍后再试。')
        } else {
          this.showInstantResponse('抱歉，我没能理解您的意思。')
        }
      },
      fail: (err) => {
        wx.hideLoading()
        this.setData({ isLoading: false })
        console.error('API调用失败:', err)
        this.showInstantResponse('网络连接失败，请稍后重试。')
      }
    })
  },

  showInstantResponse: function (content) {
    const messageList = [...this.data.messageList]
    if (messageList.length === 0) return
    
    const lastMessage = messageList[messageList.length - 1]
    lastMessage.botContent = content
    lastMessage.displayContent = content
    
    this.setData({
      messageList: messageList
    })
    
    setTimeout(() => {
      this.scrollToBottom()
    }, 50)
  },

  typeWriterEffect: function (fullText) {
    const messageList = [...this.data.messageList]
    if (messageList.length === 0) return
    
    const lastMessage = messageList[messageList.length - 1]
    const messageId = lastMessage.id
    lastMessage.botContent = ''
    lastMessage.displayContent = ''
    
    this.setData({
      messageList: messageList
    })
    
    let index = 0
    const charInterval = 80
    
    const intervalId = setInterval(() => {
      if (index < fullText.length) {
        const currentText = fullText.substring(0, index + 1)
        
        const newMessageList = this.data.messageList.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, botContent: currentText, displayContent: currentText }
          }
          return msg
        })
        
        this.setData({
          messageList: newMessageList
        })
        
        if (index % 5 === 0) {
          setTimeout(() => {
            this.scrollToBottom()
          }, 10)
        }
        
        index++
      } else {
        clearInterval(intervalId)
        
        const finalMessageList = this.data.messageList.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, botContent: fullText, displayContent: fullText }
          }
          return msg
        })
        
        this.setData({
          messageList: finalMessageList
        })
        
        setTimeout(() => {
          this.scrollToBottom()
        }, 50)
      }
    }, charInterval)
    
    this.typingIntervals[messageId] = intervalId
  },

  speakMessage: function (e) {
    const content = e.currentTarget.dataset.content
    const messageId = e.currentTarget.dataset.id
    
    if (this.data.currentSpeakingId === messageId) {
      this.stopSpeaking()
      return
    }
    
    if (this.data.isSpeaking) {
      this.stopSpeaking()
    }
    
    this.setData({
      currentSpeakingId: messageId,
      isSpeaking: true
    })
    
    this.playVoice(content)
  },

  playVoice: function (text) {
    try {
      if (!this.innerAudioContext) {
        this.innerAudioContext = wx.createInnerAudioContext()
      }
      
      this.innerAudioContext.onEnded(() => {
        this.stopSpeaking()
      })
      
      this.innerAudioContext.onError((err) => {
        console.error('Audio play error:', err)
        this.stopSpeaking()
        wx.showToast({
          title: '朗读失败，请检查网络',
          icon: 'none',
          duration: 2000
        })
      })
      
      const voiceUrl = `https://tts.baidu.com/text2audio?tex=${encodeURIComponent(text)}&cuid=baike&lan=ZH&ctp=1&pdt=301&vol=9&rate=32&per=0`
      
      this.innerAudioContext.src = voiceUrl
      this.innerAudioContext.play()
      
    } catch (err) {
      console.error('Play voice error:', err)
      this.stopSpeaking()
      wx.showToast({
        title: '朗读失败',
        icon: 'none'
      })
    }
  },

  stopSpeaking: function () {
    try {
      if (this.innerAudioContext) {
        this.innerAudioContext.stop()
      }
    } catch (err) {
      console.error('Stop speaking error:', err)
    }
    
    this.setData({
      currentSpeakingId: null,
      isSpeaking: false
    })
  },

  copyMessage: function (e) {
    const content = e.currentTarget.dataset.content
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        })
      }
    })
  },

  goToLogin: function () {
    wx.navigateTo({
      url: '/pages/login/index'
    })
  },

  goBack: function () {
    wx.navigateBack()
  },

  onUnload: function () {
    if (this.innerAudioContext) {
      this.innerAudioContext.destroy()
    }
    
    for (let key in this.typingIntervals) {
      clearInterval(this.typingIntervals[key])
    }
    
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer)
    }
  },

  updateAIUsage: function () {
    const userInfo = app.globalData.userInfo
    if (!userInfo) return
    
    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'updateStats',
        userId: userInfo.id,
        aiUsageCount: 1
      },
      success: res => {
        console.log('AI使用次数已更新')
      },
      fail: err => {
        console.error('更新AI使用次数失败:', err)
      }
    })
  }
})