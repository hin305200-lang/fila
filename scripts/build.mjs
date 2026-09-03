import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const dist = resolve(root, 'dist')
const framesDir = resolve(root, 'assets', 'hero-frames')
const distFrames = resolve(dist, 'assets', 'hero-frames')

if (!existsSync(framesDir)) {
  throw new Error('Missing assets/hero-frames. The cloud sequence cannot build without those images.')
}

await rm(dist, { recursive: true, force: true })
await mkdir(resolve(dist, 'assets'), { recursive: true })
await Promise.all([
  cp(resolve(root, 'index.html'), resolve(dist, 'index.html')),
  cp(resolve(root, 'src'), resolve(dist, 'src'), { recursive: true }),
  cp(framesDir, distFrames, { recursive: true }),
])

console.log('Built dist/ with the cinematic image sequence.')
