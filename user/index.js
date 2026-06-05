const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-d6gcu0cuh8b1242ea'
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action } = event
  
  switch (action) {
    case 'register':
      return await register(event)
    case 'login':
      return await login(event)
    case 'getUser':
      return await getUser(event)
    case 'updateUser':
      return await updateUser(event)
    case 'deleteUser':
      return await deleteUser(event)
    case 'addTestUser':
      return await addTestUser(event)
    default:
      return { success: false, message: '未知操作' }
  }
}

async function register(event) {
  const { phone, password, nickname, isElder = true } = event
  
  if (!phone || !password || !nickname) {
    return { success: false, message: '请填写完整信息' }
  }
  
  const existingUser = await db.collection('users').where({ phone }).get()
  if (existingUser.data.length > 0) {
    return { success: false, message: '该手机号已被注册' }
  }
  
  const result = await db.collection('users').add({
    data: {
      phone,
      password,
      nickname,
      isElder,
      status: 1,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
  })
  
  return { 
    success: true, 
    message: '注册成功',
    data: {
      _id: result._id,
      phone,
      nickname,
      isElder,
      status: 1
    }
  }
}

async function login(event) {
  const { phone, password } = event
  
  if (!phone || !password) {
    return { success: false, message: '请输入手机号和密码' }
  }
  
  const user = await db.collection('users').where({ phone, password }).get()
  
  if (user.data.length === 0) {
    return { success: false, message: '手机号或密码错误' }
  }
  
  return { 
    success: true, 
    message: '登录成功',
    data: {
      _id: user.data[0]._id,
      phone: user.data[0].phone,
      nickname: user.data[0].nickname,
      isElder: user.data[0].isElder,
      status: user.data[0].status
    }
  }
}

async function getUser(event) {
  const { userId } = event
  
  if (!userId) {
    return { success: false, message: '用户ID不能为空' }
  }
  
  const user = await db.collection('users').doc(userId).get()
  
  if (!user.data) {
    return { success: false, message: '用户不存在' }
  }
  
  return { 
    success: true, 
    data: {
      _id: user.data._id,
      phone: user.data.phone,
      nickname: user.data.nickname,
      isElder: user.data.isElder,
      status: user.data.status
    }
  }
}

async function updateUser(event) {
  const { userId, nickname, password } = event
  
  if (!userId) {
    return { success: false, message: '用户ID不能为空' }
  }
  
  const updateData = { updatedAt: db.serverDate() }
  if (nickname) updateData.nickname = nickname
  if (password) updateData.password = password
  
  await db.collection('users').doc(userId).update({ data: updateData })
  
  return { success: true, message: '更新成功' }
}

async function deleteUser(event) {
  const { userId } = event
  
  if (!userId) {
    return { success: false, message: '用户ID不能为空' }
  }
  
  await db.collection('users').doc(userId).remove()
  
  return { success: true, message: '删除成功' }
}

async function addTestUser(event) {
  const { username, password } = event
  
  if (!username || !password) {
    return { success: false, message: '请提供用户名和密码' }
  }
  
  const existingUser = await db.collection('users').where({ phone: username }).get()
  if (existingUser.data.length > 0) {
    return { success: false, message: '该账号已存在' }
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
  
  return { 
    success: true, 
    message: '测试用户添加成功',
    data: {
      _id: result._id,
      phone: username,
      nickname: '测试用户'
    }
  }
}