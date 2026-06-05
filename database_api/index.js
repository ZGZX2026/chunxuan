const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const MAX_LIMIT = 100

exports.main = async (event, context) => {
  const { action, params } = event
  
  try {
    switch (action) {
      case 'get_linked_elders':
        return await getLinkedElders(params)
      case 'get_elder_stats':
        return await getElderStats(params)
      case 'record_ai_usage':
        return await recordAIUsage(params)
      case 'record_app_open':
        return await recordAppOpen(params)
      case 'record_emergency':
        return await recordEmergency(params)
      case 'save_ai_analysis':
        return await saveAIAnalysis(params)
      case 'get_latest_analysis':
        return await getLatestAnalysis(params)
      case 'request_relate':
        return await requestRelate(params)
      case 'confirm_relate':
        return await confirmRelate(params)
      case 'unlink_elder':
        return await unlinkElder(params)
      case 'get_today_timeline':
        return await getTodayTimeline(params)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (err) {
    console.error('Database API Error:', err)
    return { success: false, message: err.message }
  }
}

async function getLinkedElders(params) {
  const { childrenId } = params
  
  try {
    const relations = await db.collection('parent_child_relations')
      .where({
        childrenId,
        status: 'active'
      })
      .get()
    
    const elderIds = relations.data.map(r => r.elderId)
    
    if (elderIds.length === 0) {
      return { success: true, data: [] }
    }
    
    const elders = await db.collection('users')
      .where({
        _id: db.command.in(elderIds),
        userType: 'elder'
      })
      .field({
        _id: true,
        nickname: true,
        phone: true,
        avatar: true
      })
      .get()
    
    const result = relations.data.map(relation => {
      const elder = elders.data.find(e => e._id === relation.elderId)
      return {
        id: relation.elderId,
        name: elder?.nickname || '未知',
        phone: elder?.phone || '',
        gender: elder?.gender || 'male',
        avatar: elder?.avatar || '',
        online: true,
        status: '活动正常',
        linkedAt: relation.createdAt
      }
    })
    
    return { success: true, data: result }
  } catch (err) {
    console.error('getLinkedElders Error:', err)
    return { success: false, message: err.message }
  }
}

async function getElderStats(params) {
  const { elderId, date } = params
  
  try {
    const today = date || new Date().toISOString().split('T')[0]
    const startOfDay = `${today} 00:00:00`
    const endOfDay = `${today} 23:59:59`
    
    const [aiUsage, appOpen, emergency] = await Promise.all([
      db.collection('usage_statistics')
        .where({
          elderId,
          type: 'ai_usage',
          createdAt: db.command.gte(new Date(startOfDay)).and(db.command.lte(new Date(endOfDay)))
        })
        .count(),
      db.collection('usage_statistics')
        .where({
          elderId,
          type: 'app_open',
          createdAt: db.command.gte(new Date(startOfDay)).and(db.command.lte(new Date(endOfDay)))
        })
        .count(),
      db.collection('usage_statistics')
        .where({
          elderId,
          type: 'emergency',
          createdAt: db.command.gte(new Date(startOfDay)).and(db.command.lte(new Date(endOfDay)))
        })
        .count()
    ])
    
    const stats = await db.collection('usage_statistics')
      .where({
        elderId,
        type: db.command.in(['ai_usage', 'app_open'])
      })
      .orderBy('createdAt', 'desc')
      .limit(7)
      .get()
    
    let healthTrend = 0
    if (stats.data.length >= 2) {
      healthTrend = stats.data[0].value - stats.data[1].value
    }
    
    return {
      success: true,
      data: {
        aiUsageCount: aiUsage.total,
        appOpenCount: appOpen.total,
        emergencyCount: emergency.total,
        healthScore: 85,
        healthTrend
      }
    }
  } catch (err) {
    console.error('getElderStats Error:', err)
    return { success: false, message: err.message }
  }
}

async function recordAIUsage(params) {
  const { elderId } = params
  
  try {
    await db.collection('usage_statistics').add({
      data: {
        elderId,
        type: 'ai_usage',
        value: 1,
        createdAt: new Date()
      }
    })
    
    const today = new Date().toISOString().split('T')[0]
    const existing = await db.collection('daily_summary')
      .where({
        elderId,
        date: today
      })
      .get()
    
    if (existing.data.length > 0) {
      await db.collection('daily_summary')
        .doc(existing.data[0]._id)
        .update({
          data: {
            aiUsageCount: db.command.inc(1),
            updatedAt: new Date()
          }
        })
    } else {
      await db.collection('daily_summary').add({
        data: {
          elderId,
          date: today,
          aiUsageCount: 1,
          appOpenCount: 0,
          emergencyCount: 0,
          healthScore: 85,
          createdAt: new Date()
        }
      })
    }
    
    return { success: true }
  } catch (err) {
    console.error('recordAIUsage Error:', err)
    return { success: false, message: err.message }
  }
}

async function recordAppOpen(params) {
  const { elderId } = params
  
  try {
    await db.collection('usage_statistics').add({
      data: {
        elderId,
        type: 'app_open',
        value: 1,
        createdAt: new Date()
      }
    })
    
    const today = new Date().toISOString().split('T')[0]
    const existing = await db.collection('daily_summary')
      .where({
        elderId,
        date: today
      })
      .get()
    
    if (existing.data.length > 0) {
      await db.collection('daily_summary')
        .doc(existing.data[0]._id)
        .update({
          data: {
            appOpenCount: db.command.inc(1),
            updatedAt: new Date()
          }
        })
    } else {
      await db.collection('daily_summary').add({
        data: {
          elderId,
          date: today,
          aiUsageCount: 0,
          appOpenCount: 1,
          emergencyCount: 0,
          healthScore: 85,
          createdAt: new Date()
        }
      })
    }
    
    return { success: true }
  } catch (err) {
    console.error('recordAppOpen Error:', err)
    return { success: false, message: err.message }
  }
}

async function recordEmergency(params) {
  const { elderId, childrenIds, reason } = params
  
  try {
    await db.collection('usage_statistics').add({
      data: {
        elderId,
        type: 'emergency',
        value: 1,
        reason: reason || '紧急呼叫',
        createdAt: new Date()
      }
    })
    
    await db.collection('emergency_records').add({
      data: {
        elderId,
        childrenIds: childrenIds || [],
        reason: reason || '紧急呼叫',
        status: 'pending',
        createdAt: new Date()
      }
    })
    
    const today = new Date().toISOString().split('T')[0]
    const existing = await db.collection('daily_summary')
      .where({
        elderId,
        date: today
      })
      .get()
    
    if (existing.data.length > 0) {
      await db.collection('daily_summary')
        .doc(existing.data[0]._id)
        .update({
          data: {
            emergencyCount: db.command.inc(1),
            updatedAt: new Date()
          }
        })
    }
    
    return { success: true }
  } catch (err) {
    console.error('recordEmergency Error:', err)
    return { success: false, message: err.message }
  }
}

async function saveAIAnalysis(params) {
  const { elderId, content, level, title } = params
  
  try {
    const result = await db.collection('ai_analysis').add({
      data: {
        elderId,
        title: title || '健康分析',
        content,
        level,
        status: 'new',
        createdAt: new Date()
      }
    })
    
    const linkedRelations = await db.collection('parent_child_relations')
      .where({
        elderId,
        status: 'active'
      })
      .get()
    
    const childrenIds = linkedRelations.data.map(r => r.childrenId)
    
    await db.collection('ai_analysis_notifications').add({
      data: {
        elderId,
        analysisId: result._id,
        childrenIds,
        title,
        content,
        level,
        status: 'unread',
        createdAt: new Date()
      }
    })
    
    return { success: true, data: { id: result._id } }
  } catch (err) {
    console.error('saveAIAnalysis Error:', err)
    return { success: false, message: err.message }
  }
}

async function getLatestAnalysis(params) {
  const { elderId } = params
  
  try {
    const result = await db.collection('ai_analysis')
      .where({
        elderId
      })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()
    
    if (result.data.length > 0) {
      const analysis = result.data[0]
      return {
        success: true,
        data: {
          id: analysis._id,
          title: analysis.title,
          content: analysis.content,
          level: analysis.level,
          levelText: getLevelText(analysis.level),
          time: formatTime(analysis.createdAt)
        }
      }
    }
    
    return { success: true, data: null }
  } catch (err) {
    console.error('getLatestAnalysis Error:', err)
    return { success: false, message: err.message }
  }
}

async function requestRelate(params) {
  const { childrenId, elderPhone, elderUsername } = params
  
  try {
    const query = {}
    if (elderPhone) {
      query.phone = elderPhone
    } else if (elderUsername) {
      query.nickname = elderUsername
    }
    query.userType = 'elder'
    
    const elder = await db.collection('users')
      .where(query)
      .get()
    
    if (elder.data.length === 0) {
      return { success: false, message: '未找到该老人账户' }
    }
    
    const elderId = elder.data[0]._id
    
    const existing = await db.collection('parent_child_relations')
      .where({
        childrenId,
        elderId,
        status: 'active'
      })
      .get()
    
    if (existing.data.length > 0) {
      return { success: false, message: '该老人已被关联' }
    }
    
    const verifyCode = Math.random().toString().slice(2, 8)
    
    await db.collection('relate_requests').add({
      data: {
        childrenId,
        elderId,
        verifyCode,
        status: 'pending',
        createdAt: new Date()
      }
    })
    
    return {
      success: true,
      message: '关联请求已发送，请让老人确认',
      data: { elderId }
    }
  } catch (err) {
    console.error('requestRelate Error:', err)
    return { success: false, message: err.message }
  }
}

async function confirmRelate(params) {
  const { childrenId, elderPhone, elderUsername, verifyCode } = params
  
  try {
    const query = {}
    if (elderPhone) {
      query.phone = elderPhone
    } else if (elderUsername) {
      query.nickname = elderUsername
    }
    query.userType = 'elder'
    
    const elder = await db.collection('users')
      .where(query)
      .get()
    
    if (elder.data.length === 0) {
      return { success: false, message: '未找到该老人账户' }
    }
    
    const elderId = elder.data[0]._id
    
    const request = await db.collection('relate_requests')
      .where({
        childrenId,
        elderId,
        verifyCode,
        status: 'pending'
      })
      .get()
    
    if (request.data.length === 0) {
      return { success: false, message: '验证码错误或已过期' }
    }
    
    await db.collection('parent_child_relations').add({
      data: {
        childrenId,
        elderId,
        status: 'active',
        createdAt: new Date()
      }
    })
    
    await db.collection('relate_requests')
      .doc(request.data[0]._id)
      .update({
        data: {
          status: 'completed'
        }
      })
    
    return { success: true, message: '关联成功' }
  } catch (err) {
    console.error('confirmRelate Error:', err)
    return { success: false, message: err.message }
  }
}

async function unlinkElder(params) {
  const { childrenId, elderId } = params
  
  try {
    const relation = await db.collection('parent_child_relations')
      .where({
        childrenId,
        elderId,
        status: 'active'
      })
      .get()
    
    if (relation.data.length > 0) {
      await db.collection('parent_child_relations')
        .doc(relation.data[0]._id)
        .update({
          data: {
            status: 'unlinked',
            unlinkedAt: new Date()
          }
        })
    }
    
    return { success: true }
  } catch (err) {
    console.error('unlinkElder Error:', err)
    return { success: false, message: err.message }
  }
}

async function getTodayTimeline(params) {
  const { elderId } = params
  
  try {
    const today = new Date().toISOString().split('T')[0]
    const startOfDay = `${today} 00:00:00`
    const endOfDay = `${today} 23:59:59`
    
    const result = await db.collection('usage_statistics')
      .where({
        elderId,
        createdAt: db.command.gte(new Date(startOfDay)).and(db.command.lte(new Date(endOfDay)))
      })
      .orderBy('createdAt', 'asc')
      .get()
    
    const timeline = result.data.map(item => ({
      id: item._id,
      time: new Date(item.createdAt).toTimeString().slice(0, 5),
      type: item.type,
      typeText: getTypeText(item.type),
      content: getContentByType(item)
    }))
    
    return { success: true, data: timeline }
  } catch (err) {
    console.error('getTodayTimeline Error:', err)
    return { success: false, message: err.message }
  }
}

function getLevelText(level) {
  const map = {
    good: '良好',
    normal: '正常',
    warning: '关注',
    alert: '警示'
  }
  return map[level] || '正常'
}

function getTypeText(type) {
  const map = {
    ai_usage: 'AI陪伴',
    app_open: '打开小程序',
    emergency: '紧急呼叫',
    health: '健康提醒'
  }
  return map[type] || '其他'
}

function getContentByType(item) {
  const map = {
    ai_usage: '使用了AI陪伴功能',
    app_open: '打开了小程序',
    emergency: '发起了紧急呼叫',
    health: '健康数据更新'
  }
  return map[item.type] || '其他活动'
}

function formatTime(date) {
  const now = new Date()
  const diff = now - new Date(date)
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  
  return new Date(date).toLocaleDateString()
}