import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

const BASE_CLASS: Record<string, string> = {
  A: 'text-base-a',
  C: 'text-base-c',
  G: 'text-base-g',
  T: 'text-base-t',
  U: 'text-base-t',
}

// Past this length, per-base colouring would create tens of thousands of DOM nodes, so fall back to plain text.
const COLOUR_LIMIT = 6000

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 gap-1.5 px-2 text-xs"
      disabled={!text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1400)
        } catch {
          /* clipboard can be blocked; nothing useful to do */
        }
      }}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {done ? 'Copied' : label}
    </Button>
  )
}

/** Sequence in lines of `lineLength`, grouped in tens, with the start position of each line in the gutter. */
export function SeqView({ seq, colour = true, lineLength = 60 }: { seq: string; colour?: boolean; lineLength?: number }) {
  if (!seq) return <p className="text-sm text-ink-soft">Nothing to show yet.</p>
  const colourise = colour && seq.length <= COLOUR_LIMIT
  const lines: { start: number; text: string }[] = []
  for (let i = 0; i < seq.length; i += lineLength) lines.push({ start: i + 1, text: seq.slice(i, i + lineLength) })
  const gutter = String(seq.length).length
  return (
    <div className="max-h-72 overflow-auto rounded-md border border-border bg-card p-3 font-mono text-[13px] leading-6" role="region" aria-label="Sequence">
      {lines.map((line) => {
        const groups: string[] = []
        for (let i = 0; i < line.text.length; i += 10) groups.push(line.text.slice(i, i + 10))
        return (
          <div key={line.start} className="flex gap-3 whitespace-nowrap">
            <span className="select-none text-right text-ink-soft" style={{ minWidth: `${gutter}ch` }}>{line.start}</span>
            <span>
              {groups.map((g, gi) => (
                <span key={gi} className="mr-2 inline-block">
                  {colourise
                    ? g.split('').map((c, ci) => <span key={ci} className={BASE_CLASS[c] ?? 'text-ink-soft'}>{c}</span>)
                    : g}
                </span>
              ))}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wider text-ink-soft">{label}</p>
      <p className="mt-0.5 font-display text-xl text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-soft">{hint}</p>}
    </div>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: React.ReactNode }) {
  return (
    <p className={`rounded-md border px-3 py-2 text-xs ${tone === 'warn' ? 'border-warn/40 bg-warn-soft text-ink' : 'border-border bg-lab-soft text-ink-soft'}`}>
      {children}
    </p>
  )
}
