import { updateDrone } from './drone-overlay.js'
import { initContactPortal } from './contact-portal.js'

const HERO_FRAMES = {
  directory: './assets/hero-frames',
  prefix: 'frame-',
  extension: '.webp',
  pad: 3,
}

const FRAME_COUNT = 157
const PRELOAD_COUNT = 14
const images = new Array(FRAME_COUNT)
const loaded = new Set()
const loading = new Map()
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

const sequence = document.querySelector('[data-sequence]')
const canvas = document.querySelector('.sequence-canvas')
const poster = document.querySelector('.sequence-poster')
const ctx = canvas?.getContext('2d', { alpha: false })
const chapters = [...document.querySelectorAll('[data-chapter]')]
const loadBar = document.querySelector('[data-load-progress]')
const loadingStatus = document.querySelector('.loading-status')
const progressBar = document.querySelector('[data-scroll-progress]')
const chapterIndex = document.querySelector('[data-chapter-index]')
const header = document.querySelector('[data-header]')
const concierge = document.querySelector('#concierge')

let desiredFrame = 0
let displayedFrame = -1
let displayedBlend = -1
let raf = 0
let lastScroll = window.scrollY
let displayedProgress = 0
let lastTime = 0
const REVEAL_HOLD = 0.1
const CAMERA_FOLLOW = 7

const frameUrl = (index) =>
  `${HERO_FRAMES.directory}/${HERO_FRAMES.prefix}${String(index + 1).padStart(HERO_FRAMES.pad, '0')}${HERO_FRAMES.extension}`

function loadFrame(index) {
  const bounded = Math.max(0, Math.min(FRAME_COUNT - 1, index))
  if (loaded.has(bounded)) return Promise.resolve(images[bounded])
  if (loading.has(bounded)) return loading.get(bounded)

  const task = new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = async () => {
      try { await image.decode?.() } catch {}
      images[bounded] = image
      loaded.add(bounded)
      loading.delete(bounded)
      resolve(image)
    }
    image.onerror = () => {
      loading.delete(bounded)
      reject(new Error(`Frame ${bounded + 1} failed`))
    }
    image.src = frameUrl(bounded)
  })
  loading.set(bounded, task)
  return task
}

async function preloadInitial() {
  const queue = [0, FRAME_COUNT - 1, ...Array.from({ length: PRELOAD_COUNT - 2 }, (_, i) => i + 1)]
  let complete = 0
  for (let cursor = 0; cursor < queue.length; cursor += 5) {
    const batch = queue.slice(cursor, cursor + 5)
    await Promise.allSettled(batch.map(loadFrame))
    complete += batch.length
    if (loadBar) loadBar.style.width = `${Math.min(100, (complete / queue.length) * 100)}%`
  }
  document.documentElement.dataset.enhanced = 'true'
  loadingStatus?.classList.add('is-ready')
  requestRender()
  warmSequence()
}

function warmSequence() {
  const order = Array.from({ length: FRAME_COUNT }, (_, i) => i).filter((i) => !loaded.has(i))
  let cursor = 0
  const pump = () => {
    if (cursor >= order.length) return
    const batch = order.slice(cursor, cursor + 4)
    cursor += batch.length
    Promise.allSettled(batch.map(loadFrame)).finally(() => setTimeout(pump, 10))
  }
  pump()
}

function findNearestLoaded(target) {
  if (loaded.has(target)) return target
  for (let distance = 1; distance < FRAME_COUNT; distance += 1) {
    if (target - distance >= 0 && loaded.has(target - distance)) return target - distance
    if (target + distance < FRAME_COUNT && loaded.has(target + distance)) return target + distance
  }
  return -1
}

function viewHeight() {
  return Math.round(window.visualViewport?.height || window.innerHeight)
}

function isCompactView() {
  return window.innerWidth <= 800
}

function setAppHeight() {
  document.documentElement.style.setProperty('--app-height', `${viewHeight()}px`)
  document.documentElement.classList.toggle('is-compact', isCompactView())
  document.documentElement.classList.toggle('is-short', viewHeight() <= 540)
}

function resizeCanvas() {
  if (!canvas || !ctx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  const width = Math.round(canvas.clientWidth * dpr)
  const height = Math.round(canvas.clientHeight * dpr)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    requestRender()
  }
}

function coverDraw(image) {
  const cw = canvas.width
  const ch = canvas.height
  const scale = Math.max(cw / image.naturalWidth, ch / image.naturalHeight)
  ctx.drawImage(
    image,
    (cw - image.naturalWidth * scale) / 2,
    (ch - image.naturalHeight * scale) / 2,
    image.naturalWidth * scale,
    image.naturalHeight * scale,
  )
}

function drawFrame(progress) {
  if (!canvas || !ctx) return
  const pos = progress * (FRAME_COUNT - 1)
  const i0 = Math.max(0, Math.min(FRAME_COUNT - 1, Math.floor(pos)))
  const i1 = Math.min(FRAME_COUNT - 1, i0 + 1)
  const mix = pos - i0
  const a = findNearestLoaded(i0)
  if (a < 0) return
  const b = findNearestLoaded(i1)
  const key = a + (b === a ? 0 : mix)
  if (displayedFrame === a && Math.abs(key - displayedBlend) < .002) return

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  coverDraw(images[a])
  if (b >= 0 && b !== a && mix > .02 && images[b]) {
    ctx.globalAlpha = mix
    coverDraw(images[b])
    ctx.globalAlpha = 1
  }
  displayedFrame = a
  displayedBlend = key
}

function sequenceProgress() {
  if (!sequence) return 0
  const rect = sequence.getBoundingClientRect()
  const travel = Math.max(1, sequence.offsetHeight - viewHeight())
  return Math.max(0, Math.min(1, -rect.top / travel))
}

function cinematicProgress(t) {
  const usable = 1 - REVEAL_HOLD
  if (t >= usable) return 1
  const x = t / usable
  const smooth = x * x * x * (x * (x * 6 - 15) + 10)
  return smooth * 0.28 + x * 0.72
}

function chapterOpacity(progress, start, end) {
  const span = end - start
  const fade = Math.min(.08, span * .4)
  if (progress < start || progress > end) return 0
  if (start > 0 && progress < start + fade) return (progress - start) / fade
  if (progress > end - fade) return (end - progress) / fade
  return 1
}

function updateChapters(progress) {
  let active = 0
  const compact = isCompactView()
  chapters.forEach((chapter, index) => {
    const start = Number(chapter.dataset.start)
    const end = Number(chapter.dataset.end)
    const opacity = chapterOpacity(progress, start, end)
    if (opacity > .45) active = index
    chapter.style.opacity = opacity.toFixed(3)
    chapter.style.visibility = opacity > .01 ? 'visible' : 'hidden'
    const shift = (1 - opacity) * (compact ? 10 : 18)
    if (compact) {
      chapter.style.transform = `translate3d(0, ${shift}px, 0)`
      return
    }
    const pan = (progress - (start + end) / 2) * (window.innerWidth > 1100 ? 26 : 14)
    const base = chapter.classList.contains('chapter--hero')
      ? 'translate(-50%, -52%)'
      : 'translate(0, 0)'
    chapter.style.transform = `${base} translate3d(${pan.toFixed(2)}px, ${shift}px, 0)`
  })
  if (chapterIndex) chapterIndex.textContent = String(active).padStart(2, '0')
}

function requestRender() {
  if (raf) return
  raf = requestAnimationFrame((now) => {
    raf = 0
    if (header && concierge) header.dataset.light = String(concierge.getBoundingClientRect().top < 72)
    if (reduceMotion.matches) {
      poster.src = frameUrl(FRAME_COUNT - 1)
      updateDrone(1)
      return
    }
    const dt = Math.min(.048, Math.max(0, (now - lastTime) / 1000)) || .016
    lastTime = now
    const target = cinematicProgress(sequenceProgress())
    displayedProgress += (target - displayedProgress) * (1 - Math.exp(-dt * CAMERA_FOLLOW))
    if (Math.abs(target - displayedProgress) < .00025) displayedProgress = target
    const progress = displayedProgress
    const pos = progress * (FRAME_COUNT - 1)
    desiredFrame = Math.max(0, Math.min(FRAME_COUNT - 1, Math.floor(pos)))
    loadFrame(desiredFrame).then(requestRender).catch(() => {})
    loadFrame(Math.min(FRAME_COUNT - 1, desiredFrame + 1)).then(requestRender).catch(() => {})
    drawFrame(progress)
    updateChapters(progress)
    updateDrone(progress)
    if (progressBar) progressBar.style.width = `${progress * 100}%`
    const direction = window.scrollY > lastScroll ? 'down' : 'up'
    if (header) header.dataset.calm = String(progress > .08 && progress < .92 && direction === 'down')
    lastScroll = window.scrollY
    if (Math.abs(target - displayedProgress) > .00025) requestRender()
  })
}

function scrollToProgress(progress) {
  if (!sequence) return
  const top = sequence.getBoundingClientRect().top + window.scrollY
  const travel = sequence.offsetHeight - viewHeight()
  window.scrollTo({ top: top + travel * progress, behavior: reduceMotion.matches ? 'auto' : 'smooth' })
}

function onViewportChange() {
  setAppHeight()
  resizeCanvas()
  requestRender()
}

document.querySelectorAll('a[href="#arrival"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault()
    scrollToProgress(.88)
  })
})

const menuTrigger = document.querySelector('.menu-trigger')
const menuPanel = document.querySelector('.menu-panel')
const menuBackdrop = document.querySelector('[data-menu-backdrop]')
const menuClose = document.querySelector('.menu-close')

function setMenu(open, restoreFocus = false) {
  menuTrigger?.setAttribute('aria-expanded', String(open))
  menuPanel?.setAttribute('aria-hidden', String(!open))
  menuPanel?.toggleAttribute('inert', !open)
  menuPanel?.classList.toggle('is-open', open)
  if (menuBackdrop) {
    menuBackdrop.hidden = false
    requestAnimationFrame(() => menuBackdrop.classList.toggle('is-open', open))
    if (!open) setTimeout(() => { menuBackdrop.hidden = true }, 360)
  }
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) setTimeout(() => menuClose?.focus(), 120)
  if (!open && restoreFocus) menuTrigger?.focus()
}

menuTrigger?.addEventListener('click', () => setMenu(true))
menuClose?.addEventListener('click', () => setMenu(false, true))
menuBackdrop?.addEventListener('click', () => setMenu(false, true))
menuPanel?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)))
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuTrigger?.getAttribute('aria-expanded') === 'true') setMenu(false, true)
})

window.addEventListener('scroll', requestRender, { passive: true })
window.addEventListener('resize', onViewportChange, { passive: true })
window.addEventListener('orientationchange', onViewportChange)
window.addEventListener('touchmove', requestRender, { passive: true })
window.visualViewport?.addEventListener('resize', onViewportChange)
reduceMotion.addEventListener?.('change', () => location.reload())

setAppHeight()
resizeCanvas()
initContactPortal()
preloadInitial().catch(() => {
  loadingStatus?.classList.add('is-ready')
  document.documentElement.dataset.enhanced = 'fallback'
})
