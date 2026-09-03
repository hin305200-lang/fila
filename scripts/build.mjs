import { cp, mkdir, rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const dist = resolve(root, 'dist')
const framesZip = resolve(root, 'public', 'assets', 'hero-frames.zip')
const framesDir = resolve(root, 'public', 'assets', 'hero-frames')
const distFrames = resolve(dist, 'assets', 'hero-frames')

await rm(dist, { recursive: true, force: true })
await mkdir(distFrames, { recursive: true })
await Promise.all([
  cp(resolve(root, 'index.html'), resolve(dist, 'index.html')),
  cp(resolve(root, 'src'), resolve(dist, 'src'), { recursive: true }),
])

if (existsSync(framesZip)) {
  execFileSync('unzip', ['-oq', framesZip, '-d', distFrames])
} else if (existsSync(framesDir)) {
  await cp(framesDir, distFrames, { recursive: true })
} else {
  throw new Error('Missing hero frames. Add public/assets/hero-frames.zip or public/assets/hero-frames/.')
}

console.log('Built dist/ with the cinematic image sequence.')
