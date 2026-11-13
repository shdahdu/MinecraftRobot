const { pathfinder, Movements, goals: { GoalNear } } = require('mineflayer-pathfinder')

let botRef = null
let chopping = false
let chopBusy = false
let chopTimer = null
let navStall = 0

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

// 扫描指定半径内所有原木，按到机器人的距离排序（近的在前）
function findLogBlocks(range = 20) {
    if (!botRef) return []
    const myPos = botRef.entity.position
    const logs = []

    for (let x = -range; x <= range; x++) {
        for (let y = -1; y <= 15; y++) {
            for (let z = -range; z <= range; z++) {
                const block = botRef.blockAt(myPos.offset(x, y, z))
                if (isLogBlock(block)) {
                    logs.push(block)
                }
            }
        }
    }

    logs.sort((a, b) =>
        botRef.entity.position.distanceTo(a.position) - botRef.entity.position.distanceTo(b.position)
    )
    return logs
}

// 用 pathfinder 走到指定坐标，20 秒超时返回 false
async function walkTo(x, y, z) {
    const goal = new GoalNear(x, y, z, 2)
    const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 20000))
    try {
        const result = await Promise.race([botRef.pathfinder.goto(goal), timeout])
        if (result === 'timeout') {
            botRef.pathfinder.setGoal(null)
            console.log('[logger] 寻路超时')
            return false
        }
        return true
    } catch (err) {
        botRef.pathfinder.setGoal(null)
        console.log('[logger] 寻路失败:', err.message)
        return false
    }
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

        // 大范围搜索最近的木头
        const logs = findLogBlocks(32)

        if (logs.length === 0) {
            console.log('[logger] 附近没有木头，停止砍树')
            chopping = false
            return
        }

        const target = logs[0]
        const dist = botRef.entity.position.distanceTo(target.position)

        // 太远就主动走过去
        if (dist > 4.5) {
            console.log(`[logger] 发现 ${target.name}，距离约 ${Math.round(dist)} 格，前往`)
            const groundY = Math.floor(botRef.entity.position.y)
            const ok = await walkTo(target.position.x, groundY, target.position.z)
            if (!ok) {
                chopping = false
                return
            }
            // 走过去后仍够不到（比如树在高处），累计次数，超过 3 次就放弃
            if (botRef.entity.position.distanceTo(target.position) > 4.5) {
                navStall++
                if (navStall >= 3) {
                    console.log('[logger] 多次前往仍够不到木头，放弃')
                    botRef.chat('够不到那棵树，放弃了')
                    chopping = false
                    return
                }
            } else {
                navStall = 0
            }
            chopTimer = setTimeout(chopLoop, 300)
            return
        }

        // 够得着就直接砍
        const current = botRef.blockAt(target.position)
        if (current && isLogBlock(current) && botRef.canDigBlock(current)) {
            await botRef.lookAt(current.position.offset(0.5, 0.5, 0.5))
            await botRef.dig(current)
            navStall = 0
        }
        chopTimer = setTimeout(chopLoop, 300)
    } catch (err) {
        console.log('[logger] 错误:', err.message)
        chopping = false
    } finally {
        chopBusy = false
    }
}

function setupLogger(bot) {
    botRef = bot

    // 加载寻路插件，用于主动前往木头
    if (!bot.pathfinder) bot.loadPlugin(pathfinder)
    bot.pathfinder.setMovements(new Movements(bot))

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
            botRef.pathfinder?.setGoal(null)
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
    if (botRef && botRef.pathfinder) botRef.pathfinder.setGoal(null)
}

function isChopping() {
    return chopping
}

module.exports = { setupLogger, stopChopping, isChopping }

