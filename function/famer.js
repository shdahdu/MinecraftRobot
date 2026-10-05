// farmer.js — 自动种地（收割小麦 → 补种）

let botRef = null
let farming = false
let farmTimer = null


function findHarvestBlocks() {
    if (!botRef) return []
    const myPos = botRef.entity.position
    if (!myPos) return []
    const results = []

// 扫描机器人为中心的6*1*6的区域，找到所有成熟的小麦
    for (let x = -6; x <= 6; x++) {
        for (let y = -1; y <= 2; y++) {
            for (let z = -6; z <= 6; z++) {
                const pos = myPos.offset(x, y, z)
                const below = botRef.blockAt(pos)
                if (!below || !below.position || below.name !== 'farmland') continue

                const above = botRef.blockAt(pos.offset(0, 1, 0))
                if (!above || !above.position || above.name !== 'wheat') continue

                try {
                    const props = above.getProperties ? above.getProperties() : null
                    if (props) {
                        
                        if (typeof props.age !== 'undefined') {
                            console.log(`[farmer] 小麦@${above.position} age=${props.age} type=${typeof props.age} props=`, JSON.stringify(props))
                        }
                        if (props.age == 7) {  
                            results.push({ farmland: below, crop: above })
                        }
                    }
                } catch {}
            }
        }
    }
    return results
}
//寻找空的耕地
function findEmptyFarmland() {
    if (!botRef) return []
    const myPos = botRef.entity.position
    if (!myPos) return []
    const results = []

    for (let x = -6; x <= 6; x++) {
        for (let y = -1; y <= 2; y++) {
            for (let z = -6; z <= 6; z++) {
                const pos = myPos.offset(x, y, z)
                const block = botRef.blockAt(pos)
                if (!block || !block.position || block.name !== 'farmland') continue

                const above = botRef.blockAt(pos.offset(0, 1, 0))
                if (!above || above.name === 'air') {
                    results.push(block)
                }
            }
        }
    }
    return results
}

function findAndReportFarmland(bot) {
    const myPos = bot.entity.position
    if (!myPos) {
        bot.chat('无法获取当前位置')
        return
    }

    const farmlands = []   
    const mature = []      
    const growing = []     

    for (let x = -6; x <= 6; x++) {
        for (let y = -1; y <= 2; y++) {
            for (let z = -6; z <= 6; z++) {
                const pos = myPos.offset(x, y, z)
                const block = bot.blockAt(pos)
                if (!block || !block.position || block.name !== 'farmland') continue

                farmlands.push(block)

                const above = bot.blockAt(pos.offset(0, 1, 0))
                if (!above || !above.position) continue

                if (above.name === 'wheat') {
                    try {
                        const props = above.getProperties ? above.getProperties() : null
                        if (props && props.age == 7) {
                            mature.push(above)
                        } else {
                            growing.push(above)
                        }
                    } catch { /* skip */ }
                }
            }
        }
    }

    if (farmlands.length === 0) {
        bot.chat('附近 6 格内没有耕地')
        return
    }

    const report = [
        `耕地: ${farmlands.length} 块`,
        `成熟作物: ${mature.length} 个`,
        `生长中: ${growing.length} 个`,
        `空地: ${farmlands.length - mature.length - growing.length} 块`,
    ].join(', ')

    bot.chat(report)
    console.log(`[farmer] ${report}`)
}

async function farmLoop() {
    if (!farming || !botRef) return

    try {
        // 1. 收割成熟小麦
        const harvestBlocks = findHarvestBlocks()
        let harvested = 0

        console.log(`[farmer] 扫描到 ${harvestBlocks.length} 块成熟作物`)
        if (harvestBlocks.length > 0) {
            const first = harvestBlocks[0].crop
            console.log(`[farmer] 第一块作物: name=${first.name}, diggable=${first.diggable}, pos=${first.position}`)
            console.log(`[farmer] digTime=${botRef.digTime(first)}`)
        }

        for (const { crop } of harvestBlocks) {
            if (!farming) break
            if (!crop || !crop.position) continue
            try {
                await botRef.lookAt(crop.position.offset(0.5, 0.5, 0.5))

                if (botRef.digTime(crop) === Infinity || !crop.diggable) {
                    // 先空手右键（避免用种子右键到作物上）
                    const emptySlot = botRef.inventory.items().find(i => i.name === 'air')
                    if (!emptySlot) {
                        // 切到任意非种子物品
                        const anyItem = botRef.inventory.items().find(
                            i => !['wheat_seeds', 'potato_seeds', 'carrot_seeds'].includes(i.name)
                        )
                        if (anyItem) await botRef.equip(anyItem, 'hand')
                    }
                    await botRef.activateBlock(crop)
                    console.log('[farmer] 右键收割:', crop.name)
                } else {
                    const digPromise = botRef.dig(crop)
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('dig timeout')), 2000)
                    )
                    await Promise.race([digPromise, timeoutPromise])
                }
                harvested++
                await new Promise(r => setTimeout(r, 200))
            } catch (err) {
                console.log('[farmer] 收割失败:', err.message)
            }
        }
        if (harvested > 0) {
            console.log(`[farmer] 收割 ${harvested} 个小麦`)
            // 等掉落物被拾取
            await new Promise(r => setTimeout(r, 500))
        }

        // 2. 补种
        const emptyFarmland = findEmptyFarmland()
        let sowed = 0

        for (const farmland of emptyFarmland) {
            if (!farming) break
            if (!farmland || !farmland.position) continue
            try {
                
                const seeds = botRef.inventory.items().find(
                    i => ['wheat_seeds', 'potato_seeds', 'carrot_seeds'].includes(i.name)
                )
                if (!seeds) {
                    console.log('[farmer] 没有种子了')
                    break
                }
                await botRef.equip(seeds, 'hand')
                // 看向耕地 + 右键种下（用 activateBlock，不等 blockUpdate）
                await botRef.lookAt(farmland.position.offset(0.5, 1.5, 0.5))
                await botRef.activateBlock(farmland)
                sowed++
                await new Promise(r => setTimeout(r, 200))
            } catch (err) {
                console.log('[farmer] 补种失败:', err.message)
            }
        }
        if (sowed > 0) console.log(`[farmer] 补种 ${sowed} 个`)
    } catch (e) {
        console.log('[farmer] 错误:', e.message)
    }

    farmTimer = setTimeout(farmLoop, 3000)
}

function setupFarmer(bot) {
    botRef = bot

    bot.on('chat', (username, message) => {
        if (message === 'farm start') {
            if (farming) {
                bot.chat('已经在种田了')
                return
            }
            farming = true
            farmLoop()
            bot.chat('开始种田')
            console.log('[farmer] 开始种田')
        }

        if (message === 'farm stop') {
            farming = false
            clearTimeout(farmTimer)
            farmTimer = null
            bot.chat('停止种田')
            console.log('[farmer] 停止种田')
        }

        // 寻找附近耕地
        if (message === 'farm find') {
            findAndReportFarmland(bot)
        }
    })
}

function stopFarming() {
    farming = false
    if (farmTimer) {
        clearTimeout(farmTimer)
        farmTimer = null
    }
}

module.exports = { setupFarmer, stopFarming }
