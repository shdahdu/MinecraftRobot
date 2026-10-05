
let botRef = null
let fishing = false
let fishTimer = null

function findWaterBlocks() {
    if (!botRef) return []
    const myPos = botRef.entity.position
    if (!myPos) return []
    const results = []

    for (let x = -8; x <= 8; x++) {
        for (let y = -8; y <= 8; y++) {
            for (let z = -8; z <= 8; z++) {
                const pos = myPos.offset(x, y, z)
                const block = botRef.blockAt(pos)
                if (!block || !block.position) continue

                if (block.name !== 'water' && block.name !== 'flowing_water') continue

                const above = botRef.blockAt(pos.offset(0, 1, 0))
                if (!above || above.name !== 'air') continue

                results.push(block)
            }
        }
    }
    results.sort((a, b) =>
        a.position.distanceTo(myPos) - b.position.distanceTo(myPos)
    )
    return results
}



async function fishLoop() {
    if (!fishing || !botRef) return

    try {
        const rod = botRef.inventory.items().find(i => i.name.includes('fishing_rod'))
        if (!rod) {
            botRef.chat('没有钓鱼竿')
            fishing = false
            return
        }
        await botRef.equip(rod, 'hand')

        
        const waters = findWaterBlocks()
        if (waters.length === 0) {
            botRef.chat('附近没有可钓鱼的水面')
            fishing = false
            return
        }
        const water = waters[0]
        console.log(`[fisher] 找到水面 @ (${water.position.x}, ${water.position.y}, ${water.position.z})`)
        await botRef.lookAt(water.position.offset(0.5, 1, 0.5))


        // bot.fish()：甩杆 → 监听钓鱼粒子检测上钩 → 自动收杆
        const fishPromise = botRef.fish().catch(() => {})
        // 60 秒超时保护
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 60000)
        )
        await Promise.race([fishPromise, timeoutPromise])
    } catch (err) {
        if (err.message === 'timeout') {
           
            botRef.activateItem()
            console.log('[fisher] 60 秒无鱼，重新甩杆')
        } else {
            console.log('[fisher] 错误:', err.message)
        }
    }

    // 收杆后稍等再进入下一轮
    fishTimer = setTimeout(fishLoop, 1000)
}

function setupFisher(bot) {
    botRef = bot

    bot.on('chat', (username, message) => {
        if (message === 'go to fishing') {
            if (fishing) {
                bot.chat('已经在钓鱼了')
                return
            }
            fishing = true
            fishLoop()
            bot.chat('开始钓鱼')
            console.log('[fisher] 开始钓鱼')
        }

        if (message === 'fishing stop') {
            fishing = false
            clearTimeout(fishTimer)
            fishTimer = null
            // 收杆
            try { bot.activateItem() } catch {}
            bot.chat('停止钓鱼')
            console.log('[fisher] 停止钓鱼')
        }
    })
}

function stopFishing() {
    fishing = false
    if (fishTimer) {
        clearTimeout(fishTimer)
        fishTimer = null
    }
    if (botRef) {
        try { botRef.activateItem() } catch {}
    }
}

module.exports = { setupFisher, stopFishing }
