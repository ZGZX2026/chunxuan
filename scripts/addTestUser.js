const cloud = require('wx-server-sdk')

cloud.init({
  env: 'nodejs-2g7k4v5p547b299a'
})

const db = cloud.database()

async function addTestUser() {
  try {
    const username = 'test'
    const password = '111111'
    
    const existingUser = await db.collection('users').where({ phone: username }).get()
    if (existingUser.data.length > 0) {
      console.log('测试用户已存在:', existingUser.data[0])
      return
    }
    
    const result = await db.collection('users').add({
      data: {
        phone: username,
        password,
        nickname: '测试用户',
        isElder: true,
        status: 1,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
    
    console.log('测试用户添加成功:', result)
    console.log('用户名: test')
    console.log('密码: 111111')
    
  } catch (error) {
    console.error('添加测试用户失败:', error)
  }
}

addTestUser()