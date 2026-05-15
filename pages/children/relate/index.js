const app = getApp()

Page({
  data: {
    searchKeyword: '',
    searchResults: [],
    showSearchResults: false,
    linkedElders: [],
    selectedElder: null,
    showConfirmModal: false,
    userInfo: null,
    isSearching: false,
    isLoading: true
  },

  onShow: function() {
    this.checkLoginStatus()
    this.fetchLinkedElders()
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

  onSearchInput: function(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  searchElder: function() {
    const keyword = this.data.searchKeyword.trim()
    
    if (!keyword) {
      wx.showToast({
        title: '请输入手机号或姓名',
        icon: 'none'
      })
      return
    }

    this.setData({ isSearching: true, showSearchResults: true })

    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'searchElder',
        keyword: keyword
      },
      success: res => {
        console.log('搜索结果:', res.result)
        this.setData({ isSearching: false })
        
        if (res.result && res.result.success) {
          this.setData({
            searchResults: res.result.data || []
          })
          
          if (res.result.data && res.result.data.length === 0) {
            wx.showToast({
              title: '未找到相关老人',
              icon: 'none'
            })
          }
        } else {
          this.setData({
            searchResults: []
          })
          wx.showToast({
            title: '搜索失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        console.error('搜索失败:', err)
        this.setData({ 
          isSearching: false,
          searchResults: []
        })
        wx.showToast({
          title: '搜索失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  selectElder: function(e) {
    const elder = e.currentTarget.dataset.elder
    this.setData({
      selectedElder: elder,
      showConfirmModal: true,
      showSearchResults: false
    })
  },

  closeConfirmModal: function() {
    this.setData({
      showConfirmModal: false,
      selectedElder: null
    })
  },

  confirmRelate: function() {
    const elder = this.data.selectedElder
    const userInfo = this.data.userInfo

    if (!elder || !userInfo) return

    wx.showLoading({ title: '关联中...' })

    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'addGuardianRelation',
        childUserId: userInfo.id,
        elderUserId: elder.id,
        relationName: elder.nickname
      },
      success: res => {
        wx.hideLoading()
        console.log('关联结果:', res.result)
        
        if (res.result && res.result.success) {
          wx.showToast({
            title: '关联成功',
            icon: 'success'
          })
          this.setData({
            showConfirmModal: false,
            selectedElder: null,
            searchKeyword: '',
            searchResults: [],
            showSearchResults: false
          })
          this.fetchLinkedElders()
        } else {
          wx.showToast({
            title: res.result.message || '关联失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('关联失败:', err)
        wx.showToast({
          title: '关联失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  fetchLinkedElders: function() {
    const userInfo = this.data.userInfo
    if (!userInfo) return

    this.setData({ isLoading: true })

    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'getGuardianRelations',
        childUserId: userInfo.id
      },
      success: res => {
        console.log('获取关联老人:', res.result)
        this.setData({ isLoading: false })
        
        if (res.result && res.result.success) {
          this.setData({
            linkedElders: res.result.data || []
          })
        } else {
          this.setData({
            linkedElders: []
          })
        }
      },
      fail: err => {
        console.error('获取关联老人失败:', err)
        this.setData({ 
          isLoading: false,
          linkedElders: []
        })
      }
    })
  },

  unlinkElder: function(e) {
    const elder = e.currentTarget.dataset.elder

    wx.showModal({
      title: '解除关联',
      content: `确定要解除与"${elder.elder_name}"的关联吗？`,
      success: (res) => {
        if (res.confirm) {
          this.doUnlink(elder.id)
        }
      }
    })
  },

  doUnlink: function(relationId) {
    wx.showLoading({ title: '解除中...' })

    wx.cloud.callFunction({
      name: 'mysql',
      data: {
        action: 'removeGuardianRelation',
        relationId: relationId
      },
      success: res => {
        wx.hideLoading()
        console.log('解除关联结果:', res.result)
        
        if (res.result && res.result.success) {
          wx.showToast({
            title: '已解除关联',
            icon: 'success'
          })
          this.fetchLinkedElders()
        } else {
          wx.showToast({
            title: '解除失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('解除关联失败:', err)
        wx.showToast({
          title: '解除失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  goHome: function() {
    wx.switchTab({ url: '/pages/children/home/index' })
  },

  goData: function() {
    wx.switchTab({ url: '/pages/children/data/index' })
  },

  goMessages: function() {
    wx.switchTab({ url: '/pages/children/messages/index' })
  },

  goProfile: function() {
    wx.switchTab({ url: '/pages/children/profile/index' })
  }
})
