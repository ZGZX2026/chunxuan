const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: 'cloud1-d6gcu0cuh8b1242ea'
})

const API_KEY = 'f7298ab4bf1e4402a5cd778392c55100.ZMiwK83GlegFHufv'
const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

exports.main = async (event, context) => {
  const { message } = event

  if (!message) {
    return {
      success: false,
      error: '消息内容不能为空'
    }
  }

  try {
    const response = await makeRequest(message)
    
    if (response.success) {
      return {
        success: true,
        data: {
          content: response.content
        }
      }
    } else {
      return {
        success: false,
        error: response.error
      }
    }
  } catch (err) {
    console.error('AI API error:', err)
    return {
      success: false,
      error: err.message || '服务暂时不可用'
    }
  }
}

function makeRequest(message) {
  return new Promise((resolve, reject) => {
    const systemPrompt = '你是小银，一个友善、耐心的AI助手，专门为老年人提供陪伴服务。请用简洁、易懂的语言回答问题。'

    const postData = JSON.stringify({
      model: 'glm-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 2048,
      temperature: 0.7
    })

    const options = {
      hostname: 'open.bigmodel.cn',
      port: 443,
      path: '/api/paas/v4/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          
          if (res.statusCode === 200 && result.choices && result.choices.length > 0) {
            resolve({
              success: true,
              content: result.choices[0].message.content
            })
          } else if (result.error) {
            resolve({
              success: false,
              error: result.error.message || '服务暂时不可用'
            })
          } else {
            resolve({
              success: false,
              error: '获取响应失败'
            })
          }
        } catch (err) {
          resolve({
            success: false,
            error: '解析响应失败'
          })
        }
      })
    })

    req.on('error', (err) => {
      resolve({
        success: false,
        error: '网络请求失败'
      })
    })

    req.write(postData)
    req.end()
  })
}
