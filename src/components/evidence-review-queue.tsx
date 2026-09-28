import { useId, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import type { Invoice } from '@/lib/types';

function EvidenceReviewItem({ invoice }: { invoice: Invoice }) {
  const { evidenceReviews, confirmEvidenceReview } = useStore();
  const review = evidenceReviews[invoice.id];
  const id = useId();
  const [reviewer, setReviewer] = useState('');
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  if (!review) return null;
  const confirm = () => {
    if (!checked) { setError('Kinnita, et oled näidisdokumendi andmed üle vaadanud.'); return; }
    setError(confirmEvidenceReview(invoice.id, reviewer) ?? '');
  };
  return (
    <div className="rounded-lg border p-3 space-y-2 text-[13px]">
      <div className="font-medium">{invoice.nr} <span className="font-normal text-muted-foreground">· {review.documentName}</span></div>
      {review.state === 'confirmed' ? (
        <p className="text-success" role="status">Tõend kinnitatud tasemele E2 · {review.reviewer}. Arve finantseerimist see kinnitus ei käivita.</p>
      ) : (
        <>
          <p className="text-muted-foreground">AI näidiskontroll tuvastas arve numbri, ostja ja summa vastavuse ning tarnekinnituse. Panga töötaja kinnitab tõendi sobivuse.</p>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-1" />
            Kontrollisin näidisdokumendi vastavust arvele ja tarne kinnitust.
          </label>
          <div className="flex items-end gap-2 flex-wrap">
            <label htmlFor={id} className="text-xs space-y-1"><span className="block">Kinnitaja</span>
              <select id={id} value={reviewer} onChange={e => setReviewer(e.target.value)} className="rounded-md border bg-background px-2 py-2 text-[13px]">
                <option value="">Vali panga töötaja</option><option>Anna Liiv</option><option>Margus Tamm</option><option>Kadri Rehe</option>
              </select>
            </label>
            <Button size="sm" onClick={confirm} disabled={!checked || !reviewer || invoice.status === 'paid'}>Kinnita tõendi tase E2</Button>
          </div>
          {invoice.status === 'paid' && <p className="text-muted-foreground">Arve on tasutud. Tõendi kinnitamine ei ole enam vajalik.</p>}
        </>
      )}
      {error && <p className="text-destructive" role="alert">{error}</p>}
    </div>
  );
}

export function EvidenceReviewQueue() {
  const { invoices, evidenceReviews } = useStore();
  const submitted = invoices.filter(i => ['submitted', 'confirmed'].includes(evidenceReviews[i.id]?.state));
  if (submitted.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileCheck2 className="h-4 w-4" />Kaupmehe esitatud tarnetõendid</CardTitle></CardHeader>
      <CardContent className="space-y-3">{submitted.map(invoice => <EvidenceReviewItem key={invoice.id} invoice={invoice} />)}</CardContent>
    </Card>
  );
}
