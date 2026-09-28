import { useState } from 'react';
import { CheckCircle2, CircleAlert, FileCheck2 } from 'lucide-react';
import { AiPanel } from '@/components/ai-panel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { eur, useStore } from '@/lib/store';
import type { Invoice } from '@/lib/types';

export function AiInvoiceAssistant({ invoice }: { invoice: Invoice }) {
  const { buyers, evidenceReviews, attachDemoEvidence, submitEvidenceReview } = useStore();
  const buyer = buyers.find((item) => item.id === invoice.buyerId);
  const review = evidenceReviews[invoice.id];
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  const hasDocument = !!review;
  const confirmed = review?.state === 'confirmed';
  const submitted = review?.state === 'submitted';
  const paid = invoice.status === 'paid';
  const action = (callback: () => string | null, success: string) => {
    const error = callback();
    setMessage(error ?? success);
  };
  const checks = [
    { label: 'Arve number', value: invoice.nr, ready: true },
    { label: 'Ostja', value: buyer?.name ?? 'Ostja puudub', ready: !!buyer },
    { label: 'Arve summa', value: eur(invoice.amount), ready: true },
    { label: 'Tarnekinnitus', value: hasDocument ? 'Näidisdokumendis tuvastatud' : 'Puudub', ready: hasDocument },
  ];

  return (
    <AiPanel title="Arve kontroll">
      <div className="space-y-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{invoice.nr}</p>
          <h3 className="font-semibold">{paid ? 'Arve on tasutud' : confirmed ? 'Tarnekinnitus on kontrollitud' : submitted ? 'Tõend ootab panga kontrolli' : hasDocument ? 'Näidisdokument on ülevaatuseks valmis' : 'Puudub ostja tarnekinnitus'}</h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {paid ? 'Selle arve jaoks uut finantseerimist ega tõendikontrolli ei algatata.' : confirmed
              ? 'Tõendi tase on E2. Arve finantseerimine vajab ka ülejäänud tingimuste kontrolli.'
              : hasDocument
                ? 'Näidisvõrdluses kattuvad arve ja saatelehe andmed. Pank kinnitab dokumendi sobivuse ja tõendi taseme.'
                : 'Lisa allkirjastatud saateleht või muu aktsepteeritud tarnetõend. Praegune E1 tase ei ole finantseerimiseks piisav.'}
          </p>
        </div>

        <ul className="divide-y border-y" aria-label="Arve kontrollnimekiri">
          {checks.map((check) => (
            <li key={check.label} className="flex items-start gap-2 py-2.5">
              {check.ready ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-success" aria-hidden="true" /> : <CircleAlert className="h-4 w-4 shrink-0 mt-0.5 text-warning" aria-hidden="true" />}
              <span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">{check.label}</span><span className="block text-xs font-medium break-words">{check.value}</span></span>
              {hasDocument && check.ready && <span className="text-[11px] text-muted-foreground shrink-0">Näidis kattub</span>}
            </li>
          ))}
        </ul>

        <details className="text-xs">
          <summary className="cursor-pointer text-info font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">Vaata kontrolli aluseid</summary>
          <div className="space-y-2 text-muted-foreground mt-2 leading-relaxed">
            <p>Allikas: arve {invoice.nr}, ostja {buyer?.name}, summa {eur(invoice.amount)}.</p>
            <p>{review ? `Näidisdokument: ${review.documentName}. Dokumendi sisu ja AI võrdlus on simuleeritud; päris faili ei laadita üles.` : 'Arvel puudub E2 või E3 taseme tarnetõend. Arveandmed on olemas, kuid need ei tõenda kauba vastuvõtmist.'}</p>
            <p>Vajalik kontroll: ostja kinnitus, allkiri ning arve ja tarnedokumendi seos. AI soovitus ei muuda tõendi taset ega käivita väljamakset.</p>
            {confirmed && <p>Kinnitas: {review.reviewer}.</p>}
          </div>
        </details>

        {!hasDocument && !paid && (
          <div className="flex flex-col gap-2 items-stretch">
            <Button size="sm" onClick={() => action(() => attachDemoEvidence(invoice.id), 'Näidisdokument lisatud. Vaata võrdlus üle ja saada tõend kontrolli.')}><FileCheck2 className="h-4 w-4" />Lisa näidisdokument</Button>
            <Button size="sm" variant="outline" onClick={() => { setDraft(`Palun lisage arve ${invoice.nr} (${eur(invoice.amount)}) allkirjastatud saateleht või muu ostja tarnekinnitus. Dokumendil peab olema võimalik tuvastada ostja ja seos arvega.`); setMessage('Kinnituse päringu mustand koostatud. Seda ei saadeta automaatselt.'); }}>Koosta kinnituse päring</Button>
          </div>
        )}
        {review?.state === 'attached' && !paid && <Button className="w-full" size="sm" onClick={() => action(() => submitEvidenceReview(invoice.id), 'Tõend saadetud panga kontrolli. Arve jääb avatuks ja tõendi tase on endiselt E1.')}>Saada tõend kontrolli</Button>}
        {submitted && !paid && <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning">Ootab kontrolli · E1 säilib. Panga analüütik leiab tõendi vaatest „Nõuded ja laekumised”.</p>}
        {confirmed && !paid && <p className="rounded-md border border-success/30 bg-success/5 p-3 text-xs text-success">Tõend kinnitatud · E2. Finantseerimist ei ole käivitatud.</p>}
        {draft !== null && <div className="space-y-2"><label className="text-xs font-medium" htmlFor={`evidence-request-${invoice.id}`}>Kinnituse päringu mustand</label><Textarea id={`evidence-request-${invoice.id}`} value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} /><p className="text-[11px] text-muted-foreground">Mustand on muudetav. Selle näite kaudu sõnumeid ei saadeta.</p></div>}
        <p role="status" aria-live="polite" className="text-xs text-muted-foreground">{message}</p>
      </div>
    </AiPanel>
  );
}
