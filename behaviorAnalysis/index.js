const cloud = require('wx-server-sdk')

cloud.init({
  env: 'your-env-id'
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { elderId, behaviorType, timestamp } = event
  
  const behaviorRecord = {
    elderId,
    behaviorType,
    timestamp,
    createTime: Date.now()
  }
  
  await db.collection('behavior_records').add({
    data: behaviorRecord
  })
  
  const pattern = await detectPattern(elderId)
  
  if (pattern.abnormal) {
    await alertAbnormalBehavior(elderId, pattern)
  }
  
  return {
    success: true,
    pattern: pattern
  }
}

async function detectPattern(elderId) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const todayRecords = await db.collection('behavior_records')
    .where({ 
      elderId,
      timestamp: {
        $gte: today.getTime()
      }
    })
    .get()
  
  const yesterdayRecords = await db.collection('behavior_records')
    .where({ 
      elderId,
      timestamp: {
        $gte: yesterday.getTime(),
        $lt: today.getTime()
      }
    })
    .get()
  
  const todayCount = todayRecords.data.length
  const yesterdayCount = yesterdayRecords.data.length
  
  const currentHour = now.getHours()
  const morningActivity = todayRecords.data.filter(r => {
    const hour = new Date(r.timestamp).getHours()
    return hour >= 6 && hour < 12
  }).length
  
  const nightActivity = todayRecords.data.filter(r => {
    const hour = new Date(r.timestamp).getHours()
    return hour >= 22 || hour < 6
  }).length
  
  let abnormal = false
  let reason = ''
  
  if (currentHour >= 10 && currentHour < 14 && morningActivity === 0) {
    abnormal = true
    reason = '上午无活动记录'
  } else if (nightActivity > 5) {
    abnormal = true
    reason = '夜间活动频繁'
  } else if (todayCount < yesterdayCount * 0.3) {
    abnormal = true
    reason = '今日活动显著减少'
  } else if (todayCount > yesterdayCount * 3) {
    abnormal = true
    reason = '今日活动异常增多'
  }
  
  return {
    abnormal,
    reason,
    todayCount,
    yesterdayCount,
    morningActivity,
    nightActivity
  }
}

async function alertAbnormalBehavior(elderId, pattern) {
  const elder = await db.collection('elders').doc(elderId).get()
  const contacts = elder.data.emergencyContacts || []
  
  if (contacts.length > 0) {
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: contacts[0].openid,
        templateId: 'behavior_alert_template',
        data: {
          thing1: { value: elder.data.name },
          thing2: { value: pattern.reason },
          thing3: { value: `今日活动: ${pattern.todayCount}次` },
          time4: { value: new Date().toLocaleString() }
        }
      })
    } catch (err) {
      console.error('发送行为异常预警失败:', err)
    }
  }
  
  await db.collection('behavior_alerts').add({
    data: {
      elderId,
      reason: pattern.reason,
      details: pattern,
      status: 'pending',
      createTime: Date.now()
    }
  })
}