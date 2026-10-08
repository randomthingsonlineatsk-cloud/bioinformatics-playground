import { useMemo } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { AMINO_ACIDS, cleanProtein, proteinStats } from '@/lib/bio'
import { Notice, Stat } from '@/components/seq-view'

export function ProteinTool({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const r = useMemo(() => cleanProtein(value), [value])
  const st = useMemo(() => proteinStats(r.seq.replace(/\*$/, '')), [r.seq])
  const max = Math.max(1, ...Object.values(st.counts))

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="prot-in" className="text-sm font-medium">Protein sequence (one-letter codes)</label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onChange('DRVYIHPF')}>Load angiotensin II</Button>
            <Button variant="ghost" size="sm" onClick={() => onChange('')}>Clear</Button>
          </div>
        </div>
        <Textarea id="prot-in" value={value} onChange={(e) => onChange(e.target.value)} rows={4} spellCheck={false} className="font-mono text-sm" />
        {r.invalid.length > 0 && <Notice tone="warn">Ignored invalid characters: {r.invalid.join(' ')}</Notice>}
      </div>

      {st.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Length" value={`${st.length} aa`} />
            <Stat label="Average mass" value={st.mass === null ? '—' : `${st.mass.toFixed(2)} Da`} hint="Unmodified, standard residues" />
            <Stat label="Not counted" value={st.skipped} hint="X, B, Z, U, O" />
          </div>
          <div className="grid gap-1" role="img" aria-label="Amino acid composition bar chart">
            {AMINO_ACIDS.map((a) => (
              <div key={a} className="flex items-center gap-2 text-xs">
                <span className="w-4 font-mono">{a}</span>
                <div className="h-3 flex-1 rounded-sm bg-lab-soft">
                  <div className="h-3 rounded-sm bg-lab" style={{ width: `${(st.counts[a] / max) * 100}%` }} />
                </div>
                <span className="w-8 text-right tabular-nums">{st.counts[a]}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <Notice>Paste a protein, or send one here from the ORF table.</Notice>
      )}
    </div>
  )
}
