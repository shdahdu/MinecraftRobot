let botRef = null
let attackInterval = null
let lastAttackTime = 0

function setupCombat(bot) {
    botRef = bot

    bot.on('entityHurt', (entity) => {
        if (entity !== bot.entity) return

        // 找最近的敌对生物
        let nearest = null, nearestDist = Infinity
        for (const e of Object.values(bot.entities)) {
            if (e === bot.entity || !e.position || e.type !== 'hostile') continue
            const dist = bot.entity.position.distanceTo(e.position)
            if (dist < nearestDist && dist < 6) {
                nearestDist = dist
                nearest = e
            }
        }
        if (!nearest) return

        // 切换武器
        const item = bot.inventory.items().find(i => i.name.includes('sword'))
        if (item) bot.equip(item, 'hand')

        // 持续攻击直到目标死亡
        if (attackInterval) clearInterval(attackInterval)
        attackInterval = setInterval(() => {
            if (!nearest.isValid || nearest.health <= 0) {
                clearInterval(attackInterval)
                attackInterval = null
                return
            }
            bot.lookAt(nearest.position.offset(0, 1, 0))
            bot.attack(nearest)
        }, 500)
    })

    // 死亡时停止攻击
    bot.on('death', () => {
        if (attackInterval) {
            clearInterval(attackInterval)
            attackInterval = null
        }
    })
}

module.exports = setupCombat
