import { useMemo } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { baseCounts, cleanDna, complement, gcPercent, meltingTemp, reverseComplement, transcribe } from '@/lib/bio'
import { CopyButton, Notice, SeqView, Stat } from '@/components/seq-view'

export const EXAMPLE_DNA = 'ATGAAAGCTTGGCGTAATCCGGGTTTAGCAGCCATTGACCGTAAGGGCTGA'

export function DnaTool({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const r = useMemo(() => cleanDna(value), [value])
  const counts = useMemo(() => baseCounts(r.seq), [r.seq])
  const gc = gcPercent(r.seq)
  const tm = meltingTemp(r.seq)
  const has = r.seq.length > 0

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="dna-in" className="text-sm font-medium">DNA sequence (plain or FASTA)</label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onChange(EXAMPLE_DNA)}>Load example</Button>
            <Button variant="ghost" size="sm" onClick={() => onChange('')}>Clear</Button>
          </div>
        </div>
        <Textarea id="dna-in" value={value} onChange={(e) => onChange(e.target.value)} rows={5} spellCheck={false}
          className="font-mono text-sm" placeholder="Paste ATGC… Spaces, digits and FASTA header lines are ignored." />
        {r.convertedU && <Notice>Found U in the input, so it was read as RNA and U was changed to T.</Notice>}
        {r.invalid.length > 0 && <Notice tone="warn">Ignored characters that are not valid DNA codes: {r.invalid.join(' ')}</Notice>}
      </div>

      {has ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Length" value={`${r.seq.length} nt`} />
            <Stat label="GC content" value={gc === null ? '—' : `${gc.toFixed(1)}%`} hint="A, C, G, T only" />
            <Stat label="Tm (approx.)" value={tm ? `${tm.tm.toFixed(1)} °C` : '—'}
              hint={tm ? (tm.method === 'wallace' ? 'Wallace rule, ≤14 nt' : 'GC/length formula') : undefined} />
            <Stat label="A / C / G / T" value={`${counts.A} / ${counts.C} / ${counts.G} / ${counts.T}`}
              hint={counts.other ? `${counts.other} ambiguous` : undefined} />
          </div>
          <Notice>Tm values are textbook approximations for short oligos. Real primer design uses nearest-neighbour models and your salt conditions.</Notice>
          <Out title="Complement (3′→5′ as written left to right)" seq={complement(r.seq)} />
          <Out title="Reverse complement (5′→3′)" seq={reverseComplement(r.seq)} />
          <Out title="RNA transcript of the coding strand" seq={transcribe(r.seq)} />
        </>
      ) : (
        <Notice>Paste a sequence or load the example to see its properties.</Notice>
      )}
    </div>
  )
}

function Out({ title, seq }: { title: string; seq: string }) {
  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <CopyButton text={seq} />
      </div>
      <SeqView seq={seq} />
    </section>
  )
}
