# Word Climb

A six-round nested-anagram game built for AI Agent Programming. Start with a hidden 3-letter word, then carry every letter forward and add one new letter per round until reaching 8 letters.

## Run locally

```bash
npm install
npm run dev
```

Open the local address shown in the terminal.

## Game rules

- Round one offers six gray letters. Exactly three form the hidden answer.
- Later rounds carry the previous answer as blue letters and add four gray letters.
- The next answer uses every blue letter plus exactly one gray letter.
- The answer must be the specific hidden word, not merely another valid anagram.
- Three hints are available for the entire game. Within each round they:
  1. remove one distractor;
  2. reveal the first letter;
  3. reveal the second letter.
- English mode uses the supplied `engwords.txt` dictionary. Castellano mode uses its own curated Spanish word chains.

## Checks

```bash
npm test
npm run typecheck
npm run build
```
