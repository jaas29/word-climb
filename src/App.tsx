import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from './components/Icon'
import {
  LEVEL_LENGTHS,
  chooseChain,
  createTiles,
  parseDictionary,
  type LetterTile,
} from './lib/gameEngine'

type GamePhase = 'loading' | 'playing' | 'won' | 'error'
type MessageTone = 'neutral' | 'good' | 'bad'

interface Message {
  text: string
  tone: MessageTone
}

const INITIAL_MESSAGE: Message = {
  text: 'Build the hidden 3-letter word to begin.',
  tone: 'neutral',
}

export default function App() {
  const [dictionary, setDictionary] = useState<Set<string> | null>(null)
  const [chain, setChain] = useState<string[]>([])
  const [levelIndex, setLevelIndex] = useState(0)
  const [tiles, setTiles] = useState<LetterTile[]>([])
  const [entries, setEntries] = useState<(string | null)[]>([])
  const [completed, setCompleted] = useState<string[]>([])
  const [removedTileIds, setRemovedTileIds] = useState<Set<string>>(new Set())
  const [lockedPositions, setLockedPositions] = useState<Set<number>>(new Set())
  const [hintsRemaining, setHintsRemaining] = useState(3)
  const [roundHintStep, setRoundHintStep] = useState(0)
  const [message, setMessage] = useState<Message>(INITIAL_MESSAGE)
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [shakeCount, setShakeCount] = useState(0)

  const target = chain[levelIndex] ?? ''
  const tileMap = useMemo(() => new Map(tiles.map((tile) => [tile.id, tile])), [tiles])
  const usedTileIds = useMemo(
    () => new Set(entries.filter((entry): entry is string => entry !== null)),
    [entries],
  )
  const guess = entries.map((tileId) => (tileId ? tileMap.get(tileId)?.letter ?? '' : '')).join('')

  const beginGame = useCallback((loadedDictionary: Set<string>) => {
    try {
      const nextChain = chooseChain(loadedDictionary)
      setChain(nextChain)
      setLevelIndex(0)
      setTiles(createTiles(nextChain, 0))
      setEntries(Array(3).fill(null))
      setCompleted([])
      setRemovedTileIds(new Set())
      setLockedPositions(new Set())
      setHintsRemaining(3)
      setRoundHintStep(0)
      setMessage(INITIAL_MESSAGE)
      setIsAdvancing(false)
      setPhase('playing')
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'The game could not be prepared.',
        tone: 'bad',
      })
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    let active = true
    fetch(`${import.meta.env.BASE_URL}engwords.txt`)
      .then((response) => {
        if (!response.ok) throw new Error('The English word list could not be loaded.')
        return response.text()
      })
      .then((raw) => {
        if (!active) return
        const loadedDictionary = parseDictionary(raw)
        setDictionary(loadedDictionary)
        beginGame(loadedDictionary)
      })
      .catch((error: unknown) => {
        if (!active) return
        setMessage({
          text: error instanceof Error ? error.message : 'The English word list could not be loaded.',
          tone: 'bad',
        })
        setPhase('error')
      })
    return () => {
      active = false
    }
  }, [beginGame])

  const chooseTile = useCallback(
    (tileId: string) => {
      if (phase !== 'playing' || isAdvancing || removedTileIds.has(tileId)) return

      setEntries((current) => {
        const existingPosition = current.indexOf(tileId)
        if (existingPosition !== -1) {
          if (lockedPositions.has(existingPosition)) return current
          const next = [...current]
          next[existingPosition] = null
          return next
        }

        const openPosition = current.findIndex(
          (entry, position) => entry === null && !lockedPositions.has(position),
        )
        if (openPosition === -1) return current
        const next = [...current]
        next[openPosition] = tileId
        return next
      })
      setMessage({ text: 'Arrange the letters, then submit your word.', tone: 'neutral' })
    },
    [isAdvancing, lockedPositions, phase, removedTileIds],
  )

  const removeLastEntry = useCallback(() => {
    if (phase !== 'playing' || isAdvancing) return
    setEntries((current) => {
      const position = current.findLastIndex(
        (entry, index) => entry !== null && !lockedPositions.has(index),
      )
      if (position === -1) return current
      const next = [...current]
      next[position] = null
      return next
    })
  }, [isAdvancing, lockedPositions, phase])

  const clearEntries = useCallback(() => {
    if (phase !== 'playing' || isAdvancing) return
    setEntries((current) =>
      current.map((entry, position) => (lockedPositions.has(position) ? entry : null)),
    )
    setMessage({ text: 'Your unlocked letters have been cleared.', tone: 'neutral' })
  }, [isAdvancing, lockedPositions, phase])

  const advanceLevel = useCallback(() => {
    setIsAdvancing(false)
    const nextLevel = levelIndex + 1
    if (nextLevel >= LEVEL_LENGTHS.length) {
      setPhase('won')
      return
    }

    setLevelIndex(nextLevel)
    setTiles(createTiles(chain, nextLevel))
    setEntries(Array(LEVEL_LENGTHS[nextLevel]).fill(null))
    setRemovedTileIds(new Set())
    setLockedPositions(new Set())
    setRoundHintStep(0)
    setMessage({
      text: `Carry the blue letters and add one gray letter to make ${LEVEL_LENGTHS[nextLevel]}.`,
      tone: 'neutral',
    })
  }, [chain, levelIndex])

  const submitGuess = useCallback(() => {
    if (phase !== 'playing' || isAdvancing) return
    if (entries.some((entry) => entry === null)) {
      setMessage({ text: `Choose ${target.length} letters first.`, tone: 'bad' })
      setShakeCount((count) => count + 1)
      return
    }

    if (guess === target) {
      setIsAdvancing(true)
      setCompleted((words) => [...words, target])
      setMessage({ text: `${target.toUpperCase()} — that's it!`, tone: 'good' })
      window.setTimeout(advanceLevel, 650)
      return
    }

    const isEnglishWord = dictionary?.has(guess)
    setMessage({
      text: isEnglishWord
        ? `${guess.toUpperCase()} is a word, but not the hidden word.`
        : `${guess.toUpperCase()} is not in the supplied word list.`,
      tone: 'bad',
    })
    setShakeCount((count) => count + 1)
  }, [advanceLevel, dictionary, entries, guess, isAdvancing, phase, target])

  useEffect(() => {
    if (phase === 'playing' && !isAdvancing && entries.every((entry) => entry !== null)) {
      submitGuess()
    }
  }, [entries, isAdvancing, phase, submitGuess])

  const revealPosition = useCallback(
    (position: number) => {
      setEntries((current) => {
        const next = [...current]
        const currentTileId = next[position]
        const currentTile = currentTileId ? tileMap.get(currentTileId) : undefined

        if (currentTile?.letter === target[position]) return next
        next[position] = null
        const usedElsewhere = new Set(
          next.filter((entry): entry is string => entry !== null),
        )
        const matchingTile = tiles.find(
          (tile) =>
            tile.letter === target[position] &&
            !usedElsewhere.has(tile.id) &&
            !removedTileIds.has(tile.id),
        )
        if (matchingTile) next[position] = matchingTile.id
        return next
      })
      setLockedPositions((positions) => new Set(positions).add(position))
    },
    [removedTileIds, target, tileMap, tiles],
  )

  const useHint = useCallback(() => {
    if (phase !== 'playing' || isAdvancing || hintsRemaining === 0) return

    if (roundHintStep === 0) {
      const distractor = tiles.find(
        (tile) => tile.role === 'distractor' && !removedTileIds.has(tile.id),
      )
      if (distractor) {
        setRemovedTileIds((ids) => new Set(ids).add(distractor.id))
        setMessage({ text: 'One distractor has been removed.', tone: 'neutral' })
      }
    } else {
      const position = roundHintStep - 1
      revealPosition(position)
      setMessage({
        text: `Letter ${position + 1} is ${target[position].toUpperCase()}.`,
        tone: 'neutral',
      })
    }

    setHintsRemaining((remaining) => remaining - 1)
    setRoundHintStep((step) => Math.min(step + 1, 3))
  }, [hintsRemaining, isAdvancing, phase, removedTileIds, revealPosition, roundHintStep, target, tiles])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isHelpOpen && event.key === 'Escape') {
        setIsHelpOpen(false)
        return
      }
      if (isHelpOpen || phase !== 'playing' || isAdvancing) return
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        removeLastEntry()
        return
      }
      if (/^[a-zA-Z]$/.test(event.key)) {
        const tile = tiles.find(
          (candidate) =>
            candidate.letter === event.key.toLowerCase() &&
            !usedTileIds.has(candidate.id) &&
            !removedTileIds.has(candidate.id),
        )
        if (tile) chooseTile(tile.id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    chooseTile,
    isAdvancing,
    isHelpOpen,
    phase,
    removeLastEntry,
    removedTileIds,
    submitGuess,
    tiles,
    usedTileIds,
  ])

  const hintLabel =
    roundHintStep === 0
      ? 'Remove a distractor'
      : roundHintStep === 1
        ? 'Reveal first letter'
        : 'Reveal second letter'

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="Word Climb home">
          <span className="brand-mark" aria-hidden="true">
            W
          </span>
          <span>
            <strong>WORD CLIMB</strong>
            <small>One letter higher</small>
          </span>
        </a>
        <div className="header-actions">
          <button
            className="icon-button"
            type="button"
            aria-label="How to play"
            onClick={() => setIsHelpOpen(true)}
          >
            <Icon name="help" />
            <span>How to play</span>
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="New game"
            onClick={() => dictionary && beginGame(dictionary)}
            disabled={!dictionary}
          >
            <Icon name="refresh" />
            <span>New game</span>
          </button>
        </div>
      </header>

      <main className="game-frame">
        <section className="ladder-panel" aria-labelledby="ladder-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The climb</p>
              <h1 id="ladder-title">Three to eight</h1>
            </div>
            <div className="level-counter" aria-label={`Level ${levelIndex + 1} of 6`}>
              <strong>{String(levelIndex + 1).padStart(2, '0')}</strong>
              <span>/ 06</span>
            </div>
          </div>

          <div className="ladder" aria-label="Word ladder">
            {LEVEL_LENGTHS.map((length, rowIndex) => {
              const isActive = phase !== 'loading' && rowIndex === levelIndex && phase !== 'won'
              const isComplete = rowIndex < completed.length || phase === 'won'
              const word = completed[rowIndex] ?? (phase === 'won' ? chain[rowIndex] : '')
              return (
                <div
                  className={`ladder-row ${isActive ? 'is-active' : ''} ${isComplete ? 'is-complete' : ''}`}
                  key={length}
                  style={{ '--row-index': rowIndex } as React.CSSProperties}
                >
                  <span className="row-label">{length}</span>
                  <div
                    className={`word-row ${isActive ? `shake-${shakeCount}` : ''}`}
                    aria-label={`${length}-letter ${isComplete ? 'completed' : isActive ? 'current' : 'future'} word`}
                  >
                    {Array.from({ length }, (_, position) => {
                      const tileId = isActive ? entries[position] : null
                      const letter = isComplete ? word[position] : tileId ? tileMap.get(tileId)?.letter : ''
                      return (
                        <div
                          className={`letter-cell ${letter ? 'has-letter' : ''} ${lockedPositions.has(position) && isActive ? 'is-locked' : ''}`}
                          key={position}
                        >
                          {letter?.toUpperCase()}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="play-panel" aria-labelledby="letters-title">
          <div className="round-meta">
            <div>
              <p className="eyebrow">Round {levelIndex + 1}</p>
              <h2 id="letters-title">Your letters</h2>
            </div>
            <div className="hints-count" aria-label={`${hintsRemaining} hints remaining`}>
              <Icon name="bulb" size={18} />
              <span>{hintsRemaining} left</span>
            </div>
          </div>

          {phase === 'loading' ? (
            <div className="loading-state" role="status">
              <span className="loader" />
              <p>Reading 42,405 English words…</p>
            </div>
          ) : phase === 'error' ? (
            <div className="error-state" role="alert">
              <strong>We hit a snag.</strong>
              <p>{message.text}</p>
            </div>
          ) : (
            <>
              <div className="tile-groups">
                {levelIndex > 0 && (
                  <div className="tile-group">
                    <span className="group-label">Carry these</span>
                    <div className="tile-rack inherited-rack">
                      {tiles
                        .filter((tile) => tile.role === 'inherited')
                        .map((tile) => (
                          <LetterButton
                            key={tile.id}
                            tile={tile}
                            isUsed={usedTileIds.has(tile.id)}
                            isRemoved={removedTileIds.has(tile.id)}
                            isDisabled={isAdvancing}
                            onClick={chooseTile}
                          />
                        ))}
                    </div>
                  </div>
                )}

                <div className="tile-group">
                  <span className="group-label">
                    {levelIndex === 0 ? 'Choose three' : 'Choose one more'}
                  </span>
                  <div className="tile-rack new-rack">
                    {tiles
                      .filter((tile) => levelIndex === 0 || tile.role !== 'inherited')
                      .map((tile) => (
                        <LetterButton
                          key={tile.id}
                          tile={tile}
                          isUsed={usedTileIds.has(tile.id)}
                          isRemoved={removedTileIds.has(tile.id)}
                          isDisabled={isAdvancing}
                          onClick={chooseTile}
                        />
                      ))}
                  </div>
                </div>
              </div>

              <div className="message-area" aria-live="polite">
                <span className={`message-dot ${message.tone}`} />
                <p>{message.text}</p>
              </div>

              <div className="action-stack">
                <button
                  className="hint-button"
                  type="button"
                  onClick={useHint}
                  disabled={hintsRemaining === 0 || phase !== 'playing' || isAdvancing}
                  title={hintsRemaining > 0 ? hintLabel : 'No hints remaining'}
                >
                  <Icon name="bulb" />
                  <span>
                    <strong>Use a hint</strong>
                    <small>{hintsRemaining > 0 ? hintLabel : 'No hints remaining'}</small>
                  </span>
                </button>
              </div>

              <button
                className="clear-button"
                type="button"
                onClick={clearEntries}
                disabled={
                  phase !== 'playing' ||
                  isAdvancing ||
                  !entries.some((entry, position) => entry !== null && !lockedPositions.has(position))
                }
              >
                <Icon name="close" size={16} />
                Clear selected letters
              </button>

              <p className="keyboard-note">Words are checked as soon as you fill every space. You can also type and use Backspace.</p>
            </>
          )}
        </section>
      </main>

      <footer>
        <span>Built from the supplied English dictionary</span>
        <span className="footer-rule" />
        <span>AI Agent Programming · Fall 2026</span>
      </footer>

      {isHelpOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsHelpOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Close instructions"
              onClick={() => setIsHelpOpen(false)}
              autoFocus
            >
              <Icon name="close" />
            </button>
            <p className="eyebrow">How to play</p>
            <h2 id="help-title">Climb one letter at a time.</h2>
            <ol>
              <li>Start by finding the specific hidden 3-letter word among six gray letters.</li>
              <li>Each new word uses every blue letter from the last answer plus one gray letter.</li>
              <li>Rearrange the letters freely. A real English word may still be the wrong hidden word.</li>
              <li>Reach the 8-letter word to complete the climb.</li>
            </ol>
            <div className="hint-explainer">
              <Icon name="bulb" />
              <p>
                You get <strong>three hints for the entire game.</strong> On each round, hints remove a
                distractor first, then reveal the first and second letters.
              </p>
            </div>
          </section>
        </div>
      )}

      {phase === 'won' && (
        <div className="modal-backdrop victory-backdrop">
          <section className="modal victory-modal" role="dialog" aria-modal="true" aria-labelledby="win-title">
            <div className="victory-mark" aria-hidden="true">8</div>
            <p className="eyebrow">Climb complete</p>
            <h2 id="win-title">You reached the top.</h2>
            <p>Six hidden words, each carrying the last one forward.</p>
            <div className="chain-summary" aria-label="Completed word chain">
              {chain.map((word) => (
                <span key={word}>{word.toUpperCase()}</span>
              ))}
            </div>
            <button className="submit-button" type="button" onClick={() => dictionary && beginGame(dictionary)}>
              Play another chain
              <Icon name="refresh" />
            </button>
          </section>
        </div>
      )}
    </div>
  )
}

interface LetterButtonProps {
  tile: LetterTile
  isUsed: boolean
  isRemoved: boolean
  isDisabled: boolean
  onClick: (id: string) => void
}

function LetterButton({ tile, isUsed, isRemoved, isDisabled, onClick }: LetterButtonProps) {
  return (
    <button
      className={`letter-tile ${tile.role === 'inherited' ? 'is-inherited' : ''} ${isUsed ? 'is-used' : ''} ${isRemoved ? 'is-removed' : ''}`}
      type="button"
      onClick={() => onClick(tile.id)}
      disabled={isRemoved || isDisabled}
      aria-pressed={isUsed}
      aria-label={`${tile.letter.toUpperCase()}${isUsed ? ', selected' : ''}`}
    >
      {tile.letter.toUpperCase()}
    </button>
  )
}
