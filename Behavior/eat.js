const autoeat = require('mineflayer-auto-eat')

let botRef = null

function setupEat(bot) {
    botRef = bot
    bot.autoEat.options = {
        priority: 'foodPoints',   // 优先吃饱食度高的食物
        startAt: 19,              // 饥饿值低于14时开始吃
        bannedFood: []            // 禁用食物列表，默认为空
    }
    console.log('[eat] 自动进食已配置')

    bot.on('autoeat_started', () => {
        console.log('[autoeat] 开始吃食物')
    })

    bot.on('autoeat_finished', () => {
        console.log('[autoeat] 吃完食物')
    })   

    
    bot.on('autoeat_error', (err) => {
        console.error('[autoeat] 出错:', err.message)
    })
}


module.exports = setupEat
