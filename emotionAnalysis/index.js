const cloud = require('wx-server-sdk')

cloud.init({
  env: 'nodejs-2g7k4v5p547b299a'
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { elderId, text, timestamp } = event
  
  const analysis = await analyzeEmotion(text)
  
  const emotionRecord = {
    elderId,
    text,
    emotion: analysis.emotion,
    confidence: analysis.confidence,
    sentiment: analysis.sentiment,
    timestamp,
    createTime: Date.now()
  }
  
  await db.collection('emotion_records').add({
    data: emotionRecord
  })
  
  const trend = await checkEmotionTrend(elderId)
  
  if (trend === 'depressed') {
    await triggerCare(elderId)
  }
  
  return {
    success: true,
    emotion: analysis.emotion,
    trend: trend
  }
}

async function analyzeEmotion(text) {
  const keywords = {
    positive: ['开心', '高兴', '快乐', '幸福', '好', '棒', '不错'],
    negative: ['难过', '伤心', '孤独', '累', '烦', '无聊', '郁闷'],
    neutral: ['嗯', '哦', '好的', '知道了', '谢谢']
  }
  
  let score = 0
  let wordCount = 0
  
  for (const word of keywords.positive) {
    if (text.includes(word)) {
      score += 1
      wordCount++
    }
  }
  for (const word of keywords.negative) {
    if (text.includes(word)) {
      score -= 1
      wordCount++
    }
  }
  
  let emotion, sentiment, confidence
  
  if (wordCount === 0) {
    emotion = 'neutral'
    sentiment = 0
    confidence = 0.5
  } else if (score > 0) {
    emotion = 'positive'
    sentiment = score / wordCount
    confidence = Math.min(0.9, sentiment + 0.3)
  } else if (score < 0) {
    emotion = 'negative'
    sentiment = score / wordCount
    confidence = Math.min(0.9, Math.abs(score / wordCount) + 0.3)
  } else {
    emotion = 'neutral'
    sentiment = 0
    confidence = 0.6
  }
  
  return { emotion, sentiment, confidence }
}

async function checkEmotionTrend(elderId) {
  const records = await db.collection('emotion_records')
    .where({ elderId })
    .orderBy('createTime', 'desc')
    .limit(10)
    .get()
  
  if (records.data.length < 5) {
    return 'normal'
  }
  
  const negativeCount = records.data.filter(r => r.emotion === 'negative').length
  
  if (negativeCount >= 7) {
    return 'depressed'
  } else if (negativeCount >= 4) {
    return 'warning'
  }
  
  return 'normal'
}

async function triggerCare(elderId) {
  const elder = await db.collection('elders').doc(elderId).get()
  const contacts = elder.data.emergencyContacts || []
  
  if (contacts.length > 0) {
    await sendFamilyAlert(contacts[0], elder.data.name)
  }
  
  await db.collection('care_tasks').add({
    data: {
      elderId,
      type: 'emotion',
      status: 'pending',
      createTime: Date.now()
    }
  })
}

async function sendFamilyAlert(contact, elderName) {
  try {
    await cloud.openapi.subscribeMessage.send({
      touser: contact.openid,
      templateId: 'emotion_alert_template',
      data: {
        thing1: { value: elderName },
        thing2: { value: '情绪持续低落' },
        thing3: { value: '建议多打电话陪伴' },
        time4: { value: new Date().toLocaleString() }
      }
    })
  } catch (err) {
    console.error('发送情绪预警失败:', err)
  }
}