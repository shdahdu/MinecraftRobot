// bot.js — 主入口
const mineflayer = require('mineflayer')
//cd /d D:\MinecraftRobot && node bot.js

const skinUrl = 'https://raw.githubusercontent.com/shdahdu/MC-Skin-Test/main/88774e1261d89051fed417c7cc6c20412630b9fa9f8984c354c0d0293a3fe708.png'


const { setupMove, stopFollow, isFollowing } = require('./Behavior/move')
const { setupWander, startWander, stopWander, isWandering } = require('./Behavior/wander')

const setupCombat = require('./Behavior/combat')
const setupEat = require('./Behavior/eat')
const setupSleeper = require('./Behavior/sleeper')

const { setupFarmer, stopFarming } = require('./function/famer')
const { setupFisher, stopFishing } = require('./function/fisher')
const { setupLogger, stopChopping, isChopping } = require('./function/logger')


const { setupChat } = require('./Behavior/APIchat')

const bot = mineflayer.createBot({
    host: 'localhost',
    port: 25565,
    username: 'shenle',
    version: '1.21.1',
    auth: 'offline',
})



// 没有这些监听，出错时进程会静默卡死，什么都看不到
bot.on('kicked', (reason) => console.log('[踢出]', JSON.stringify(reason)))
bot.on('error', (err) => console.log('[错误]', err.message))
bot.on('end', (reason) => console.log('[断开]', reason))

bot.on('messagestr', (msg) => {
    console.log('[收到消息]', msg)
})

bot.once('spawn', () => {
    console.log('机器人已上线')
    bot.chat('机器人已上线')

     setTimeout(() => {
        bot.chat('/skin set web classic "https://raw.githubusercontent.com/shdahdu/MC-Skin-Test/main/88774e1261d89051fed417c7cc6c20412630b9fa9f8984c354c0d0293a3fe708.png"')
    }, 2000)

    bot.chat('已加载皮肤')

    setupMove(bot)
    setupWander(bot)
    setupCombat(bot)
    setupEat(bot)
    setupSleeper(bot)
    setupFarmer(bot)
    setupFisher(bot)
    setupLogger(bot)
    setupChat(bot)

    // 自动游荡
    startWander()
   

    // 协调 follow 与wander 互斥
    bot.on('chat', (username, message) => {
        if (message.startsWith('follow ') && message.substring(7).trim() !== 'stop') {
            stopWander()
        }
        if (message === 'wander' && isFollowing()) {
            stopFollow()
        }
        if (message === 'farm start' && isWandering()) {
            stopWander()
        }
        if (message === 'farm start' && isFollowing()) {
            stopFollow()
        }
        if (message === 'go to fishing' && isWandering()) {
            stopWander()
        }
        if (message === 'go to fishing' && isFollowing()) {
            stopFollow()
        }
        if (message === 'chop' && isWandering()) {
            stopWander()
        }
        if (message === 'chop' && isFollowing()) {
            stopFollow()
        }
        if ((message.startsWith('follow ') || message === 'wander') && isChopping()) {
            stopChopping()
        }
        
    })

    
})
