import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { randomize, runningImbalance, type Scheme } from '@/lib/stats'
import { Notice, Stat } from '@/components/seq-view'

const LETTERS = 'ABCDEFGH'

export function RandomizeTool() {
  const [n, setN] = useState(40)
  const [arms, setArms] = useState(2)
  const [scheme, setScheme] = useState<Scheme>('block')
  const [blockSize, setBlockSize] = useState(4)
  const [seed, setSeed] = useState(2024)

  const res = useMemo(() => {
    try {
      const nn = Math.min(Math.max(Math.floor(n), 1), 500)
      const alloc = randomize(nn, arms, scheme, blockSize, seed)
      const counts = new Array<number>(arms).fill(0)
      alloc.forEach((a) => counts[a]++)
      return { alloc, counts, imb: runningImbalance(alloc, arms) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Invalid input' }
    }
  }, [n, arms, scheme, blockSize, seed])

  const csv = () => {
    if (!('alloc' in res) || !res.alloc) return
    const rows = ['participant,arm', ...res.alloc.map((a, i) => `${i + 1},${LETTERS[a]}`)]
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'randomisation-list.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1 text-sm"><span className="font-medium">Participants (max 500)</span>
          <Input type="number" min={1} max={500} value={n} onChange={(e) => setN(Number(e.target.value))} /></label>
        <label className="grid gap-1 text-sm"><span className="font-medium">Arms</span>
          <select value={arms} onChange={(e) => setArms(Number(e.target.value))} className="h-9 rounded-md border bg-paper px-2 text-sm">
            {[2, 3, 4].map((a) => <option key={a} value={a}>{a}</option>)}
          </select></label>
        <label className="grid gap-1 text-sm"><span className="font-medium">Seed</span>
          <div className="flex gap-2">
            <Input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
            <Button variant="outline" onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}>New</Button>
          </div></label>
        <label className="grid gap-1 text-sm"><span className="font-medium">Scheme</span>
          <select value={scheme} onChange={(e) => setScheme(e.target.value as Scheme)} className="h-9 rounded-md border bg-paper px-2 text-sm">
            <option value="simple">Simple (independent draws)</option>
            <option value="block">Permuted blocks</option>
          </select></label>
        {scheme === 'block' && (
          <label className="grid gap-1 text-sm"><span className="font-medium">Block size</span>
            <Input type="number" min={arms} step={arms} value={blockSize} onChange={(e) => setBlockSize(Number(e.target.value))} />
            <span className="text-xs text-ink-soft">Multiple of {arms}</span></label>
        )}
      </div>

      {'error' in res && res.error && <Notice tone="warn">{res.error}</Notice>}
      {'alloc' in res && res.alloc && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {res.counts.map((c, i) => <Stat key={i} label={`Arm ${LETTERS[i]}`} value={c} />)}
            <Stat label="Final imbalance" value={res.imb[res.imb.length - 1]} hint="largest minus smallest arm" />
          </div>
          <ImbalanceChart imb={res.imb} />
          <section className="grid gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Allocation sequence</h3>
              <Button size="sm" variant="outline" onClick={csv}>Download CSV</Button>
            </div>
            <p className="break-all font-mono text-sm leading-relaxed">{res.alloc.map((a) => LETTERS[a]).join(' ')}</p>
          </section>
          <Notice>
            Same seed, same list, so a list can be reproduced and audited. Real trials conceal the list (central or sealed-envelope allocation) and often stratify by site.
            Permuted blocks keep arms balanced but a fixed small block can make later assignments guessable.
          </Notice>
        </>
      )}
    </div>
  )
}

function ImbalanceChart({ imb }: { imb: number[] }) {
  const W = 600, H = 140, pad = 24
  const max = Math.max(2, ...imb)
  const x = (i: number) => pad + (i / Math.max(1, imb.length - 1)) * (W - pad * 2)
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2)
  const d = imb.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <figure className="grid gap-1">
      <figcaption className="text-sm font-medium">Running imbalance between arms</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-md border bg-paper" role="img" aria-label="Line chart of running imbalance">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} className="stroke-ink-soft" strokeWidth="1" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} className="stroke-ink-soft" strokeWidth="1" />
        <path d={d} fill="none" className="stroke-lab" strokeWidth="2" />
        <text x={4} y={pad + 4} fontSize="10" className="fill-ink-soft">{max}</text>
        <text x={4} y={H - pad} fontSize="10" className="fill-ink-soft">0</text>
        <text x={W - pad} y={H - 6} fontSize="10" textAnchor="end" className="fill-ink-soft">participant {imb.length}</text>
      </svg>
    </figure>
  )
}
