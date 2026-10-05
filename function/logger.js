
let botRef = null
let chopping = false
let chopBusy = false
let chopTimer = null

const LOG_NAMES = new Set([
    
    'oak_log', 'spruce_log', 'birch_log', 'jungle_log',
    'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log',
    'stripped_oak_log', 'stripped_spruce_log', 'stripped_birch_log',
    'stripped_jungle_log', 'stripped_acacia_log', 'stripped_dark_oak_log',
    'stripped_mangrove_log', 'stripped_cherry_log',
    'oak_wood', 'spruce_wood', 'birch_wood', 'jungle_wood',
    'acacia_wood', 'dark_oak_wood', 'mangrove_wood', 'cherry_wood',
    'stripped_oak_wood', 'stripped_spruce_wood', 'stripped_birch_wood',
    'stripped_jungle_wood', 'stripped_acacia_wood', 'stripped_dark_oak_wood',
    'stripped_mangrove_wood', 'stripped_cherry_wood',
    'crimson_stem', 'warped_stem',
    'crimson_hyphae', 'warped_hyphae',
    'stripped_crimson_stem', 'stripped_warped_stem',
    'stripped_crimson_hyphae', 'stripped_warped_hyphae',
    'bamboo_block', 'stripped_bamboo_block',
])

function isLogBlock(block) {
    return block && block.boundingBox === 'block' && LOG_NAMES.has(block.name)
}

async function equipBestAxe() {
    if (!botRef) return
    const axes = botRef.inventory.items().filter(i => i.name.includes('_axe'))
    if (axes.length === 0) return

    const priority = ['netherite', 'diamond', 'iron', 'stone', 'golden', 'wooden']
    axes.sort((a, b) => {
        const pa = priority.findIndex(p => a.name.includes(p))
        const pb = priority.findIndex(p => b.name.includes(p))
        return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb)
    })
    await botRef.equip(axes[0], 'hand')
}

//以自身为中心扫描 6 格范围内的所有原木方块， 
function findLogBlocks() {
    if (!botRef) return []
    const myPos = botRef.entity.position
    const logs = []

    for (let x = -6; x <= 6; x++) {
        for (let y = -1; y <= 15; y++) {
            for (let z = -6; z <= 6; z++) {
                const block = botRef.blockAt(myPos.offset(x, y, z))
                if (isLogBlock(block)) {
                    logs.push(block)
                }
            }
        }
    }

    
    logs.sort((a, b) => a.position.y - b.position.y)
    return logs
}


async function chopLoop() {
    if (!chopping || !botRef) return
    if (chopBusy) {
        chopTimer = setTimeout(chopLoop, 500)
        return
    }

    chopBusy = true
    try {
    
        await equipBestAxe()

        //  扫描范围内所有原木
        const logs = findLogBlocks()

        if (logs.length === 0) {
            console.log('[logger] 范围内没有原木，停止砍树')
            botRef.chat('没有可砍的树木了')
            chopping = false
            return
        }

        console.log(`[logger] 发现 ${logs.length} 块原木，开始砍伐`)

        let broken = 0
        for (const block of logs) {
            if (!chopping || !botRef) break

         
            const current = botRef.blockAt(block.position)
            if (!current || !isLogBlock(current)) continue

            
            if (!botRef.canDigBlock(current)) continue

            
            await equipBestAxe()

            
            await botRef.lookAt(current.position.offset(0.5, 0.5, 0.5))
            await botRef.dig(current)
            broken++
            console.log(`[logger] 砍掉: ${current.name} @ (${current.position.x}, ${current.position.y}, ${current.position.z})`)
        }

        if (broken > 0) {
            console.log(`[logger] 本轮砍掉 ${broken} 块，继续扫描...`)
            chopping = true
            chopTimer = setTimeout(chopLoop, 800)
        } else {
            console.log('[logger] 本轮没有砍到原木')
            chopping = false
        }
    } catch (err) {
        console.log('[logger] 错误:', err.message)
        chopping = false
    } finally {
        chopBusy = false
    }
}

function setupLogger(bot) {
    botRef = bot

    bot.on('chat', (username, message) => {
        if (message === 'chop') {
            if (chopping) {
                bot.chat('已经在砍树了')
                return
            }
            chopping = true
            chopLoop()
            bot.chat('开始砍树')
            console.log('[logger] 开始砍树')
        }

        if (message === 'chop stop') {
            chopping = false
            clearTimeout(chopTimer)
            chopTimer = null
            bot.chat('停止砍树')
            console.log('[logger] 停止砍树')
        }
    })
}

function stopChopping() {
    chopping = false
    if (chopTimer) {
        clearTimeout(chopTimer)
        chopTimer = null
    }
}

function isChopping() {
    return chopping
}

module.exports = { setupLogger, stopChopping, isChopping }
