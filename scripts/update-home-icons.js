/**
 * Update the ICONS map in src/views/home.tsx with the same high-quality
 * SVG paths used in the seed (extracted from Simple Icons + Lucide).
 *
 * Run: node /home/z/my-project/scripts/update-home-icons.js
 */
const fs = require('fs')

// Read seed-turso.ts and extract slug -> svg map
const seed = fs.readFileSync('/home/z/my-project/scripts/seed-turso.ts', 'utf8')
const slugSvg = {}
const re = /slug:\s*"([^"]+)",[^]*?svg:\s*"([^"]+)"/g
let m
while ((m = re.exec(seed)) !== null) {
  slugSvg[m[1]] = m[2]
}

// Keys used in home.tsx ICONS map
const ICONS_KEYS = [
  'html5', 'css3', 'js', 'ts', 'react', 'vue', 'angular', 'node',
  'git', 'docker', 'terminal', 'figma',
  'browser', 'server', 'api', 'database',
  'component', 'copy', 'card', 'palette', 'globe',
]

// Map home.tsx slugs -> seed slugs
const SEED_KEY_MAP = {
  js: 'javascript',
  ts: 'typescript',
  node: 'nodejs',
  // copy, card, palette, globe are home-only — keep as-is from existing file
}

// Read current home.tsx
const homePath = '/home/z/my-project/src/views/home.tsx'
const home = fs.readFileSync(homePath, 'utf8')

// Extract existing ICONS block (between "const ICONS = {" and the matching "}")
const startIdx = home.indexOf('const ICONS = {')
if (startIdx === -1) throw new Error('ICONS map not found in home.tsx')
const openBrace = home.indexOf('{', startIdx)
let depth = 0
let endIdx = -1
for (let i = openBrace; i < home.length; i++) {
  if (home[i] === '{') depth++
  else if (home[i] === '}') {
    depth--
    if (depth === 0) { endIdx = i + 1; break }
  }
}
if (endIdx === -1) throw new Error('Could not find end of ICONS map')

const existingBlock = home.slice(startIdx, endIdx)

// Parse existing entries to keep custom ones (copy, card, palette, globe)
const existingEntries = {}
const entryRe = /(\w+):\s*'([^']+)'/g
while ((m = entryRe.exec(existingBlock)) !== null) {
  existingEntries[m[1]] = m[2]
}

// Build new ICONS map
const newEntries = {}
for (const key of ICONS_KEYS) {
  const seedKey = SEED_KEY_MAP[key] || key
  if (slugSvg[seedKey]) {
    newEntries[key] = slugSvg[seedKey]
  } else if (existingEntries[key]) {
    newEntries[key] = existingEntries[key]
  } else {
    throw new Error('No svg found for key: ' + key)
  }
}

// Emit new block
const lines = Object.entries(newEntries).map(([k, v]) => `  ${k}: '${v}',`)
const newBlock = 'const ICONS = {\n' + lines.join('\n') + '\n}'

// Replace in home.tsx
const updated = home.slice(0, startIdx) + newBlock + home.slice(endIdx)
fs.writeFileSync(homePath, updated)
console.log('Updated ICONS map in', homePath)
console.log('Entries:', Object.keys(newEntries).length)
