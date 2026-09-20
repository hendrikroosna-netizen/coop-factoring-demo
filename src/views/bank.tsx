import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Zap, ShieldCheck, ShieldAlert, UserCheck, ChevronRight, ArrowLeftRight, FilePlus2, MoonStar, Banknote, CreditCard, Scale, AlertTriangle } from 'lucide-react';
import { RuleTableDialog, StatusChip, StatCard, StepCheck, Waterfall } from '@/components/chrome';
import { EVENT_RULES, EPOD_LEVELS, FACILITY_RULES, GRADE_CRITERIA, INTEREST_RULES, LOAN_SIZE_TABLE, MERCHANT, MERCHANT_APP, PEP_SOURCES, PRICE_LIST, RECOURSE_RULES, SANCTIONS_LISTS, SCREENING_TABLE, SERVICE_FEE_RULES, MASS_PORTFOLIO_COUNT, MASS_PORTFOLIO_LIMIT_SUM, MASS_PORTFOLIO_OPEN_AR, DEMO_AS_OF, BASE, ANNUAL_FEE_HIGH, ANNUAL_FEE_LOW, CONTRACT_FEE_YEAR, EFFECTIVE_RATE, FEE_BAND, FLOOR_GAP, FLOOR_OFF_EURIBOR, MONTHLY_FLOW, RATES, UNFLOORED_RATE, pct } from '@/lib/data';
import { eur, useStore } from '@/lib/store';
import type { BankRole, Buyer, EventType } from '@/lib/types';
import { cn } from '@/lib/utils';

function EventFeed() {
  const { events, buyers } = useStore();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" />Sündmuste voog — automaatne korduvhindamine</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-72 overflow-y-auto">
        {events.map((e) => {
          const b = buyers.find((x) => x.id === e.buyerId);
          return (
            <div key={e.id} className="flex items-start gap-3 text-[13px] border-b pb-2 last:border-0">
              <span className="text-xs text-muted-foreground w-10 shrink-0 pt-0.5">{e.time}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[11px]">{e.ruleId}</Badge>
                  <StatusChip status={e.action} />
                  {e.state === 'pending-confirm' && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[11px]">Ootab nelja silma kinnitust</Badge>}
                  {e.state === 'resolved' && <Badge variant="secondary" className="text-[11px]">Lahendatud</Badge>}
                  <span className="font-medium">{b?.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">{e.detail}</div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function EventSimulator({ onPick }: { onPick: (b: Buyer) => void }) {
  const { buyers, triggerEvent } = useStore();
  const targets = buyers.filter((b) => ['active', 'review'].includes(b.status) && b.limit > 0).slice(0, 6);
  const [buyerId, setBuyerId] = useState(targets[0]?.id ?? 'gtc');
  const b = buyers.find((x) => x.id === buyerId) ?? targets[0];
  const fire = (type: EventType, variant: 'severe' | 'mild') => {
    if (b) triggerEvent(type, b.id, variant);
  };
  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-600" />Simuleeri sündmust<Badge variant="outline" className="text-[10px] uppercase tracking-wide text-amber-700">DEMO</Badge></CardTitle>
      </CardHeader>
      <CardContent className="text-[13px] space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Ostja:</span>
          {targets.map((t) => (
            <Button key={t.id} size="sm" variant={t.id === buyerId ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setBuyerId(t.id)}>
              {t.name.replace(' OÜ', '').replace(' AS', '')}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Sündmus:</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fire('emta_drop', 'severe')}>EMTA käibe langus −42% (YoY, hooajakorrigeeritud)</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fire('emta_drop', 'mild')}>EMTA käibe langus −22% (YoY)</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fire('board_change', 'severe')}>Juhatuse liikme vahetus</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fire('ownership_change', 'severe')}>Omandi muutus ≥ 50%</Button>
          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => fire('sanctions_update', 'severe')}>Sanktsioonide nimekirja uuendus</Button>
          {b && <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => onPick(b)}>Ava ostja toimik →</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

const BANK_USERS = ['Kadri Rehe', 'Margus Tamm', 'Anna Liiv', 'Aivar Tšekmazov'];

function BuyerDetail({ buyer, onClose, onShowClaims }: { buyer: Buyer; onClose: () => void; onShowClaims?: () => void }) {
  const { events, requestUnfreeze, confirmUnfreeze, unfreezeRequests, startReview, resolveReview, sanctionCases, resolveSanctionCase, proposeAmlDecision, confirmAmlDecision } = useStore();
  const pendingConfirm = events.some((e) => e.buyerId === buyer.id && e.ruleId === 'OV-01' && e.state === 'pending-confirm');
  const buyerEvents = events.filter((e) => e.buyerId === buyer.id);
  const sanctionCase = sanctionCases[buyer.id];
  const sanctionOpen = sanctionCase?.state === 'open';
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [approver, setApprover] = useState('');
  const [confirmError, setConfirmError] = useState('');
  // R01: sanktsioonivaste lahendamise vorm (otsus + tõend + otsustaja)
  const [sanctionForm, setSanctionForm] = useState({ decision: 'Valepositiivne — isik ei ole nimekirja isik', evidence: '', decider: '' });
  const [sanctionError, setSanctionError] = useState('');
  const [amlApprover, setAmlApprover] = useState('');
  const [amlError, setAmlError] = useState('');
  const requester = unfreezeRequests[buyer.id] ?? 'Kadri Rehe';
  const submitConfirm = () => {
    if (approver === requester) {
      setConfirmError(`Neli silma: kinnitaja peab olema keegi teine kui taotleja (${requester}). Valige teine kinnitaja.`);
      return;
    }
    if (!approver) {
      setConfirmError('Valige teine kinnitaja.');
      return;
    }
    const ok = confirmUnfreeze(buyer.id, approver);
    if (!ok) {
      setConfirmError('Kinnitus ei õnnestunud — kinnitaja peab erinema taotlejast ja sanktsioonijuhtum peab olema lahendatud.');
      return;
    }
    setConfirmOpen(false);
    setApprover('');
    setConfirmError('');
  };
  const submitSanction = () => {
    if (!sanctionForm.evidence.trim()) {
      setSanctionError('Tõend on kohustuslik — kirjeldage, mille põhjal vaste lahendati (nt isikukoodi ja sünniaja võrdlus).');
      return;
    }
    if (!sanctionForm.decider) {
      setSanctionError('Valige otsustaja.');
      return;
    }
    const ok = resolveSanctionCase(buyer.id, sanctionForm.decision, sanctionForm.evidence.trim(), sanctionForm.decider);
    if (!ok) setSanctionError('Lahendamine ei õnnestunud.');
    else setSanctionError('');
  };
  const aml = buyer.amlDecision;
  const submitAmlConfirm = () => {
    if (!amlApprover || amlApprover === (aml?.requester ?? 'Kadri Rehe')) {
      setAmlError(`Neli silma: kinnitaja peab olema keegi teine kui taotleja (${aml?.requester ?? 'Kadri Rehe'}).`);
      return;
    }
    const ok = confirmAmlDecision(buyer.id, amlApprover);
    if (!ok) setAmlError('Kinnitus ei õnnestunud.');
    else { setAmlError(''); setAmlApprover(''); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          Portfell <ChevronRight className="h-3 w-3" /> <span className="font-medium text-foreground">{buyer.name}</span>
        </div>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg">
            {buyer.name}
            <span className="text-sm text-muted-foreground font-normal">#{buyer.reg}</span>
            <StatusChip status={buyer.status} />
          </DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground flex gap-4 flex-wrap">
          <span>Mudel: Ostja limiidi otsus</span><span>Otsuse allikas: reeglipõhine otsustegur</span><span>Kehtivus: 90 päeva</span><span>Hinne: {buyer.grade}</span>
          {buyer.pep && <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">PEP — tugevdatud kliendi tundmaõppimine (EDD)</Badge>}
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Otsus reeglite järgi vs kinnitatud otsus</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Parameeter</TableHead>
                  <TableHead className="text-xs">Reeglipõhine otsus</TableHead>
                  <TableHead className="text-xs">Kinnitatud otsus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-[13px]">Limiit</TableCell>
                  <TableCell className="text-[13px] text-right tabular-nums whitespace-nowrap">
                    {buyer.override
                      ? eur(buyer.override.rulesLimit)
                      : aml
                        ? `${eur(aml.proposed)} (soovitus — PEP 50% näidisriskipoliitika)`
                        : eur(buyer.limit)}
                  </TableCell>
                  <TableCell className="text-[13px] text-right tabular-nums whitespace-nowrap">
                    {buyer.status === 'pending'
                      ? aml?.state === 'confirmed'
                        ? eur(buyer.limit)
                        : <span className="text-muted-foreground">— kinnitamata (kehtivat limiiti pole)</span>
                      : eur(buyer.limit)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-[13px]">Lisatagatis / käendus</TableCell>
                  <TableCell className="text-[13px]">{buyer.grade === 'C' || buyer.grade === 'D' ? 'Jah' : 'Ei'}</TableCell>
                  <TableCell className="text-[13px]">{buyer.grade === 'C' || buyer.grade === 'D' ? 'Jah' : 'Ei'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-[13px]">Regress</TableCell>
                  <TableCell className="text-[13px]">regressiga portfelli osa</TableCell>
                  <TableCell className="text-[13px]">regressiga portfelli osa</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-[13px]">Tulemus</TableCell>
                  <TableCell className="text-[13px]">{buyer.override ? buyer.override.rulesResult : buyer.status === 'rejected' ? 'REJECTED' : aml ? 'REFER (PEP → EDD)' : 'ACCEPTED'}</TableCell>
                  <TableCell className="text-[13px]">
                    {buyer.status === 'rejected'
                      ? 'REJECTED'
                      : buyer.status === 'frozen'
                        ? 'FROZEN (EV)'
                        : buyer.status === 'pending'
                          ? aml?.state === 'confirmed'
                            ? 'ACCEPTED'
                            : aml?.state === 'four-eyes'
                              ? 'OOTAB NELJA SILMA KINNITUST'
                              : 'TAOTLUS OOTEL — otsust pole'
                          : 'ACCEPTED'}
                  </TableCell>
                </TableRow>
                {buyer.override && (
                  <TableRow className="bg-amber-50">
                    <TableCell className="text-[13px]">Käsitsi muutmise põhjus</TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">—</TableCell>
                    <TableCell className="text-[13px] font-medium text-amber-800">{buyer.override.reason}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
            {buyer.override && (
              <div className="text-[11px] text-amber-700 mt-2">Kinnitatud otsus erineb reeglitulemusest — käsitsi muudatus põhjuse koodiga, mõlemad on auditi jäljes.</div>
            )}
            <div className="mt-2"><RuleTableDialog name="Loan Size (HR Policy Unique)" rows={LOAN_SIZE_TABLE} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">KYC/AML skreeningu kokkuvõte</CardTitle></CardHeader>
          <CardContent className="text-[13px] space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sanktsioonid (5 nimekirja)</span>
              {sanctionOpen ? (
                <span className="text-destructive font-medium">Hägusvaste {sanctionCase.score.toLocaleString('et-EE')} — juhtum AVATUD {sanctionCase.openedAt}</span>
              ) : sanctionCase?.state === 'cleared' ? (
                <span className="text-amber-700 font-medium">Vaste lahendatud {sanctionCase.clearedAt} — {sanctionCase.decider}: {sanctionCase.decision}</span>
              ) : (
                <span className="text-emerald-700 font-medium">Puhas · viimati 06:00</span>
              )}
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">PEP</span><span className={buyer.pep ? 'text-orange-700 font-medium' : 'text-emerald-700 font-medium'}>{buyer.pep ? 'PEP tuvastatud — ' + (buyer.pepNote ?? '') : 'Puhas'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Negatiivne meedia</span><span className="text-emerald-700 font-medium">0 materiaalset vihjet</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Seotud osapooled</span><span className={buyer.relationFlag ? 'text-amber-700 font-medium' : 'text-emerald-700 font-medium'}>{buyer.relationFlag ?? 'Ei tuvastatud'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Võlad (ettevõte / esindajad)</span><span className="text-emerald-700 font-medium">Normivahemikus</span></div>
          </CardContent>
        </Card>

        {sanctionOpen && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-destructive">Sanktsioonijuhtum EV-04 — vajab lahendamist enne limiidi taastamist</CardTitle></CardHeader>
            <CardContent className="text-[13px] space-y-2">
              <div className="text-xs text-muted-foreground">Hägusvaste {sanctionCase.score.toLocaleString('et-EE')} (lävi 0,92) UBO nimega EL konsolideeritud nimekirjas. Nime hägusvaste vajab uurimist — limiidi taastamine ei tõenda lahendamist.</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select className="border rounded-md px-2 py-1.5 text-[13px] bg-white" value={sanctionForm.decision} onChange={(e) => setSanctionForm((f) => ({ ...f, decision: e.target.value }))}>
                  <option>Valepositiivne — isik ei ole nimekirja isik</option>
                  <option>Valepositiivne — nime sarnasus, erinev isikukood/sünniaeg</option>
                  <option>Vaste kinnitatud — tehingud keelatud, esitatakse RAB-i teade</option>
                </select>
                <input
                  className="border rounded-md px-2 py-1.5 text-[13px] bg-white"
                  placeholder="Tõend (nt isikukoodi ja sünniaja võrdlus)"
                  value={sanctionForm.evidence}
                  onChange={(e) => setSanctionForm((f) => ({ ...f, evidence: e.target.value }))}
                />
                <select className="border rounded-md px-2 py-1.5 text-[13px] bg-white" value={sanctionForm.decider} onChange={(e) => setSanctionForm((f) => ({ ...f, decider: e.target.value }))}>
                  <option value="">— otsustaja (AML) —</option>
                  {BANK_USERS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={submitSanction}>Lahenda sanktsioonivaste (auditikirjega)</Button>
                {sanctionError && <span className="text-xs text-red-700 font-medium">{sanctionError}</span>}
              </div>
            </CardContent>
          </Card>
        )}

        {buyerEvents.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Ostja sündmuste ajalugu</CardTitle></CardHeader>
            <CardContent className="text-[13px] space-y-1.5">
              {buyerEvents.map((e) => (
                <div key={e.id} className="flex gap-2">
                  <span className="text-muted-foreground w-10 shrink-0">{e.time}</span>
                  <Badge variant="outline" className="text-[11px] shrink-0 h-5">{e.ruleId}</Badge>
                  <span className="text-muted-foreground">{e.detail}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2 flex-wrap">
          {buyer.status === 'frozen' && !pendingConfirm && !sanctionOpen && (
            <Button size="sm" variant="outline" onClick={() => requestUnfreeze(buyer.id)}>Taotle limiidi peatamise lõpetamist</Button>
          )}
          {buyer.status === 'frozen' && sanctionOpen && (
            <Button size="sm" variant="outline" disabled title="Sanktsioonijuhtum peab olema lahendatud enne taotlust">Taotle limiidi peatamise lõpetamist (blokeeritud — EV-04 avatud)</Button>
          )}
          {pendingConfirm && (
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => { setConfirmOpen(true); setConfirmError(''); setApprover(''); }}>
              <UserCheck className="h-4 w-4 mr-1" />Kinnita peatamise lõpetamine (2. kinnitaja — neli silma)
            </Button>
          )}
          {buyer.status === 'review' && (
            <>
              <Button size="sm" variant="outline" onClick={() => startReview(buyer.id)}>Ava läbivaatus</Button>
              <Button size="sm" onClick={() => resolveReview(buyer.id)}>Sule läbivaatus — taasta limiit</Button>
            </>
          )}
          {buyer.status === 'pending' && aml?.state === 'proposal' && (
            <Button size="sm" onClick={() => proposeAmlDecision(buyer.id)}>Kinnita otsus: {eur(aml.proposed)} + EDD nõue</Button>
          )}
          {onShowClaims && (
            <Button size="sm" variant="ghost" onClick={onShowClaims}>Vaata nõude elutsükli →</Button>
          )}
          <Button size="sm" variant="ghost" onClick={onClose}>Sulge</Button>
        </div>

        {buyer.status === 'pending' && aml?.state === 'four-eyes' && (
          <div className="border border-amber-300 bg-amber-50/60 rounded-lg p-3 space-y-2">
            <div className="text-sm font-medium flex items-center gap-2"><UserCheck className="h-4 w-4 text-amber-700" />AML-otsus ootab nelja silma kinnitust — {eur(aml.proposed)} + EDD</div>
            <div className="text-xs text-muted-foreground">Taotleja: <b>{aml.requester}</b> — kinnitaja peab olema teine isik. Kehtiv limiit tekib alles kinnituse järel.</div>
            <div className="flex items-center gap-2 flex-wrap">
              <select className="border rounded-md px-2 py-1.5 text-[13px] bg-white" value={amlApprover} onChange={(e) => { setAmlApprover(e.target.value); setAmlError(''); }}>
                <option value="">— vali kinnitaja —</option>
                {BANK_USERS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 h-7 text-xs" onClick={submitAmlConfirm}>Kinnita AML-otsus</Button>
            </div>
            {amlError && <div className="text-xs text-red-700 font-medium">{amlError}</div>}
          </div>
        )}
        {aml?.state === 'confirmed' && (
          <div className="text-[11px] text-emerald-700">AML-otsus kinnitatud: {eur(aml.proposed)} · taotleja {aml.requester} · kinnitaja {aml.approver} · tingimus: {aml.conditions}</div>
        )}

        {confirmOpen && (
          <div className="border border-amber-300 bg-amber-50/60 rounded-lg p-3 space-y-2">
            <div className="text-sm font-medium flex items-center gap-2"><UserCheck className="h-4 w-4 text-amber-700" />Nelja silma kinnitus — vali teine kinnitaja</div>
            <div className="text-xs text-muted-foreground">Taotleja: <b>{requester}</b> — kinnitaja peab olema teine isik.</div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="border rounded-md px-2 py-1.5 text-[13px] bg-white"
                value={approver}
                onChange={(e) => { setApprover(e.target.value); setConfirmError(''); }}
              >
                <option value="">— vali kinnitaja —</option>
                {BANK_USERS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 h-7 text-xs" onClick={submitConfirm}>Kinnita</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmOpen(false)}>Tühista</Button>
            </div>
            {confirmError && <div className="text-xs text-red-700 font-medium">{confirmError}</div>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Panga alamrollid: töölaua moodulite komplekt kohandub rollile (muu navigeerimine sama) ---

export const BANK_ROLES: { id: BankRole; label: string }[] = [
  { id: 'analyst', label: 'Krediidianalüütik' },
  { id: 'cfo', label: 'CFO' },
  { id: 'cro', label: 'CRO' },
  { id: 'rm', label: 'Kliendihaldur' },
];

export function BankRoleSwitch() {
  const { bankRole, setBankRole } = useStore();
  return (
    <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/40" role="group" aria-label="Panga roll">
      {BANK_ROLES.map((r) => (
        <button
          key={r.id}
          onClick={() => setBankRole(r.id)}
          aria-pressed={bankRole === r.id}
          className={cn(
            'px-2.5 py-1 text-xs rounded-md transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
            bankRole === r.id ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function AnalystDashboard() {
  const { buyers, base } = useStore();
  const frozen = buyers.filter((b) => b.status === 'frozen').length;
  const review = buyers.filter((b) => b.status === 'review').length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Peatatud ostjaid" value={frozen} tone="danger" hint="Limiit peatatud — uued nõuded ei finantseeritu" />
        <StatCard label="Läbivaatusel" value={review} tone="warning" hint="Ootavad krediidianalüütiku otsust" />
        <StatCard label="Kasutusest peatatud osa" value={eur(base.frozenFinanced)} tone="danger" hint="Intress peatatud, tagasiostu ei käivitata (RK-01)" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><EventFeed /></div>
        <Waterfall compact />
      </div>
    </div>
  );
}

function CfoDashboard() {
  const { base, buyers } = useStore();
  // R19: RK-01 intressipaus kajastub tuluprognoosis — brutoprognoos, peatamise mõju ja neto eraldi
  const interestMonthGross = (base.fundsEmployed * EFFECTIVE_RATE) / 12;
  const frozenInterestMonth = (base.frozenFinanced * EFFECTIVE_RATE) / 12;
  const interestMonth = interestMonthGross - frozenInterestMonth;
  const feeMonthLow = ANNUAL_FEE_LOW / 12;
  const feeMonthHigh = ANNUAL_FEE_HIGH / 12;
  const contractMonth = CONTRACT_FEE_YEAR / 12;
  const totalLow = interestMonth + feeMonthLow + contractMonth;
  const totalHigh = interestMonth + feeMonthHigh + contractMonth;
  const floorActive = RATES.euribor3m + RATES.margin < RATES.floor;
  const floorExtraMonth = (base.fundsEmployed * FLOOR_GAP) / 12;
  const leakPerDay = (base.frozenFinanced * EFFECTIVE_RATE) / 360;
  const autoMatched = LEDGER.filter((r) => r.method !== 'käsitsi').length;
  const exceptionSum = LEDGER.filter((r) => r.status !== 'matched').reduce((s, r) => s + r.sum, 0);
  const stage3 = BASE.ineligible[0];
  const frozenCount = buyers.filter((b) => b.status === 'frozen').length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Portfelli tulu (kuu)</CardTitle></CardHeader>
          <CardContent className="text-[13px] space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Intressitulu (bruto): {eur(base.fundsEmployed)} × {pct(EFFECTIVE_RATE)} / 12</span><span className="font-medium tabular-nums whitespace-nowrap">{eur(interestMonthGross)}</span></div>
            {base.frozenFinanced > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">RK-01 intressipaus peatatud ostjatele: −{eur(base.frozenFinanced)} × {pct(EFFECTIVE_RATE)} / 12</span><span className="font-medium tabular-nums whitespace-nowrap text-destructive">−{eur(frozenInterestMonth)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Intressitulu (neto, intressi teeniv jääk)</span><span className="font-medium tabular-nums whitespace-nowrap">{eur(interestMonth)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Haldustasud: kuu arvevoog {eur(MONTHLY_FLOW)} × kaalutud PR-01 ({pct(FEE_BAND.low)}–{pct(FEE_BAND.high)})</span><span className="font-medium tabular-nums whitespace-nowrap">~{eur(feeMonthLow)}–{eur(feeMonthHigh)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Lepingu- ja pikendustasu: {eur(BASE.facilityLimit)} × 1% / 12</span><span className="font-medium tabular-nums whitespace-nowrap">{eur(contractMonth)}</span></div>
            <div className="flex justify-between font-medium pt-1 border-t"><span>Kokku (neto)</span><span className="tabular-nums whitespace-nowrap">~{eur(Math.round(totalLow / 100) * 100)}–{eur(Math.round(totalHigh / 100) * 100)} kuus</span></div>
            <div className="text-[11px] text-muted-foreground pt-1">Aastases vaates klappib müüja kogukulu kaardiga (~277 000–316 000 €) — sama COST_MODEL allikas. RK-01 intressipaus on lepinguline näidisotsus.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Põranda monitor (PR-02)</CardTitle></CardHeader>
          <CardContent className="text-[13px] space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Valem: EURIBOR 3M {pct(RATES.euribor3m)} + marginaal {pct(RATES.margin)} − regressisoodustus {pct(RATES.recourseDiscount)}</span><span className="font-medium tabular-nums whitespace-nowrap">{pct(UNFLOORED_RATE)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Alampiir (miinimum aastas)</span><span className="font-medium tabular-nums whitespace-nowrap">{pct(RATES.floor)}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Põranda staatus</span>
              {floorActive
                ? <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning rounded-md px-2 py-0.5 text-xs font-medium hover:bg-transparent"><AlertTriangle className="h-3 w-3 mr-1" />AKTIIVNE — rakendub {pct(EFFECTIVE_RATE)}</Badge>
                : <Badge variant="outline" className="border-success/30 bg-success/10 text-success rounded-md px-2 py-0.5 text-xs font-medium hover:bg-transparent">Põrand ei rakendu</Badge>}
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Lisatulu põrandalt: +{pct(FLOOR_GAP)} väljamakstud summalt</span><span className="font-medium tabular-nums whitespace-nowrap">≈ {eur(floorExtraMonth)} kuus</span></div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t">Lipp kaob, kui EURIBOR 3M &gt; {pct(FLOOR_OFF_EURIBOR)} — siis valem ületab alampiiri iseenesest.</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Peatatud intressi leke (RK-01)</CardTitle></CardHeader>
          <CardContent className="text-[13px] space-y-1.5">
            {base.frozenFinanced > 0 ? (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Peatatud ostjate finantseeritud osa</span><span className="font-medium tabular-nums">{eur(base.frozenFinanced)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{eur(base.frozenFinanced)} × {pct(EFFECTIVE_RATE)} / 360</span><span className="font-medium tabular-nums">{eur(leakPerDay)} päevas</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Kuu hinnang (× 30)</span><span className="font-medium tabular-nums">{eur(leakPerDay * 30)} kuus</span></div>
              </>
            ) : (
              <div className="text-muted-foreground">Praegu peatatud ostjaid pole — leke 0 €. Kui EV-reegel ostja peatab, jääb juba finantseeritud osa intressita: {pct(EFFECTIVE_RATE)} / 360 päevas (RK-01: tagasiostu ei käivitata).</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">IFRS 9 sisendid</CardTitle></CardHeader>
          <CardContent className="text-[13px] space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Stage 3 sisend: {stage3.name.toLowerCase()}</span><span className="font-medium tabular-nums whitespace-nowrap">{eur(stage3.amount)} · {stage3.count} arvet</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">RK-01 &gt; 60 pv: baasist välja</span><span className="font-medium tabular-nums">0 aktiivset (demos)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">RK-01 &gt; 90 pv: tagasiost</span><span className="font-medium tabular-nums">0 aktiivset (demos)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">EV-peatamine ilma tagasiostuta</span><span className="font-medium tabular-nums">{frozenCount} ostjat</span></div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t">Stage-jaotuse sisendid tulevad finantseerimisbaasi välistustest ja RK-01 tagasiostu-pipeline'ist.</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Laekumiste kokkuvõte — sobitused (LEDGER)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[13px]">
            <div><div className="text-xs text-muted-foreground">Sobituse määr (automaatne)</div><div className="font-semibold tabular-nums text-lg">{pct(autoMatched / LEDGER.length, 0)}</div><div className="text-[11px] text-muted-foreground">{autoMatched}/{LEDGER.length} laekumist — vIBAN määrab ostja, RF-viide nõude</div></div>
            <div><div className="text-xs text-muted-foreground">Keskmine sobitusaeg</div><div className="font-semibold text-lg">reaalajas</div><div className="text-[11px] text-muted-foreground">camt.054 → sobitus sekunditega; erandid ootavad raamatupidajat</div></div>
            <div><div className="text-xs text-muted-foreground">Erandite summa</div><div className="font-semibold tabular-nums text-lg text-warning">{eur(exceptionSum)}</div><div className="text-[11px] text-muted-foreground">osalised 9 500 € + 7 740 € + erand 1 250 €</div></div>
            <div><div className="text-xs text-muted-foreground">Detailid</div><div className="text-[13px]">Vaade «Nõuded ja laekumised» → laekumiste register</div></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const GRADE_ORDER = ['A', 'B', 'C', 'D'] as const;
const DEMO_TODAY = new Date(2026, 9, 17); // demo "täna" — viimase laekumisregistri kirje järgne päev
const parseEtDate = (d: string) => {
  const [dd, mm, yyyy] = d.split('.').map(Number);
  return new Date(yyyy, mm - 1, dd);
};
const AGE_BUCKETS = [
  { id: 'current', label: 'Tähtajani (0 pv)' },
  { id: '1-30', label: '1–30 pv üle' },
  { id: '31-60', label: '31–60 pv üle' },
  { id: '61-90', label: '61–90 pv üle' },
  { id: '90+', label: '> 90 pv üle' },
] as const;

// RK-01 tegevusregister — staatiline demos näidis
const RK01_REGISTER = [
  { ref: 'ARV-2026-04210', buyer: 'Kalju Betoon OÜ', amount: 18_200, action: 'BAASIST VÄLJA', note: '> 60 pv üle tähtaja — arve eemaldatud finantseerimisbaasist' },
  { ref: 'ARV-2026-04055', buyer: 'Tartu Faasaadid AS', amount: 9_300, action: 'TAGASIOST', note: '> 90 pv üle tähtaja — tagasiost müüjalt käivitatud (täisregressi osa)' },
  { ref: 'EV-01 sündmus', buyer: '(demo)', amount: 0, action: 'EI TAGASIOSTU', note: 'EV-peatamine — juba finantseeritud arvetele tagasiostu ei käivitata; intress peatub' },
];

function CroDashboard() {
  const { buyers, invoices, base } = useStore();
  const gradeRows = GRADE_ORDER.map((g) => {
    const list = buyers.filter((b) => b.grade === g);
    return { g, count: list.length, limit: list.reduce((s, b) => s + b.limit, 0), utilized: list.reduce((s, b) => s + b.utilized, 0) };
  });
  const massCap = 0.6 * BASE.facilityLimit; // FAC-01: massportfelli aggregaatne kasutus ≤ 60% faktooringulimiidist
  // R03: tegelik kasutus = väljamakstud finantseering kokku − individuaalsete ostjate kasutus (elav — reageerib laekumistele)
  const headUtilized = buyers.reduce((s, b) => s + b.utilized, 0);
  const massFinanced = base.fundsEmployed - headUtilized;
  const massTheoretical = MASS_PORTFOLIO_OPEN_AR * BASE.blendedRate; // nõuete teoreetiline finantseerimisväärtus
  const massBreached = massFinanced > massCap;
  const massPct = massFinanced / massCap;
  const stage3 = BASE.ineligible[0];
  const aging = AGE_BUCKETS.map((bucket) => {
    const list = invoices.filter((i) => {
      if (i.status === 'paid') return false;
      const dpd = Math.floor((DEMO_TODAY.getTime() - parseEtDate(i.due).getTime()) / 86_400_000);
      if (bucket.id === 'current') return dpd <= 0;
      if (bucket.id === '1-30') return dpd >= 1 && dpd <= 30;
      if (bucket.id === '31-60') return dpd >= 31 && dpd <= 60;
      if (bucket.id === '61-90') return dpd >= 61 && dpd <= 90;
      return dpd > 90;
    });
    return { ...bucket, count: list.length, sum: list.reduce((s, i) => s + i.amount, 0) };
  });
  const overrides = buyers.filter((b) => b.override);
  const overrideShare = overrides.length / buyers.length;
  const headOpenAr = buyers.reduce((s, b) => s + b.openAr, 0);
  const epOpenAr = buyers.filter((b) => b.sector === 'Ehitus' || b.sector === 'Puit').reduce((s, b) => s + b.openAr, 0);
  const sectorShare = headOpenAr > 0 ? epOpenAr / headOpenAr : 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Riskipositsioon krediidihinde järgi — individuaalselt hinnatud ostjad + massportfell</CardTitle>
            <div className="text-xs text-muted-foreground pt-0.5">Massportfell = {MASS_PORTFOLIO_COUNT.toLocaleString('et-EE')} väikest ostjat · automaatne skoorimine · alglimiit kuni 1 000 € + käitumispõhine kasv kuni 5 000 € ostja kohta (näidisriskipoliitika)</div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hinne</TableHead>
                  <TableHead className="text-right">Ostjaid</TableHead>
                  <TableHead className="text-right">Limiidid</TableHead>
                  <TableHead className="text-right">Kasutus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradeRows.map((r) => (
                  <TableRow key={r.g}>
                    <TableCell className="font-semibold">{r.g}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(r.limit)}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(r.utilized)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40">
                  <TableCell className="font-medium">Massportfell (automaatne skoorimine)</TableCell>
                  <TableCell className="text-right tabular-nums">{MASS_PORTFOLIO_COUNT.toLocaleString('et-EE')}</TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(MASS_PORTFOLIO_LIMIT_SUM)}</TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(MASS_PORTFOLIO_OPEN_AR)} AR</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className={massBreached ? 'border-destructive/40' : ''}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Massportfelli 60% piirang — elav indikaator (FAC-01)</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-[13px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Piir: 60% × {eur(BASE.facilityLimit)} faktooringulimiidist</span><span className="font-medium tabular-nums">{eur(massCap)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tegelik kasutus: {eur(base.fundsEmployed)} väljamakstud − {eur(headUtilized)} individuaalsete ostjate kasutus</span><span className="font-medium tabular-nums">{eur(massFinanced)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Nõuete teoreetiline finantseerimisväärtus: {eur(MASS_PORTFOLIO_OPEN_AR)} AR × 80%</span><span className="font-medium tabular-nums">{eur(massTheoretical)}</span></div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={cn('h-full rounded-full', massBreached ? 'bg-destructive' : 'bg-success')} style={{ width: `${Math.min(100, massPct * 100)}%` }} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Kasutus piirist</span>
              <span className={cn('font-semibold tabular-nums', massBreached ? 'text-destructive' : 'text-success')}>{pct(massPct, 0)}</span>
            </div>
            {massBreached && (
              <div className="border border-destructive/30 bg-destructive/5 rounded-md px-3 py-2 text-xs">
                <b className="text-destructive">ÜLETATUD — taotluslik leid.</b> FAC-01: massportfelli tegelik aggregaatne kasutus ({eur(massFinanced)}) ületab 60% faktooringulimiidist ({eur(massCap)}) → uued massportfelli ostjad vajavad käsitsi kinnitust kuni kasutus langeb.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Nõuete vanuseline jaotus — avatud ja finantseeritud arved</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Päevi üle tähtaja</TableHead>
                  <TableHead className="text-right">Arveid</TableHead>
                  <TableHead className="text-right">Summa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aging.map((a) => (
                  <TableRow key={a.id} className={a.id === '90+' ? 'bg-destructive/5' : ''}>
                    <TableCell>{a.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.count}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(a.sum)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="text-[11px] text-muted-foreground mt-2 pt-2 border-t">
              Portfelli tasandil (sh massportfell) on &gt; 90 pv tähtaja ületanud nõuded {eur(stage3.amount)} / {stage3.count} arvet — baasist välistatud (vt finantseerimisbaas, «{stage3.name}»). Individuaalselt hinnatud ostjate näidisarved seisuga {DEMO_AS_OF} (demo arvestuskuupäev).
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">RK-01 tegevusregister <Badge variant="outline" className="text-[10px] uppercase tracking-wide">demos näidis</Badge></CardTitle></CardHeader>
            <CardContent className="space-y-2 text-[13px]">
              {RK01_REGISTER.map((r) => (
                <div key={r.ref} className="border rounded-lg p-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium tabular-nums">{r.ref}</span>
                    <Badge variant="outline" className={cn('rounded-md border px-1.5 py-0 text-[11px] font-medium hover:bg-transparent', r.action === 'TAGASIOST' ? 'border-destructive/30 bg-destructive/10 text-destructive' : r.action === 'BAASIST VÄLJA' ? 'border-warning/30 bg-warning/10 text-warning' : 'border-border bg-muted text-muted-foreground')}>{r.action}</Badge>
                    {r.amount > 0 && <span className="ml-auto tabular-nums">{eur(r.amount)}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.buyer} — {r.note}</div>
                </div>
              ))}
              <div className="text-[11px] text-muted-foreground">Reeglitabel: Reeglid ja mudelid → RK-01 · Regressi tagasiostu reeglid.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Käsitsi otsused (kvartal)</CardTitle></CardHeader>
            <CardContent className="text-[13px] space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Käsitsi limiidimuudatusi</span><span className="font-medium tabular-nums">{overrides.length} tk</span></div>
              {overrides.map((b) => (
                <div key={b.id} className="text-xs text-muted-foreground">{b.name}: {eur(b.override!.rulesLimit)} → {eur(b.limit)} · {b.override!.reason}</div>
              ))}
              <div className="flex justify-between items-center pt-1 border-t">
                <span className="text-muted-foreground">Osakaal individuaalselt hinnatud ostjatest</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium tabular-nums">{pct(overrideShare, 0)}</span>
                  {overrideShare > 0.05 && <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning rounded-md px-2 py-0.5 text-xs font-medium hover:bg-transparent">&gt; 5% → mudeli läbivaatus</Badge>}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Müüja risk — Bauhof Group AS</CardTitle></CardHeader>
          <CardContent className="text-[13px] space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Käive</span><span className="font-medium tabular-nums">{MERCHANT.turnover2023} → {MERCHANT.turnover2024} (−2,8% YoY)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Kaalutud lepinguline maksetähtaeg</span><span className="font-medium tabular-nums">{MERCHANT_APP.contractualTerm} pv</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">DSO (tegelik laekumine, 12M)</span><span className="font-medium tabular-nums">{MERCHANT_APP.avgPaymentTerm} pv</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Kahanemine (FAC-01)</span><span className="font-medium tabular-nums">2,0% faktooringu arvevoost</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Kreeditarved 12M</span><span className="font-medium tabular-nums">{eur(MERCHANT_APP.creditNotes12m)}</span></div>
          </CardContent>
        </Card>
        <Card className="border-warning/40">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Sektori kontsentratsioon (FAC-01)</CardTitle></CardHeader>
          <CardContent className="text-[13px] space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Ehitus + Puit, individuaalselt hinnatud ostjate avatud nõuetest</span><span className="font-semibold tabular-nums">{pct(sectorShare, 0)}</span></div>
            <div className="text-xs text-muted-foreground">{eur(epOpenAr)} / {eur(headOpenAr)} — FAC-01 lävend on teadlikult määratud individuaalselt hinnatud alamportfellile. Massportfelli sektorijaotus on teadmata — käsitletakse eraldi jälgimisriskina, mitmekesisust ei eeldata.</div>
            <div className="flex items-center gap-2 pt-1 border-t">
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning rounded-md px-2 py-0.5 text-xs font-medium hover:bg-transparent"><AlertTriangle className="h-3 w-3 mr-1" />&gt; 70% → ESKALEERI</Badge>
              <span className="text-xs text-muted-foreground">Lipp põleb — automaatne eskaleerimine krediidikomiteesse (monitooring, mitte blokeering).</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RmDashboard() {
  const { base, buyers, events } = useStore();
  const utilization = base.fundsEmployed / BASE.facilityLimit;
  const pending = buyers.filter((b) => b.status === 'pending');
  const exceptions = LEDGER.filter((r) => r.status !== 'matched');
  const manualFee = PRICE_LIST.find((p) => p.price === '65 €');
  const interestYear = base.fundsEmployed * EFFECTIVE_RATE;
  const totalLow = interestYear + ANNUAL_FEE_LOW + CONTRACT_FEE_YEAR;
  const totalHigh = interestYear + ANNUAL_FEE_HIGH + CONTRACT_FEE_YEAR;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Kohe kättesaadav Bauhofile" value={eur(base.availableNow)} tone="success" hint="Bruto kättesaadav − väljamakstud finantseering" />
        <StatCard label="Limiidi kasutus" value={pct(utilization, 0)} hint={`${eur(base.fundsEmployed)} / ${eur(BASE.facilityLimit)} faktooringulimiidist`} />
        <StatCard label="Limiiditaotlusi ootel" value={pending.length} tone="warning" hint={pending.map((b) => b.name).join(' · ')} />
        <StatCard label="Erand-laekumisi" value={exceptions.length} tone="warning" hint={`kokku ${eur(exceptions.reduce((s, r) => s + r.sum, 0))} — osaline ja erand`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Limiiditaotluste järjekord</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ostja</TableHead>
                  <TableHead>Hinne</TableHead>
                  <TableHead className="text-right">Taotletud limiit</TableHead>
                  <TableHead>Nelja silma olek</TableHead>
                  <TableHead className="text-right">Tasu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="font-semibold">{b.grade}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">
                      {eur(b.limit || 15000)}
                      {b.amlDecision && <div className="text-[11px] text-muted-foreground">reegli soovitus {eur(b.amlDecision.proposed)}</div>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {b.amlDecision?.state === 'confirmed'
                        ? `Kinnitatud: ${eur(b.amlDecision.proposed)} (2. kinnitaja ${b.amlDecision.approver})`
                        : b.amlDecision?.state === 'four-eyes'
                          ? 'Ootab nelja silma kinnitust — kehtivat limiiti veel pole'
                          : b.pep
                            ? 'PEP → REFER: analüütiku otsuse ettepanek kuni 50% standardist — kinnitamata'
                            : 'Andmete kogumisel'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{manualFee?.price ?? '65 €'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="text-[11px] text-muted-foreground mt-2 pt-2 border-t">Tasu hinnakirja järgi: «{manualFee?.item}» — käsitsi esitatud eritaotlused; automaatsed limiidid on paketihinnas.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Müüjalt teenitav aastane tulu — hinnang</CardTitle></CardHeader>
          <CardContent className="text-[13px] space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Intress: {eur(base.fundsEmployed)} × {pct(EFFECTIVE_RATE)} (PR-02)</span><span className="font-medium tabular-nums whitespace-nowrap">{eur(interestYear)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Haldustasu: 57,8M € aastane arvevoog × hindekaalutud määr (PR-01)</span><span className="font-medium tabular-nums whitespace-nowrap">~{eur(Math.round(ANNUAL_FEE_LOW / 1000) * 1000)}–{eur(Math.round(ANNUAL_FEE_HIGH / 1000) * 1000)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Lepingu- ja pikendustasu: kuni 1% limiidist</span><span className="font-medium tabular-nums whitespace-nowrap">kuni {eur(CONTRACT_FEE_YEAR)}</span></div>
            <div className="flex justify-between font-medium pt-1 border-t"><span>Kokku</span><span className="tabular-nums whitespace-nowrap">~{eur(Math.round(totalLow / 1000) * 1000)}–{eur(Math.round(totalHigh / 1000) * 1000)} aastas</span></div>
            <div className="text-[11px] text-muted-foreground pt-1">Brutotulu (intress + tasud) — rahastamiskulu, oodatavat krediidikahju, tegevus- ega kapitalikulu siin ei arvestata. Klappib müüja vaate kogukulu kaardiga — sama COST_MODEL allikas (PR-01/PR-02 + hinnakiri).</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Bauhof 360°</CardTitle></CardHeader>
          <CardContent className="text-[13px] space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Kahanemine</span><span className="font-medium tabular-nums">2,0% faktooringu arvevoost (FAC-01)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Lepinguline tähtaeg / DSO</span><span className="font-medium tabular-nums">{MERCHANT_APP.contractualTerm} pv / {MERCHANT_APP.avgPaymentTerm} pv</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Lepingu lõpp</span><span className="font-medium tabular-nums">17.09.2027 (otsus {MERCHANT_APP.decided.split(' ')[0]} + {MERCHANT_APP.requestedTerm})</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ostjate koond</span><span className="font-medium tabular-nums">{buyers.length} individuaalset + {MASS_PORTFOLIO_COUNT.toLocaleString('et-EE')} massportfelli ostjat</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Taotlus</span><span className="font-medium tabular-nums">{MERCHANT_APP.nr}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Kliendi sündmused — teavitused</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-56 overflow-y-auto text-[13px]">
            {events.length === 0 && <div className="text-xs text-muted-foreground">Uusi sündmusi pole.</div>}
            {events.slice(0, 8).map((e) => {
              const b = buyers.find((x) => x.id === e.buyerId);
              return (
                <div key={e.id} className="flex items-start gap-3 border-b pb-2 last:border-0">
                  <span className="text-xs text-muted-foreground w-10 shrink-0 pt-0.5">{e.time}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[11px]">{e.ruleId}</Badge>
                      <StatusChip status={e.action} />
                      <span className="font-medium">{b?.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{e.detail}</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Dashboard() {
  const { bankRole } = useStore();
  if (bankRole === 'cfo') return <CfoDashboard />;
  if (bankRole === 'cro') return <CroDashboard />;
  if (bankRole === 'rm') return <RmDashboard />;
  return <AnalystDashboard />;
}

function Portfolio({ onShowClaims }: { onShowClaims: () => void }) {
  const { buyers, invoices } = useStore();
  const [detail, setDetail] = useState<Buyer | null>(null);
  const sorted = [...buyers].sort((a, b) => b.limit - a.limit);
  // Peatatud ostja juba finantseeritud osa (intress peatatud, RK-01)
  const frozenFinancedOf = (buyerId: string) =>
    invoices.filter((i) => i.buyerId === buyerId && i.status === 'financed').reduce((s, i) => s + (i.amount - i.retention), 0);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ostjaportfell — suurimad 10 ostjat + {MASS_PORTFOLIO_COUNT.toLocaleString('et-EE')} automaatselt hinnatavat ostjat</CardTitle>
          <div className="text-xs text-muted-foreground flex gap-3 pt-1 flex-wrap">
            <span>Väikeste ostjate limiitide summa: {eur(MASS_PORTFOLIO_LIMIT_SUM)}</span>
            <span>Väikeste ostjate avatud nõuded: {eur(MASS_PORTFOLIO_OPEN_AR)}</span>
          </div>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Ostja</TableHead>
                <TableHead>Hinne</TableHead>
                <TableHead className="text-right">Limiit</TableHead>
                <TableHead className="text-right">Kasutus (aktiivne / peatatud osa)</TableHead>
                <TableHead className="text-right">Avatud nõuded</TableHead>
                <TableHead className="text-right">Viivises (päeva)</TableHead>
                <TableHead>Staatus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((b) => {
                const frozenPart = b.status === 'frozen' ? frozenFinancedOf(b.id) : 0;
                return (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => setDetail(b)}>
                    <TableCell>
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs tabular-nums text-muted-foreground">{b.reg}</div>
                    </TableCell>
                    <TableCell className="font-semibold">{b.grade}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(b.limit)}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">
                      {eur(b.utilized - (frozenPart > 0 ? Math.min(frozenPart, b.utilized) : 0))}
                      {frozenPart > 0 && (
                        <div className="text-destructive font-normal">peatatud osa {eur(frozenPart)} · intress peatatud</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{eur(b.openAr)}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{b.dpd > 0 ? b.dpd + ' pv' : '—'}</TableCell>
                    <TableCell><StatusChip status={b.status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {detail && <BuyerDetail buyer={buyers.find((b) => b.id === detail.id) ?? detail} onClose={() => setDetail(null)} onShowClaims={onShowClaims} />}
    </div>
  );
}

function DemoTools({ onShowClaims }: { onShowClaims: () => void }) {
  const { buyers } = useStore();
  const [detail, setDetail] = useState<Buyer | null>(null);
  return (
    <div className="space-y-4 max-w-4xl">
      <EventSimulator onPick={(b) => setDetail(b)} />
      {detail && <BuyerDetail buyer={buyers.find((b) => b.id === detail.id) ?? detail} onClose={() => setDetail(null)} onShowClaims={onShowClaims} />}
    </div>
  );
}

function AmlOnboarding() {
  const { buyers, proposeAmlDecision, confirmAmlDecision } = useStore();
  const laane = buyers.find((b) => b.id === 'laane')!;
  const aml = laane.amlDecision;
  const [amlApprover, setAmlApprover] = useState('');
  const [amlError, setAmlError] = useState('');
  const submitAmlConfirm = () => {
    if (!amlApprover || amlApprover === (aml?.requester ?? 'Kadri Rehe')) {
      setAmlError(`Neli silma: kinnitaja peab olema keegi teine kui taotleja (${aml?.requester ?? 'Kadri Rehe'}).`);
      return;
    }
    const ok = confirmAmlDecision(laane.id, amlApprover);
    if (!ok) setAmlError('Kinnitus ei õnnestunud.');
    else { setAmlError(''); setAmlApprover(''); }
  };
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-3">
        <div className="text-sm text-muted-foreground">
          Uus ostja: <b className="text-foreground">{laane.name}</b> · reg {laane.reg} · taotletud limiit {eur(laane.limit || 15000)} · mudel <span className="font-mono">BuyerLimitDecisionModel</span>
        </div>
        <StepCheck title="Ettevõtte andmed (äriregister)" state="done" note="Nimi, staatus, käibemaksukohuslane, tegevusalad kinnitatud" />
        <StepCheck title="Sanktsioonide skreening" state="done" note="5 nimekirja · 0 vastet · hägusvaste lävi 0,92">
          <RuleTableDialog name="AML-01 · Sanktsioonid" rows={SCREENING_TABLE.slice(0, 1)} />
        </StepCheck>
        <StepCheck title="PEP skreening" state="attention" note={laane.pepNote}>
          <RuleTableDialog name="AML-02 · PEP" rows={[SCREENING_TABLE[1], SCREENING_TABLE[5]]} />
        </StepCheck>
        <StepCheck title="Negatiivne meedia" state="done" note="12 allikat · 0 materiaalset vihjet (ajavahemikus 01.01.2024–)" />
        <StepCheck title="UBO ja seotud osapooled" state="done" note="100% omanik: Marko Saar (38603…) — vastavus Bauhofi UBO-ga: ei tuvastatud" />
        <StepCheck title="Aastaaruanne / EMTA käibeandmed" state="done" note="Käive 12M 2,1M € · kasumimarginaal 6,8% · kvartal −3% vs sama kvartal eelmisel aastal (normis, hooajakorrigeeritud)" />
        <StepCheck title="Võlakontroll (ettevõte + esindajad)" state="done" note="Käibe väljavaated + laenumaksekoormus normivahemikus" />
        <StepCheck title="Limiidi arvutus" state="done" note="Eellimiit 15 000 € · täiendavad kontrollid: kvartaalne andmekontroll">
          <RuleTableDialog name="Loan Size (HR Policy Unique)" rows={LOAN_SIZE_TABLE} />
        </StepCheck>
        <StepCheck
          title="Otsus"
          state={aml?.state === 'confirmed' ? 'done' : 'attention'}
          note={
            aml?.state === 'confirmed'
              ? `ACCEPTED — ${eur(aml.proposed)} + EDD nõue · taotleja ${aml.requester}, kinnitaja ${aml.approver} (neli silma)`
              : aml?.state === 'four-eyes'
                ? `REFER — PEP tõttu limiit kuni 50% standardist → ${eur(aml?.proposed ?? 7500)}, esitatud nelja silma kinnitusele (taotleja ${aml.requester})`
                : 'REFER — PEP tõttu limiit kuni 50% standardist → 7 500 €, nõutav analüütiku ettepanek + nelja silma kinnitus'
          }
        />
        {aml?.state === 'proposal' && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => proposeAmlDecision(laane.id)}>Kinnita otsus: {eur(aml.proposed)} + EDD nõue</Button>
            <Button size="sm" variant="outline" onClick={() => proposeAmlDecision(laane.id)}>Suuna nelja silma kinnitusele</Button>
          </div>
        )}
        {aml?.state === 'four-eyes' && (
          <div className="border border-amber-300 bg-amber-50/60 rounded-lg p-3 space-y-2">
            <div className="text-sm font-medium flex items-center gap-2"><UserCheck className="h-4 w-4 text-amber-700" />Nelja silma kinnitus — AML-otsus {eur(aml.proposed)} + EDD nõue</div>
            <div className="text-xs text-muted-foreground">Taotleja: <b>{aml.requester}</b> — kinnitaja peab olema teine isik. Kehtiv limiit tekib alles kinnituse järel; kinnitamata otsusel limiiti ei ole.</div>
            <div className="flex items-center gap-2 flex-wrap">
              <select className="border rounded-md px-2 py-1.5 text-[13px] bg-white" value={amlApprover} onChange={(e) => { setAmlApprover(e.target.value); setAmlError(''); }}>
                <option value="">— vali 2. kinnitaja —</option>
                {BANK_USERS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 h-7 text-xs" onClick={submitAmlConfirm}>Kinnita AML-otsus (2. kinnitaja)</Button>
            </div>
            {amlError && <div className="text-xs text-red-700 font-medium">{amlError}</div>}
          </div>
        )}
        {aml?.state === 'confirmed' && (
          <div className="text-xs text-emerald-700 border border-emerald-300 bg-emerald-50/60 rounded-lg px-3 py-2">
            Otsus kinnitatud ja limiit {eur(aml.proposed)} kehtib · tingimus: {aml.conditions} · auditikirjed auditi jäljes.
          </div>
        )}
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" />Skreeningu nimekirjad</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            <div className="font-medium">Sanktsioonid</div>
            {SANCTIONS_LISTS.map((l) => <div key={l} className="text-muted-foreground flex items-center gap-1.5"><span className="text-emerald-600">✓</span>{l}</div>)}
            <div className="font-medium pt-1">PEP allikad</div>
            {PEP_SOURCES.map((l) => <div key={l} className="text-muted-foreground flex items-center gap-1.5"><span className="text-emerald-600">✓</span>{l}</div>)}
            <div className="text-[11px] text-muted-foreground pt-2 border-t">Iga nimekirja uuendus käivitab automaatse uuesti-skreenimise kõigile {MASS_PORTFOLIO_COUNT.toLocaleString('et-EE')}+ ostjale (EV-04).</div>
          </CardContent>
        </Card>
        <Waterfall compact />
      </div>
    </div>
  );
}

function RulesPage() {
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="text-sm text-muted-foreground">
        Reeglid on andmed, mitte kood — versioon RB-2026.09, efektiivsuse kuupäevaga, mitte retroaktiivne. Iga automaatne tegevus kirjutab auditi.
      </div>
      {EVENT_RULES.map((t) => (
        <Card key={t.name}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">{t.name}<RuleTableDialog name={t.name} rows={t.rows} /></CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-[13px]">
              <tbody>
                {t.rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1.5 pr-3 font-mono whitespace-nowrap">{r.when}</td>
                    <td className="py-1.5 pr-3"><StatusChip status={r.result as 'FREEZE' | 'REVIEW' | 'MONITOR'} /></td>
                    <td className="py-1.5 text-muted-foreground">{r.annotation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">AML-01 · Skreeningu kategooriad<RuleTableDialog name="AML-01 · Skreeningu kategooriad" rows={SCREENING_TABLE} /></CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-[13px]">
            <tbody>
              {SCREENING_TABLE.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1.5 pr-3">{r.when}</td>
                  <td className="py-1.5 pr-3 font-mono font-semibold">{r.result}{r.limitResult ? ` · ${r.limitResult}` : ''}</td>
                  <td className="py-1.5 text-muted-foreground">{r.annotation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">RK-01 · Regressi tagasiostu reeglid<RuleTableDialog name="RK-01 · Regressi tagasiost" rows={RECOURSE_RULES} /></CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-[13px]">
            <tbody>
              {RECOURSE_RULES.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1.5 pr-3 font-mono whitespace-nowrap">{r.when}</td>
                  <td className="py-1.5 pr-3 font-mono font-semibold whitespace-nowrap">{r.result}</td>
                  <td className="py-1.5 text-muted-foreground">{r.annotation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">ePOD · Tarnekinnituse tasemed (tõendusmaterjal)</CardTitle></CardHeader>
        <CardContent className="text-[13px] space-y-1.5">
          {EPOD_LEVELS.map((e) => (
            <div key={e.level} className="flex gap-3">
              <span className="font-mono font-semibold w-6 shrink-0">{e.level}</span>
              <span className="text-muted-foreground">{e.text}</span>
            </div>
          ))}
          <div className="text-[11px] text-muted-foreground pt-1.5 border-t">FAC-01: finantseerimise miinimumtase on E2 — E1-ga arve jääb ootele kuni tarnekinnitus lisandub.</div>
        </CardContent>
      </Card>
    </div>
  );
}

function MerchantOnboarding() {
  const app = MERCHANT_APP;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-3">
        <div className="text-sm text-muted-foreground">
          Müüja: <b className="text-foreground">{MERCHANT.name}</b> · reg {MERCHANT.reg} · taotlus <span className="font-mono">{app.nr}</span> · esitatud {app.submitted} · mudel <span className="font-mono">FacilityLimitDecisionModel</span>
        </div>
        <StepCheck title="Taotluse vastuvõtt ja andmete automaatne täitmine" state="done" note="Äriregister + EMTA käibeandmed + Coop'i kontoajalugu (arvelduste osakaal 82%) — taotlus kontrolliti ja täideti ilma inimsekkuvmuseta 2 minutiga" />
        <StepCheck title="Müüja KYC/AML ja UBO" state="done" note="UBO: Nerius Numa (Šveitsi resident, kontroll >50% hääleõiguse kaudu, alates 11.02.2026) — sanktsioonid (5 nimekirja) ja PEP puhas; esindusõigus kinnitatud (juhatuse liige L. Kandratavičius)" />
        <StepCheck title="Finantside ja portfelli analüüs" state="done" note="Käive 2024: 113,3 mln € (2023: 116,6 mln €) · nõuete kahanemise määr 2,0% · DSO 34 pv · debitoorne võlg kasvutrendis (demo portfell — näidisandmed)" />
        <StepCheck title="Faktooringulimiidi arvutus" state="done" note="FAC-01: kõik tingimused OK → eellimiit 3 600 000 € · finantseerimismäär 80% · regressiga portfelli osa">
          <RuleTableDialog name="FAC-01 · Faktooringulimiit" rows={FACILITY_RULES} />
        </StepCheck>
        <div className="text-[11px] text-muted-foreground px-1">Kahanemine = kreeditarved, tagastused ja allahindlused, mis vähendavad sissenõutavat nõuet.</div>
        <StepCheck title="Otsus" state="done" note="ACCEPTED 17.09 13:13 — Kadri Rehe (analüütik); nelja silma kinnitus: Margus Tamm 13:20" />
        <StepCheck title="Leping ja Smart-ID allkiri" state="done" note="Faktooringuleping + nõudeõiguse loovutuse avaldus allkirjastatud 17.09 14:02 — L. Kandratavičius (Smart-ID)" />

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Otsus reeglite järgi vs kinnitatud otsus — müüja limiit</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Parameeter</TableHead>
                  <TableHead className="text-xs">Reeglipõhine otsus</TableHead>
                  <TableHead className="text-xs">Kinnitatud otsus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-[13px]">Faktooringulimiit</TableCell>
                  <TableCell className="text-[13px] text-right tabular-nums whitespace-nowrap">{eur(3_600_000)}</TableCell>
                  <TableCell className="text-[13px] text-right tabular-nums whitespace-nowrap">{eur(3_600_000)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-[13px]">Finantseerimismäär</TableCell>
                  <TableCell className="text-[13px]">80%</TableCell>
                  <TableCell className="text-[13px]">80%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-[13px]">Regress</TableCell>
                  <TableCell className="text-[13px]">regressiga portfelli osa</TableCell>
                  <TableCell className="text-[13px]">regressiga portfelli osa</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-[13px]">Lepingutähtaeg</TableCell>
                  <TableCell className="text-[13px]">12 kuud</TableCell>
                  <TableCell className="text-[13px]">12 kuud</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-[13px]">Tulemus</TableCell>
                  <TableCell className="text-[13px]">ACCEPTED</TableCell>
                  <TableCell className="text-[13px]">ACCEPTED</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Taotlusel deklareeritud (Coop Panga vorm)</CardTitle></CardHeader>
          <CardContent className="text-[13px] space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Prognoos käive 12M</span><span className="font-medium">{eur(app.forecastTurnover)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Arveid kuus</span><span className="font-medium">{app.invoicesPerMonth}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ostjate arv</span><span className="font-medium">{app.buyerCount.toLocaleString('et-EE')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Keskmine maksetähtaeg</span><span className="font-medium">{app.avgPaymentTerm} pv</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Keskmine arve summa</span><span className="font-medium">{eur(app.avgInvoice)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Kreeditarved 12M</span><span className="font-medium">{eur(app.creditNotes12m)}</span></div>
            {app.debtorBalance.map((d) => (
              <div key={d.date} className="flex justify-between"><span className="text-muted-foreground">Debitoorne saldo {d.date}</span><span className="font-medium">{eur(d.saldo)}</span></div>
            ))}
            <div className="flex justify-between"><span className="text-muted-foreground">Taotletav limiit</span><span className="font-medium">{eur(app.requestedLimit)} · {app.requestedTerm}</span></div>
            <div className="border-t pt-1.5 mt-1.5 space-y-1">
              <div className="font-medium">Kehtivad kohustused</div>
              {app.obligations.map((o, i) => (
                <div key={i} className="flex justify-between"><span className="text-muted-foreground">{o.inst} · {o.type}</span><span>{eur(o.balance)}</span></div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tööaeg</CardTitle></CardHeader>
          <CardContent className="text-[13px] space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Esitatud</span><span>14.09 09:32</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Andmete kontroll</span><span>14.09 09:34 (automaatne)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Analüüsi päevad</span><span>15.–16.09 (2 panga päeva)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Otsus</span><span>17.09 13:13</span></div>
            <div className="flex justify-between font-medium"><span>Kokku</span><span>3 panga päeva</span></div>
          </CardContent>
        </Card>
        <Waterfall compact />
      </div>
    </div>
  );
}

function PricingPage() {
  const feeRows = SERVICE_FEE_RULES;
  const intRows = INTEREST_RULES;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Hinnakiri — faktooring</CardTitle>
            <div className="text-xs text-muted-foreground">Coop Panga avalik ärikliendi hinnakiri (faktooringu osa kehtiv alates 01.01.2022) · ² = näidislepingu eritingimus (tasuta automaatlimiidid, 4,55% määr) — ei ole ametlik hinnakiri</div>
          </CardHeader>
          <CardContent className="text-[13px] space-y-1.5">
            {PRICE_LIST.map((p) => (
              <div key={p.item} className="flex justify-between gap-3 border-b pb-1.5 last:border-0">
                <span className="text-muted-foreground">{p.item}</span>
                <span className="font-medium text-right">{p.price}</span>
              </div>
            ))}
            <div className="text-[11px] text-muted-foreground pt-1">* Käibemaks 24% lisandub tasudele (haldus-, lepingu- ja limiiditasud); intress on käibemaksuvaba (KMS § 16). Demos näidiselepingu 4,55% määr ja tasuta automaatlimiidid on eritingimused ², mitte avaliku hinnakirja sisu.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Hinnakonfiguratsiooni versioon</CardTitle></CardHeader>
          <CardContent className="text-[13px] space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Versioon</span><span className="font-mono">PR-2026.09</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Efektiivne alates</span><span>01.09.2026</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tagasiulatuvus</span><span>ei — rakendub vaid uutele tehingutele</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Muutja / kinnitaja</span><span>A. Tšekmazov / M. Tamm</span></div>
            <div className="text-[11px] text-muted-foreground pt-2 border-t">Hinnakirja muudatus käivitub reeglina kuu alguses; versioon seotakse iga finantseeritud arvega, et auditi jälg teab alati õiget hinda.</div>
          </CardContent>
        </Card>
      </div>
      <div className="xl:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">PR-01 · Arvete haldustasu — rakendub automaatselt ostja hinde kaudu<RuleTableDialog name="PR-01 · Arvete haldustasu" rows={feeRows} version="PR-2026.09" /></CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-[13px]">
              <tbody>
                {feeRows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1.5 pr-3 font-mono whitespace-nowrap">{r.when}</td>
                    <td className="py-1.5 pr-3 font-mono font-semibold">{r.result}</td>
                    <td className="py-1.5 text-muted-foreground">{r.annotation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">PR-02 · Intressimäär — kokkuleppe määr ja alampiir<RuleTableDialog name="PR-02 · Intressimäär" rows={intRows} version="PR-2026.09" /></CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-[13px]">
              <tbody>
                {intRows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1.5 pr-3">{r.when}</td>
                    <td className="py-1.5 pr-3 font-mono font-semibold whitespace-nowrap">{r.result}</td>
                    <td className="py-1.5 text-muted-foreground">{r.annotation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Näide: kuidas hind arvele rakendub — ARV-2026-04412 (GTC Constructions OÜ, hinne B)</CardTitle></CardHeader>
          <CardContent className="text-[13px] space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Arve summa · periood</span><span className="font-medium">8 400 € · 29 päeva (väljamakse 18.09 → tähtaeg 17.10.2026)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Garantiijääk (retention 20%)</span><span>1 680 € — ei finantseerita</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Finantseeritud osa</span><span className="font-medium">6 720 € (80%)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Haldustasu (PR-01, hinne B)</span><span>8 400 € × 0,25% = <b>21,00 €</b></span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Kokkuleppe määr (PR-02)</span><span>max(2,15% + 2,10%; 4,90%) − 0,35% = 4,55%</span></div>
            <div className="text-[11px] text-muted-foreground -mt-1">Regressisoodustus rakendub alampiira järel; intressi kantakse vaid finantseeritud osalt.</div>
            <div className="flex justify-between"><span className="text-muted-foreground">Intress (finantseeritud osalt, tegelikud päevad)</span><span>6 720 € × 4,55% × 29/360 = <b>24,63 €</b></span></div>
            <div className="flex justify-between font-medium pt-1 border-t"><span>Tasumisele kuuluv kokku (ilma km-ta)</span><span>45,63 €</span></div>
            <div className="text-[11px] text-muted-foreground pt-1">Arvutus toimub igal arvel automaatselt otsusteguris tegelike päevade järgi; kreeditarvel tasu arvestatakse tagasi samade reeglitega.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">A–D hindemudeli kriteeriumid</CardTitle></CardHeader>
          <CardContent className="text-[13px] space-y-1.5">
            {GRADE_CRITERIA.map((g) => (
              <div key={g.grade} className="flex gap-3">
                <span className="font-mono font-semibold w-5 shrink-0">{g.grade}</span>
                <span className="text-muted-foreground">{g.text}</span>
              </div>
            ))}
            <div className="text-[11px] text-muted-foreground pt-1.5 border-t">Scorecardi kalibreerimine on dokumenteeritud panga mudelivalideerimise dokumendis, mitte demos.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AuditLog() {
  const { audit, resetDemo } = useStore();
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-sm">Auditi jälg — iga sündmus, iga reegel, iga kinnitaja</CardTitle>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={resetDemo}>Uus sessioon — lähtesta demoseis</Button>
        </div>
      </CardHeader>
      <CardContent className="text-xs space-y-2 max-h-[70vh] overflow-y-auto">
        <div className="text-[11px] text-muted-foreground border-b pb-1.5">Uued kirjed saavad päris kellaaja sündmuse toimumise hetkel. Demo: kogu demoseis (arved, pakkumised, ostjate staatused, saldod ja audit) säilitatakse ühiselt brauseri localStorage'is — värskendus taastab järjepideva seisu. «Uus sessioon» lähtestab kõik koos ja märgib selle auditis.</div>
        {audit.map((a) => (
          <div key={a.id} className="flex gap-3 border-b pb-1.5 last:border-0">
            <span className="text-muted-foreground w-14 shrink-0 tabular-nums">{a.time}</span>
            <span className="font-medium w-44 shrink-0 truncate">{a.actor}</span>
            <span>{a.text}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const CLAIM_STEPS = [
  { n: 1, icon: FilePlus2, title: 'Arve sünnib ERP-s', desc: 'Merit, Directo või ERPLY — sünkroon platvormi iga 15 minuti tagant' },
  { n: 2, icon: MoonStar, title: 'Nõue registreeritakse', desc: 'Öine sulgemine 23:59 EET — versioon ja content-hash (demos näidis)' },
  { n: 3, icon: ShieldCheck, title: 'Sobivuskontroll', desc: 'Tähtaeg ≤ 90 pv · ei vaidlusta · ei seotud osapool · tõend ≥ E2 · ostja limiit aktiivne' },
  { n: 4, icon: Banknote, title: 'Finantseerimine', desc: '80% nõudest — näidis 6 720 € arvelt 8 400 € (PR-01 / PR-02)' },
  { n: 5, icon: CreditCard, title: 'Ostja maksab', desc: 'Ostjapõhine vIBAN, saaja "Bauhof Group AS" — varjatud faktooring' },
  { n: 6, icon: ArrowLeftRight, title: 'Laekumine sobitatakse', desc: 'camt.054 — vIBAN määrab ostja; RF-viide/arvetunnus määrab nõude; summa ja jääk määravad täieliku/osalise tasumise' },
  { n: 7, icon: Scale, title: 'Tasakaalustus', desc: 'Garantiijääk 20% vabastatakse, intress ja haldustasu maha — nõue suletakse' },
];

const CLAIM_TIMELINE = [
  { time: '17.09.2026 15:20', title: 'Faktooringuleping jõustus — ostjate limiidid avatud', detail: 'Leping + Smart-ID allkiri 17.09 14:02 → limiidid aktiivsed 15:20' },
  { time: '17.09.2026 16:40', title: 'Arve väljastatud ERP-s', detail: 'ARV-2026-04412 · 8 400 € · ostja GTC Constructions OÜ · tähtaeg 17.10.2026' },
  { time: '17.09.2026 16:55', title: 'Sünkroon platvormi', detail: 'Tõenduse tase E3 — ostja vastuvõtukinnitus konkreetse tarne kohta (RECADV)' },
  { time: '17.09.2026 23:59', title: 'Öine sulgemine', detail: 'Sobivuskontroll läbitud · ostja limiit 30 000 €, kasutus enne 13 800 €' },
  { time: '18.09.2026 09:02', title: 'Väljamakse müüjale 6 720 € (80%)', detail: 'Haldustasu 21,00 € (PR-01, hinne B)' },
  { time: '17.10.2026 (tähtaeg — oodatav)', title: 'Laekumine 8 400 € vIBAN-ile EE91 4200 0100 1238 1145', detail: 'camt.054 kontoväljavõte — vIBAN määrab ostja, RF-viide nõude (näidisstsenaarium)', scenario: true },
  { time: '17.10.2026 (oodatav)', title: 'Tasakaalustus', detail: 'Garantiijääk 1 680 € vabastatud · intress 24,63 € (6 720 € × 4,55% × 29/360, tegelikud päevad 18.09→17.10) · müüjale kokku 8 354,37 € (8 400 − 21,00 haldustasu − 24,63 intress) · panga tulu kokku 45,63 € (näidisstsenaarium)', scenario: true },
  { time: '17.10.2026 (oodatav)', title: 'Nõue suletud', detail: 'Auditi jälg uuendatud (näidisstsenaarium)', scenario: true },
];

type LedgerRow = {
  date: string; viban: string; buyer: string; amount: string; sum: number; invoice: string;
  method: string; methodSub?: string;
  status: 'matched' | 'partial' | 'exception'; statusSub?: string;
};

const LEDGER: LedgerRow[] = [
  { date: '19.09.2026 10:12', viban: 'EE91 4200 0100 1238 1145', buyer: 'GTC Constructions OÜ', amount: '12 300 €', sum: 12300, invoice: 'ARV-2026-04398', method: 'automaatne vIBAN + RF', status: 'matched' },
  { date: '02.10.2026 09:15', viban: 'EE64 4200 0100 1552 9087', buyer: 'Nordica Ehitus OÜ', amount: '21 400 €', sum: 21400, invoice: 'ARV-2026-04401', method: 'automaatne vIBAN + RF', status: 'matched' },
  { date: '10.10.2026 14:02', viban: 'EE07 4200 0100 1887 3412', buyer: 'Kalju Betoon OÜ', amount: '9 500 €', sum: 9500, invoice: 'ARV-2026-04425 (9 600 €)', method: 'RF-viide', methodSub: 'summa ei ühti 1:1 — sobitatud RF-viitega', status: 'partial', statusSub: 'Osaline — 100 € jääk avatud' },
  { date: '14.10.2026 10:31', viban: 'EE05 4200 0100 1440 1263', buyer: 'Saare Puithooned OÜ', amount: '7 740 €', sum: 7740, invoice: 'ARV-2026-04431 (12 900 €)', method: 'automaatne vIBAN', status: 'partial', statusSub: '60% sobitatud, 5 160 € jääk avatud' },
  { date: '16.10.2026 08:55', viban: 'EE59 4200 0000 0055 0001 (master)', buyer: 'Tundmatu maksja', amount: '1 250 €', sum: 1250, invoice: '—', method: 'käsitsi', status: 'exception', statusSub: 'Erand — ootab raamatupidajat' },
];

function ClaimsPage() {
  return (
    <div className="space-y-6">
      {/* A — nõude elutsükkel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Nõude elutsükkel — arvest sulgemiseni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-stretch gap-2">
            {CLAIM_STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <div className="border rounded-lg p-3 w-56 bg-card">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0">{s.n}</span>
                    <s.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                  <div className="font-medium text-[13px] mt-2">{s.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                </div>
                {i < CLAIM_STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* B — näidisnõude ajajoon */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Näidisnõue ajajoon — ARV-2026-04412</CardTitle>
          <div className="text-xs text-muted-foreground">Demo arvestuskuupäev {DEMO_AS_OF}: arve on avatud ja ootab laekumist (ostja portaalis «maksmata»). Tähtaja-järgsed sammud on märgitud näidisstsenaariumina.</div>
        </CardHeader>
        <CardContent>
          <div className="relative pl-7 space-y-5 before:content-[''] before:absolute before:left-[7px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-border">
            {CLAIM_TIMELINE.map((t, i) => (
              <div key={i} className="relative">
                <span className={`absolute -left-7 top-1 h-3.5 w-3.5 rounded-full border-2 border-background ${t.scenario ? 'bg-muted-foreground/40' : i === CLAIM_TIMELINE.length - 1 ? 'bg-primary' : 'bg-success'}`} />
                <div className="text-xs text-muted-foreground tabular-nums">{t.time}</div>
                <div className="text-[13px] font-medium flex items-center gap-2 flex-wrap">
                  {t.title}
                  {t.scenario && <Badge variant="outline" className="text-[10px] uppercase tracking-wide">näidisstsenaarium</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{t.detail}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* C — laekumiste register */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Laekumiste register — camt.054 sobitused</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Kuupäev</TableHead>
                  <TableHead>vIBAN</TableHead>
                  <TableHead>Ostja</TableHead>
                  <TableHead className="text-right">Summa</TableHead>
                  <TableHead>Sobitatud arve</TableHead>
                  <TableHead>Meetod</TableHead>
                  <TableHead>Staatus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LEDGER.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="tabular-nums whitespace-nowrap">{r.date}</TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{r.viban}</TableCell>
                    <TableCell>{r.buyer}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{r.amount}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.invoice}</TableCell>
                    <TableCell>
                      {r.method}
                      {r.methodSub && <div className="text-[11px] text-muted-foreground">{r.methodSub}</div>}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={r.status} />
                      {r.statusSub && <div className="text-[11px] text-muted-foreground mt-0.5">{r.statusSub}</div>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div className="border rounded-lg p-3">
              <div className="font-semibold text-[13px] mb-1">Sobituse ahel</div>
              <div className="text-xs text-muted-foreground">vIBAN → ostja · RF-viide/arvetunnus → nõue · summa ja jääk → täielik/osaline tasumine · mitmetähenduslik makse → jaotamise erandijärjekord. «Sobitatud» üksi ei tähenda arve täielikku tasumist — osalise jääk jääb avatuks.</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="font-semibold text-[13px] mb-1">Osamaksed ja kogumaksed</div>
              <div className="text-xs text-muted-foreground">Üks laekumine võib katta mitu arvet — jaotus kinnitatakse müüja raamatupidaja poolt.</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type Integration = {
  name: string; purpose: string; direction: 'Sisse' | 'Välja' | 'Kahesuunaline' | 'Sisemine';
  protocol: string; status: 'connected' | 'required' | 'planned'; owner: string;
};

const INTEGRATION_GROUPS: { title: string; items: Integration[] }[] = [
  {
    title: 'Kontod ja maksed',
    items: [
      { name: 'Põhipanga kontohaldus (core banking)', purpose: 'vIBAN-ide haldus ostjate kaupa; kogumiskonto EE59 4200 0000 0055 0001', direction: 'Kahesuunaline', protocol: 'API/REST', status: 'connected', owner: 'Maksete osakond' },
      { name: 'SEPA maksed', purpose: 'Väljamaksed müüjale (pain.001) ja laekumiste teated (camt.054)', direction: 'Kahesuunaline', protocol: 'ISO 20022 · pain.001 / camt.054', status: 'connected', owner: 'Maksete osakond' },
      { name: 'Konto väljavõtted', purpose: 'camt.053 päeva lõpu väljavõte öiseks sulgemiseks (23:59 EET)', direction: 'Sisse', protocol: 'ISO 20022 · camt.053', status: 'connected', owner: 'Maksete osakond' },
    ],
  },
  {
    title: 'Välised andmeallikad',
    items: [
      { name: 'Äriregister (avaandmed)', purpose: 'Ostjate ja müüja registriandmed, juhatused, osanikud', direction: 'Sisse', protocol: 'API/REST', status: 'connected', owner: 'KYC/AML tiim' },
      { name: 'EMTA', purpose: 'Maksuvõlad ja käibed — EV-01 käibe YoY reegli sisend', direction: 'Sisse', protocol: 'API', status: 'connected', owner: 'Krediidiriski tiim' },
      { name: 'Krediidiregister (CreditInfo)', purpose: 'Maksehäired ja ostjate hinnete sisendid', direction: 'Sisse', protocol: 'API', status: 'connected', owner: 'Krediidiriski tiim' },
      { name: 'Sanktsioonide ja PEP nimekirjad', purpose: 'EL / ÜRO / OFAC + PEP-allikad, päevane uuendus (EV-04, hägusvaste lävi 0,92)', direction: 'Sisse', protocol: 'fail / API', status: 'connected', owner: 'KYC/AML tiim' },
      { name: 'E-arve operaator (Telema)', purpose: 'Arve edastuse tehnilised kinnitused (ei ole kaubatõend); ePOD E3 = ostja vastuvõtukinnitus (RECADV) eraldi sündmusena', direction: 'Sisse', protocol: 'e-arve standard', status: 'required', owner: 'Integratsioonitiim' },
    ],
  },
  {
    title: 'Kliendi pool',
    items: [
      { name: 'Müüja raamatupidamistarkvara konnektorid', purpose: 'Merit Aktiva / Directo / ERPLY Books — arved ja ostjaregister sisse', direction: 'Sisse', protocol: 'API · sünkroon iga 15 min', status: 'connected', owner: 'Kliendi vastuvõtt' },
      { name: 'Ostja portaal (Bauhofi kliendiportaal)', purpose: 'Maksetingimused, arved ja konnektorite seis ostjale', direction: 'Kahesuunaline', protocol: 'veeb / API', status: 'connected', owner: 'Toote tiim' },
    ],
  },
  {
    title: 'Aruandlus ja compliance',
    items: [
      { name: 'Finantsinspektsiooni / Eesti Panga aruandlus', purpose: 'Faktooringulimiidi ja portfelli statistika', direction: 'Välja', protocol: 'statistilised aruanded', status: 'required', owner: 'Regulatiivne aruandlus' },
      { name: 'AML aruandlus (Rahapesu Andmebüroo)', purpose: 'Kahtlaste tehingute teated — teate koostamine, vastutava isiku (MLRO) kinnitus, saatmine ja vastuvõtukinnitus; kanal ajakohastatakse RAB-i juhendi järgi', direction: 'Välja', protocol: 'RABIS / veebivorm / XML üle X-tee', status: 'required', owner: 'Compliance / MLRO' },
      { name: 'Auditi WORM-hoidla', purpose: 'Muutmatu auditi jälg — demos localStorage, päris süsteemis WORM', direction: 'Välja', protocol: 'logi eksport', status: 'required', owner: 'IT / Infoturve' },
      { name: 'GDPR/DPIA register', purpose: 'Andmetöötluse dokumendid ja nõusolekud', direction: 'Sisemine', protocol: 'sisemine register', status: 'planned', owner: 'Andmekaitse (DPO)' },
    ],
  },
  {
    title: 'Identiteet ja allkirjad',
    items: [
      { name: 'Smart-ID / Mobiil-ID', purpose: 'Lepingu allkirjad ja nelja silma kinnitused', direction: 'Sisse', protocol: 'RP API', status: 'connected', owner: 'IT / KYC' },
      { name: 'Ajatempliteenus (TSA)', purpose: 'Nõuete ja lepingute ajatembeldamine', direction: 'Sisse', protocol: 'RFC 3161', status: 'planned', owner: 'IT' },
    ],
  },
  {
    title: 'Sisemised süsteemid',
    items: [
      { name: 'Põhiraamat (GL)', purpose: 'Tasude ja intressi kanded (PR-01 / PR-02)', direction: 'Välja', protocol: 'API/REST', status: 'connected', owner: 'Finantsosakond' },
      { name: 'Andmeait / BI', purpose: 'Portfelli ja reeglite analüütika', direction: 'Välja', protocol: 'öine eksport', status: 'planned', owner: 'Riskianalüütika' },
      { name: 'Teavitusteenus', purpose: 'E-post / SMS müüja ja ostja teadetele', direction: 'Välja', protocol: 'API (e-post / SMS)', status: 'connected', owner: 'IT' },
    ],
  },
];

const DIRECTION_CLS: Record<Integration['direction'], string> = {
  Sisse: 'border-info/30 bg-info/10 text-info',
  Välja: 'border-border bg-muted text-muted-foreground',
  Kahesuunaline: 'border-primary/30 bg-primary/5 text-primary',
  Sisemine: 'border-border bg-muted text-muted-foreground',
};

function IntegrationsPage() {
  const all = INTEGRATION_GROUPS.flatMap((g) => g.items);
  const connected = all.filter((i) => i.status === 'connected').length;
  const required = all.filter((i) => i.status === 'required').length;
  const inbound = all.filter((i) => i.direction === 'Sisse' || i.direction === 'Kahesuunaline').length;
  const outbound = all.filter((i) => i.direction === 'Välja' || i.direction === 'Kahesuunaline').length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Integratsioone kokku" value={all.length} hint="6 kategoorias — kontod, andmed, klient, aruandlus, identiteet, sisemised" />
        <StatCard label="Aktiivsed demos" value={connected} tone="success" hint="Asendatud näidisandmetega — päris ühendused lepitakse teenusetasemega" />
        <StatCard label="Vajalik enne tootmisse minekut" value={required} tone="warning" hint="Seotud külgriba plokiga «Enne tootmisse»" />
        <StatCard label="Andmevood" value={`${inbound} sisse · ${outbound} välja`} hint="Kahesuunalised ühendused arvestatud mõlemas suunas" />
      </div>

      {INTEGRATION_GROUPS.map((g) => (
        <Card key={g.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {g.title}
              <Badge variant="outline" className="text-[11px]">{g.items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {g.items.map((i) => (
              <div key={i.name} className="border rounded-lg p-3 flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[13px]">{i.name}</span>
                    <Badge variant="outline" className={DIRECTION_CLS[i.direction] + ' rounded-md border px-1.5 py-0 text-[11px] font-medium hover:bg-transparent'}>{i.direction}</Badge>
                    <code className="text-[11px] font-mono bg-muted rounded px-1.5 py-0.5">{i.protocol}</code>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{i.purpose}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">Vastutaja: {i.owner}</div>
                </div>
                <StatusChip status={i.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tootmisse mineku eelduseks</CardTitle></CardHeader>
        <CardContent className="text-[13px] space-y-1.5">
          <div>Staatuses «Vajalik enne tootmist» olevad integratsioonid on seotud tootmisse mineku kontrollidega — vt külgriba plokk <b>«Enne tootmisse»</b> (pandiregistri päring reg-koodi kaupa, tarnekinnituse tasemed ePOD, krediidikindlustuse liini sidumine, Smart-ID allkirjastamine).</div>
          <div className="text-muted-foreground">Demos on kõik integratsioonid asendatud näidisandmetega — näiteks laekumised camt.054 ja auditi jälg localStorage'is. Päris süsteemis on igal ühendusel lepitud teenusetase ja nimetatud vastutaja.</div>
        </CardContent>
      </Card>
    </div>
  );
}

export function BankHome({ section, onNavigate }: { section: string; onNavigate: (id: string) => void }) {
  const showClaims = () => onNavigate('claims');
  switch (section) {
    case 'portfolio':
      return <Portfolio onShowClaims={showClaims} />;
    case 'claims':
      return <ClaimsPage />;
    case 'merchant':
      return <MerchantOnboarding />;
    case 'aml':
      return <AmlOnboarding />;
    case 'rules':
      return <RulesPage />;
    case 'pricing':
      return <PricingPage />;
    case 'audit':
      return <AuditLog />;
    case 'demo':
      return <DemoTools onShowClaims={showClaims} />;
    case 'settings':
      return <IntegrationsPage />;
    case 'dashboard':
    default:
      return <Dashboard />;
  }
}
