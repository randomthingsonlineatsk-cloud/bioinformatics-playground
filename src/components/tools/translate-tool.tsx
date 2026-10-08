import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cleanDna, findOrfs, sixFrames } from '@/lib/bio'
import { CopyButton, Notice } from '@/components/seq-view'

export function TranslateTool({ dna, onSendProtein }: { dna: string; onSendProtein: (p: string) => void }) {
  const [minAa, setMinAa] = useState(10)
  const r = useMemo(() => cleanDna(dna), [dna])
  const frames = useMemo(() => sixFrames(r.seq), [r.seq])
  const orfs = useMemo(() => findOrfs(r.seq, Math.max(1, minAa)), [r.seq, minAa])

  if (!r.seq) return <Notice>Enter a DNA sequence on the DNA tab first. It is shared across tabs.</Notice>

  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <h3 className="text-sm font-medium">Six-frame translation</h3>
        <p className="text-sm text-ink-soft">Stop codons are shown as *. Frames −1 to −3 read the reverse complement.</p>
        <div className="grid gap-2">
          {frames.map((f) => (
            <div key={f.label} className="rounded-md border bg-paper p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-xs font-semibold">Frame {f.label}</span>
                <CopyButton text={f.protein} />
              </div>
              <p className="break-all font-mono text-xs leading-relaxed">{f.protein || '—'}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">Open reading frames</h3>
            <p className="text-sm text-ink-soft">Complete ATG…stop in any of six frames.</p>
          </div>
          <label className="grid gap-1 text-sm">
            Minimum length (amino acids)
            <Input type="number" min={1} value={minAa} onChange={(e) => setMinAa(Number(e.target.value) || 1)} className="w-32" />
          </label>
        </div>
        {orfs.length === 0 ? (
          <Notice>No complete ORFs of at least {minAa} amino acids. Try a lower minimum.</Notice>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-lab-soft text-left">
                <tr><th className="p-2">Frame</th><th className="p-2">Position</th><th className="p-2">Length</th><th className="p-2">Protein</th><th className="p-2" /></tr>
              </thead>
              <tbody>
                {orfs.map((o, i) => (
                  <tr key={i} className="border-t align-top">
                    <td className="p-2 font-mono">{o.frame}</td>
                    <td className="p-2 font-mono whitespace-nowrap">{o.start}–{o.end}</td>
                    <td className="p-2">{o.aaLength} aa</td>
                    <td className="p-2 break-all font-mono text-xs">{o.protein}</td>
                    <td className="p-2"><Button size="sm" variant="outline" onClick={() => onSendProtein(o.protein)}>Analyse</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-ink-soft">Positions are 1-based on the sequence as entered. Minus-strand ORFs are listed on the same forward coordinates.</p>
      </section>
    </div>
  )
}
