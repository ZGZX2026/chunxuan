const cloud = require('wx-server-sdk')

cloud.init({
  env: 'your-env-id'
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { elderId, imageBase64, timestamp } = event
  
  try {
    const result = await detectFall(imageBase64)
    
    if (result.confidence > 0.92) {
      await db.collection('fall_detections').add({
        data: {
          elderId,
          imageBase64,
          confidence: result.confidence,
          timestamp,
          status: 'confirmed'
        }
      })
      
      const emergency = await cloud.callFunction({
        name: 'emergency',
        data: {
          type: 'fall',
          elderId,
          location: await getLocation(elderId),
          imageBase64
        }
      })
      
      return {
        success: true,
        detected: true,
        confidence: result.confidence,
        emergencyId: emergency.result.emergencyId
      }
    } else {
      await db.collection('fall_detections').add({
        data: {
          elderId,
          imageBase64,
          confidence: result.confidence,
          timestamp,
          status: 'false_positive'
        }
      })
      
      return {
        success: true,
        detected: false,
        confidence: result.confidence
      }
    }
  } catch (err) {
    return {
      success: false,
      message: err.message
    }
  }
}

async function detectFall(imageBase64) {
  const request = require('request')
  
  return new Promise((resolve, reject) => {
    request.post({
      url: 'https://api.yolov8n.com/detect',
      json: {
        image: imageBase64,
        model: 'fall-detection'
      }
    }, (error, response, body) => {
      if (error) {
        reject(error)
      } else {
        resolve({
          detected: body.detected,
          confidence: body.confidence || 0
        })
      }
    })
  })
}

async function getLocation(elderId) {
  const elder = await db.collection('elders').doc(elderId).get()
  return elder.data.address || '未知位置'
}