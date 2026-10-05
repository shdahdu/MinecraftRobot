const OpenAI = require('openai')

const BASE_URL = 'https://api.deepseek.com'
const MODEL = 'deepseek-chat'
const KEY = ('').trim()

let client = new OpenAI({ apiKey: KEY, baseURL: BASE_URL })

const history = {}

async function ask (player, text) {

  if (!history[player]) {
    history[player] = [
      { role: 'system', content: '你是Minecraft机器人，名字叫shenle。回复要简短（50字以内）、口语化，适合聊天框。' }
    ]
  }
  history[player].push({ role: 'user', content: text })

  if (history[player].length > 110) {
    history[player] = [history[player][0], ...history[player].slice(-100)]
  }

  const stream = await client.chat.completions.create({
    model: MODEL,
    messages: history[player],
    stream: true
  })

  let reply = ''
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content
    if (delta) reply += delta
  }
  reply = reply.trim() || '...'

  history[player].push({ role: 'assistant', content: reply })
  return reply
}

function setupChat (bot) {
  bot.on('chat', async (username, message) => {
    // 不响应自己，也不响应非 @机器人 的消息
    if (username === bot.username || !message.startsWith(`@${bot.username}`)) return

    const text = message.slice(bot.username.length + 1).trim()
    if (!text) return bot.chat('嗯？叫我干嘛~')
    if (!KEY) return bot.chat('没配置 API Key，我暂时不会说话…')

    try {
      const reply = await ask(username, text)
      // Minecraft 聊天框单条限 100 字符，超长分段发送
      for (const chunk of reply.match(/.{1,100}/g) || []) {
        bot.chat(chunk)
        await new Promise(r => setTimeout(r, 500))
      }
    } catch (err) {
      console.error('[APIchat] 调用失败:', err.status || '', err.message)
      bot.chat('我好像出错了…')
    }
  })
}

module.exports = { setupChat }
