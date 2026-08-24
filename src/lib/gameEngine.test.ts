import { describe, expect, it } from 'vitest'
import {
  chooseChain,
  createTiles,
  getPlayableChains,
  isNestedChain,
  parseDictionary,
  signature,
} from './gameEngine'

const sampleChain = ['lie', 'tile', 'tilde', 'detail', 'citadel', 'delicate']

describe('game engine', () => {
  it('normalizes words into anagram signatures', () => {
    expect(signature('TILE')).toBe('eilt')
    expect(signature('LIE')).toBe('eil')
  })

  it('accepts only chains that add exactly one letter per level', () => {
    expect(isNestedChain(sampleChain)).toBe(true)
    expect(isNestedChain(['cat', 'dogs', 'actor', 'carton', 'cartoon', 'cartoons'])).toBe(false)
  })

  it('parses only usable alphabetic dictionary entries', () => {
    const dictionary = parseDictionary('Lie\nTILE\na-b\ntoolongword\n\n')
    expect([...dictionary]).toEqual(['lie', 'tile'])
  })

  it('filters curated chains through the supplied dictionary', () => {
    const dictionary = new Set(sampleChain)
    expect(getPlayableChains(dictionary)).toEqual([sampleChain])
    expect(chooseChain(dictionary, () => 0)).toEqual(sampleChain)
  })

  it('creates six gray tiles for the opening level', () => {
    const tiles = createTiles(sampleChain, 0, () => 0.25)
    const distractors = tiles.filter((tile) => tile.role === 'distractor')
    expect(tiles).toHaveLength(6)
    expect(tiles.filter((tile) => tile.role === 'needed')).toHaveLength(3)
    expect(distractors).toHaveLength(3)
    expect(new Set(distractors.map((tile) => tile.letter)).size).toBe(3)
    expect(distractors.every((tile) => !sampleChain[0].includes(tile.letter))).toBe(true)
  })

  it('carries old letters and adds one needed plus three distractors', () => {
    const tiles = createTiles(sampleChain, 1, () => 0.4)
    expect(tiles).toHaveLength(7)
    expect(tiles.filter((tile) => tile.role === 'inherited')).toHaveLength(3)
    expect(tiles.filter((tile) => tile.role === 'needed')).toHaveLength(1)
    expect(tiles.find((tile) => tile.role === 'needed')?.letter).toBe('t')
    expect(tiles.filter((tile) => tile.role === 'distractor')).toHaveLength(3)
  })
})
