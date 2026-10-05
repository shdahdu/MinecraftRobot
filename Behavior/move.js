
const { tickJump, resetJump } = require('./jumpHelper')

let followTarget = null
let botRef = null
let tickCount = 0
let hurtCooldown = 0

function setupMove(bot) {
    botRef = bot

    bot.on('damage', () => { hurtCooldown = 20 })       // 1秒
    bot.on('entityHurt', (e) => {
        if (e === bot.entity) hurtCooldown = 20
    })

    bot.on('physicsTick', () => {
        if (!followTarget || !botRef) return

        if (hurtCooldown > 0) {
            hurtCooldown--
            botRef.setControlState('forward', false)
            resetJump(botRef)
            return
        }

        const player = botRef.players[followTarget]
        if (!player || !player.entity) return

        const myPos = botRef.entity.position
        const targetPos = player.entity.position
        const dist = myPos.distanceTo(targetPos)

        if (dist > 30 || dist <= 2.5) {
            botRef.setControlState('forward', false)
            resetJump(botRef)
            return
        }

        const dx = targetPos.x - myPos.x
        const dz = targetPos.z - myPos.z
        const yaw = Math.atan2(-dx, -dz)

        botRef.setControlState('forward', true)
        botRef.look(yaw, 0, false)

        tickCount++
        if (tickCount % 2 === 0) {
            const step = 0.075  // 每 tick 步进 tiao su du
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
        if (!message.startsWith('follow ')) return
        const name = message.substring(7).trim()
        if (name === 'stop') {
            followTarget = null
            botRef?.setControlState('forward', false)
            resetJump(botRef)
            bot.chat('停止跟随')
            return
        }
        if (!bot.players[name]) {
            bot.chat(`找不到 ${name}`)
            return
        }
        followTarget = name
        bot.chat(`开始跟随 ${name}`)
    })
}

function stopFollow() {
    if (botRef) {
        botRef.setControlState('forward', false)
        resetJump(botRef)
    }
    followTarget = null
}

function isFollowing() {
    return followTarget !== null
}

module.exports = { setupMove, stopFollow, isFollowing }
