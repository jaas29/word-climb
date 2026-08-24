/**
 * Friendly chains are preferred so a round feels challenging, not arbitrary.
 * Every entry is still checked against engwords.txt before it can be played.
 */
export const CURATED_CHAINS = [
  ['lie', 'tile', 'tilde', 'detail', 'citadel', 'delicate'],
  ['cat', 'coat', 'actor', 'carton', 'cartoon', 'cartoons'],
  ['rat', 'rate', 'later', 'rental', 'central', 'clarinet'],
  ['ear', 'dear', 'heard', 'thread', 'hearted', 'threaded'],
  ['one', 'tone', 'stone', 'tensor', 'monster', 'monsters'],
  ['top', 'post', 'sport', 'poster', 'reports', 'sportier'],
  ['car', 'care', 'crane', 'nectar', 'central', 'clarinet'],
  ['sin', 'sign', 'sting', 'things', 'hosting', 'shooting'],
  ['tea', 'tale', 'steal', 'castle', 'elastic', 'articles'],
  ['red', 'read', 'grade', 'danger', 'gardens', 'grandest'],
  ['cap', 'pace', 'space', 'places', 'special', 'especial'],
  ['ape', 'leap', 'plead', 'pedals', 'pleased', 'pleaders'],
] as const

/** Carefully selected Spanish nested-anagram chains for the castellano mode. */
export const SPANISH_CHAINS = [
  ['amo', 'coma', 'campo', 'compra', 'comprar', 'comparar'],
  ['eso', 'peso', 'paseo', 'pesado', 'pescado', 'despacio'],
  ['tan', 'ante', 'renta', 'entrar', 'enterar', 'entregar'],
  ['dos', 'soda', 'sonda', 'senado', 'condesa', 'descanso'],
  ['tal', 'alta', 'altar', 'alerta', 'lateral', 'estallar'],
] as const
