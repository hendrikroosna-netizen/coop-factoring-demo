import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type SetStateAction } from 'react';
import { BASE, BUYERS, INVOICES, PAYMENT_TERMS } from './data';
import { applyInvoicePayment, applyPaymentAllocation, canOfferInvoice, canSubmitCreditDraft, cents, decisionContextFingerprint, euros, invoiceFinancedOutstanding, invoiceOutstanding, invoicePaidPrincipal, migrateInvoice, seedDemoPayments } from './finance';
import type { AiDraft, DemoPayment, EvidenceReview, PaymentAllocation, AuditLine, BankRole, Buyer, EventAction, EventType, Invoice, MerchantRole, Persona, PlatformEvent, SanctionCase, TermOffer } from './types';

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
  aiDrafts: Record<string, AiDraft>;
  saveAiDraft: (buyerId: string, text: string, kind: AiDraft['kind'], submit: boolean, reviewedContext?: string) => string | null;
  evidenceReviews: Record<string, EvidenceReview>;
  attachDemoEvidence: (invoiceId: string) => string | null;
  submitEvidenceReview: (invoiceId: string) => string | null;
  confirmEvidenceReview: (invoiceId: string, reviewer: string) => string | null;
  demoPayments: DemoPayment[];
  confirmPaymentAllocation: (paymentId: string, allocations: PaymentAllocation[], reviewer: string) => string | null;
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

const STATE_KEY = 'coop-factoring-demo-state-v3';
const LEGACY_STATE_KEY = 'coop-factoring-demo-state-v2';
const STATE_VERSION = 3;

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
  aiDrafts: Record<string, AiDraft>;
  evidenceReviews: Record<string, EvidenceReview>;
  demoPayments: DemoPayment[];
}

function seedState(): DemoState {
  return {
    version: STATE_VERSION,
    buyers: BUYERS.map((b) => ({ ...b })),
    invoices: INVOICES.map(migrateInvoice),
    events: [...SEED_EVENTS],
    offers: [],
    audit: [...SEED_AUDIT],
    sanctionCases: {},
    unfreezeRequests: {},
    aiDrafts: {},
    evidenceReviews: {},
    demoPayments: seedDemoPayments(),
  };
}

// R13: kogu demoseis persistitakse ühiselt — värskendus taastab arved, pakkumised,
// ostjate staatused, saldod ja auditi kooskõlalisena (või lähtestatakse kõik koos).
function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(STATE_KEY) ?? localStorage.getItem(LEGACY_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed && (parsed.version === STATE_VERSION || parsed.version === 2) && Array.isArray(parsed.buyers) && Array.isArray(parsed.invoices) && Array.isArray(parsed.audit)) {
        return {
          ...parsed,
          version: STATE_VERSION,
          invoices: parsed.invoices.map(migrateInvoice),
          aiDrafts: parsed.aiDrafts ?? {},
          evidenceReviews: parsed.evidenceReviews ?? {},
          demoPayments: Array.isArray(parsed.demoPayments) ? parsed.demoPayments : seedDemoPayments(),
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

  const [state, setReactState] = useState<DemoState>(loadState);
  const stateRef = useRef(state);
  // Synchronous transaction reference lets consecutive clicks validate the newest
  // state before React renders, including idempotent receipt confirmation.
  const setState = (action: SetStateAction<DemoState>) => {
    const next = typeof action === 'function' ? action(stateRef.current) : action;
    stateRef.current = next;
    setReactState(next);
  };
  const { buyers, invoices, events, offers, audit, sanctionCases, unfreezeRequests, aiDrafts, evidenceReviews, demoPayments } = state;

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
    const current = stateRef.current;
    const b = current.buyers.find((x) => x.id === buyerId);
    if (!b || b.status !== 'frozen') return false;
    // R01: sanktsioonivaste lahendamise otsus + tõend peab olemas olema enne taastamist
    if (current.sanctionCases[buyerId]?.state === 'open') return false;
    const requester = current.unfreezeRequests[buyerId];
    if (!requester || !approver.trim() || approver.trim() === requester.trim()) return false;
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
    const current = stateRef.current;
    const b = current.buyers.find((x) => x.id === buyerId);
    if (!b || b.status !== 'pending' || b.amlDecision?.state !== 'proposal' || current.sanctionCases[buyerId]?.state === 'open') return;
    setState((s) => ({
      ...s,
      buyers: s.buyers.map((x) =>
        x.id === buyerId ? { ...x, amlDecision: { ...x.amlDecision!, state: 'four-eyes', requester: 'Kadri Rehe' } } : x
      ),
    }));
    log('Kadri Rehe (analüütik)', `${b.name}: AML-otsus ${fmt(b.amlDecision.proposed)} + EDD nõue esitatud nelja silma kinnitusele — kehtiv limiit tekib alles kinnituse järel.`);
  };

  const confirmAmlDecision: Store['confirmAmlDecision'] = (buyerId, approver) => {
    const current = stateRef.current;
    const b = current.buyers.find((x) => x.id === buyerId);
    if (!b || b.status !== 'pending' || b.relationFlag || b.amlDecision?.state !== 'four-eyes' || current.sanctionCases[buyerId]?.state === 'open') return false;
    const requester = b.amlDecision.requester ?? 'Kadri Rehe';
    if (!approver.trim() || approver.trim() === requester.trim()) return false;
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

  const appendAudit = (s: DemoState, actor: string, text: string): DemoState => ({
    ...s, audit: [{ id: uid(), time: nowTime(), actor, text }, ...s.audit].slice(0, 60),
  });

  const saveAiDraft: Store['saveAiDraft'] = (buyerId, text, kind, submit, reviewedContext) => {
    const current = stateRef.current;
    if (persona !== 'bank') return 'Otsustusabi märkmeid saab salvestada panga vaates.';
    const buyer = current.buyers.find((b) => b.id === buyerId);
    if (!buyer) return 'Ostjat ei leitud.';
    if (!text.trim()) return 'Lisage memo tekst.';
    const contextFingerprint = decisionContextFingerprint(buyer, current.sanctionCases[buyerId], current.events);
    if (reviewedContext !== undefined && reviewedContext !== contextFingerprint) return 'Ostja andmed on muutunud. Koosta värske mustand ja vaata see enne salvestamist või esitamist üle.';
    if (submit && kind === 'credit' && !canSubmitCreditDraft(current.buyers.find((b) => b.id === buyerId), current.sanctionCases[buyerId], current.events)) return 'Ostjal on pooleliolev riskikontroll. Salvestage mustand või esitage lisainfo päring; krediidimemo esitamine ootab piirangute lahendamist.';
    const draft: AiDraft = { text: text.trim(), kind, status: submit ? 'submitted' : 'draft', updatedAt: new Date().toISOString(), contextFingerprint };
    setState(appendAudit({ ...current, aiDrafts: { ...current.aiDrafts, [buyerId]: draft } }, 'Kadri Rehe (analüütik)', `AI näidismemo ${submit ? 'esitatud läbivaatuseks' : 'salvestatud mustandina'}: ${current.buyers.find((b) => b.id === buyerId)!.name}. Liik: ${kind === 'credit' ? 'krediidimemo' : 'lisainfo päring'}. Krediidiotsust, limiiti ega piiranguid ei muudetud.`));
    return null;
  };

  const attachDemoEvidence: Store['attachDemoEvidence'] = (invoiceId) => {
    const current = stateRef.current;
    const invoice = current.invoices.find((i) => i.id === invoiceId);
    if (persona !== 'merchant') return 'Tarnekinnituse saab lisada müüja vaates.';
    if (!invoice || invoice.status === 'paid' || invoice.evidence !== 'E1') return 'Näidistõendi saab lisada ainult tasumata E1 arvele.';
    if (current.evidenceReviews[invoiceId]) return null;
    const review: EvidenceReview = { state: 'attached', documentName: `Saateleht-${invoice.nr}-DEMO.pdf` };
    setState(appendAudit({ ...current, evidenceReviews: { ...current.evidenceReviews, [invoiceId]: review } }, 'Müüja raamatupidaja', `${invoice.nr}: lisatud sünteetiline demo-saateleht kontrollimiseks. E1 tase ja finantseerimise seis ei muutunud.`));
    return null;
  };

  const submitEvidenceReview: Store['submitEvidenceReview'] = (invoiceId) => {
    const current = stateRef.current;
    const invoice = current.invoices.find((i) => i.id === invoiceId);
    const review = current.evidenceReviews[invoiceId];
    if (persona !== 'merchant') return 'Tõendi saab kontrolli esitada müüja vaates.';
    if (!invoice || invoice.status === 'paid' || invoice.evidence !== 'E1') return 'Arve seis muutus; tõendit ei saa enam kontrolli esitada.';
    if (!review) return 'Lisage esmalt näidistõend.';
    if (review.state !== 'attached') return null;
    setState(appendAudit({ ...current, evidenceReviews: { ...current.evidenceReviews, [invoiceId]: { ...review, state: 'submitted' } } }, 'Müüja raamatupidaja', `${invoice.nr}: näidistõend esitatud panga kontrolli. AI võrdlus on soovitus; E1 muutub E2-ks alles inimese kinnitusega.`));
    return null;
  };

  const confirmEvidenceReview: Store['confirmEvidenceReview'] = (invoiceId, reviewer) => {
    const current = stateRef.current;
    const invoice = current.invoices.find((i) => i.id === invoiceId);
    const review = current.evidenceReviews[invoiceId];
    if (persona !== 'bank') return 'Tarnekinnituse kinnitab panga töötaja.';
    if (!reviewer.trim()) return 'Lisage kontrollija nimi.';
    if (review?.state === 'confirmed') return null;
    if (!invoice || invoice.status === 'paid' || invoice.evidence !== 'E1' || review?.state !== 'submitted') return 'Arve või tõendi seis muutus; kontrolli ei saa kinnitada.';
    const buyer = current.buyers.find((b) => b.id === invoice.buyerId);
    if (!buyer || buyer.status !== 'active' || buyer.relationFlag || current.sanctionCases[buyer.id]?.state === 'open') return 'Ostjal on piirang või pooleliolev riskikontroll. Tõend jääb kontrolli ootele.';
    setState(appendAudit({ ...current,
      invoices: current.invoices.map((i) => i.id === invoiceId ? { ...i, evidence: 'E2' } : i),
      evidenceReviews: { ...current.evidenceReviews, [invoiceId]: { ...review, state: 'confirmed', reviewer: reviewer.trim() } },
    }, reviewer.trim(), `${invoice.nr}: demo-saatelehe arvenumber, summa ja tarne kinnitatud; tõend E1 → E2. Arve jääb avatuks; väljamakset ega limiidimuudatust ei tehtud.`));
    return null;
  };

  const confirmPaymentAllocation: Store['confirmPaymentAllocation'] = (paymentId, allocations, reviewer) => {
    if (persona !== 'bank') return 'Laekumise jaotuse kinnitab panga raamatupidaja.';
    const applied = applyPaymentAllocation(stateRef.current, paymentId, allocations, reviewer);
    if (applied.error || applied.alreadyApplied) return applied.error;
    const detail = allocations.map((a) => `${applied.state.invoices.find((i) => i.id === a.invoiceId)!.nr}: ${fmt2(a.amount)}`).join('; ');
    setState(appendAudit(applied.state, reviewer.trim(), `AI näidislaekumise ${paymentId} jaotus kinnitatud inimese poolt: ${detail}. Nõuete põhiosa vähenes ${fmt2(applied.principalDelta)}, finantseeritud põhiosa ${fmt2(applied.financedDelta)}, tasutud pikendustasu ${fmt2(applied.feeDelta)}. Osaline jääk jääb avatuks.`));
    return null;
  };

  // R02/R05: full settlement uses precisely the same cumulative calculation as
  // partial allocation, so paying the remainder cannot release funding twice.
  const payInvoice: Store['payInvoice'] = (invoiceId) => {
    const current = stateRef.current;
    const invoice = current.invoices.find((i) => i.id === invoiceId);
    if (!invoice || invoice.status === 'paid' || invoiceOutstanding(invoice) <= 0) return;
    const amount = invoiceOutstanding(invoice);
    const applied = applyInvoicePayment(invoice, amount);
    const next: DemoState = {
      ...current,
      invoices: current.invoices.map((i) => i.id === invoiceId ? applied.invoice : i),
      buyers: current.buyers.map((b) => b.id === invoice.buyerId ? { ...b,
        openAr: euros(Math.max(0, cents(b.openAr) - cents(applied.principalDelta))),
        utilized: euros(Math.max(0, cents(b.utilized) - cents(applied.financedDelta))),
      } : b),
      offers: current.offers.map((o) => o.invoiceId === invoiceId && o.status === 'offered' ? { ...o, status: 'void' } : o),
    };
    setState(appendAudit(next, 'Süsteem', `camt.054 ${nowTime()}: ${invoice.nr} — laekus jääk ${fmt2(amount)}. Nõue suletud; põhiosa vähenes ${fmt2(applied.principalDelta)}, finantseeritud põhiosa ${fmt2(applied.financedDelta)}, tasutud pikendustasu ${fmt2(applied.feeDelta)} müüjale. Varasemaid osalaekumisi ei arvestatud teist korda.`));
  };

  // Kuupäeva nihutamine 'DD.MM.YYYY' kujul (maksetähtaja pikendus)
  const addDays = (d: string, days: number) => {
    const [dd, mm, yyyy] = d.split('.').map(Number);
    const dt = new Date(yyyy, mm - 1, dd + days);
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
  };

  const makeOffer: Store['makeOffer'] = (invoiceId, days) => {
    const current = stateRef.current;
    const inv = current.invoices.find((i) => i.id === invoiceId);
    if (!inv) return 'Arvet ei leitud.';
    // R06: kehtiva seisundi kontroll pakkumise loomisel
    if (inv.status === 'paid') return 'Arve on tasutud — pakkumist ei saa teha.';
    const b = current.buyers.find((x) => x.id === inv.buyerId);
    if (!canOfferInvoice(inv, b, current.sanctionCases[inv.buyerId])) return 'Pakkumiseks on vaja aktiivset piiranguteta ostjat, E2/E3 tõendit ja osamakseteta tasumata arvet.';
    if (current.offers.some((o) => o.invoiceId === invoiceId && (o.status === 'offered' || o.status === 'accepted'))) return 'Sellel arvel on juba aktiivne pakkumine.';
    const term = PAYMENT_TERMS.find((t) => t.days === days);
    if (!term) return 'Tundmatu maksetähtaeg.';
    const fee = euros(Math.round(cents(inv.amount) * term.feePct / 100));
    patch({ offers: [{ id: 'offer-' + uid(), invoiceId, days, feePct: term.feePct, fee, status: 'offered', createdBy: 'Marten Kask (Laagri kauplus)' }, ...current.offers] });
    log('Marten Kask (ärikliendihaldur)', `Maksa-hiljem pakkumine: ${inv.nr} (${fmt(inv.amount)}) → ${days} pv, lisatasu ${fmt2(fee)} (${term.feePct.toLocaleString('et-EE')}% arve summast) — saadetud ostja kliendiportaali. Tasumisel kuulub kokku ${fmt2(inv.amount + fee)} (põhisumma + lisatasu).`);
    return null;
  };

  const respondOffer: Store['respondOffer'] = (offerId, accept) => {
    const current = stateRef.current;
    const o = current.offers.find((x) => x.id === offerId);
    if (!o || o.status !== 'offered') return;
    const inv = current.invoices.find((i) => i.id === o.invoiceId);
    if (!inv) return;
    const b = current.buyers.find((x) => x.id === inv.buyerId);
    if (accept) {
      // R06: kehtiva seisundi kontroll ka aktsepteerimisel
      if (!canOfferInvoice(inv, b, current.sanctionCases[inv.buyerId])) {
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
    .reduce((s, i) => s + invoiceFinancedOutstanding(i), 0);
  const ineligibleTotal = BASE.ineligible.reduce((s, i) => s + i.amount, 0);
  const reservesTotal = BASE.reserves.reduce((s, r) => s + r.amount, 0);
  // R02: tasutud nõue kaob ka bruto-AR-st; väljamakstud finantseering väheneb vaid
  // tegeliku finantseeritud põhiosa võrra (finantseerimata arve ei vabasta midagi)
  const paidTotal = euros(invoices.reduce((s, i) => s + cents(invoicePaidPrincipal(i)), 0));
  const paidFinanced = euros(invoices.reduce((s, i) => s + cents(i.paidFinancedPart ?? 0), 0));
  const grossAr = BASE.grossAr - paidTotal;
  const fundsEmployed = BASE.fundsEmployed - paidFinanced;
  const netEligible = grossAr - ineligibleTotal - frozenOpenAr;
  const advance = netEligible * BASE.blendedRate;
  const grossAvailability = Math.min(BASE.facilityLimit, advance) - reservesTotal;
  const availableNow = grossAvailability - fundsEmployed;

  const value: Store = {
    persona, setPersona, bankRole, setBankRole, merchantRole, setMerchantRole, offers, makeOffer, respondOffer, buyers, invoices, events, audit, sanctionCases,
    triggerEvent, requestUnfreeze, confirmUnfreeze, unfreezeRequests, startReview, resolveReview, resolveSanctionCase, proposeAmlDecision, confirmAmlDecision, payInvoice, resetDemo,
    aiDrafts, saveAiDraft, evidenceReviews, attachDemoEvidence, submitEvidenceReview, confirmEvidenceReview, demoPayments, confirmPaymentAllocation,
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
