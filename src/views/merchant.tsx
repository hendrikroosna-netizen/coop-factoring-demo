import { useState } from 'react';
import { CheckCircle2, ArrowRight, RefreshCw, Landmark, FileSpreadsheet, CalendarClock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { MerchantRole } from '@/lib/types';
import { StatusChip, StatCard, StepCheck, Waterfall, EvidenceBadge } from '@/components/chrome';
import { ANNUAL_FEE_HIGH, ANNUAL_FEE_LOW, CONTRACT_FEE_YEAR, EFFECTIVE_RATE, EPOD_LEVELS, FEE_BAND, MANAGER, MANAGER_CLIENT_IDS, MASS_PORTFOLIO_COUNT, MASS_PORTFOLIO_LIMIT_SUM, MASTER_IBAN, MERCHANT, MERCHANT_APP, PAYMENT_TERMS, pct } from '@/lib/data';
import { eur, useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

function Notifications() {
  const { events, buyers } = useStore();
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Teavitused</CardTitle></CardHeader>
      <CardContent className="text-xs space-y-2 max-h-56 overflow-y-auto">
        {events.length === 0 && <div className="text-muted-foreground">Uusi teavitusi pole.</div>}
        {events.slice(0, 8).map((e) => {
          const b = buyers.find((x) => x.id === e.buyerId);
          const msg =
            e.action === 'FREEZE'
              ? `${b?.name}: ostja limiit ajutiselt peatatud — panga täiendav kontroll käib. Uute nõuete finantseerimine sellele ostjale on peatatud kuni otsuseni.`
              : e.action === 'REVIEW'
                ? `${b?.name}: ostja limiidi täiendav kontroll käib. Uute nõuete finantseerimine ajutiselt peatatud.`
                : `${b?.name}: limiidi olek uuendatud panga poolt.`;
          return (
            <div key={e.id} className="flex gap-2 border-b pb-1.5 last:border-0">
              <span className="text-muted-foreground w-10 shrink-0 tabular-nums">{e.time}</span>
              <span>{msg}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function Overview() {
  const { buyers, base } = useStore();
  const frozen = buyers.filter((b) => b.status === 'frozen');
  // R19: RK-01 intressipaus kajastub ka müüja kulus — brutoprognoos, peatamise mõju ja neto eraldi
  const interestYearGross = base.fundsEmployed * EFFECTIVE_RATE;
  const frozenInterestYear = base.frozenFinanced * EFFECTIVE_RATE;
  const interestYear = interestYearGross - frozenInterestYear;
  const totalLow = interestYear + ANNUAL_FEE_LOW + CONTRACT_FEE_YEAR;
  const totalHigh = interestYear + ANNUAL_FEE_HIGH + CONTRACT_FEE_YEAR;
  // R11: käibemaks 24% ainult tasudelt — intress on käibemaksuvaba (KMS § 16)
  const vatLow = (ANNUAL_FEE_LOW + CONTRACT_FEE_YEAR) * 0.24;
  const vatHigh = (ANNUAL_FEE_HIGH + CONTRACT_FEE_YEAR) * 0.24;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="Kohe kättesaadav finantseering" value={eur(base.availableNow)} tone={base.availableNow < 0 ? 'danger' : 'success'} hint="Bruto kättesaadav − väljamakstud finantseering" />
          <StatCard label="Kasutatud limiit" value={eur(base.fundsEmployed)} hint="Väljamakstud finantseering" />
          <StatCard label="Peatatud ostjaid" value={frozen.length} tone="danger" hint="Nende ostjate uued nõuded ei finantseeritu" />
        </div>
        {frozen.length > 0 && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">Aktiivsed peatamised</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1.5">
              {frozen.map((b) => (
                <div key={b.id} className="flex justify-between items-center">
                  <span className="font-medium">{b.name}</span>
                  <span className="text-muted-foreground">avatud nõuded {eur(b.openAr)} ei kuulu ajutiselt baasi · pangale teade saadetud</span>
                </div>
              ))}
              <div className="text-[11px] text-muted-foreground pt-1 border-t">Juba finantseeritud arvete intress peatamisperioodil peatub ja tagasiostu ei käivitata (RK-01) — limiidi peatamine mõjutab vaid uusi arveid.</div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Faktooringulimiidi kogukulu — aastane hinnang (demo portfell — näidisandmed)</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Intress (bruto): {eur(base.fundsEmployed)} × {pct(EFFECTIVE_RATE)} (PR-02)</span><span className="font-medium tabular-nums">{eur(interestYearGross)}</span></div>
            {base.frozenFinanced > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">RK-01 intressipaus peatatud ostjatele: −{eur(base.frozenFinanced)} × {pct(EFFECTIVE_RATE)}</span><span className="font-medium tabular-nums text-success">−{eur(frozenInterestYear)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Intress (neto, intressi teeniv jääk)</span><span className="font-medium tabular-nums">{eur(interestYear)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Haldustasu: 57,8M € aastane arvevoog × hindekaalutud määr {pct(FEE_BAND.low)}–{pct(FEE_BAND.high)} (PR-01)</span><span className="font-medium tabular-nums">~{eur(Math.round(ANNUAL_FEE_LOW / 1000) * 1000)}–{eur(Math.round(ANNUAL_FEE_HIGH / 1000) * 1000)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Lepingu- ja pikendustasu: kuni 1% limiidist</span><span className="font-medium tabular-nums">kuni {eur(CONTRACT_FEE_YEAR)}</span></div>
            <div className="flex justify-between font-medium pt-1 border-t"><span>Kokku (km-ta)</span><span className="tabular-nums">~{eur(Math.round(totalLow / 1000) * 1000)}–{eur(Math.round(totalHigh / 1000) * 1000)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Käibemaks 24% tasudelt (intress on km-vaba, KMS § 16)</span><span className="font-medium tabular-nums">~{eur(Math.round(vatLow / 100) * 100)}–{eur(Math.round(vatHigh / 100) * 100)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Efektiivne määr kasutatud summalt</span><span className="font-medium tabular-nums">~{(totalLow / base.fundsEmployed * 100).toFixed(1).replace('.', ',')}–{(totalHigh / base.fundsEmployed * 100).toFixed(1).replace('.', ',')}% aastas</span></div>
            <div className="text-[11px] text-muted-foreground pt-1">Hinnanguline, demo portfelli andmetel; automaatsete ostjalimiitide tasud on paketihinnas (vt hinnakirja erand). RK-01 intressipaus on lepinguline näidisotsus.</div>
          </CardContent>
        </Card>
        <Notifications />
      </div>
      <Waterfall compact />
    </div>
  );
}

function BuyersPage() {
  const { buyers } = useStore();
  const sorted = [...buyers].sort((a, b) => b.limit - a.limit);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Ostjaregister — faktooringulimiidid</CardTitle>
        <div className="text-xs text-muted-foreground">Limiidid on panga reeglipõhised otsused; muudatused jõustuvad automaatselt.</div>
      </CardHeader>
      <CardContent>
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Ostja</TableHead>
              <TableHead>Hinne</TableHead>
              <TableHead className="text-right">Limiit</TableHead>
              <TableHead className="text-right">Limiidi kasutus</TableHead>
              <TableHead className="text-right">Avatud nõuded</TableHead>
              <TableHead>Staatus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs tabular-nums text-muted-foreground">{b.reg}</div>
                </TableCell>
                <TableCell className="font-semibold">{b.grade}</TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(b.limit)}</TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(b.utilized)}</TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(b.openAr)}</TableCell>
                <TableCell><StatusChip status={b.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="text-[11px] text-muted-foreground mt-3 pt-2 border-t">
          + {MASS_PORTFOLIO_COUNT.toLocaleString('et-EE')} automaatselt skooritud ostjat massportfellis, limiidid kokku {eur(MASS_PORTFOLIO_LIMIT_SUM)} — automaatne alglimiit kuni 1 000 €, käitumispõhine automaatne kasv kuni 5 000 € ostja kohta (näidisriskipoliitika); limiiditaotlused genereeris platvorm sama andmemudeli pealt.
        </div>
      </CardContent>
    </Card>
  );
}

const INVOICE_FILTERS = [
  { id: 'all', label: 'Kõik' },
  { id: 'open', label: 'Avatud' },
  { id: 'financed', label: 'Finantseeritud' },
  { id: 'paid', label: 'Laekunud' },
] as const;

function InvoicesPage() {
  const { invoices, buyers, merchantRole } = useStore();
  const [filter, setFilter] = useState<(typeof INVOICE_FILTERS)[number]['id']>('all');
  // Ärikliendihaldur näeb vaid oma kaupluse klientide arveid
  const visible = merchantRole === 'manager' ? invoices.filter((i) => MANAGER_CLIENT_IDS.includes(i.buyerId)) : invoices;
  const shown = visible.filter((i) => filter === 'all' || i.status === filter);
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card className="xl:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Arved</CardTitle>
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-fit mt-1" role="group" aria-label="Filtreeri staatuse järgi">
            {INVOICE_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  filter === f.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
                <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">{f.id === 'all' ? visible.length : visible.filter((i) => i.status === f.id).length}</span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Arve</TableHead>
                <TableHead>Ostja</TableHead>
                <TableHead className="text-right">Summa</TableHead>
                <TableHead>Väljastatud</TableHead>
                <TableHead>Tähtaeg</TableHead>
                <TableHead>Tõend (ePOD)</TableHead>
                <TableHead>Staatus</TableHead>
                <TableHead>vIBAN</TableHead>
                <TableHead>Viitenumber</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((i) => {
                const b = buyers.find((x) => x.id === i.buyerId);
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium tabular-nums">{i.nr}</TableCell>
                    <TableCell>{b?.name}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(i.amount)}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{i.issued}</TableCell>
                    <TableCell className="tabular-nums">{i.due}</TableCell>
                    <TableCell><EvidenceBadge level={i.evidence} /></TableCell>
                    <TableCell>
                      <StatusChip status={i.status} />
                      {i.status === 'financed' && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">ootab laekumist</div>
                      )}
                      {i.status === 'financed' && b?.status === 'frozen' && (
                        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive rounded-md px-2 py-0.5 text-xs font-medium hover:bg-transparent mt-1">peatatud — intress peatatud, tagasiostu ei käivitata</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{i.viban}</TableCell>
                    <TableCell className="font-mono text-xs">{i.reference}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="text-[11px] text-muted-foreground mt-3 space-y-1 border-t pt-2">
            <div>Tarnekinnituse tasemed (ePOD): {EPOD_LEVELS.map((e) => `${e.level} = ${e.text}`).join(' · ')}.</div>
            <div className="text-warning font-medium">ARV-2026-04490 (E1) ootab tarnekinnitust — finantseerimise miinimumtase on E2; arve finantseeritakse, kui allkirjastatud saateleht/CMR lisandub.</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Faktooringu kogumiskonto</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1.5">
          <div className="flex justify-between"><span className="text-muted-foreground">Põhikonto (master)</span><span className="font-mono">{MASTER_IBAN}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Haldur</span><span>Coop Pank AS</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Saaja nimi arvel</span><span className="font-medium">Bauhof Group AS</span></div>
          <div className="text-[11px] text-muted-foreground pt-2 border-t">
            Varjatud faktooring: ostja maksab tavapäraselt, saaja nimi ei muutu. Igal ostjal oma vIBAN tuvastab maksja; konkreetse nõue määrab RF-viide/arvetunnus koos summa ja jäägiga.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SyncNode({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm flex items-center gap-3 min-w-0">
      <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{sub}</div>
      </div>
    </div>
  );
}

function SyncArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground shrink-0">
      <div className="h-px w-6 bg-border" />
      <span className="text-[11px] whitespace-nowrap">{label}</span>
      <ArrowRight className="h-3.5 w-3.5" />
    </div>
  );
}

function SyncPage() {
  const rows = [
    'Viimane sünkroon: täna 06:12 · 412 arvet · 0 viga',
    'Ostjaregister: 3 000 kirjet sünkroonis',
    'Järgmine sünkroon: 15 minuti pärast',
  ];
  return (
    <div className="space-y-4 max-w-5xl">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="h-4 w-4 text-primary" />Andmeside — raamatupidamistarkvara ↔ pank</CardTitle>
          <div className="text-xs text-muted-foreground">Arved ja ostjaregister liiguvad automaatselt — käsitsi üleslaadimist pole.</div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap xl:flex-nowrap">
            <SyncNode icon={<FileSpreadsheet className="h-4 w-4" />} title="Raamatupidamistarkvara" sub="Merit · Directo · ERPLY" />
            <SyncArrow label="API · sünkroon iga 15 min" />
            <SyncNode icon={<FileSpreadsheet className="h-4 w-4" />} title="Bauhofi faktooringuportfell" sub="ostjad + arved" />
            <SyncArrow label="öine sulgemine 23:59" />
            <SyncNode icon={<Landmark className="h-4 w-4" />} title="Coop Pank" sub="otsustegur + väljamaksed" />
          </div>
          <div className="space-y-1.5 border-t pt-3">
            {rows.map((r) => (
              <div key={r} className="flex items-center gap-2 text-[13px]">
                <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                <span className="text-muted-foreground">{r}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Application() {
  const { buyers } = useStore();
  const app = MERCHANT_APP;
  const heads = [...buyers].filter((b) => b.limit > 0).sort((a, b) => b.limit - a.limit).slice(0, 5);
  const Row = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="flex justify-between gap-3"><span className="text-muted-foreground shrink-0">{label}</span><span className="font-medium text-right">{children}</span></div>
  );
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-4">
        <Card className="border-success/40 bg-success/5">
          <CardContent className="pt-6 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-medium text-success"><CheckCircle2 className="h-4 w-4" />Taotlus {app.nr} — faktooringulimiit 3 600 000 € kinnitatud 17.09</div>
            <div className="text-muted-foreground">Esitatud 14.09 09:32 → andmete kontroll 14.09 09:34 (automaatne) → analüüs 15.–16.09 → otsus 17.09 13:13 → leping + Smart-ID allkiri 17.09 14:02 → ostjate limiidid avatud 17.09 15:20</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">1 · Taotleja andmed (äriregister)</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1.5">
            <Row label="Ärinimi"><span>{MERCHANT.name}</span></Row>
            <Row label="Registrikood / asutatud"><span className="tabular-nums">{MERCHANT.reg} · {MERCHANT.founded}</span></Row>
            <Row label="KMKR number"><span className="tabular-nums">{MERCHANT.kmkr}</span></Row>
            <Row label="Aadress"><span>{MERCHANT.address}</span></Row>
            <Row label="Aktsiakapital"><span className="tabular-nums">{eur(MERCHANT.shareCapital)}</span></Row>
            <Row label="Põhitegevus (EMTAK)"><span>{MERCHANT.emtak}</span></Row>
            <Row label="Käive 2024"><span className="tabular-nums">{MERCHANT.turnover2024} (2023: {MERCHANT.turnover2023})</span></Row>
            <Row label="E-arvete operaator"><span>{MERCHANT.eInvoiceOperator}</span></Row>
            <Row label="Juhatuse liige"><span>{MERCHANT.boardMember} (alates {MERCHANT.boardMemberSince})</span></Row>
            <Row label="Tegelik kasusaaja (UBO)"><span>{MERCHANT.ubo} — {MERCHANT.uboNote}</span></Row>
            <Row label="Arvelduskonto Coop Pank AS-is"><span className="font-mono">EE86 4200 0000 0777 0001</span></Row>
            <Row label="Arvelduste osakaal Coopis"><span className="tabular-nums">{app.bankAccountShare}%</span></Row>
            <Row label="Varasem faktooring"><span>{app.usedFactoringBefore}</span></Row>
            <div className="text-[11px] text-muted-foreground pt-1.5 border-t">{MERCHANT.registrySource}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">2 · Esindaja</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1.5">
            <Row label="Esindaja"><span>{MERCHANT.boardMember} · juhatuse liige (alates {MERCHANT.boardMemberSince}) · esindamise alus: juhatuse liige</span></Row>
            <Row label="Raamatupidamine"><span>Bauhofi siseüksus · kontaktandmed lepingu lisas (demo)</span></Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">3 · Kehtivad kohustused finantseerimisasutuste ees</CardTitle></CardHeader>
          <CardContent>
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Asutus</TableHead>
                  <TableHead>Kohustuse liik</TableHead>
                  <TableHead className="text-right">Jääk</TableHead>
                  <TableHead className="text-right">Igakuine tagasimakse</TableHead>
                  <TableHead>Lõpptähtaeg</TableHead>
                  <TableHead>Tagatis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {app.obligations.map((o, i) => (
                  <TableRow key={i}>
                    <TableCell>{o.inst}</TableCell>
                    <TableCell>{o.type}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(o.balance)}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{o.monthly > 0 ? eur(o.monthly) : '—'}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{o.due}</TableCell>
                    <TableCell>{o.collateral}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">4 · Ülevaade tegevusest</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1.5">
            <Row label="Käive (2024, äriregister)"><span className="tabular-nums">{eur(app.forecastTurnover)}</span></Row>
            <Row label="Arveid kuus"><span className="tabular-nums">{app.invoicesPerMonth}</span></Row>
            <Row label="Ostjate arv"><span className="tabular-nums">{app.buyerCount.toLocaleString('et-EE')}</span></Row>
            <Row label="Kaalutud lepinguline maksetähtaeg ostjatele"><span className="tabular-nums">{app.contractualTerm} pv</span></Row>
            <Row label="DSO (tegelik laekumise kiirus, 12M)"><span className="tabular-nums">{app.avgPaymentTerm} pv</span></Row>
            <Row label="Keskmine arve summa"><span className="tabular-nums">{eur(app.avgInvoice)}</span></Row>
            <Row label="Kreeditarvete kogusumma eelneva 12 kuu jooksul"><span className="tabular-nums">{eur(app.creditNotes12m)}</span></Row>
            {app.debtorBalance.map((d) => (
              <Row key={d.date} label={`Debitoorse võla saldo ${d.date}`}><span className="tabular-nums">{eur(d.saldo)}</span></Row>
            ))}
            <Row label="Osakaal käibest — kodumaine / EL-i / väljaspoole EL-i"><span className="tabular-nums">{app.domestic}% / {app.eu}% / {app.nonEu}%</span></Row>
            <div className="border-t pt-1.5 mt-1.5 space-y-1">
              <Row label="Taotletav limiit"><span className="font-semibold tabular-nums">{eur(app.requestedLimit)}</span></Row>
              <Row label="Taotletav faktooringulimiidi tähtaeg"><span>{app.requestedTerm}</span></Row>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1.5 border-t">Arvevoo numbrid (arved kuus, keskmine arve, debitoorne saldo) on demo portfelli näidisandmed.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">5 · Suuremad ostjad (5 esimest)</CardTitle></CardHeader>
          <CardContent>
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Ostja</TableHead>
                  <TableHead className="text-right">Keskmine arve</TableHead>
                  <TableHead className="text-right">Arveid kuus</TableHead>
                  <TableHead className="text-right">Soovitud osalimiit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {heads.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell><div className="font-medium">{b.name}</div><div className="text-xs tabular-nums text-muted-foreground">{b.reg}</div></TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(b.openAr)}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{Math.max(1, Math.round(b.openAr / 11700))}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(b.limit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="text-[11px] text-muted-foreground mt-2">Ülejäänud 2 990 ostja kohta ei küsitud vormis käsitsi andmeid — platvorm genereeris nende kohta limiiditaotlused automaatselt sama andmemudeli pealt (sealt pank vaatab 3 000 ostjat).</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">6 · Kinnitused ja allkiri</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1.5">
            <div className="flex gap-2"><span className="text-success">✓</span><span>Kõik taotluses esitatud andmed on õiged ja panga nõudel dokumentaalselt tõestatavad.</span></div>
            <div className="flex gap-2"><span className="text-success">✓</span><span>Nimetatud füüsilised isikud on andnud nõusoleku isikuandmete avaldamiseks pangale faktooringutaotluse läbivaatamiseks ja lepingu täitmiseks.</span></div>
            <div className="flex gap-2"><span className="text-success">✓</span><span>Taotleja on nõus tasuma ostja krediidianalüüsiga seotud kulud.</span></div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-muted-foreground">Allkirjastatud Smart-ID-ga · 17.09.2026 14:02 · L. Kandratavičius</span>
              <Badge variant="outline" className="border-success/30 bg-success/10 text-success rounded-md px-2 py-0.5 text-xs font-medium hover:bg-transparent"><CheckCircle2 className="h-3 w-3 mr-1" />Allkiri kehtiv</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Mida pank sama taotlusega näeb</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            <StepCheck title="Andmete automaatne kontroll" state="done" note="Äriregister + EMTA + Coop'i kontoajalugu" />
            <StepCheck title="Müüja ja UBO KYC/AML" state="done" note="Sanktsioonid (5 nimekirja) + PEP — puhas" />
            <StepCheck title="Finantside analüüs" state="done" note="Nõuete kahanemine 2,0% faktooringu arvevoost · lepinguline tähtaeg 32 pv / DSO 34 pv · kohustuste koormus" />
            <StepCheck title="FAC-01 limiidi arvutus" state="done" note="Kõik tingimused OK → 3,6M € · 80% · regressiga portfelli osa" />
            <StepCheck title="Krediidiotsus — neli silma" state="done" note="Analüütik + kinnitaja, 17.09 13:13" />
            <StepCheck title="Leping ja Smart-ID" state="done" note="Allkirjastatud 17.09 14:02" />
            <div className="text-[11px] text-muted-foreground pt-1">Kahanemine = kreeditarved, tagastused ja allahindlused, mis vähendavad sissenõutavat nõuet.</div>
            <div className="text-[11px] text-muted-foreground pt-1">Müüja ja pank näevad sama taotlust eri vaatest — üks andmemudel, kaks nägu.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Ostja krediidianalüüsi tasu</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Lepingu punkt 3: ostja krediidianalüüsi kulud jäävad taotleja kanda. Platvormiga analüüsib pank 3 000 ostjat sama hinnaga, mis varem ~50 käsitsi — platvormi automaatselt genereeritud ostjalimiidid ja reeglipõhised limiidimuudatused on tasuta (platvormi paketihinnas); 65 € tasu kehtib vaid käsitsi esitatud eritaotlustele. Müüja näeb igal ostjal otsust reaalselt ühe päeva jooksul.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Müüja (Bauhof) alamrollid: CFO täisvaade / ärikliendihaldur piiratud vaade ---

export const MERCHANT_ROLES: { id: MerchantRole; label: string }[] = [
  { id: 'cfo', label: 'CFO' },
  { id: 'manager', label: 'Ärikliendihaldur' },
];

export function MerchantRoleSwitch() {
  const { merchantRole, setMerchantRole } = useStore();
  return (
    <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/40" role="group" aria-label="Müüja roll">
      {MERCHANT_ROLES.map((r) => (
        <button
          key={r.id}
          onClick={() => setMerchantRole(r.id)}
          aria-pressed={merchantRole === r.id}
          className={cn(
            'px-2.5 py-1 text-xs rounded-md transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
            merchantRole === r.id ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function ManagerDashboard() {
  const { buyers, offers } = useStore();
  const clients = buyers.filter((b) => MANAGER_CLIENT_IDS.includes(b.id));
  const openAr = clients.reduce((s, b) => s + b.openAr, 0);
  const freeLimit = clients.reduce((s, b) => s + Math.max(0, b.limit - b.utilized), 0);
  const activeOffers = offers.filter((o) => o.status === 'offered').length;
  return (
    <div className="space-y-6">
      <div className="text-xs text-muted-foreground border border-info/30 bg-info/5 rounded-lg px-3 py-2">
        Piiratud vaade — <b>{MANAGER.role} · {MANAGER.store}</b> ({MANAGER.name}). Faktooringulimiiti, reserve ega kogukulu kaarti see roll ei näe — need on CFO täisvaates.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Minu kliente" value={clients.length} hint={`${MANAGER.store} — ärikliendid, kellele vormistan krediidilepinguid`} />
        <StatCard label="Avatud nõuded minu klientidelt" value={eur(openAr)} hint="Maksmata arvete summa" />
        <StatCard label="Vaba limiiti kokku" value={eur(freeLimit)} tone="success" hint="Limiit miinus kasutus — ruumi uutele ostudele" />
        <StatCard label="Aktiivseid pakkumisi" value={activeOffers} tone={activeOffers > 0 ? 'warning' : 'default'} hint="«Maksa hiljem» — ootavad ostja otsust" />
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Minu kliendid — {MANAGER.store}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Ostja</TableHead>
                <TableHead>Hinne</TableHead>
                <TableHead className="text-right">Limiit</TableHead>
                <TableHead className="text-right">Kasutus</TableHead>
                <TableHead className="text-right">Vaba limiit</TableHead>
                <TableHead className="text-right">Päevi üle tähtaja</TableHead>
                <TableHead>Staatus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((b) => (
                <TableRow key={b.id}>
                  <TableCell><div className="font-medium">{b.name}</div><div className="text-xs tabular-nums text-muted-foreground">{b.reg}</div></TableCell>
                  <TableCell className="font-semibold">{b.grade}</TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(b.limit)}</TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(b.utilized)}</TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(Math.max(0, b.limit - b.utilized))}</TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{b.dpd > 0 ? b.dpd + ' pv' : '—'}</TableCell>
                  <TableCell><StatusChip status={b.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="text-[11px] text-muted-foreground mt-2 pt-2 border-t">Limiidid seab ja muudab pank — ärikliendihaldur näeb otsuseid, kuid ei saa neid muuta. Uue kliendi limiiditaotlus läheb pangale (65 € käsitsi taotluse tasu hinnakirja järgi).</div>
        </CardContent>
      </Card>
    </div>
  );
}

function OffersPage() {
  const { invoices, buyers, offers, makeOffer } = useStore();
  const [term, setTerm] = useState<Record<string, 45 | 60>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mine = invoices.filter((i) => MANAGER_CLIENT_IDS.includes(i.buyerId) && i.status !== 'paid');
  const submit = (invoiceId: string, days: 45 | 60) => {
    const err = makeOffer(invoiceId, days);
    setErrors((m) => ({ ...m, [invoiceId]: err ?? '' }));
  };
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" />«Maksa hiljem» — paku kliendile pikendatud maksetähtaega</CardTitle>
          <div className="text-xs text-muted-foreground">Lisatasu arvutatakse samast maksetingimuste tabelist, mida ostja näeb kliendiportaalis (45 pv = +0,8%, 60 pv = +1,5% arve summast). Pakkumine ilmub ostja kliendiportaali aktsepteerimiseks.</div>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Arve</TableHead>
                <TableHead>Ostja</TableHead>
                <TableHead className="text-right">Summa</TableHead>
                <TableHead>Tähtaeg</TableHead>
                <TableHead>Pikendus</TableHead>
                <TableHead className="text-right">Lisatasu kliendile</TableHead>
                <TableHead>Pakkumine</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mine.map((i) => {
                const b = buyers.find((x) => x.id === i.buyerId);
                const days = term[i.id] ?? 45;
                const t = PAYMENT_TERMS.find((x) => x.days === days)!;
                const fee = (i.amount * t.feePct) / 100;
                const offer = offers.find((o) => o.invoiceId === i.id);
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium tabular-nums">{i.nr}</TableCell>
                    <TableCell>{b?.name}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(i.amount)}</TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">{i.due}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/40 w-fit" role="group" aria-label="Pikenduse valik">
                        {PAYMENT_TERMS.filter((x) => x.days > 30).map((x) => (
                          <button
                            key={x.days}
                            onClick={() => setTerm((m) => ({ ...m, [i.id]: x.days as 45 | 60 }))}
                            aria-pressed={days === x.days}
                            className={cn('px-2 py-0.5 text-xs rounded-md transition-colors', days === x.days ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground')}
                          >
                            {x.days} pv
                          </button>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(fee)}</TableCell>
                    <TableCell>
                      {offer && offer.status !== 'declined' ? (
                        <div>
                          <StatusChip status={offer.status} />
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {offer.days} pv · {eur(offer.fee)}
                            {offer.status === 'accepted' && ' — uus tähtaeg arvel; tasumisele ' + eur(i.amount + offer.fee)}
                            {offer.status === 'offered' && ' — ootab ostja otsust'}
                            {offer.status === 'void' && ' — kehtetu (riskipiirang / arve tasutud)'}
                          </div>
                        </div>
                      ) : b && (b.status === 'frozen' || b.status === 'rejected') ? (
                        <div>
                          <Button size="sm" variant="outline" className="h-7 text-xs" disabled>Paku {days} pv →</Button>
                          <div className="text-[11px] text-destructive mt-0.5">Ostjal on riskipiirang — pakkumine suunatakse pädevale kinnitajale</div>
                        </div>
                      ) : (
                        <div>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => submit(i.id, days)}>Paku {days} pv →</Button>
                          {errors[i.id] && <div className="text-[11px] text-destructive mt-0.5">{errors[i.id]}</div>}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="text-[11px] text-muted-foreground mt-3 pt-2 border-t">Pikem tähtaeg finantseeritakse Bauhofi faktooringulepingu raames — ostja suhe jääb Bauhofiga (varjatud faktooring). Keeldunud pakkumise saab uuesti teha.</div>
        </CardContent>
      </Card>
    </div>
  );
}

export function MerchantHome({ section }: { section: string }) {
  const { merchantRole } = useStore();
  if (merchantRole === 'manager') {
    switch (section) {
      case 'invoices':
        return <InvoicesPage />;
      case 'offers':
        return <OffersPage />;
      case 'overview':
      default:
        return <ManagerDashboard />;
    }
  }
  switch (section) {
    case 'buyers':
      return <BuyersPage />;
    case 'invoices':
      return <InvoicesPage />;
    case 'sync':
      return <SyncPage />;
    case 'application':
      return <Application />;
    case 'overview':
    default:
      return <Overview />;
  }
}
