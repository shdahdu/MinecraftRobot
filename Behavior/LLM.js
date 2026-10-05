// // Behavior/LLM.js
// const http = require('http')

// // 每个玩家独立的对话历史
// const conversationHistory = {}

// async function askLLM(playerName, userMessage) {
//   // 初始化对话历史
//   if (!conversationHistory[playerName]) {
//     conversationHistory[playerName] = [
//       {
//         role: 'system',
//         content: '你是一个Minecraft机器人助手，名字叫shenle。回复要简短，控制在50字以内，适合聊天框显示。'//system content设定模板
//       }
//     ]
//   }

//   // 加入用户消息
//   conversationHistory[playerName].push({ role: 'user', content: userMessage })

//   // 防止历史过长（保留最近10条 + system prompt）
//   if (conversationHistory[playerName].length > 11) {
//     conversationHistory[playerName] = [
//       conversationHistory[playerName][0],   // 保留 system
//       ...conversationHistory[playerName].slice(-10)
//     ]
//   }

//   const body = JSON.stringify({
//     model: 'qwen2.5:7b',
//     messages: conversationHistory[playerName],
//     stream: false
//   })

//   return new Promise((resolve, reject) => {
//     const req = http.request({
//       hostname: 'localhost',
//       port: 11434,
//       path: '/api/chat',
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' }
//     }, res => {
//       let data = ''
//       res.on('data', chunk => data += chunk)
//       res.on('end', () => {
//         try {
//           const parsed = JSON.parse(data)
//           const reply = parsed.message?.content || '...'
//           // 把 AI 回复也存入历史
//           conversationHistory[playerName].push({ role: 'assistant', content: reply })
//           resolve(reply)
//         } catch (e) {
//           reject(e)
//         }
//       })
//     })
//     req.on('error', reject)
//     req.write(body)
//     req.end()
//   })
// }

// function setupChat(bot) {
//   bot.on('chat', async (username, message) => {
//     // 不响应自己
//     if (username === bot.username) return

//     // 触发条件：@机器人名字，或者以特定关键词开头
//     const trigger = `@${bot.username}`
//     if (!message.startsWith(trigger)) return

//     const userText = message.slice(trigger.length).trim()
//     if (!userText) {
//       bot.chat('嗯？叫我干嘛~')
//       if(bot.chat('嗯？叫我干嘛~')) {
//         bot.chat('/tp ' + username) 
//       }
//       return
//     }

//     bot.chat('思考中...')

//     try {
//       const reply = await askLLM(username, userText)
//       // Minecraft 聊天框单条限140字符，超长分割
//       if (reply.length <= 100) {
//         bot.chat(reply)
//       } else {
//         // 分段发送
//         const chunks = reply.match(/.{1,100}/g) || []
//         for (const chunk of chunks) {
//           bot.chat(chunk)
//           await new Promise(r => setTimeout(r, 500))
//         }
//       }
//     } catch (err) {
//       bot.chat('脑子转不动了...')
//       console.error('[chat] LLM调用失败:', err.message)
//     }
//   })
// }

// module.exports = { setupChat }
