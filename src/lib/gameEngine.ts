import { CURATED_CHAINS } from '../data/chains'

export type TileRole = 'inherited' | 'needed' | 'distractor'

export interface LetterTile {
  id: string
  letter: string
  role: TileRole
}

export const LEVEL_LENGTHS = [3, 4, 5, 6, 7, 8] as const
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'

export function signature(word: string): string {
  return [...word.toLowerCase()].sort().join('')
}

export function isNestedChain(chain: readonly string[]): boolean {
  if (chain.length !== LEVEL_LENGTHS.length) return false

  return chain.every((word, index) => {
    if (word.length !== LEVEL_LENGTHS[index]) return false
    if (index === 0) return true

    const current = [...signature(word)]
    for (const letter of signature(chain[index - 1])) {
      const position = current.indexOf(letter)
      if (position === -1) return false
      current.splice(position, 1)
    }
    return current.length === 1
  })
}

export function parseDictionary(raw: string): Set<string> {
  return new Set(
    raw
      .split(/\r?\n/)
      .map((word) => word.trim().toLowerCase())
      .filter((word) => /^[\p{L}]+$/u.test(word) && word.length >= 3 && word.length <= 8),
  )
}

export function getPlayableChains(
  dictionary: Set<string>,
  curatedChains: readonly (readonly string[])[] = CURATED_CHAINS,
): string[][] {
  return curatedChains.filter(
    (chain) => isNestedChain(chain) && chain.every((word) => dictionary.has(word)),
  ).map((chain) => [...chain])
}

export function chooseChain(
  dictionary: Set<string>,
  random: () => number = Math.random,
  curatedChains: readonly (readonly string[])[] = CURATED_CHAINS,
): string[] {
  const chains = getPlayableChains(dictionary, curatedChains)
  if (chains.length === 0) {
    throw new Error('No complete 3-to-8-letter chains were found in the dictionary.')
  }
  return chains[Math.floor(random() * chains.length)]
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function addedLetter(previousWord: string, targetWord: string): string {
  const remaining = [...signature(targetWord)]
  for (const letter of signature(previousWord)) {
    const index = remaining.indexOf(letter)
    if (index === -1) throw new Error('Target word does not contain the previous word letters.')
    remaining.splice(index, 1)
  }
  if (remaining.length !== 1) throw new Error('Each level must add exactly one letter.')
  return remaining[0]
}

function distractorLetters(
  count: number,
  target: string,
  random: () => number,
): string[] {
  const preferred = [...ALPHABET].filter((letter) => !target.includes(letter))
  const pool = preferred.length >= count ? preferred : [...ALPHABET]
  return shuffle(pool, random).slice(0, count)
}

export function createTiles(
  chain: readonly string[],
  levelIndex: number,
  random: () => number = Math.random,
): LetterTile[] {
  const target = chain[levelIndex]
  const tiles: LetterTile[] = []

  if (levelIndex === 0) {
    for (const [index, letter] of [...target].entries()) {
      tiles.push({ id: `0-needed-${index}-${letter}`, letter, role: 'needed' })
    }
    for (const [index, letter] of distractorLetters(3, target, random).entries()) {
      tiles.push({ id: `0-distractor-${index}-${letter}`, letter, role: 'distractor' })
    }
    return shuffle(tiles, random)
  }

  for (const [index, letter] of [...chain[levelIndex - 1]].entries()) {
    tiles.push({ id: `${levelIndex}-inherited-${index}-${letter}`, letter, role: 'inherited' })
  }

  const required = addedLetter(chain[levelIndex - 1], target)
  tiles.push({ id: `${levelIndex}-needed-0-${required}`, letter: required, role: 'needed' })
  for (const [index, letter] of distractorLetters(3, target, random).entries()) {
    tiles.push({ id: `${levelIndex}-distractor-${index}-${letter}`, letter, role: 'distractor' })
  }

  const inherited = shuffle(
    tiles.filter((tile) => tile.role === 'inherited'),
    random,
  )
  const newLetters = shuffle(
    tiles.filter((tile) => tile.role !== 'inherited'),
    random,
  )
  return [...inherited, ...newLetters]
}
