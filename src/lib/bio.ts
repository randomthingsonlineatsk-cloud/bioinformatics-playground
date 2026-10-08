// Pure sequence and protein functions. No React, no browser APIs, so they can be
// unit-tested from plain Node and reused anywhere.

export interface CleanResult {
  seq: string
  /** Characters that are not valid for the chosen alphabet, de-duplicated. */
  invalid: string[]
  /** True when the input contained U and it was read as T. */
  convertedU: boolean
}

const DNA_VALID = new Set('ACGTRYKMSWBDHVN'.split(''))
const PROTEIN_VALID = new Set('ACDEFGHIKLMNPQRSTVWYXBZUO*'.split(''))

/** Strips FASTA headers (lines starting with ">"), whitespace and digits, upper-cases the rest. */
function stripFasta(raw: string): string {
  return raw
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('>'))
    .join('')
    .replace(/[\s\d]/g, '')
    .toUpperCase()
}

export function cleanDna(raw: string): CleanResult {
  let seq = stripFasta(raw)
  const convertedU = seq.includes('U')
  if (convertedU) seq = seq.replace(/U/g, 'T')
  const invalid = [...new Set(seq.split('').filter((c) => !DNA_VALID.has(c)))]
  return { seq, invalid, convertedU }
}

export function cleanProtein(raw: string): CleanResult {
  const seq = stripFasta(raw)
  const invalid = [...new Set(seq.split('').filter((c) => !PROTEIN_VALID.has(c)))]
  return { seq, invalid, convertedU: false }
}

export interface BaseCounts {
  A: number
  C: number
  G: number
  T: number
  /** Everything else: N and the other IUPAC ambiguity codes. */
  other: number
}

export function baseCounts(seq: string): BaseCounts {
  const counts: BaseCounts = { A: 0, C: 0, G: 0, T: 0, other: 0 }
  for (const c of seq) {
    if (c === 'A' || c === 'C' || c === 'G' || c === 'T') counts[c]++
    else counts.other++
  }
  return counts
}

/** GC content as a percentage of unambiguous bases (A, C, G, T). Returns null when there are none. */
export function gcPercent(seq: string): number | null {
  const { A, C, G, T } = baseCounts(seq)
  const total = A + C + G + T
  return total === 0 ? null : ((G + C) / total) * 100
}

export interface MeltingTemp {
  method: 'wallace' | 'gc-length'
  tm: number
}

/**
 * Rough melting temperature for a short oligo. Wallace rule (2*(A+T) + 4*(G+C)) up to 14 nt,
 * 64.9 + 41*(G+C-16.4)/N above that. Both are textbook approximations at ~50 mM Na+, not nearest-neighbour values.
 */
export function meltingTemp(seq: string): MeltingTemp | null {
  const { A, C, G, T } = baseCounts(seq)
  const n = A + C + G + T
  if (n === 0) return null
  if (n <= 14) return { method: 'wallace', tm: 2 * (A + T) + 4 * (G + C) }
  return { method: 'gc-length', tm: 64.9 + (41 * (G + C - 16.4)) / n }
}

const COMPLEMENT: Record<string, string> = {
  A: 'T', T: 'A', G: 'C', C: 'G',
  R: 'Y', Y: 'R', K: 'M', M: 'K',
  B: 'V', V: 'B', D: 'H', H: 'D',
  S: 'S', W: 'W', N: 'N',
}

export function complement(seq: string): string {
  return seq.split('').map((c) => COMPLEMENT[c] ?? c).join('')
}

export function reverseComplement(seq: string): string {
  return complement(seq).split('').reverse().join('')
}

/** DNA coding strand to mRNA: T becomes U. */
export function transcribe(seq: string): string {
  return seq.replace(/T/g, 'U')
}

// Standard genetic code, codon index = 16*i1 + 4*i2 + i3 with bases ordered T, C, A, G.
const BASES = 'TCAG'
const CODON_AA = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG'

export function translateCodon(codon: string): string {
  const i1 = BASES.indexOf(codon[0])
  const i2 = BASES.indexOf(codon[1])
  const i3 = BASES.indexOf(codon[2])
  if (i1 < 0 || i2 < 0 || i3 < 0) return 'X'
  return CODON_AA[16 * i1 + 4 * i2 + i3]
}

/** Translates from `offset` (0, 1 or 2). Stops are written as "*"; codons with ambiguity codes become "X". Trailing partial codons are ignored. */
export function translate(seq: string, offset = 0): string {
  let out = ''
  for (let i = offset; i + 3 <= seq.length; i += 3) out += translateCodon(seq.slice(i, i + 3))
  return out
}

export interface Frame {
  label: string
  strand: '+' | '-'
  offset: number
  protein: string
}

/** Six-frame translation: +1, +2, +3 on the given strand and -1, -2, -3 on its reverse complement. */
export function sixFrames(seq: string): Frame[] {
  const rc = reverseComplement(seq)
  const frames: Frame[] = []
  for (let f = 0; f < 3; f++) frames.push({ label: `+${f + 1}`, strand: '+', offset: f, protein: translate(seq, f) })
  for (let f = 0; f < 3; f++) frames.push({ label: `-${f + 1}`, strand: '-', offset: f, protein: translate(rc, f) })
  return frames
}

export interface Orf {
  frame: string
  strand: '+' | '-'
  /** 1-based, inclusive, on the strand as entered (so minus-strand ORFs are reported on the forward coordinates). */
  start: number
  end: number
  /** Amino acids, excluding the stop. */
  aaLength: number
  protein: string
}

/**
 * Finds complete ORFs (ATG through the first in-frame stop) in all six frames.
 * Only the first ATG after the previous stop is used, so nested ATGs are not reported separately.
 */
export function findOrfs(seq: string, minAa = 30): Orf[] {
  const L = seq.length
  const rc = reverseComplement(seq)
  const found: Orf[] = []
  for (const strand of ['+', '-'] as const) {
    const s = strand === '+' ? seq : rc
    for (let f = 0; f < 3; f++) {
      let start: number | null = null
      for (let i = f; i + 3 <= s.length; i += 3) {
        const codon = s.slice(i, i + 3)
        if (start === null && codon === 'ATG') start = i
        const aa = translateCodon(codon)
        if (aa === '*' && start !== null) {
          const aaLength = (i - start) / 3
          if (aaLength >= minAa) {
            const a = start
            const b = i + 3
            found.push({
              frame: `${strand}${f + 1}`,
              strand,
              start: strand === '+' ? a + 1 : L - b + 1,
              end: strand === '+' ? b : L - a,
              aaLength,
              protein: translate(s.slice(start, i), 0),
            })
          }
          start = null
        } else if (aa === '*') {
          start = null
        }
      }
    }
  }
  return found.sort((x, y) => y.aaLength - x.aaLength)
}

// Average residue masses (Da), i.e. amino acid minus water. Add one water per chain.
const RESIDUE_MASS: Record<string, number> = {
  A: 71.0788, R: 156.1875, N: 114.1038, D: 115.0886, C: 103.1388,
  E: 129.1155, Q: 128.1307, G: 57.0519, H: 137.1411, I: 113.1594,
  L: 113.1594, K: 128.1741, M: 131.1926, F: 147.1766, P: 97.1167,
  S: 87.0782, T: 101.1051, W: 186.2132, Y: 163.1760, V: 99.1326,
}
const WATER = 18.01528

export const AMINO_ACIDS = Object.keys(RESIDUE_MASS)

export interface ProteinStats {
  length: number
  /** Average molecular weight in Da, counting only the 20 standard residues. */
  mass: number | null
  /** Residues that were not counted toward the mass (X, B, Z, U, O, stop). */
  skipped: number
  counts: Record<string, number>
}

export function proteinStats(seq: string): ProteinStats {
  const counts: Record<string, number> = Object.fromEntries(AMINO_ACIDS.map((a) => [a, 0]))
  let mass = 0
  let counted = 0
  let skipped = 0
  for (const c of seq) {
    if (c in RESIDUE_MASS) {
      counts[c]++
      mass += RESIDUE_MASS[c]
      counted++
    } else skipped++
  }
  return { length: seq.length, mass: counted === 0 ? null : mass + WATER, skipped, counts }
}
