import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BASE, BUYERS, INVOICES, PAYMENT_TERMS } from './data';
import type { AuditLine, BankRole, Buyer, EventAction, EventType, Invoice, MerchantRole, Persona, PlatformEvent, SanctionCase, TermOffer } from './types';

interface Store {
  persona: Persona;
  setPersona: (p: Persona) => void;
  bankRole: BankRole;
  setBankRole: (r: BankRole) => void;
  merchantRole: MerchantRole;
  setMerchantRole: (r: MerchantRole) => void;
  offers: TermOffer[];
  /** Tagastab veatekste või null (õnnestus) — R06: seisundikontroll loomisel */
  makeOffer: (invoiceId: string, days: 45 | 60) => string | null;
  respondOffer: (offerId: string, accept: boolean) => void;
  buyers: Buyer[];
  invoices: Invoice[];
  events: PlatformEvent[];
  audit: AuditLine[];
  sanctionCases: Record<string, SanctionCase>;
  triggerEvent: (type: EventType, buyerId: string, variant: 'severe' | 'mild') => void;
  requestUnfreeze: (buyerId: string) => void;
  confirmUnfreeze: (buyerId: string, approver: string) => boolean;
  unfreezeRequests: Record<string, string>;
  startReview: (buyerId: string) => void;
  resolveReview: (buyerId: string) => void;
  /** R01: sanktsioonivaste lahendamine — otsus + tõend + otsustaja, enne limiidi taastamist */
  resolveSanctionCase: (buyerId: string, decision: string, evidence: string, decider: string) => boolean;
  /** R08: AML-otsuse esitamine nelja silma kinnitusele */
  proposeAmlDecision: (buyerId: string) => void;
  /** R08: AML-otsuse nelja silma kinnitus (2. kinnitaja ≠ taotleja) */
  confirmAmlDecision: (buyerId: string, approver: string) => boolean;
  payInvoice: (invoiceId: string) => void;
  /** R13: kogu demoseis (koos auditiga) lähtestatakse ja märgitakse uus sessioon */
  resetDemo: () => void;
  base: {
    grossAr: number;
    ineligibleTotal: number;
    netEligible: number;
    advance: number;
    reservesTotal: number;
    grossAvailability: number;
    fundsEmployed: number;
    availableNow: number;
    frozenOpenAr: number;
    frozenFinanced: number;
  };
}

const Ctx = createContext<Store | null>(null);

const fmt = (n: number) => Math.round(n).toLocaleString('et-EE') + ' €';
const fmt2 = (n: number) => n.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

// Unikaalne ID — ei sõltu mooduli-skoopis loendurist (StrictMode topelt-render ohutu)
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));

// Päris kellaaeg sündmuse toimumise hetkel (HH:MM)
const nowTime = () => new Date().toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit' });

const STATE_KEY = 'coop-factoring-demo-state-v2';
const STATE_VERSION = 2;

// Seemne-kirjed säilitavad oma usutavad fikseeritud ajad.
// R13: Pärnu Torutööd erandotsus (KÄSITSI-01) on auditis aja, otsustaja, kinnitaja ja alusega.
const SEED_AUDIT: AuditLine[] = [
  { id: 'a1', time: '06:00', actor: 'Süsteem', text: 'Öine sulgemine 23:59 EET — borrowing_base_snapshot #182 loodud, content-hash: päris süsteemis kinnitatud (demos näidis), reeglite versioon RB-2026.09' },
  { id: 'a2', time: '09:14', actor: 'Süsteem', text: 'EV-03: Viru Raudteed OÜ osaluse muutus → läbivaatus; nõuded 0 €, finantseerimisbaasi mõju puudub' },
  { id: 'a3', time: '15.09 10:41', actor: 'Kadri Rehe (analüütik)', text: 'KÄSITSI-01: Pärnu Torutööd OÜ — reeglitulemus REFER (maksehäire ≤ 12 kk), reeglimiit 0 € → käsitsi otsus 9 000 €. Alus: 8 a pikkune makseajalugu ilma viimase 12 kk häireteta + omaniku käendus 9 000 € (tagatis registreeritud). Erand on auditi jäljes.' },
  { id: 'a4', time: '15.09 11:05', actor: 'Margus Tamm (2. kinnitaja)', text: 'KÄSITSI-01 nelja silma kinnitus — Pärnu Torutööd OÜ limiit 0 € → 9 000 € kinnitatud (taotleja Kadri Rehe; tagatise alus: omaniku käendus).' },
];

const SEED_EVENTS: PlatformEvent[] = [
  {
    id: 'ev-seed-1', time: '09:14', buyerId: 'viru', type: 'ownership_change', severity: 'MEDIUM',
    detail: 'Äriregister: osaluse muutus 30% → juhatuse liikme lähisugulane (seotud osapoole kahtlus)',
    action: 'REVIEW', state: 'auto-applied', ruleId: 'EV-03',
  },
];

interface DemoState {
  version: number;
  buyers: Buyer[];
  invoices: Invoice[];
  events: PlatformEvent[];
  offers: TermOffer[];
  audit: AuditLine[];
  sanctionCases: Record<string, SanctionCase>;
  unfreezeRequests: Record<string, string>;
}

function seedState(): DemoState {
  return {
    version: STATE_VERSION,
    buyers: BUYERS.map((b) => ({ ...b })),
    invoices: INVOICES.map((i) => ({ ...i })),
    events: [...SEED_EVENTS],
    offers: [],
    audit: [...SEED_AUDIT],
    sanctionCases: {},
    unfreezeRequests: {},
  };
}

// R13: kogu demoseis persistitakse ühiselt — värskendus taastab arved, pakkumised,
// ostjate staatused, saldod ja auditi kooskõlalisena (või lähtestatakse kõik koos).
function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed && parsed.version === STATE_VERSION && Array.isArray(parsed.buyers) && Array.isArray(parsed.invoices) && Array.isArray(parsed.audit)) {
        return {
          ...parsed,
          offers: Array.isArray(parsed.offers) ? parsed.offers : [],
          events: Array.isArray(parsed.events) ? parsed.events : [],
          sanctionCases: parsed.sanctionCases ?? {},
          unfreezeRequests: parsed.unfreezeRequests ?? {},
        };
      }
    }
  } catch {
    /* demo: localStorage võib olla kättesaamatu */
  }
  return seedState();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState<Persona>('bank');
  // Panga alamroll (krediidianalüütik / CFO / CRO / kliendihaldur) — persistib localStorage'is
  const [bankRole, setBankRole] = useState<BankRole>(() => {
    try {
      const v = localStorage.getItem('coop-demo-bank-role');
      if (v === 'analyst' || v === 'cfo' || v === 'cro' || v === 'rm') return v;
    } catch {
      /* demo: localStorage võib olla kättesaamatu */
    }
    return 'analyst';
  });
  useEffect(() => {
    try {
      localStorage.setItem('coop-demo-bank-role', bankRole);
    } catch {
      /* demo: salvestus ebaõnnestus ei ole kriitiline */
    }
  }, [bankRole]);
  // Müüja (Bauhof) alamroll: CFO täisvaade / ärikliendihaldur piiratud vaade
  const [merchantRole, setMerchantRole] = useState<MerchantRole>(() => {
    try {
      const v = localStorage.getItem('coop-demo-merchant-role');
      if (v === 'cfo' || v === 'manager') return v;
    } catch {
      /* demo: localStorage võib olla kättesaamatu */
    }
    return 'cfo';
  });
  useEffect(() => {
    try {
      localStorage.setItem('coop-demo-merchant-role', merchantRole);
    } catch {
      /* demo: salvestus ebaõnnestus ei ole kriitiline */
    }
  }, [merchantRole]);

  const [state, setState] = useState<DemoState>(loadState);
  const { buyers, invoices, events, offers, audit, sanctionCases, unfreezeRequests } = state;

  // Demo: kogu seis säilitatakse brauseri localStorage'is — värskendus taastab järjepideva seisu
  useEffect(() => {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({ ...state, audit: state.audit.slice(0, 60) }));
    } catch {
      /* demo: salvestus ebaõnnestus ei ole kriitiline */
    }
  }, [state]);

  const patch = (p: Partial<DemoState>) => setState((s) => ({ ...s, ...p }));

  const log = (actor: string, text: string) => {
    const t = nowTime();
    setState((s) => ({ ...s, audit: [{ id: uid(), time: t, actor, text }, ...s.audit].slice(0, 60) }));
  };

  const pushEvent = (e: PlatformEvent) => setState((s) => ({ ...s, events: [e, ...s.events].slice(0, 30) }));

  // R01: piirangu põhjus on eraldi olekus (sanctionCases) — leebem sündmus ei tohi
  // avatud sanktsioonijuhtumit üle kirjutada ega peatamist lõpetada.
  const applyAction = (buyerId: string, action: EventAction, ruleId: string, detail: string) => {
    const b = state.buyers.find((x) => x.id === buyerId);
    if (!b) return;
    const sanctionOpen = state.sanctionCases[buyerId]?.state === 'open';
    if (action === 'FREEZE') {
      patch({ buyers: state.buyers.map((x) => (x.id === buyerId ? { ...x, status: 'frozen' } : x)) });
      log('Süsteem', `${ruleId}: ${b.name} limiit ${fmt(b.limit)} PEATATUD automaatselt. ${detail} Ostja nõuded ${fmt(b.openAr)} eemaldati faktooringu baasist. Juba finantseeritud arvete intress peatub; tagasiostu ei käivitata (RK-01).`);
    } else if (action === 'REVIEW') {
      if (sanctionOpen) {
        // Avatud sanktsioonijuhtum on rangem piirang — ostja jääb peatatuks
        log('Süsteem', `${ruleId}: ${b.name} läbivaatus registreeritud. ${detail} Ostja jääb PEATATUKS — avatud sanktsioonijuhtum (EV-04) nõuab eraldi lahendamist; teine sündmus seda ei tühistata.`);
      } else {
        patch({ buyers: state.buyers.map((x) => (x.id === buyerId ? { ...x, status: 'review' } : x)) });
        log('Süsteem', `${ruleId}: ${b.name} läbivaatusse. ${detail} Uute nõuete finantseerimine peatatud kuni otsuseni.`);
      }
    } else {
      log('Süsteem', `${ruleId}: ${b.name} — ${detail} (monitor).`);
    }
  };

  const triggerEvent: Store['triggerEvent'] = (type, buyerId, variant) => {
    const b = state.buyers.find((x) => x.id === buyerId);
    if (!b) return;
    const t = nowTime();
    const id = 'ev-' + uid();
    if (type === 'emta_drop') {
      const severe = variant === 'severe';
      const e: PlatformEvent = {
        id, time: t, buyerId, type, severity: severe ? 'HIGH' : 'MEDIUM',
        detail: `EMTA signaal: kvartalikäibe langus ${severe ? '−42%' : '−22%'} võrreldes sama kvartaliga eelmisel aastal — hooajakorrigeeritud (${b.name})`,
        action: severe ? 'FREEZE' : 'REVIEW', state: 'auto-applied', ruleId: 'EV-01',
      };
      pushEvent(e);
      applyAction(buyerId, e.action, 'EV-01', severe ? 'Langus > 35% YoY (hooajakorrigeeritud).' : 'Langus 15–35% YoY (hooajakorrigeeritud).');
    } else if (type === 'board_change') {
      pushEvent({ id, time: t, buyerId, type, severity: 'MEDIUM', detail: `Äriregister: juhatuse liikme vahetus — uus liige registreeritud (${b.name})`, action: 'REVIEW', state: 'auto-applied', ruleId: 'EV-02' });
      applyAction(buyerId, 'REVIEW', 'EV-02', 'Uue liikme KYC/PEP/võlgade kontroll vajalik.');
    } else if (type === 'ownership_change') {
      pushEvent({ id, time: t, buyerId, type, severity: 'HIGH', detail: `Äriregister: osaluse muutus ≥ 50% — uus omanik registreeritud (${b.name})`, action: 'FREEZE', state: 'auto-applied', ruleId: 'EV-03' });
      applyAction(buyerId, 'FREEZE', 'EV-03', 'UBO ja sanktsioonide uus skreening kohustuslik.');
    } else {
      pushEvent({ id, time: t, buyerId, type, severity: 'HIGH', detail: `Sanktsioonide nimekirja uuendus: hägusvaste 0,93 UBO nimega EL konsolideeritud nimekirjas (${b.name})`, action: 'FREEZE', state: 'auto-applied', ruleId: 'EV-04' });
      applyAction(buyerId, 'FREEZE', 'EV-04', 'Tehingud keelatud kuni AML selguseni; alarm saadetud vastavusmeeskonnale.');
      // R01: avatakse eraldi sanktsioonijuhtum — seda saab sulgeda ainult vaste lahendamise otsusega
      setState((s) => s.sanctionCases[buyerId]?.state === 'open'
        ? s
        : { ...s, sanctionCases: { ...s.sanctionCases, [buyerId]: { buyerId, score: 0.93, openedAt: t, state: 'open' } } });
    }
  };

  const resolveSanctionCase: Store['resolveSanctionCase'] = (buyerId, decision, evidence, decider) => {
    const b = state.buyers.find((x) => x.id === buyerId);
    const c = state.sanctionCases[buyerId];
    if (!b || !c || c.state !== 'open' || !decision.trim() || !evidence.trim() || !decider.trim()) return false;
    const t = nowTime();
    setState((s) => ({
      ...s,
      sanctionCases: { ...s.sanctionCases, [buyerId]: { ...c, state: 'cleared', decision, evidence, decider, clearedAt: t } },
      events: s.events.map((e) => (e.buyerId === buyerId && e.ruleId === 'EV-04' && e.state !== 'resolved' ? { ...e, state: 'resolved' } : e)),
    }));
    log(`${decider} (AML)`, `${b.name}: sanktsioonivaste LAHENDATUD — otsus: ${decision}. Tõend: ${evidence}. Limiidi taastamine nõuab eraldi taotlust ja nelja silma kinnitust.`);
    return true;
  };

  const requestUnfreeze = (buyerId: string) => {
    const b = state.buyers.find((x) => x.id === buyerId);
    if (!b) return;
    // R01: avatud sanktsioonijuhtumi korral taotlust ei saa esitada
    if (state.sanctionCases[buyerId]?.state === 'open') return;
    const sc = state.sanctionCases[buyerId];
    const screenNote = sc?.state === 'cleared'
      ? `skreening: vaste lahendatud ${sc.clearedAt} (${sc.decider}: ${sc.decision})`
      : 'skreening: vasteid ei tuvastatud';
    patch({ unfreezeRequests: { ...state.unfreezeRequests, [buyerId]: 'Kadri Rehe' } });
    pushEvent({ id: 'ev-' + uid(), time: nowTime(), buyerId, type: 'sanctions_update', severity: 'MEDIUM', detail: `Limiidi peatamise lõpetamise taotlus esitatud (${b.name}) — ootab nelja silma kinnitust`, action: 'REVIEW', state: 'pending-confirm', ruleId: 'OV-01' });
    log('Kadri Rehe (analüütik)', `${b.name}: limiidi peatamise lõpetamise taotlus — põhjus: riskihindamine taastatud, ${screenNote}. Ootab teist kinnitajat.`);
  };

  const confirmUnfreeze = (buyerId: string, approver: string): boolean => {
    const b = state.buyers.find((x) => x.id === buyerId);
    if (!b) return false;
    // R01: sanktsioonivaste lahendamise otsus + tõend peab olemas olema enne taastamist
    if (state.sanctionCases[buyerId]?.state === 'open') return false;
    const requester = state.unfreezeRequests[buyerId] ?? 'Kadri Rehe';
    if (!approver || approver === requester) return false;
    setState((s) => ({
      ...s,
      buyers: s.buyers.map((x) => (x.id === buyerId ? { ...x, status: 'active' } : x)),
      events: s.events.map((e) => (e.buyerId === buyerId && e.ruleId === 'OV-01' && e.state === 'pending-confirm' ? { ...e, state: 'resolved' } : e)),
      unfreezeRequests: (() => { const n = { ...s.unfreezeRequests }; delete n[buyerId]; return n; })(),
    }));
    log(`${approver} (2. kinnitaja)`, `${b.name}: limiidi peatamine LÕPETATUD — nelja silma kontroll täidetud (taotleja: ${requester}, kinnitaja: ${approver}). Nõuded ${fmt(b.openAr)} naasevad baasi; kättesaadav suureneb.`);
    return true;
  };

  const startReview = (buyerId: string) => {
    const b = state.buyers.find((x) => x.id === buyerId);
    if (!b) return;
    log('Kadri Rehe (analüütik)', `${b.name}: läbivaatus avatud — koonduvad registriandmed, EMTA käive, võlad, skreeningu ajalugu.`);
  };

  const resolveReview = (buyerId: string) => {
    const b = state.buyers.find((x) => x.id === buyerId);
    if (!b) return;
    // R01: läbivaatuse sulgemine lahendab vaid läbivaatus-sündmused — EV-04 sanktsioonijuhtumit see ei sulge
    const sanctionOpen = state.sanctionCases[buyerId]?.state === 'open';
    setState((s) => ({
      ...s,
      buyers: s.buyers.map((x) =>
        x.id === buyerId ? { ...x, status: sanctionOpen ? 'frozen' : x.relationFlag ? 'review' : 'active' } : x
      ),
      events: s.events.map((e) =>
        e.buyerId === buyerId && e.state !== 'resolved' && e.action === 'REVIEW' && e.ruleId !== 'OV-01' ? { ...e, state: 'resolved' } : e
      ),
    }));
    log(
      'Süsteem',
      `${b.name}: läbivaatus SULETUD — otsus: ${
        sanctionOpen
          ? 'läbivaatus-sündmus lahendatud, kuid limiit jääb PEATATUKS — avatud sanktsioonijuhtum (EV-04) vajab eraldi lahendamist ja nelja silma kinnitust'
          : b.relationFlag
            ? 'jääb karantiini (seotud osapool)'
            : 'limiit taastatud'
      }.`
    );
  };

  const proposeAmlDecision: Store['proposeAmlDecision'] = (buyerId) => {
    const b = state.buyers.find((x) => x.id === buyerId);
    if (!b || b.amlDecision?.state !== 'proposal') return;
    setState((s) => ({
      ...s,
      buyers: s.buyers.map((x) =>
        x.id === buyerId ? { ...x, amlDecision: { ...x.amlDecision!, state: 'four-eyes', requester: 'Kadri Rehe' } } : x
      ),
    }));
    log('Kadri Rehe (analüütik)', `${b.name}: AML-otsus ${fmt(b.amlDecision.proposed)} + EDD nõue esitatud nelja silma kinnitusele — kehtiv limiit tekib alles kinnituse järel.`);
  };

  const confirmAmlDecision: Store['confirmAmlDecision'] = (buyerId, approver) => {
    const b = state.buyers.find((x) => x.id === buyerId);
    if (!b || b.amlDecision?.state !== 'four-eyes') return false;
    const requester = b.amlDecision.requester ?? 'Kadri Rehe';
    if (!approver || approver === requester) return false;
    setState((s) => ({
      ...s,
      buyers: s.buyers.map((x) =>
        x.id === buyerId
          ? { ...x, limit: b.amlDecision!.proposed, status: 'active', amlDecision: { ...b.amlDecision!, state: 'confirmed', approver, conditions: 'EDD: tugevdatud hoolsusmeetmed + kvartaalne andmekontroll' } }
          : x
      ),
    }));
    log(`${approver} (2. kinnitaja)`, `${b.name}: AML-otsus KINNITATUD — limiit ${fmt(b.amlDecision.proposed)} kehtiv (PEP → 50% näidisriskipoliitika; tingimus: EDD). Taotleja ${requester}, kinnitaja ${approver}.`);
    return true;
  };

  // R02/R05: laekumine muudab nõude jääki, tegelikku finantseeritud põhiosa, ostja kasutust
  // ja müüjale makstavat jääki — kõik ühest arvutusest. Aktsepteeritud lisatasu kuulub
  // tasumisele koos põhisummaga; tasu saaja on müüja (nõude osa), pank võtab intressi
  // pikendatud perioodilt. Finantseerimata (E1) arve ei vabasta finantseeringut.
  const payInvoice: Store['payInvoice'] = (invoiceId) => {
    const inv = state.invoices.find((i) => i.id === invoiceId);
    if (!inv || inv.status === 'paid') return;
    const b = state.buyers.find((x) => x.id === inv.buyerId);
    const financedPart = inv.status === 'financed' ? inv.amount - inv.retention : 0;
    const fee = inv.extensionFee ?? 0;
    const total = inv.amount + fee;
    const now = nowTime();
    setState((s) => ({
      ...s,
      invoices: s.invoices.map((i) => (i.id === invoiceId ? { ...i, status: 'paid', paidFinancedPart: financedPart } : i)),
      buyers: s.buyers.map((x) =>
        x.id === inv.buyerId
          ? { ...x, openAr: Math.max(0, x.openAr - inv.amount), utilized: Math.max(0, x.utilized - financedPart) }
          : x
      ),
      // R06: tasutud arve ootel pakkumised muutuvad kehtetuks
      offers: s.offers.map((o) => (o.invoiceId === invoiceId && o.status === 'offered' ? { ...o, status: 'void' } : o)),
    }));
    const feeNote = fee > 0 ? ` sh lisatasu ${fmt2(fee)} müüjale (aktsepteeritud maksepikendus — nõude osa);` : '';
    const finNote =
      financedPart > 0
        ? ` Finantseeritud põhiosa ${fmt(financedPart)} tasakaalustati; garantiijääk ${fmt(inv.retention)} vabanes müüjale (intress ja haldustasu maha arvatud).`
        : ' Arvet ei olnud finantseeritud (E1 ootele) — finantseeringut ei vabanenud ega tekkinud.';
    log('Süsteem', `camt.054 ${now}: ${inv.nr} — laekus ${fmt2(total)} ostjalt ${b?.name} vIBAN-ile.${feeNote} Nõue suletud; ostja avatud nõuded ja limiidi kasutus vähenesid.${finNote}`);
  };

  // Kuupäeva nihutamine 'DD.MM.YYYY' kujul (maksetähtaja pikendus)
  const addDays = (d: string, days: number) => {
    const [dd, mm, yyyy] = d.split('.').map(Number);
    const dt = new Date(yyyy, mm - 1, dd + days);
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
  };

  const makeOffer: Store['makeOffer'] = (invoiceId, days) => {
    const inv = state.invoices.find((i) => i.id === invoiceId);
    if (!inv) return 'Arvet ei leitud.';
    // R06: kehtiva seisundi kontroll pakkumise loomisel
    if (inv.status === 'paid') return 'Arve on tasutud — pakkumist ei saa teha.';
    const b = state.buyers.find((x) => x.id === inv.buyerId);
    if (b && (b.status === 'frozen' || b.status === 'rejected')) {
      return `Ostjal ${b.name} on riskipiirang (${b.status === 'frozen' ? 'limiit peatatud' : 'keelatud'}) — maksetähtaja pikendamise pakkumine on suunatud pädevale kinnitajale.`;
    }
    if (state.offers.some((o) => o.invoiceId === invoiceId && (o.status === 'offered' || o.status === 'accepted'))) return 'Sellel arvel on juba aktiivne pakkumine.';
    const term = PAYMENT_TERMS.find((t) => t.days === days);
    if (!term) return 'Tundmatu maksetähtaeg.';
    const fee = (inv.amount * term.feePct) / 100;
    patch({ offers: [{ id: 'offer-' + uid(), invoiceId, days, feePct: term.feePct, fee, status: 'offered', createdBy: 'Marten Kask (Laagri kauplus)' }, ...state.offers] });
    log('Marten Kask (ärikliendihaldur)', `Maksa-hiljem pakkumine: ${inv.nr} (${fmt(inv.amount)}) → ${days} pv, lisatasu ${fmt2(fee)} (${term.feePct.toLocaleString('et-EE')}% arve summast) — saadetud ostja kliendiportaali. Tasumisel kuulub kokku ${fmt2(inv.amount + fee)} (põhisumma + lisatasu).`);
    return null;
  };

  const respondOffer: Store['respondOffer'] = (offerId, accept) => {
    const o = state.offers.find((x) => x.id === offerId);
    if (!o || o.status !== 'offered') return;
    const inv = state.invoices.find((i) => i.id === o.invoiceId);
    if (!inv) return;
    const b = state.buyers.find((x) => x.id === inv.buyerId);
    if (accept) {
      // R06: kehtiva seisundi kontroll ka aktsepteerimisel
      if (inv.status === 'paid' || (b && (b.status === 'frozen' || b.status === 'rejected'))) {
        setState((s) => ({ ...s, offers: s.offers.map((x) => (x.id === offerId ? { ...x, status: 'void' } : x)) }));
        log('Süsteem', `Maksepikenduse pakkumine ${inv.nr} muutus KEHTETUKS — ${inv.status === 'paid' ? 'arve on juba tasutud' : `ostjal on riskipiirang (${b?.name})`}. Pakkumine suunatud pädevale kinnitajale.`);
        return;
      }
      setState((s) => ({
        ...s,
        offers: s.offers.map((x) => (x.id === offerId ? { ...x, status: 'accepted' } : x)),
        // R05: lisatasu kantakse arvele — tasumisele kuulub põhisumma + tasu
        invoices: s.invoices.map((i) => (i.id === o.invoiceId ? { ...i, due: addDays(i.due, o.days - 30), extensionFee: o.fee } : i)),
      }));
      log('GTC Constructions (ostja)', `Maksepikenduse pakkumine AKTSEPTEERITUD: ${inv.nr} → ${o.days} pv, lisatasu ${fmt2(o.fee)}. Uus tähtaeg kanti arvele; tasumisele kuulub kokku ${fmt2(inv.amount + o.fee)} (põhisumma + lisatasu müüjale). Pank võtab intressi pikendatud perioodilt.`);
    } else {
      setState((s) => ({ ...s, offers: s.offers.map((x) => (x.id === offerId ? { ...x, status: 'declined' } : x)) }));
      log('GTC Constructions (ostja)', `Maksepikenduse pakkumine KEELDETI: ${inv.nr} → ${o.days} pv, lisatasu ${fmt2(o.fee)}.`);
    }
  };

  const resetDemo: Store['resetDemo'] = () => {
    const fresh = seedState();
    fresh.audit = [{ id: uid(), time: nowTime(), actor: 'Süsteem', text: 'Uus sessioon — demoseis (arved, pakkumised, ostjate staatused, saldod ja audit) lähtestatud kooskõlaliselt algseisu.' }, ...SEED_AUDIT];
    setState(fresh);
  };

  const frozenOpenAr = buyers.filter((b) => b.status === 'frozen').reduce((s, b) => s + b.openAr, 0);
  // Peatatud ostjate juba finantseeritud osa — RK-01: intress peatub, tagasiostu ei käivitata
  const frozenIds = new Set(buyers.filter((b) => b.status === 'frozen').map((b) => b.id));
  const frozenFinanced = invoices
    .filter((i) => i.status === 'financed' && frozenIds.has(i.buyerId))
    .reduce((s, i) => s + (i.amount - i.retention), 0);
  const ineligibleTotal = BASE.ineligible.reduce((s, i) => s + i.amount, 0);
  const reservesTotal = BASE.reserves.reduce((s, r) => s + r.amount, 0);
  // R02: tasutud nõue kaob ka bruto-AR-st; väljamakstud finantseering väheneb vaid
  // tegeliku finantseeritud põhiosa võrra (finantseerimata arve ei vabasta midagi)
  const paidTotal = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const paidFinanced = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.paidFinancedPart ?? 0), 0);
  const grossAr = BASE.grossAr - paidTotal;
  const fundsEmployed = BASE.fundsEmployed - paidFinanced;
  const netEligible = grossAr - ineligibleTotal - frozenOpenAr;
  const advance = netEligible * BASE.blendedRate;
  const grossAvailability = Math.min(BASE.facilityLimit, advance) - reservesTotal;
  const availableNow = grossAvailability - fundsEmployed;

  const value: Store = {
    persona, setPersona, bankRole, setBankRole, merchantRole, setMerchantRole, offers, makeOffer, respondOffer, buyers, invoices, events, audit, sanctionCases,
    triggerEvent, requestUnfreeze, confirmUnfreeze, unfreezeRequests, startReview, resolveReview, resolveSanctionCase, proposeAmlDecision, confirmAmlDecision, payInvoice, resetDemo,
    base: { grossAr, ineligibleTotal, netEligible, advance, reservesTotal, grossAvailability, fundsEmployed, availableNow, frozenOpenAr, frozenFinanced },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('store missing');
  return s;
}

export const eur = (n: number) => Math.round(n).toLocaleString('et-EE').replace(/ /g, ' ') + ' €';
export const eur2 = (n: number) => n.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export function useMemoBuyer(id: string): Buyer | undefined {
  const { buyers } = useStore();
  return useMemo(() => buyers.find((b) => b.id === id), [buyers, id]);
}
