App({
  globalData: {
    userInfo: null,
    childrenUserInfo: null,
    isElder: true,
    guardianStatus: false,
    emergencyContacts: []
  },
  
  onLaunch: function () {
    console.log('App Launch')
    this.initCloud()
    this.loadUserData()
  },
  
  initCloud: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    
    wx.cloud.init({
      env: 'cloud1-d6gcu0cuh8b1242ea',
      traceUser: true
    })
  },
  
  loadUserData: function () {
    const userData = wx.getStorageSync('userData')
    if (userData) {
      if (userData.userType === 'children') {
        this.globalData.childrenUserInfo = userData
        this.globalData.isElder = false
      } else {
        this.globalData.userInfo = userData
        this.globalData.isElder = true
      }
    }
  },
  
  onShow: function () {
    console.log('App Show')
  },
  
  onHide: function () {
    console.log('App Hide')
  },

  setUserInfo: function(userInfo) {
    this.globalData.userInfo = userInfo
    this.globalData.isElder = userInfo ? true : false
    if (userInfo && userInfo.userType === 'elder') {
      this.globalData.childrenUserInfo = null
    }
  },

  setChildrenUserInfo: function(userInfo) {
    this.globalData.childrenUserInfo = userInfo
    this.globalData.isElder = userInfo ? false : true
    if (userInfo && userInfo.userType === 'children') {
      this.globalData.userInfo = null
    }
  },
  
  toggleGuardian: function(status) {
    this.globalData.guardianStatus = status
  }
})