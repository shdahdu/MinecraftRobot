let botRef = null

function findBedBlocks() {
    if (!botRef) return []
    const myPos = botRef.entity.position
    if (!myPos) return []
    const results = []

    for (let x = -8; x <= 8; x++) {
        for (let y = -8; y <= 8; y++) {
            for (let z = -6; z <= 6; z++) {
                const pos = myPos.offset(x, y, z)
                const block = botRef.blockAt(pos)
                if (!block || !block.position) continue

                if (!botRef.isABed(block)) continue

    
                results.push(block)
            }
        }
    }


    results.sort((a, b) =>
        a.position.distanceTo(myPos) - b.position.distanceTo(myPos)
    )
    return results
}

function setupSleeper(bot) {
    botRef = bot

    bot.on('chat', (username, message) => {
        switch (message) {
            case 'sleep':
                findBedBlocks()
                goToSleep()
                break
            case 'wakeup':
                wakeUp()
                break
        }
    })
}

async function goToSleep() {
    if (!botRef) return
    const beds = findBedBlocks()
    const bed = beds[0]
    if (!bed) {
        console.log('[sleeper] 没有找到床')
        botRef.chat('附近没有床')
        return
    }
    console.log(`[sleeper] 找到床 @ (${bed.position.x}, ${bed.position.y}, ${bed.position.z})`)

    try {
        await botRef.sleep(bed)   
        console.log('[sleeper] 正在睡觉...')
    } catch (err) {
        console.log('[sleeper] 无法入睡:', err.message)
        botRef.chat(`无法入睡: ${err.message}`)
    }
}

async function wakeUp() {
    if (!botRef) return
    try {
        await botRef.wake()
        console.log('[sleeper] 正在醒来...')
    } catch (err) {
        console.log('[sleeper] 无法醒来:', err.message)
    }
}

module.exports = setupSleeper
