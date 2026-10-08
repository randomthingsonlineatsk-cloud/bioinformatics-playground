// Statistics helpers: inverse normal CDF, sample size for two means / two proportions,
// and seeded randomization. Pure functions, no browser APIs.

/** Standard normal quantile (Acklam's rational approximation, relative error about 1e-9). */
export function zQuantile(p: number): number {
  if (!(p > 0 && p < 1)) throw new RangeError('p must be strictly between 0 and 1')
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]
  const low = 0.02425
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p > 1 - low) {
    const q = Math.sqrt(-2 * Math.log(1 - p))
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  const q = p - 0.5
  const r = q * q
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

export interface SampleSizeInput {
  /** Significance level, e.g. 0.05. */
  alpha: number
  /** Desired power, e.g. 0.8. */
  power: number
  sided: 1 | 2
  /** Allocation ratio n2 / n1 (1 = equal groups). */
  ratio: number
  /** Expected fraction lost to follow-up, 0 to <1. */
  dropout: number
}

export interface SampleSizeResult {
  n1: number
  n2: number
  total: number
  /** Total to enrol once the dropout allowance is added. */
  enrolled: number
  zAlpha: number
  zBeta: number
}

function finish(n1Raw: number, input: SampleSizeInput, zAlpha: number, zBeta: number): SampleSizeResult {
  const n1 = Math.ceil(n1Raw)
  const n2 = Math.ceil(n1Raw * input.ratio)
  const total = n1 + n2
  const enrolled = Math.ceil(n1 / (1 - input.dropout)) + Math.ceil(n2 / (1 - input.dropout))
  return { n1, n2, total, enrolled, zAlpha, zBeta }
}

function validate(input: SampleSizeInput) {
  if (!(input.alpha > 0 && input.alpha < 1)) throw new RangeError('alpha must be between 0 and 1')
  if (!(input.power > 0 && input.power < 1)) throw new RangeError('power must be between 0 and 1')
  if (!(input.ratio > 0)) throw new RangeError('allocation ratio must be positive')
  if (!(input.dropout >= 0 && input.dropout < 1)) throw new RangeError('dropout must be from 0 up to (not including) 1')
}

/** Two independent means, normal approximation: n1 = (1 + 1/k) * (sd * (zA + zB) / delta)^2. */
export function sampleSizeTwoMeans(input: SampleSizeInput & { delta: number; sd: number }): SampleSizeResult {
  validate(input)
  if (!(input.sd > 0)) throw new RangeError('standard deviation must be positive')
  if (!(input.delta !== 0)) throw new RangeError('difference to detect cannot be zero')
  const zAlpha = zQuantile(1 - input.alpha / input.sided)
  const zBeta = zQuantile(input.power)
  const n1 = (1 + 1 / input.ratio) * Math.pow((input.sd * (zAlpha + zBeta)) / input.delta, 2)
  return finish(n1, input, zAlpha, zBeta)
}

/** Two independent proportions, normal approximation with pooled variance under the null. */
export function sampleSizeTwoProportions(input: SampleSizeInput & { p1: number; p2: number }): SampleSizeResult {
  validate(input)
  const { p1, p2, ratio: k } = input
  if (!(p1 > 0 && p1 < 1 && p2 > 0 && p2 < 1)) throw new RangeError('proportions must be strictly between 0 and 1')
  if (p1 === p2) throw new RangeError('the two proportions must differ')
  const zAlpha = zQuantile(1 - input.alpha / input.sided)
  const zBeta = zQuantile(input.power)
  const pbar = (p1 + k * p2) / (1 + k)
  const term = zAlpha * Math.sqrt((1 + 1 / k) * pbar * (1 - pbar)) + zBeta * Math.sqrt(p1 * (1 - p1) + (p2 * (1 - p2)) / k)
  const n1 = (term * term) / Math.pow(p1 - p2, 2)
  return finish(n1, input, zAlpha, zBeta)
}

/** Small, fast, seedable PRNG (mulberry32). Same seed gives the same sequence everywhere. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export type Scheme = 'simple' | 'block'

/**
 * Allocation list for `n` participants over `arms` arms.
 * Simple: each participant is an independent draw. Block: each block of `blockSize` holds every arm equally often, in random order.
 */
export function randomize(n: number, arms: number, scheme: Scheme, blockSize: number, seed: number): number[] {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer')
  if (!Number.isInteger(arms) || arms < 2) throw new RangeError('need at least 2 arms')
  const rand = mulberry32(seed)
  if (scheme === 'simple') return Array.from({ length: n }, () => Math.floor(rand() * arms))
  if (!Number.isInteger(blockSize) || blockSize < arms || blockSize % arms !== 0) {
    throw new RangeError('block size must be a multiple of the number of arms')
  }
  const out: number[] = []
  const perArm = blockSize / arms
  while (out.length < n) {
    const block: number[] = []
    for (let arm = 0; arm < arms; arm++) for (let i = 0; i < perArm; i++) block.push(arm)
    out.push(...shuffle(block, rand))
  }
  return out.slice(0, n)
}

/** Running difference between the largest and smallest arm count after each participant. */
export function runningImbalance(allocation: number[], arms: number): number[] {
  const counts = new Array<number>(arms).fill(0)
  return allocation.map((arm) => {
    counts[arm]++
    return Math.max(...counts) - Math.min(...counts)
  })
}
