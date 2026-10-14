const DEFAULT_SYMBOLS = {
  '<->': '↔',
  '->': '→',
  '<-': '←',
  '|-': '⊢',
  '|=': '⊨',
  '/\\': '∧',
  '\\/': '∨',
  '~': '¬',
  forall: '∀',
  exists: '∃',
  GAMMA: 'Γ',
  DELTA: 'Δ',
  TAU: 'Τ',
  PI: 'Π',
  THETA: 'Θ',
  SIGMA: 'Σ',
  OMEGA: 'Ω',
  XI: 'Ξ',
  IOTA: 'Ι',
  PHI: 'Φ',
  MU: 'Μ',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  theta: 'θ',
  lambda: 'λ',
  mu: 'μ',
  pi: 'π',
  tau: 'τ',
  eta: 'η',
  rho: 'ρ',
  sigma: 'σ',
  phi: 'φ',
  omega: 'ω',
  box: '□',
  diamond: '◇',
  always: '□',
  eventually: '◇',
  next: '○',
  until: 'U',
  release: 'R',
  '-*': '⊸',
  '-o': '⊸',
  tensor: '⊗',
  par: '⅋',
  with: '&',
  plus: '⊕',
  one: '1',
  zero: '0',
  bottom: '⊥',
  bot: '⊥',
  top: '⊤',
  union: '∪',
  intersect: '∩'
};

export function normalizeFormula(value, overrides = {}) {
  const symbols = { ...DEFAULT_SYMBOLS, ...overrides };
  const entries = Object.entries(symbols).sort(([left], [right]) => right.length - left.length);
  return entries.reduce((text, [alias, symbol]) => {
    const escaped = escapeRegExp(alias);
    if (/^[A-Za-z][A-Za-z0-9_]*$/.test(alias)) {
      return text.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'gu'), symbol);
    }
    return text.replace(new RegExp(escaped, 'g'), symbol);
  }, value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

