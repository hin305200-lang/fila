const STEPS = [
  {
    key: 'name',
    kicker: '01 — IDENTITY',
    title: 'State your name.',
    label: 'Name',
    action: 'Continue',
    handshake: 'linking identity',
    type: 'text',
    autocomplete: 'name',
    placeholder: 'Your name',
    pattern: /.{2,}/,
    hint: 'Enter at least two characters.',
  },
  {
    key: 'phone',
    kicker: '02 — FREQUENCY',
    title: 'Your phone number.',
    label: 'Phone number',
    action: 'Continue',
    handshake: 'tuning frequency',
    type: 'tel',
    autocomplete: 'tel',
    placeholder: '0000000000',
    pattern: /\d{7,}/,
    hint: 'Include a reachable number.',
  },
  {
    key: 'email',
    kicker: '03 — COORDINATES',
    title: 'Your email.',
    label: 'Email',
    action: 'Transmit',
    handshake: 'locking coordinates',
    type: 'email',
    autocomplete: 'email',
    placeholder: 'you@domain.com',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    hint: 'Use a valid email address.',
  },
]

const CIRC = 2 * Math.PI * 52
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ΔΞΦΩ'

export function initContactPortal() {
  const portal = document.querySelector('[data-portal]')
  const form = portal?.querySelector('[data-portal-form]')
  const input = portal?.querySelector('[data-portal-input]')
  const title = portal?.querySelector('[data-portal-title]')
  const kicker = portal?.querySelector('[data-portal-kicker]')
  const label = portal?.querySelector('[data-portal-label]')
  const hint = portal?.querySelector('[data-portal-hint]')
  const action = portal?.querySelector('[data-portal-action]')
  const count = portal?.querySelector('[data-portal-count]')
  const ring = portal?.querySelector('[data-portal-ring]')
  const done = portal?.querySelector('[data-portal-done]')
  const handshake = portal?.querySelector('[data-portal-handshake]')
  const handshakeText = portal?.querySelector('[data-portal-handshake-text]')
  const closeBtn = portal?.querySelector('[data-portal-close]')
  const voidEl = portal?.querySelector('[data-portal-void]')
  const clock = portal?.querySelector('[data-portal-clock]')
  const nodes = [...(portal?.querySelectorAll('[data-portal-node]') ?? [])]
  if (!portal || !form || !input) return

  const payload = { name: '', phone: '', email: '' }
  let step = 0
  let lastFocus = null
  let lockTimer = 0
  let decodeTimer = 0
  let clockTimer = 0

  const digits = (value) => value.replace(/\D/g, '')
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function valid() {
    const spec = STEPS[step]
    const value = input.value.trim()
    if (spec.key === 'phone') return spec.pattern.test(digits(value))
    return spec.pattern.test(value)
  }

  function decodeInto(el, text) {
    window.clearInterval(decodeTimer)
    if (reduceMotion || !el) {
      if (el) el.textContent = text
      return
    }
    let frame = 0
    const total = Math.max(12, text.length + 6)
    decodeTimer = window.setInterval(() => {
      frame += 1
      const revealed = Math.floor((frame / total) * text.length)
      el.textContent = [...text]
        .map((char, index) => {
          if (char === ' ' || char === '.' || char === "'" || char === ',' || index < revealed) return char
          return GLYPHS[(index + frame + revealed) % GLYPHS.length]
        })
        .join('')
      if (frame >= total) {
        el.textContent = text
        window.clearInterval(decodeTimer)
      }
    }, 28)
  }

  function paint(animateTitle = true) {
    const spec = STEPS[step]
    const progress = (step + 1) / STEPS.length
    kicker.textContent = spec.kicker
    if (animateTitle) decodeInto(title, spec.title)
    else title.textContent = spec.title
    label.textContent = spec.label
    action.textContent = spec.action
    count.textContent = String(step + 1).padStart(2, '0')
    input.type = spec.type
    input.name = spec.key
    input.autocomplete = spec.autocomplete
    input.placeholder = spec.placeholder
    input.value = payload[spec.key]
    input.setAttribute('aria-invalid', 'false')
    hint.textContent = ''
    ring.style.strokeDasharray = String(CIRC)
    ring.style.strokeDashoffset = String(CIRC * (1 - progress))
    nodes.forEach((node, index) => node.classList.toggle('is-on', index <= step))
    portal.classList.remove('is-complete')
    form.hidden = false
    if (done) done.hidden = true
    if (handshake) handshake.hidden = true
  }

  function tickClock() {
    if (!clock) return
    const now = new Date()
    const ms = String(now.getMilliseconds()).padStart(3, '0').slice(0, 2)
    clock.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${ms}`
  }

  const chrome = [document.querySelector('.site-header'), document.querySelector('main'), document.querySelector('footer'), document.querySelector('.menu-panel')]

  function setOpen(open) {
    portal.hidden = !open
    portal.setAttribute('aria-hidden', String(!open))
    document.body.style.overflow = open ? 'hidden' : ''
    chrome.forEach((el) => { if (el) el.inert = open })
    window.clearInterval(clockTimer)
    if (open) {
      lastFocus = document.activeElement
      step = 0
      payload.name = ''
      payload.phone = ''
      payload.email = ''
      paint(true)
      tickClock()
      clockTimer = window.setInterval(tickClock, 70)
      setTimeout(() => input.focus(), 80)
    } else {
      window.clearInterval(decodeTimer)
      if (lastFocus?.focus) lastFocus.focus()
    }
  }

  function lockThen(message, next) {
    portal.classList.add('is-locking')
    form.inert = true
    if (handshake) {
      handshake.hidden = false
      if (handshakeText) handshakeText.textContent = message
    }
    window.clearTimeout(lockTimer)
    lockTimer = window.setTimeout(() => {
      portal.classList.remove('is-locking')
      form.inert = false
      if (handshake) handshake.hidden = true
      next()
    }, reduceMotion ? 40 : 640)
  }

  function complete() {
    form.hidden = true
    if (done) done.hidden = false
    if (handshake) handshake.hidden = true
    portal.classList.add('is-complete')
    ring.style.strokeDashoffset = '0'
    nodes.forEach((node) => node.classList.add('is-on'))
    count.textContent = 'OK'
    kicker.textContent = '04 — CONFIRMED'
    decodeInto(title, "You're in the sequence.")
    closeBtn?.focus()
  }

  function focusables() {
    return [...portal.querySelectorAll('button, [href], input, textarea, select')]
      .filter((el) => !el.hasAttribute('disabled') && !el.closest('[hidden]') && el.offsetParent !== null)
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (!valid()) {
      hint.textContent = STEPS[step].hint
      input.setAttribute('aria-invalid', 'true')
      input.focus()
      return
    }
    payload[STEPS[step].key] = input.value.trim()
    const message = STEPS[step].handshake
    lockThen(message, () => {
      if (step < STEPS.length - 1) {
        step += 1
        paint(true)
        input.focus()
        return
      }
      complete()
    })
  })

  document.querySelectorAll('[data-contact-open]').forEach((trigger) => {
    trigger.addEventListener('click', () => setOpen(true))
  })
  closeBtn?.addEventListener('click', () => setOpen(false))
  voidEl?.addEventListener('click', () => setOpen(false))
  document.addEventListener('keydown', (event) => {
    if (portal.hidden) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopImmediatePropagation()
      setOpen(false)
      return
    }
    if (event.key !== 'Tab') return
    const items = focusables()
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }, true)
}
