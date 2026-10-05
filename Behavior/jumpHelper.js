// jumpHelper.js — 共享跳跃逻辑（定时跳跃 + 多角度障碍检测 + 间隙检测 + 卡住检测）

const states = new WeakMap()

function getState(bot) {
    if (!states.has(bot)) {
        states.set(bot, {
            holdTimer: 0,       // 跳跃按键保持剩余 tick 数
            cooldown: 0,        // 跳跃冷却剩余 tick 数
            lastPos: null,      // 上一帧位置，用于卡住检测
            stuckCounter: 0,    // 连续卡住 tick 数
        })
    }
    return states.get(bot)
}

/**
 * 每 physicsTick 调用一次，管理跳跃状态。
 * @param {object} bot - mineflayer bot 实例
 * @param {number} yaw  - 当前朝向的 yaw 角
 */
function tickJump(bot, yaw) {
    const s = getState(bot)
    const pos = bot.entity.position

    // ===== 阶段1：释放跳跃按键 =====
    if (s.holdTimer > 0) {
        s.holdTimer--
        if (s.holdTimer === 0) {
            bot.setControlState('jump', false)
            s.cooldown = 5   // 跳完后冷却，避免连跳
        }
        return
    }

    // ===== 阶段2：冷却中 =====
    if (s.cooldown > 0) {
        s.cooldown--
        return
    }

    // ===== 阶段3：判断是否需要跳跃 =====
    const fx = -Math.sin(yaw)
    const fz = -Math.cos(yaw)

    let shouldJump = false

    // --- 检测1：正前方多高度障碍物扫描 ---
    for (const h of [0.3, 0.5, 0.7]) {
        const block = bot.blockAt(pos.offset(fx, h, fz))
        if (block && block.boundingBox === 'block') {
            const head = bot.blockAt(pos.offset(fx, h + 1.0, fz))
            if (!head || head.boundingBox !== 'block') {
                shouldJump = true
                break
            }
        }
    }

    // --- 检测2：前方间隙/沟壑（1 格落差） ---
    if (!shouldJump) {
        const below = bot.blockAt(pos.offset(fx, -0.5, fz))
        const farFoot = bot.blockAt(pos.offset(fx * 1.8, 0.3, fz * 1.8))
        if ((!below || below.boundingBox !== 'block')
            && farFoot && farFoot.boundingBox === 'block') {
            shouldJump = true
        }
    }

    // --- 检测3：侧面障碍物（±0.4 偏移）---
    if (!shouldJump) {
        const sx = -fz * 0.4    // 垂直于前进方向
        const sz = fx * 0.4
        for (const side of [1, -1]) {
            const checkX = fx + sx * side
            const checkZ = fz + sz * side
            const block = bot.blockAt(pos.offset(checkX, 0.3, checkZ))
            if (block && block.boundingBox === 'block') {
                const head = bot.blockAt(pos.offset(checkX, 1.3, checkZ))
                if (!head || head.boundingBox !== 'block') {
                    shouldJump = true
                    break
                }
            }
        }
    }

    // --- 检测4：卡住检测（位置长时间不变）---
    if (!shouldJump && s.lastPos) {
        const moved = Math.abs(pos.x - s.lastPos.x) + Math.abs(pos.z - s.lastPos.z)
        if (moved < 0.03) {
            s.stuckCounter++
            if (s.stuckCounter > 30) {
                // 确认前面不是 2 格高墙才跳
                const headHigh = bot.blockAt(pos.offset(fx, 1.8, fz))
                if (!headHigh || headHigh.boundingBox !== 'block') {
                    shouldJump = true
                }
                s.stuckCounter = 0
            }
        } else {
            s.stuckCounter = 0
        }
    }
    s.lastPos = pos.clone()

    // ===== 触发跳跃 =====
    if (shouldJump) {
        bot.setControlState('jump', true)
        s.holdTimer = 2   // 按住 2 tick 后自动松开
    }
}

/** 重置跳跃状态并松开跳跃键 */
function resetJump(bot) {
    states.delete(bot)
    bot.setControlState('jump', false)
}

module.exports = { tickJump, resetJump }
