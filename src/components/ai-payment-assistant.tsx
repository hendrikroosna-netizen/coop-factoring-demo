import { useState } from 'react';
import { ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { AiPanel } from '@/components/ai-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cents, euros, invoiceOutstanding } from '@/lib/finance';
import { useStore } from '@/lib/store';
import type { Invoice } from '@/lib/types';
import { cn } from '@/lib/utils';

const money = (value: number) => new Intl.NumberFormat('et-EE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value);
const REVIEWERS = ['Kadri Rehe', 'Margus Tamm', 'Anna Liiv', 'Aivar Tšekmazov'];

function suggestedAmounts(invoices: Invoice[], amount: number): Record<string, string> {
  let remaining = cents(amount);
  const result: Record<string, string> = {};
  // Reproduce the reviewed demonstration: settle invoice 04438 and put the
  // remainder against 04412. Every amount is capped by its current live balance.
  for (const invoice of [...invoices].reverse()) {
    const allocation = Math.min(remaining, cents(invoiceOutstanding(invoice)));
    result[invoice.id] = euros(allocation).toFixed(2);
    remaining -= allocation;
  }
  return result;
}

export function AiPaymentAssistant() {
  const { demoPayments, invoices, buyers, confirmPaymentAllocation } = useStore();
  const payment = demoPayments.find((item) => item.id === 'ai-gtc-10000');
  const matchingInvoices = payment ? payment.allowedInvoiceIds.flatMap((id) => {
    const invoice = invoices.find((item) => item.id === id && item.buyerId === payment.buyerId);
    return invoice ? [invoice] : [];
  }) : [];
  const [amounts, setAmounts] = useState<Record<string, string>>(() => suggestedAmounts(matchingInvoices, payment?.amount ?? 0));
  const [step, setStep] = useState<'suggestion' | 'review'>('suggestion');
  const [reviewContext, setReviewContext] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!payment) return null;

  const buyer = buyers.find((item) => item.id === payment.buyerId);
  const confirmed = payment.status === 'allocated';
  const context = JSON.stringify({ payment, invoices: matchingInvoices });
  const stale = step === 'review' && reviewContext !== context && !confirmed;
  const proposed = matchingInvoices.map((invoice) => ({
    invoiceId: invoice.id,
    amount: amounts[invoice.id]?.trim() ? Number(amounts[invoice.id]) : NaN,
  }));
  const allNumbers = proposed.every((allocation) => Number.isFinite(allocation.amount));
  const total = allNumbers ? euros(proposed.reduce((sum, allocation) => sum + cents(allocation.amount), 0)) : 0;
  const unallocated = euros(cents(payment.amount) - cents(total));
  const allocated = confirmed ? payment.allocations.reduce((sum, allocation) => sum + cents(allocation.amount), 0) : 0;
  const availableTotal = matchingInvoices.reduce((sum, invoice) => sum + cents(invoiceOutstanding(invoice)), 0);
  const notEnoughBalance = availableTotal < cents(payment.amount);

  const validation = matchingInvoices.length !== payment.allowedInvoiceIds.length
    ? 'Kõiki laekumisega seotud arveid ei leitud.'
    : !allNumbers
      ? 'Sisesta mõlema arve jaotussumma.'
      : proposed.some((allocation) => allocation.amount < 0 || Math.abs(allocation.amount * 100 - cents(allocation.amount)) > 0.000001)
        ? 'Summad peavad olema null või positiivsed, kuni kahe komakohaga.'
        : proposed.some((allocation) => cents(allocation.amount) > cents(invoiceOutstanding(matchingInvoices.find((invoice) => invoice.id === allocation.invoiceId)!)))
          ? 'Jaotus ületab mõne arve praegust jääki. Muuda summasid või värskenda ettepanekut.'
          : cents(total) !== cents(payment.amount)
            ? `Jaotus peab võrduma laekumisega ${money(payment.amount)}.`
            : null;

  const refreshSuggestion = () => {
    setAmounts(suggestedAmounts(matchingInvoices, payment.amount));
    setStep('suggestion');
    setError('');
    setReviewer('');
    setMessage('Ettepanek uuendatud arvete praeguste jääkide järgi.');
  };

  const review = () => {
    if (validation) { setError(validation); return; }
    setReviewContext(context);
    setStep('review');
    setError('');
    setMessage('Vaata jaotuse mõju üle ning vali kinnitaja. Saldosid pole veel muudetud.');
  };

  const confirm = () => {
    if (reviewContext !== context) {
      setError('Arvete või laekumise andmed muutusid. Värskenda ettepanekut ja kontrolli jaotust uuesti.');
      return;
    }
    if (validation) { setError(validation); return; }
    if (!reviewer.trim()) { setError('Vali jaotuse kinnitaja.'); return; }
    const result = confirmPaymentAllocation(payment.id, proposed.filter((allocation) => allocation.amount > 0), reviewer);
    if (result) { setError(result); return; }
    setError('');
    setStep('suggestion');
    setMessage('Jaotus kinnitatud. Arvete jäägid, kasutatud limiit ja auditi jälg on uuendatud.');
  };

  return (
    <AiPanel title="AI laekumiste jaotus">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] text-[13px]">
        <div className="min-w-0 rounded-lg border bg-white p-4 h-fit">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h3 className="font-semibold text-base">GTC · laekumine {money(payment.amount)}</h3>
            <Badge variant="outline" className={confirmed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}>{confirmed ? 'Jaotus kinnitatud' : 'Jaotamata koondmakse'}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Uus näidislaekumine · {buyer?.name ?? 'GTC Constructions OÜ'}</p>
          <dl className="mt-4 divide-y">
            <div className="py-2"><dt className="text-xs text-muted-foreground mb-1">Makseselgitus</dt><dd className="break-words">{payment.reference}</dd></div>
            <div className="flex justify-between gap-3 py-2"><dt className="text-muted-foreground">Laekunud</dt><dd className="font-medium tabular-nums whitespace-nowrap">{money(payment.amount)}</dd></div>
            <div className="flex justify-between gap-3 py-2"><dt className="text-muted-foreground">Kinnitatud jaotus</dt><dd className="font-medium tabular-nums whitespace-nowrap">{money(euros(allocated))}</dd></div>
            <div className="flex justify-between gap-3 py-2"><dt className="text-muted-foreground">Jaotamata</dt><dd className="font-semibold tabular-nums whitespace-nowrap">{money(euros(cents(payment.amount) - allocated))}</dd></div>
          </dl>
          <p className="text-xs text-muted-foreground rounded bg-slate-50 p-3 mt-3">Üks makse võib katta mitut arvet. AI koostab ettepaneku; raamatupidaja kontrollib ja kinnitab jaotuse.</p>
        </div>

        <div className="min-w-0 space-y-4">
          <ol aria-label="Laekumise jaotamise etapid" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <li aria-current={!confirmed && step === 'suggestion' ? 'step' : undefined} className={cn(!confirmed && step === 'suggestion' && 'text-primary font-semibold')}>1. Ettepanek</li>
            <li aria-current={!confirmed && step === 'review' ? 'step' : undefined} className={cn(!confirmed && step === 'review' && 'text-primary font-semibold')}>2. Mõju kontroll</li>
            <li aria-current={confirmed ? 'step' : undefined} className={cn(confirmed && 'text-emerald-700 font-semibold')}>3. Kinnitus</li>
          </ol>

          <div className="rounded-lg border overflow-hidden bg-white">
            <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3 px-3 py-2 bg-slate-50 text-xs text-muted-foreground"><span>Arve ja praegune jääk</span><span className="text-right">{confirmed ? 'Kinnitatud jaotus' : 'Jaotus eurodes'}</span></div>
            {matchingInvoices.map((invoice) => {
              const allocation = confirmed ? payment.allocations.find((item) => item.invoiceId === invoice.id)?.amount ?? 0 : proposed.find((item) => item.invoiceId === invoice.id)?.amount ?? 0;
              const remaining = invoiceOutstanding(invoice);
              return (
                <div key={invoice.id} className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3 items-center px-3 py-3 border-t">
                  <div className="min-w-0"><label className="font-medium break-words" htmlFor={`ai-allocation-${invoice.id}`}>{invoice.nr}</label><p className="text-xs text-muted-foreground mt-1">{confirmed ? 'Jääk praegu' : 'Tasumata'}: <span className="tabular-nums">{money(remaining)}</span></p></div>
                  {!confirmed && step === 'suggestion' ? <input id={`ai-allocation-${invoice.id}`} type="number" inputMode="decimal" min="0" max={remaining} step="0.01" value={amounts[invoice.id] ?? ''} aria-label={`${invoice.nr} jaotus eurodes`} className="w-full min-w-0 rounded-md border px-2 py-2 text-right bg-white tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onChange={(event) => { setAmounts((current) => ({ ...current, [invoice.id]: event.target.value })); setError(''); setMessage(''); }} /> : <span className="font-medium text-right tabular-nums whitespace-nowrap">{money(allocation)}</span>}
                </div>
              );
            })}
            <div className="flex justify-between gap-3 px-3 py-2.5 border-t bg-slate-50 font-medium"><span>Jaotus kokku</span><span className="tabular-nums whitespace-nowrap">{money(confirmed ? euros(allocated) : total)}</span></div>
            {!confirmed && <div className={cn('flex justify-between gap-3 px-3 pb-2.5 bg-slate-50 text-xs', unallocated === 0 && allNumbers ? 'text-emerald-700' : 'text-amber-800')}><span>{unallocated < 0 ? 'Üle jaotatud' : 'Ettepanekus jaotamata'}</span><span className="tabular-nums whitespace-nowrap">{allNumbers ? money(Math.abs(unallocated)) : 'Sisesta summad'}</span></div>}
          </div>

          {!confirmed && <details open className="text-xs">
            <summary className="font-medium text-primary cursor-pointer rounded focus-visible:outline focus-visible:outline-2">Miks need arved ja summad?</summary>
            <p className="mt-2 text-muted-foreground leading-relaxed">Näidislaekumise maksja on GTC. Ettepanek võrdleb selle ostja kahte finantseeritud arvet: 04412 ja 04438. Näidisjaotus katab arve 04438 ning suunab ülejäänu arvele 04412.</p>
            <p className="mt-2 text-muted-foreground leading-relaxed">RF-viide on puudulik. Enne kinnitamist kontrolli maksja maksekorraldust; arvevalik ja summad on muudetavad jaotuse ettepanek, mitte tõendatud vaste.</p>
          </details>}

          {!confirmed && notEnoughBalance && <p className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 p-3 text-xs" role="alert">Nende arvete jääk on {money(euros(availableTotal))}, mis on väiksem laekumisest. Täielik jaotus ei ole võimalik. Laekumine jääb jaotamata ning vajab käsitsi uurimist.</p>}

          {!confirmed && step === 'review' && !stale && <div className="rounded-md border bg-slate-50 p-3 space-y-3">
            <h4 className="font-semibold text-sm">Mõju saldodele pärast kinnitamist</h4>
            {matchingInvoices.map((invoice) => {
              const amount = proposed.find((allocation) => allocation.invoiceId === invoice.id)?.amount ?? 0;
              const remaining = invoiceOutstanding(invoice);
              return <div key={invoice.id} className="flex justify-between gap-2 flex-wrap text-xs"><span>{invoice.nr}</span><span className="flex items-center gap-2 tabular-nums">{money(remaining)}<ArrowRight className="h-3 w-3" aria-label="muutub" /><strong>{money(euros(cents(remaining) - cents(amount)))}</strong></span></div>;
            })}
            <p className="text-xs text-muted-foreground">Osaline laekumine jätab tasumata jäägi avatuks. Põhiosa laekumine vähendab finantseeritud osa ja limiidikasutust proportsionaalselt; lisatasu arvestatakse eraldi.</p>
            <label htmlFor="ai-payment-reviewer" className="block font-medium text-xs">Jaotuse kinnitaja</label>
            <select id="ai-payment-reviewer" value={reviewer} className="w-full rounded-md border px-3 py-2 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onChange={(event) => { setReviewer(event.target.value); setError(''); }}>
              <option value="">Vali kinnitaja</option>
              {REVIEWERS.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>}

          {stale && <p role="alert" className="rounded-md bg-amber-50 border border-amber-200 text-amber-900 p-3 text-xs">Arvete andmed muutusid pärast mõju kontrolli. Kinnitamine on peatatud; värskenda ettepanekut ja vaata uus mõju üle.</p>}
          {!confirmed && validation && !stale && <p className="text-xs text-amber-800">{validation}</p>}

          {confirmed ? <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 p-3 text-xs flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /><div><p className="font-semibold">Jaotus kinnitatud · {payment.confirmedBy}</p><p className="mt-1">Laekumine on jaotatud ja auditi jäljes. Osaliselt tasutud arve jääk on endiselt avatud.</p></div></div> : <div className="flex flex-wrap gap-2">
            {step === 'suggestion' ? <Button type="button" size="sm" disabled={Boolean(validation)} onClick={review}>Vaata mõju saldodele</Button> : <>
              <Button type="button" size="sm" disabled={stale || Boolean(validation) || !reviewer} onClick={confirm}>Kinnita jaotus</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setStep('suggestion'); setError(''); setMessage(''); }}>Muuda jaotust</Button>
            </>}
            <Button type="button" size="sm" variant="ghost" onClick={refreshSuggestion}><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Värskenda ettepanekut</Button>
          </div>}
          {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
          {message && <p role="status" className="text-xs text-primary">{message}</p>}
        </div>
      </div>
    </AiPanel>
  );
}
