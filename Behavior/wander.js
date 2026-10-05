const { Vec3 } = require('vec3')
const { tickJump, resetJump } = require('./jumpHelper')


let wanderMode = false
let wanderGoal = null
let botRef = null
let tickCount = 0


let interactCount = 0
let interactThreshold = 60
let interactBusy = false

// 受伤保护
let hurtCooldown = 0

// 不可破坏的方块名
const BREAK_BLACKLIST = new Set(['lava', 'flowing_lava'])

// 可放置的方块名
const PLACEABLE = new Set([
    'dirt', 'grass_block', 'stone', 'cobblestone', 'oak_planks',
    'spruce_planks', 'birch_planks', 'sand', 'gravel', 'glass',
    'bricks', 'netherrack', 'oak_log', 'spruce_log', 'birch_log',
    'wool', 'terracotta', 'nether_bricks', 'stone_bricks'
])

function setupWander(bot) {
    botRef = bot

    bot.on('damage', () => { hurtCooldown = 20 })
    bot.on('entityHurt', (e) => {
        if (e === bot.entity) hurtCooldown = 20
    })

    bot.on('physicsTick', () => {
        if (!wanderMode || !botRef) return

        if (hurtCooldown > 0) {
            hurtCooldown--
            botRef.setControlState('forward', false)
            resetJump(botRef)
            return
        }

       
        interactCount++
        if (interactCount >= interactThreshold && !interactBusy) {
            interactCount = 0
            interactThreshold = 60 + Math.floor(Math.random() * 1000)
            if (Math.random() < 0.5) {
                tryBreakRandom()
            } else {
                tryPlaceRandom()
            }
        }

        const myPos = botRef.entity.position

        if (!wanderGoal || myPos.distanceTo(wanderGoal) < 2) {
            wanderGoal = {
                x: myPos.x + (Math.random() - 0.5) * 30,
                z: myPos.z + (Math.random() - 0.5) * 30
            }
        }

        const dx = wanderGoal.x - myPos.x
        const dz = wanderGoal.z - myPos.z
        if (Math.abs(dx) < 0.5 && Math.abs(dz) < 0.5) {
            wanderGoal = {
                x: myPos.x + (Math.random() - 0.5) * 30,
                z: myPos.z + (Math.random() - 0.5) * 30
            }
            return
        }//速度模块

        const yaw = Math.atan2(-dx, -dz)

        botRef.setControlState('forward', true)
        botRef.look(yaw, 0, false)

      
        tickCount++
        if (tickCount % 2 === 0) {
            const step = 0.075
            const newX = myPos.x - Math.sin(yaw) * step
            const newZ = myPos.z - Math.cos(yaw) * step
            botRef.entity.position.x = newX
            botRef.entity.position.z = newZ
            botRef._client.write('position_look', {
                x: newX, y: myPos.y, z: newZ,
                yaw: yaw, pitch: 0, onGround: true
            })
        }

        tickJump(botRef, yaw)
    })

    bot.on('chat', (username, message) => {
        if (message === 'wander') {
            wanderMode = true
            wanderGoal = null
            bot.chat('开始游荡')
        }
        if (message === 'wander stop') {
            wanderMode = false
            botRef?.setControlState('forward', false)
            resetJump(botRef)
            bot.chat('停止游荡')
        }
    })
}

async function tryBreakRandom() {
    if (interactBusy || !botRef) return
    interactBusy = true
    try {
        const myPos = botRef.entity.position
        const candidates = []
        for (let x = -4; x <= 4; x++) {
            for (let y = -1; y <= 2; y++) {
                for (let z = -4; z <= 4; z++) {
                    const pos = myPos.offset(x, y, z)
                    const block = botRef.blockAt(pos)
                    if (!block) continue
                    if (block.boundingBox !== 'block') continue
                    if (BREAK_BLACKLIST.has(block.name)) continue
                    if (x === 0 && z === 0 && y === -1) continue
                    if (!botRef.canDigBlock(block)) continue
                    candidates.push(block)
                }
            }
        }
        if (candidates.length === 0) return
        const target = candidates[Math.floor(Math.random() * candidates.length)]
        console.log(`[wander] 随机破坏: ${target.name} @ ${target.position}`)
        await botRef.lookAt(target.position.offset(0.5, 0.5, 0.5))
        await botRef.dig(target)
        console.log('[wander] 破坏完成')
    } catch (err) {
        console.log('[wander] 破坏失败:', err.message)
    } finally {
        interactBusy = false
    }
}

async function tryPlaceRandom() {
    if (interactBusy || !botRef) return
    interactBusy = true
    try {
        const item = botRef.inventory.items().find(i => PLACEABLE.has(i.name))
        if (!item) return
        const myPos = botRef.entity.position
        const candidates = []
        for (let x = -3; x <= 3; x++) {
            for (let y = -1; y <= 2; y++) {
                for (let z = -3; z <= 3; z++) {
                    const pos = myPos.offset(x, y, z)
                    const block = botRef.blockAt(pos)
                    if (!block || block.boundingBox !== 'block') continue
                    const above = botRef.blockAt(pos.offset(0, 1, 0))
                    if (above && above.boundingBox === 'block') continue
                    candidates.push(block)
                }
            }
        }
        if (candidates.length === 0) return
        const refBlock = candidates[Math.floor(Math.random() * candidates.length)]
        console.log(`[wander] 随机放置: ${item.name} 在 ${refBlock.name} 上方`)
        await botRef.equip(item, 'hand')
        await botRef.lookAt(refBlock.position.offset(0.5, 1, 0.5))
        await botRef.placeBlock(refBlock, new Vec3(0, 1, 0))
        console.log('[wander] 放置完成')
    } catch (err) {
        console.log('[wander] 放置失败:', err.message)
    } finally {
        interactBusy = false
    }
}

function startWander() { wanderMode = true; wanderGoal = null }
function stopWander() {
    if (botRef) {
        botRef.setControlState('forward', false)
        resetJump(botRef)
    }
    wanderMode = false
}
function isWandering() { return wanderMode }

module.exports = { setupWander, startWander, stopWander, isWandering }
