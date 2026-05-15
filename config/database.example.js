module.exports = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'V9R7mbFR',
    database: process.env.DB_NAME || 'nodejs_demo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  api: {
    baseUrl: process.env.API_BASE_URL || 'https://your-backend-api.com/api',
    timeout: 30000
  },
  ai: {
    zhipu: {
      apiKey: process.env.ZHIPU_API_KEY || 'f7298ab4bf1e4402a5cd778392c55100.ZMiwK83GlegFHufv',
      apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      model: 'glm-5.1'
    }
  },
  tts: {
    baidu: {
      appId: process.env.BAIDU_TTS_APPID || '',
      apiKey: process.env.BAIDU_TTS_APIKEY || '',
      secretKey: process.env.BAIDU_TTS_SECRETKEY || '',
      voiceName: 'xiaoyan'
    }
  }
}