const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-d6gcu0cuh8b1242ea'
})

exports.main = async (event, context) => {
  const { text } = event
  
  if (!text) {
    return {
      success: false,
      error: '文本内容不能为空'
    }
  }

  try {
    const audioUrl = `https://tts.baidu.com/text2audio?tex=${encodeURIComponent(text)}&cuid=baike&lan=ZH&ctp=1&pdt=301&vol=9&rate=32&per=0`
    
    return {
      success: true,
      audioUrl: audioUrl
    }
  } catch (err) {
    console.error('TTS error:', err)
    return {
      success: false,
      error: err.message
    }
  }
}