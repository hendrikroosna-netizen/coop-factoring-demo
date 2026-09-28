import { ArrowRight, TrendingUp } from 'lucide-react';
import { AiPanel } from '@/components/ai-panel';
import { Button } from '@/components/ui/button';
import { MANAGER_CLIENT_IDS } from '@/lib/data';
import { canOfferInvoice, invoicePrincipalOutstanding } from '@/lib/finance';
import { eur, eur2, useStore } from '@/lib/store';

export function AiGrowthAssistant({ onOpenOffer }: { onOpenOffer: (invoiceId: string) => void }) {
  const { buyers, invoices, offers, sanctionCases } = useStore();
  const candidates = buyers
    .filter((buyer) => MANAGER_CLIENT_IDS.includes(buyer.id) && buyer.status === 'active' && buyer.dpd === 0 && buyer.limit > buyer.utilized)
    .map((buyer) => ({ buyer, invoice: invoices.find((invoice) => invoice.buyerId === buyer.id && canOfferInvoice(invoice, buyer, sanctionCases[buyer.id]) && !offers.some((offer) => offer.invoiceId === invoice.id && (offer.status === 'offered' || offer.status === 'accepted'))) }))
    .filter((candidate) => !!candidate.invoice)
    .sort((a, b) => (b.buyer.limit - b.buyer.utilized) - (a.buyer.limit - a.buyer.utilized));
  const candidate = candidates[0];

  return (
    <AiPanel title="Kasvuvõimalus">
      {candidate?.invoice ? <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 text-sm">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-info shrink-0" aria-hidden="true" />Kaalu pikema makseaja pakkumist</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{candidate.buyer.name} saab kasutada olemasolevat kinnitatud limiiti. Praegune makseviivitus puudub; enne pakkumist vaata üle ka makseajalugu.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onOpenOffer(candidate.invoice!.id)}>Ava pakkumise mustand<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Button>
          <p className="text-[11px] text-muted-foreground">Avame arve {candidate.invoice.nr} olemasoleva 45/60 päeva vormi. Pakkumise loob ja edastab kaupmees eraldi kinnitusega.</p>
        </div>
        <div className="space-y-3">
          <dl className="grid grid-cols-2 gap-3 rounded-lg border p-3">
            <div><dt className="text-[11px] text-muted-foreground">Vaba kinnitatud limiit</dt><dd className="font-semibold tabular-nums">{eur2(Math.max(0, candidate.buyer.limit - candidate.buyer.utilized))}</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Praegune viivitus</dt><dd className="font-semibold">{candidate.buyer.dpd} päeva</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Arve põhiosa jääk</dt><dd className="tabular-nums">{eur2(invoicePrincipalOutstanding(candidate.invoice))}</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Panga kinnitatud limiit</dt><dd className="tabular-nums">{eur(candidate.buyer.limit)}</dd></div>
          </dl>
          <details className="text-xs">
            <summary className="cursor-pointer text-info font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">Millel soovitus põhineb?</summary>
            <div className="text-muted-foreground mt-2 space-y-2 leading-relaxed"><p>Allikad: ostja praegune limiit {eur(candidate.buyer.limit)}, kasutus {eur2(candidate.buyer.utilized)} ja viivitus {candidate.buyer.dpd} päeva; arve {candidate.invoice.nr} tõend {candidate.invoice.evidence} ja kehtiv olek.</p><p>Valikus on ainult sinu kliendid: aktiivne ostja, vaba limiit, piisav tarnetõend ning puuduv aktiivne pakkumine. Soovitus ei suurenda limiiti ega tõenda head ajaloolist maksekäitumist.</p></div>
          </details>
        </div>
      </div> : <div className="text-sm space-y-2"><p className="font-medium">Praegu sobivat pakkumise võimalust ei ole.</p><p className="text-xs text-muted-foreground leading-relaxed">Soovitus ilmub, kui sinu kliendil on vaba kinnitatud limiit, makseviivitus puudub ning olemas on tingimustele vastav arve ilma aktiivse pakkumiseta.</p></div>}
    </AiPanel>
  );
}
