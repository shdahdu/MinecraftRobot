// injury.js — 受伤后短暂模拟击退效果（position包驱动）
let knockbackTicks = 0
let kbDx = 0, kbDy = 0, kbDz = 0
let botRef = null

function setupInjury(bot) {
    botRef = bot

    bot.on('entityHurt', (entity) => {
        if (entity !== bot.entity) return

        // 找6格内最近实体（攻击者）
        let nearest = null, nearestDist = Infinity
        for (const e of Object.values(bot.entities)) {
            if (e === bot.entity || !e.position) continue
            const dist = bot.entity.position.distanceTo(e.position)
            if (dist < nearestDist && dist < 6) {
                nearestDist = dist
                nearest = e
            }
        }
        if (!nearest) return

        // 计算击退方向（远离攻击者）
        const dx = bot.entity.position.x - nearest.position.x
        const dz = bot.entity.position.z - nearest.position.z
        const dist = Math.sqrt(dx * dx + dz * dz) || 1
        const strength = 0.3  // 击退力度

        kbDx = (dx / dist) * strength
        kbDy = 0.15            // 轻微向上弹起
        kbDz = (dz / dist) * strength
        knockbackTicks = 8     // 击退持续 8 tick ≈ 0.4秒

        console.log('[injury] 击退！方向: ' + kbDx.toFixed(2) + ', ' + kbDz.toFixed(2))
    })

    bot.on('physicsTick', () => {
        if (knockbackTicks <= 0) return

    
        const newX = bot.entity.position.x + kbDx
        const newY = bot.entity.position.y + kbDy
        const newZ = bot.entity.position.z + kbDz

        bot.entity.position.set(newX, newY, newZ)
        bot._client.write('position', {
            x: newX, y: newY, z: newZ, onGround: false
        })

        // 击退逐渐衰减
        kbDy -= 0.04   // 重力
        kbDx *= 0.85
        kbDz *= 0.85
        knockbackTicks--
    })
}

module.exports = setupInjury
