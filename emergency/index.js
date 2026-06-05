const cloud = require('wx-server-sdk')

cloud.init({
  env: 'nodejs-2g7k4v5p547b299a'
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { type, elderId, location, imageBase64 } = event
  
  const elder = await db.collection('elders').doc(elderId).get()
  
  if (!elder.data) {
    return { success: false, message: '老人信息不存在' }
  }
  
  const emergencyContacts = elder.data.emergencyContacts || []
  const communityId = elder.data.communityId
  
  const emergencyRecord = {
    elderId,
    type,
    location,
    imageBase64,
    timestamp: Date.now(),
    status: 'pending',
    contacts: []
  }
  
  await db.collection('emergencies').add({
    data: emergencyRecord
  })
  
  let contactIndex = 0
  const maxAttempts = emergencyContacts.length + 2
  
  const notifyNextContact = async () => {
    if (contactIndex >= maxAttempts) {
      await db.collection('emergencies').doc(emergencyRecord._id).update({
        data: { status: 'escalated' }
      })
      return
    }
    
    let contact
    if (contactIndex < emergencyContacts.length) {
      contact = emergencyContacts[contactIndex]
    } else if (contactIndex === emergencyContacts.length) {
      contact = await getCommunityVolunteer(communityId)
    } else {
      contact = await getCommunityStaff(communityId)
    }
    
    if (contact) {
      await sendNotification(contact, type, elder.data.name, location)
      
      emergencyRecord.contacts.push({
        contactId: contact._id || 'volunteer',
        contactName: contact.name || '社区志愿者',
        contactPhone: contact.phone,
        timestamp: Date.now()
      })
      
      await db.collection('emergencies').doc(emergencyRecord._id).update({
        data: { contacts: emergencyRecord.contacts }
      })
    }
    
    contactIndex++
    
    setTimeout(notifyNextContact, 120000)
  }
  
  notifyNextContact()
  
  return {
    success: true,
    message: '紧急呼叫已触发',
    emergencyId: emergencyRecord._id
  }
}

async function getCommunityVolunteer(communityId) {
  const result = await db.collection('volunteers')
    .where({ communityId, available: true })
    .orderBy('lastActive', 'asc')
    .limit(1)
    .get()
  
  return result.data[0]
}

async function getCommunityStaff(communityId) {
  const result = await db.collection('staff')
    .where({ communityId })
    .limit(1)
    .get()
  
  return result.data[0]
}

async function sendNotification(contact, type, elderName, location) {
  const templateId = type === 'fall' ? 'fall_template' : 'emergency_template'
  
  try {
    await cloud.openapi.subscribeMessage.send({
      touser: contact.openid,
      templateId,
      data: {
        thing1: { value: elderName },
        thing2: { value: type === 'fall' ? '疑似跌倒' : '紧急呼叫' },
        thing3: { value: location },
        time4: { value: new Date().toLocaleString() }
      }
    })
  } catch (err) {
    console.error('发送通知失败:', err)
  }
}