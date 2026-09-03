import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('reference map is independently verified', async () => {
  const map = await read('REFERENCE_MAP.md')
  assert.match(map, /STATUS: VERIFIED by independent verifier/)
  assert.match(map, /## Section map/)
})

test('image sequence is complete and ordered', async () => {
  const { execFileSync } = await import('node:child_process')
  const zip = new URL('../public/assets/hero-frames.zip', import.meta.url)
  const listing = execFileSync(
    'python3',
    ['-c', 'import zipfile,sys; print("\\n".join(zipfile.ZipFile(sys.argv[1]).namelist()))', zip.pathname],
    { encoding: 'utf8' },
  )
  const frames = listing
    .split('\n')
    .map((name) => name.replace(/^.*\//, '').trim())
    .filter((name) => /^frame-\d{3}\.webp$/.test(name))
    .sort()
  assert.equal(frames.length, 157)
  assert.equal(frames.at(0), 'frame-001.webp')
  assert.equal(frames.at(-1), 'frame-157.webp')
})

test('page exposes a progressive, accessible cinematic journey', async () => {
  const [html, css, js] = await Promise.all([read('index.html'), read('src/styles.css'), read('src/main.js')])
  assert.match(html, /<canvas class="sequence-canvas"/)
  assert.match(html, /data-chapter="arrival"/)
  assert.match(html, /aria-controls="menu-panel"/)
  assert.match(css, /prefers-reduced-motion: reduce/)
  assert.match(css, /:focus-visible/)
  assert.match(js, /const FRAME_COUNT = 157/)
  assert.match(js, /Math\.min\(window\.devicePixelRatio \|\| 1, 1\.5\)/)
  assert.doesNotMatch(html, /<video/i)
})
