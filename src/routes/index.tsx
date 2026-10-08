import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DnaTool } from '@/components/tools/dna-tool'
import { TranslateTool } from '@/components/tools/translate-tool'
import { ProteinTool } from '@/components/tools/protein-tool'
import { SampleSizeTool } from '@/components/tools/sample-size-tool'
import { RandomizeTool } from '@/components/tools/randomize-tool'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [tab, setTab] = useState('dna')
  const [dna, setDna] = useState('')
  const [protein, setProtein] = useState('')

  return (
    <div className="paper-grid min-h-screen">
      <header className="mx-auto max-w-4xl px-4 pt-10 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-lab">Educational toolkit</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>Bioinformatics Playground</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Sequence analysis, translation, protein mass, sample-size and randomisation tools. Everything runs in your browser and nothing you paste is sent anywhere.
        </p>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-12">
        <div className="rounded-lg border bg-paper p-4 shadow-sm sm:p-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
              <TabsTrigger value="dna">DNA</TabsTrigger>
              <TabsTrigger value="translate">Translate &amp; ORFs</TabsTrigger>
              <TabsTrigger value="protein">Protein</TabsTrigger>
              <TabsTrigger value="sample">Sample size</TabsTrigger>
              <TabsTrigger value="random">Randomise</TabsTrigger>
            </TabsList>
            <TabsContent value="dna" className="pt-5"><DnaTool value={dna} onChange={setDna} /></TabsContent>
            <TabsContent value="translate" className="pt-5">
              <TranslateTool dna={dna} onSendProtein={(p) => { setProtein(p); setTab('protein') }} />
            </TabsContent>
            <TabsContent value="protein" className="pt-5"><ProteinTool value={protein} onChange={setProtein} /></TabsContent>
            <TabsContent value="sample" className="pt-5"><SampleSizeTool /></TabsContent>
            <TabsContent value="random" className="pt-5"><RandomizeTool /></TabsContent>
          </Tabs>
        </div>
        <p className="mt-6 text-xs text-ink-soft">
          For learning and portfolio demonstration only. Not validated for clinical, diagnostic or regulatory use. Example sequences are made up, not real genes.
        </p>
      </main>

      <footer className="border-t py-6 text-center text-sm text-ink-soft">made by Khan Gulrez Shagufa Fazal Ahmed</footer>
    </div>
  )
}
