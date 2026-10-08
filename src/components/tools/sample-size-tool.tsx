import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { sampleSizeTwoMeans, sampleSizeTwoProportions, type SampleSizeResult } from '@/lib/stats'
import { Notice, Stat } from '@/components/seq-view'

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
    </label>
  )
}

export function SampleSizeTool() {
  const [kind, setKind] = useState<'means' | 'props'>('means')
  const [alpha, setAlpha] = useState(0.05)
  const [power, setPower] = useState(0.8)
  const [sided, setSided] = useState<1 | 2>(2)
  const [ratio, setRatio] = useState(1)
  const [dropoutPct, setDropoutPct] = useState(10)
  const [delta, setDelta] = useState(5)
  const [sd, setSd] = useState(10)
  const [p1, setP1] = useState(0.3)
  const [p2, setP2] = useState(0.45)

  const out = useMemo<{ res?: SampleSizeResult; error?: string }>(() => {
    try {
      const base = { alpha, power, sided, ratio, dropout: dropoutPct / 100 }
      if (kind === 'means') {
        if (!(sd > 0) || !(delta !== 0)) return { error: 'Enter a standard deviation above 0 and a non-zero difference.' }
        return { res: sampleSizeTwoMeans({ ...base, delta, sd }) }
      }
      if (!(p1 > 0 && p1 < 1 && p2 > 0 && p2 < 1) || p1 === p2) return { error: 'Proportions must be between 0 and 1 and different from each other.' }
      return { res: sampleSizeTwoProportions({ ...base, p1, p2 }) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Invalid input' }
    }
  }, [kind, alpha, power, sided, ratio, dropoutPct, delta, sd, p1, p2])

  const num = (setter: (n: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => setter(Number(e.target.value))

  return (
    <div className="grid gap-6">
      <div className="inline-flex w-fit rounded-md border p-1" role="group" aria-label="Outcome type">
        {(['means', 'props'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
            className={`rounded px-3 py-1.5 text-sm ${kind === k ? 'bg-lab text-paper' : 'text-ink-soft'}`}>
            {k === 'means' ? 'Compare two means' : 'Compare two proportions'}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {kind === 'means' ? (
          <>
            <Field label="Difference to detect" hint="In the units of your outcome"><Input type="number" step="any" value={delta} onChange={num(setDelta)} /></Field>
            <Field label="Standard deviation" hint="Common SD in both groups"><Input type="number" step="any" min={0} value={sd} onChange={num(setSd)} /></Field>
          </>
        ) : (
          <>
            <Field label="Proportion in group 1" hint="0 to 1, e.g. 0.30"><Input type="number" step="0.01" min={0} max={1} value={p1} onChange={num(setP1)} /></Field>
            <Field label="Proportion in group 2" hint="0 to 1, e.g. 0.45"><Input type="number" step="0.01" min={0} max={1} value={p2} onChange={num(setP2)} /></Field>
          </>
        )}
        <Field label="Significance level (α)"><Input type="number" step="0.005" value={alpha} onChange={num(setAlpha)} /></Field>
        <Field label="Power"><Input type="number" step="0.05" value={power} onChange={num(setPower)} /></Field>
        <Field label="Test">
          <select value={sided} onChange={(e) => setSided(Number(e.target.value) as 1 | 2)} className="h-9 rounded-md border bg-paper px-2 text-sm">
            <option value={2}>Two-sided</option>
            <option value={1}>One-sided</option>
          </select>
        </Field>
        <Field label="Allocation ratio (group 2 : group 1)"><Input type="number" step="0.5" min={0.1} value={ratio} onChange={num(setRatio)} /></Field>
        <Field label="Expected dropout (%)"><Input type="number" min={0} max={90} value={dropoutPct} onChange={num(setDropoutPct)} /></Field>
      </div>

      {out.error && <Notice tone="warn">{out.error}</Notice>}
      {out.res && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Group 1" value={out.res.n1} />
            <Stat label="Group 2" value={out.res.n2} />
            <Stat label="Analysable total" value={out.res.total} />
            <Stat label="To enrol" value={out.res.enrolled} hint={`with ${dropoutPct}% dropout`} />
          </div>
          <p className="text-sm">
            In plain terms: with {out.res.n1} and {out.res.n2} participants completing, a {sided === 2 ? 'two-sided' : 'one-sided'} test at α = {alpha}
            would detect the stated difference {Math.round(power * 100)}% of the time if it is real. Enrol {out.res.enrolled} to allow for dropout.
          </p>
          <Notice>
            Uses the normal approximation (z = {out.res.zAlpha.toFixed(3)} for α, {out.res.zBeta.toFixed(3)} for power). It is a teaching tool: small samples, rare events,
            clustering, interim analyses and multiple endpoints all need a statistician and proper software.
          </Notice>
        </>
      )}
    </div>
  )
}
