import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Info, Smartphone, KeyRound, User, Link2, CalendarClock } from 'lucide-react';
import { StatusChip, EvidenceBadge } from '@/components/chrome';
import { PAYMENT_TERMS } from '@/lib/data';
import { eur, useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const TERMS = PAYMENT_TERMS;

const CONNECTORS = ['Merit Aktiva', 'Directo', 'ERPLY Books'];

// R07: ostjale on näha ainult maksmise staatused — panga-sisest finantseerimisinfot ei avaldata
function BuyerPayChip({ status }: { status: 'financed' | 'open' | 'paid' }) {
  if (status === 'paid') {
    return <Badge variant="outline" className="border-success/30 bg-success/10 text-success rounded-md px-2 py-0.5 text-xs font-medium hover:bg-transparent"><CheckCircle2 className="h-3 w-3 mr-1" />Tasutud</Badge>;
  }
  return <Badge variant="outline" className="border-info/30 bg-info/10 text-info rounded-md px-2 py-0.5 text-xs font-medium hover:bg-transparent">Maksmata</Badge>;
}

export function BuyerHome() {
  const { invoices, buyers, payInvoice, offers, respondOffer } = useStore();
  const myOffers = offers.filter((o) => invoices.find((i) => i.id === o.invoiceId)?.buyerId === 'gtc');
  const gtc = buyers.find((b) => b.id === 'gtc')!;
  const mine = invoices.filter((i) => i.buyerId === 'gtc');
  const frozen = gtc.status === 'frozen';
  const [loginNote, setLoginNote] = useState('');
  const [term, setTerm] = useState(30);
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const sel = TERMS.find((t) => t.days === term)!;
  const exampleFee = (8400 * sel.feePct) / 100;
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Bauhofi kliendiportaal — inner branded header (real Bauhof logo, no invented marks) */}
      <div className="flex items-center gap-3 border rounded-xl bg-card px-5 py-4 shadow-sm">
        <img src="/logos/bauhof.svg" alt="Bauhof" className="h-7" />
        <div>
          <div className="font-semibold tracking-tight">Kliendiportaal</div>
          <div className="text-xs text-muted-foreground">Tere, GTC Constructions OÜ</div>
        </div>
      </div>

      {/* Non-blocking demo login row — content stays fully visible without login */}
      <Card>
        <CardContent className="py-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">Logi sisse:</span>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setLoginNote('Demos pole sisselogimine vajalik')}><Smartphone className="h-3.5 w-3.5 mr-1.5" />Smart-ID</Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setLoginNote('Demos pole sisselogimine vajalik')}><Smartphone className="h-3.5 w-3.5 mr-1.5" />Mobiil-ID</Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setLoginNote('Demos pole sisselogimine vajalik')}><User className="h-3.5 w-3.5 mr-1.5" />Kontoga</Button>
          {loginNote && <span className="text-xs text-info flex items-center gap-1"><Info className="h-3.5 w-3.5" />{loginNote}</span>}
          <span className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1"><KeyRound className="h-3 w-3" />Külalisrežiim — kogu sisu on avatud</span>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground border border-info/30 bg-info/5 rounded-lg px-3 py-2 flex items-start gap-2">
        <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
        <span>Demo selgitus: ostja vaade — <b>GTC Constructions OÜ</b> raamatupidaja. Ostjale on näha ainult maksmise staatused (maksmata / tasutud); pangasisese finantseerimise info ostjale ei avaldu (varjatud faktooring) — arved ja makserekvisiidid on <b>muutumatud</b>, saaja näitab endiselt <b>Bauhof Group AS</b>.</span>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Bauhof Group AS — saabunud arved</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Arve</TableHead>
                <TableHead className="text-right">Summa</TableHead>
                <TableHead>Tähtaeg</TableHead>
                <TableHead>Maksekonto (vIBAN)</TableHead>
                <TableHead>Viitenumber</TableHead>
                <TableHead>Tõend (ePOD)</TableHead>
                <TableHead>Staatus</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mine.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium tabular-nums">{i.nr}</TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">
                    {eur(i.amount + (i.extensionFee ?? 0))}
                    {i.extensionFee ? <div className="text-[11px] text-muted-foreground">sh lisatasu {eur(i.extensionFee)} (pikendatud tähtaeg)</div> : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{i.due}</TableCell>
                  <TableCell className="font-mono text-xs">{i.viban}</TableCell>
                  <TableCell className="font-mono text-xs">{i.reference}</TableCell>
                  <TableCell><EvidenceBadge level={i.evidence} /></TableCell>
                  <TableCell><BuyerPayChip status={i.status} /></TableCell>
                  <TableCell>
                    {i.status !== 'paid' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => payInvoice(i.id)}>Maksa {i.extensionFee ? eur(i.amount + i.extensionFee) : ''}</Button>
                    )}
                    {i.status === 'paid' && <Badge variant="outline" className="border-success/30 bg-success/10 text-success rounded-md px-2 py-0.5 text-xs font-medium hover:bg-transparent"><CheckCircle2 className="h-3 w-3 mr-1" />Makse kinnitatud</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {mine.every((i) => i.status === 'paid') && (
            <div className="flex items-center gap-2 text-success text-[13px] mt-2"><CheckCircle2 className="h-4 w-4" />Kõik arved on tasutud — maksekinnitused olemas</div>
          )}
          <div className="text-[11px] text-muted-foreground mt-2 space-y-1">
            <div className="text-warning font-medium">
              Makse saaja on endiselt Bauhof Group AS — kontonumber on uus sissetulekute konto; kinnitage rekvisiitide muutus telefonitsi enne esimest makset.
            </div>
            {frozen
              ? 'Märkus: Bauhofi krediidihaldur on teavitanud, et uued tellimused võivad ajutiselt nõuda ettemaksu — see on Bauhofi sisene otsus, pangaga seotud tingimused ostja ees ei muutu. Küsimuste korral võtke ühendust Bauhofi krediidihalduriga.'
              : 'Makse läheb ostjale määratud kontole; laekumise kinnitus saadetakse makse sooritamise järel. Igal arvel on oma viitenumber.'}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 bg-muted rounded-md px-3 py-2">
            Vaidlused ja tagastused esitage Bauhofile nagu tavaliselt — teie vastuväite- ja tasaarvestusõigused säilivad. Makse viivituse korral võib sissenõudmisega tegelda Bauhofi finantseerimispartner.
          </div>
        </CardContent>
      </Card>

      {myOffers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" />Pakkumised Bauhofilt — pikendatud maksetähtaeg</CardTitle>
            <div className="text-xs text-muted-foreground">Bauhofi ärikliendihaldur on pakkunud konkreetsetele arvetele pikemat maksetähtaega. Aktsepteerimisel kantakse uus tähtaeg arvele.</div>
          </CardHeader>
          <CardContent className="space-y-2">
            {myOffers.map((o) => {
              const inv = invoices.find((i) => i.id === o.invoiceId);
              if (!inv) return null;
              return (
                <div key={o.id} className="border rounded-lg p-3 flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[13px] tabular-nums">{inv.nr}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{eur(inv.amount)}</span>
                      <StatusChip status={o.status} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Pakkumine: maksetähtaeg 30 → {o.days} päeva · lisatasu {o.feePct.toLocaleString('et-EE')}% = <span className="font-medium text-foreground tabular-nums">{eur(o.fee)}</span> · pakkus {o.createdBy}
                      {o.status === 'offered' && <div className="mt-0.5">Aktsepteerimisel on tasumisele kuuluv kogusumma <span className="font-medium text-foreground tabular-nums">{eur(inv.amount + o.fee)}</span> (arve {eur(inv.amount)} + lisatasu {eur(o.fee)}).</div>}
                    </div>
                  </div>
                  {o.status === 'offered' && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" className="h-7 text-xs" onClick={() => respondOffer(o.id, true)}>Aktsepteeri</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => respondOffer(o.id, false)}>Keeldu</Button>
                    </div>
                  )}
                  {o.status === 'accepted' && <span className="text-xs text-success shrink-0 pt-1">Uus tähtaeg kantud arvele — tasumisele kokku {eur(inv.amount + o.fee)}</span>}
                  {o.status === 'void' && <span className="text-xs text-destructive shrink-0 pt-1">Pakkumine kehtetu</span>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Maksetingimused — vali sobiv maksetähtaeg</CardTitle>
          <div className="text-xs text-muted-foreground">Valik kehtib uutele arvetele; kehtivad arved jäävad samaks.</div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2" role="group" aria-label="Maksetähtaja valik">
            {TERMS.map((t) => (
              <button
                key={t.days}
                type="button"
                onClick={() => setTerm(t.days)}
                aria-pressed={term === t.days}
                className={cn(
                  'rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  term === t.days ? 'border-primary/40 ring-1 ring-primary/20' : 'hover:bg-muted/50'
                )}
              >
                <div className="text-sm font-medium">{t.label}{term === t.days && <span className="ml-2 text-[11px] font-normal bg-primary/10 text-primary rounded-md px-2 py-0.5">valitud</span>}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
          <div className="text-[13px] flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Valitud: {sel.label} · lisatasu {sel.feePct === 0 ? '0%' : sel.feePct.toLocaleString('et-EE') + '%'}</span>
            <span className="tabular-nums">nt arvel 8 400 € = {sel.feePct === 0 ? '0,00 €' : exampleFee.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">Pikema maksetähtajaga kaasneb lisatasu, mis lisandub arve maksesummale — teie suhe ja leping jäävad Bauhofiga.</div>
          <div className="text-[11px] text-muted-foreground border-t pt-2">Jooksvad tasud — viivis: 0,05% päevas (demo).</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ühenda raamatupidamistarkvara</CardTitle>
          <div className="text-xs text-muted-foreground">Ühendage oma raamatupidamistarkvara, et arved ja maksed liiguksid automaatselt.</div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {CONNECTORS.map((c) => (
              <div key={c} className={cn('rounded-xl border bg-card px-4 py-3 shadow-sm space-y-2', connected[c] && 'border-success/40')}>
                <div className="flex items-center gap-2 text-sm font-medium"><Link2 className="h-4 w-4 text-muted-foreground" />{c}</div>
                {connected[c] ? (
                  <div className="text-xs text-success flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Ühendatud (demo) — arved imporditakse automaatselt</div>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConnected((m) => ({ ...m, [c]: true }))}>Ühenda</Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
