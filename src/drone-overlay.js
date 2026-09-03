const TOWER_REVEAL = 1

const layer = document.querySelector('[data-drone-layer]')
const craft = layer?.querySelector('[data-drone-craft]')
const ghosts = [...(layer?.querySelectorAll('[data-drone-ghost]') ?? [])]
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

function flightProgress(progress) {
  return Math.max(0, Math.min(1, progress / TOWER_REVEAL))
}

function pointOnPath(t) {
  const c = Math.max(0, Math.min(1, t))
  return {
    x: 50 + Math.sin(c * Math.PI) * 12,
    y: -10 + c * 122,
  }
}

function poseAt(t) {
  const c = Math.max(0, Math.min(1, t))
  const now = pointOnPath(c)
  const next = pointOnPath(c + 0.012)
  const dx = next.x - now.x
  const dy = next.y - now.y
  return {
    x: now.x,
    y: now.y,
    rotate: Math.atan2(dy, dx) * (180 / Math.PI),
    scale: 0.48 + c * 0.7,
    speed: Math.hypot(dx, dy),
  }
}

function applyPose(el, pose, opacity, extraBlur) {
  el.style.setProperty('--drone-x', `${pose.x}%`)
  el.style.setProperty('--drone-y', `${pose.y}%`)
  el.style.setProperty('--drone-rotate', `${pose.rotate}deg`)
  el.style.setProperty('--drone-scale', pose.scale.toFixed(3))
  el.style.setProperty('--drone-blur', `${Math.min(5.5, pose.speed * 0.14) + extraBlur}px`)
  el.style.opacity = opacity.toFixed(3)
}

export function updateDrone(progress) {
  if (!layer || !craft) return
  if (reduceMotion.matches) {
    layer.hidden = true
    return
  }

  const t = flightProgress(progress)
  const fade = t >= 1 ? 0 : Math.min(1, (1 - t) / 0.1)
  layer.hidden = fade <= 0.01
  if (layer.hidden) return

  applyPose(craft, poseAt(t), fade, 0)
  ghosts.forEach((ghost, index) => {
    const lag = (index + 1) * 0.02
    applyPose(ghost, poseAt(t - lag), fade * (0.28 / (index + 1)), 1.1 + index * 1.3)
  })
}
