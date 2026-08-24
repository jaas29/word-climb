import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
type Language = 'en' | 'zh'

interface Message {
  text: string
  tone: MessageTone
}

const COPY = {
  en: {
    language: '语言', howToPlay: 'How to play', newGame: 'New game', climb: 'The climb',
    threeToEight: 'Three to eight', yourLetters: 'Your letters', carryThese: 'Carry these',
    chooseThree: 'Choose three', chooseOneMore: 'Choose one more', hintsLeft: 'left',
    useHint: 'Use a hint', removeDistractor: 'Remove a distractor', revealFirst: 'Reveal first letter',
    revealSecond: 'Reveal second letter', noHints: 'No hints remaining',
    keyboardTip: 'Words are checked as soon as you fill every space. You can also type and use Backspace.',
    readingWords: 'Reading 42,405 English words…', snag: 'We hit a snag.', howToPlayTitle: 'Climb one letter at a time.',
    help: ['Start by finding the specific hidden 3-letter word among six gray letters.', 'Each new word uses every blue letter from the last answer plus one gray letter.', 'Rearrange the letters freely. A real English word may still be the wrong hidden word.', 'Reach the 8-letter word to complete the climb.'],
    hintHelp: 'You get three hints for the entire game. On each round, hints remove a distractor first, then reveal the first and second letters.',
    complete: 'Climb complete', reachedTop: 'You reached the top.', completedWords: 'Six hidden words, each carrying the last one forward.', playAnother: 'Play another chain',
    builtFrom: 'Built from the supplied English dictionary', initial: 'Build the hidden 3-letter word to begin.',
    arrange: 'Arrange the letters; your word will be checked automatically.',
    nextRound: (length: number) => `Carry the blue letters and add one gray letter to make ${length}.`,
    chooseLetters: (length: number) => `Choose ${length} letters first.`,
    correct: (word: string) => `${word.toUpperCase()} — that's it!`,
    wrongWord: (word: string) => `${word.toUpperCase()} is a word, but not the hidden word.`,
    notWord: (word: string) => `${word.toUpperCase()} is not in the supplied word list.`,
    removed: 'One distractor has been removed.',
    revealed: (position: number, letter: string) => `Letter ${position + 1} is ${letter.toUpperCase()}.`,
    error: 'The game could not be prepared.', dictionaryError: 'The English word list could not be loaded.',
  },
  zh: {
    language: '语言', howToPlay: '玩法说明', newGame: '新游戏', climb: '单词阶梯',
    threeToEight: '从三到八', yourLetters: '你的字母', carryThese: '保留这些',
    chooseThree: '选择三个', chooseOneMore: '再选一个', hintsLeft: '次提示剩余',
    useHint: '使用提示', removeDistractor: '移除一个干扰字母', revealFirst: '显示第一个字母',
    revealSecond: '显示第二个字母', noHints: '没有提示了',
    keyboardTip: '填满所有空位后会自动检查单词。你也可以用键盘输入和退格。',
    readingWords: '正在读取 42,405 个英文单词…', snag: '出现了问题。', howToPlayTitle: '每次增加一个字母，向上攀登。',
    help: ['先在六个灰色字母中找出指定的三个字母单词。', '每个新单词都要保留上一题的所有蓝色字母，再加一个灰色字母。', '你可以自由重新排列字母。真正的英文单词也可能不是隐藏答案。', '完成八个字母的单词即可通关。'],
    hintHelp: '整局游戏共有三次提示。每一轮依次会移除一个干扰字母、显示第一个字母和第二个字母。',
    complete: '登顶完成', reachedTop: '你到达顶端了。', completedWords: '六个隐藏单词，每个都保留了上一个单词的字母。', playAnother: '再玩一组单词',
    builtFrom: '使用提供的英文词典', initial: '先拼出隐藏的三个字母单词。',
    arrange: '排列字母；填满后会自动检查单词。',
    nextRound: (length: number) => `保留蓝色字母，再加一个灰色字母，组成 ${length} 个字母的单词。`,
    chooseLetters: (length: number) => `请先选择 ${length} 个字母。`,
    correct: (word: string) => `${word.toUpperCase()} —— 正确！`,
    wrongWord: (word: string) => `${word.toUpperCase()} 是单词，但不是隐藏答案。`,
    notWord: (word: string) => `${word.toUpperCase()} 不在提供的词典中。`,
    removed: '已移除一个干扰字母。',
    revealed: (position: number, letter: string) => `第 ${position + 1} 个字母是 ${letter.toUpperCase()}。`,
    error: '无法准备游戏。', dictionaryError: '无法加载英文单词列表。',
  },
} as const

function initialMessage(language: Language): Message {
  return { text: COPY[language].initial, tone: 'neutral' }
}

export default function App() {
  const [language, setLanguage] = useState<Language>('en')
  const languageRef = useRef<Language>('en')
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
  const [message, setMessage] = useState<Message>(() => initialMessage('en'))
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [shakeCount, setShakeCount] = useState(0)
  const t = COPY[language]

  useEffect(() => {
    languageRef.current = language
  }, [language])

  const target = chain[levelIndex] ?? ''
  const tileMap = useMemo(() => new Map(tiles.map((tile) => [tile.id, tile])), [tiles])
  const usedTileIds = useMemo(
    () => new Set(entries.filter((entry): entry is string => entry !== null)),
    [entries],
  )
  const guess = entries.map((tileId) => (tileId ? tileMap.get(tileId)?.letter ?? '' : '')).join('')

  const beginGame = useCallback((loadedDictionary: Set<string>) => {
    const copy = COPY[languageRef.current]
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
      setMessage(initialMessage(languageRef.current))
      setIsAdvancing(false)
      setPhase('playing')
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : copy.error,
        tone: 'bad',
      })
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    let active = true
    fetch(`${import.meta.env.BASE_URL}engwords.txt`)
      .then((response) => {
        if (!response.ok) throw new Error(COPY[languageRef.current].dictionaryError)
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
          text: error instanceof Error ? error.message : COPY[languageRef.current].dictionaryError,
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
      setMessage({ text: t.arrange, tone: 'neutral' })
    },
    [isAdvancing, lockedPositions, phase, removedTileIds, t.arrange],
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
      text: t.nextRound(LEVEL_LENGTHS[nextLevel]),
      tone: 'neutral',
    })
  }, [chain, levelIndex, t])

  const submitGuess = useCallback(() => {
    if (phase !== 'playing' || isAdvancing) return
    if (entries.some((entry) => entry === null)) {
      setMessage({ text: t.chooseLetters(target.length), tone: 'bad' })
      setShakeCount((count) => count + 1)
      return
    }

    if (guess === target) {
      setIsAdvancing(true)
      setCompleted((words) => [...words, target])
      setMessage({ text: t.correct(target), tone: 'good' })
      window.setTimeout(advanceLevel, 650)
      return
    }

    const isEnglishWord = dictionary?.has(guess)
    setMessage({
      text: isEnglishWord
        ? t.wrongWord(guess)
        : t.notWord(guess),
      tone: 'bad',
    })
    setShakeCount((count) => count + 1)
  }, [advanceLevel, dictionary, entries, guess, isAdvancing, phase, t, target])

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
        setMessage({ text: t.removed, tone: 'neutral' })
      }
    } else {
      const position = roundHintStep - 1
      revealPosition(position)
      setMessage({
        text: t.revealed(position, target[position]),
        tone: 'neutral',
      })
    }

    setHintsRemaining((remaining) => remaining - 1)
    setRoundHintStep((step) => Math.min(step + 1, 3))
  }, [hintsRemaining, isAdvancing, phase, removedTileIds, revealPosition, roundHintStep, t, target, tiles])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isHelpOpen && event.key === 'Escape') {
        setIsHelpOpen(false)
        return
      }
      if (isHelpOpen || phase !== 'playing' || isAdvancing) return
      if (event.key === 'Enter') {
        event.preventDefault()
        submitGuess()
        return
      }
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
      ? t.removeDistractor
      : roundHintStep === 1
        ? t.revealFirst
        : t.revealSecond

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
          <label className="language-select">
            <span>{t.language}</span>
            <select
              value={language}
              onChange={(event) => {
                const nextLanguage = event.target.value as Language
                setLanguage(nextLanguage)
                setMessage(initialMessage(nextLanguage))
              }}
            >
              <option value="en">English</option>
              <option value="zh">简体中文</option>
            </select>
          </label>
          <button
            className="icon-button"
            type="button"
            aria-label={t.howToPlay}
            onClick={() => setIsHelpOpen(true)}
          >
            <Icon name="help" />
            <span>{t.howToPlay}</span>
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={t.newGame}
            onClick={() => dictionary && beginGame(dictionary)}
            disabled={!dictionary}
          >
            <Icon name="refresh" />
            <span>{t.newGame}</span>
          </button>
        </div>
      </header>

      <main className="game-frame">
        <section className="ladder-panel" aria-labelledby="ladder-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t.climb}</p>
              <h1 id="ladder-title">{t.threeToEight}</h1>
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
              <p className="eyebrow">{language === 'zh' ? `第 ${levelIndex + 1} 轮` : `Round ${levelIndex + 1}`}</p>
              <h2 id="letters-title">{t.yourLetters}</h2>
            </div>
            <div className="hints-count" aria-label={`${hintsRemaining} hints remaining`}>
              <Icon name="bulb" size={18} />
              <span>{hintsRemaining} {t.hintsLeft}</span>
            </div>
          </div>

          {phase === 'loading' ? (
            <div className="loading-state" role="status">
              <span className="loader" />
              <p>{t.readingWords}</p>
            </div>
          ) : phase === 'error' ? (
            <div className="error-state" role="alert">
              <strong>{t.snag}</strong>
              <p>{message.text}</p>
            </div>
          ) : (
            <>
              <div className="tile-groups">
                {levelIndex > 0 && (
                  <div className="tile-group">
                    <span className="group-label">{t.carryThese}</span>
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
                    {levelIndex === 0 ? t.chooseThree : t.chooseOneMore}
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
                  className="submit-button"
                  type="button"
                  onClick={submitGuess}
                  disabled={phase !== 'playing' || isAdvancing}
                >
                  Submit word
                  <Icon name="arrow" />
                </button>
                <button
                  className="hint-button"
                  type="button"
                  onClick={useHint}
                  disabled={hintsRemaining === 0 || phase !== 'playing' || isAdvancing}
                  title={hintsRemaining > 0 ? hintLabel : t.noHints}
                >
                  <Icon name="bulb" />
                  <span>
                    <strong>{t.useHint}</strong>
                    <small>{hintsRemaining > 0 ? hintLabel : t.noHints}</small>
                  </span>
                </button>
              </div>

              <p className="keyboard-note">{t.keyboardTip}</p>
            </>
          )}
        </section>
      </main>

      <footer>
        <span>{t.builtFrom}</span>
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
            <p className="eyebrow">{t.howToPlay}</p>
            <h2 id="help-title">{t.howToPlayTitle}</h2>
            <ol>
              {t.help.map((item) => <li key={item}>{item}</li>)}
            </ol>
            <div className="hint-explainer">
              <Icon name="bulb" />
              <p>
                {t.hintHelp}
              </p>
            </div>
          </section>
        </div>
      )}

      {phase === 'won' && (
        <div className="modal-backdrop victory-backdrop">
          <section className="modal victory-modal" role="dialog" aria-modal="true" aria-labelledby="win-title">
            <div className="victory-mark" aria-hidden="true">8</div>
            <p className="eyebrow">{t.complete}</p>
            <h2 id="win-title">{t.reachedTop}</h2>
            <p>{t.completedWords}</p>
            <div className="chain-summary" aria-label="Completed word chain">
              {chain.map((word) => (
                <span key={word}>{word.toUpperCase()}</span>
              ))}
            </div>
            <button className="submit-button" type="button" onClick={() => dictionary && beginGame(dictionary)}>
              {t.playAnother}
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
