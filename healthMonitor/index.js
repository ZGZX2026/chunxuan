const cloud = require('wx-server-sdk')

cloud.init({
  env: 'nodejs-2g7k4v5p547b299a'
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { elderId, heartRate, spo2, timestamp } = event
  
  const healthRecord = {
    elderId,
    heartRate,
    spo2,
    timestamp,
    createTime: Date.now()
  }
  
  await db.collection('health_records').add({
    data: healthRecord
  })
  
  const abnormal = await checkAbnormal(elderId, heartRate, spo2)
  
  if (abnormal) {
    await cloud.callFunction({
      name: 'emergency',
      data: {
        type: 'health',
        elderId,
        location: await getLocation(elderId),
        imageBase64: '',
        details: abnormal
      }
    })
  }
  
  return {
    success: true,
    abnormal: abnormal || null
  }
}

async function checkAbnormal(elderId, heartRate, spo2) {
  const elder = await db.collection('elders').doc(elderId).get()
  const healthThreshold = elder.data.healthThreshold || {
    minHeartRate: 50,
    maxHeartRate: 100,
    minSpO2: 95
  }
  
  const issues = []
  
  if (heartRate < healthThreshold.minHeartRate) {
    issues.push(`心率偏低: ${heartRate}bpm`)
  }
  if (heartRate > healthThreshold.maxHeartRate) {
    issues.push(`心率偏高: ${heartRate}bpm`)
  }
  if (spo2 < healthThreshold.minSpO2) {
    issues.push(`血氧偏低: ${spo2}%`)
  }
  
  return issues.length > 0 ? issues.join('; ') : null
}

async function getLocation(elderId) {
  const elder = await db.collection('elders').doc(elderId).get()
  return elder.data.address || '未知位置'
}