export type Persona = 'bank' | 'merchant' | 'buyer';

export type BankRole = 'analyst' | 'cfo' | 'cro' | 'rm';

export type MerchantRole = 'cfo' | 'manager';

export interface TermOffer {
  id: string;
  invoiceId: string;
  days: 45 | 60;
  feePct: number;
  fee: number;
  // 'void' — pakkumine muutus kehtetuks (arve tasutud / ostja riskipiirang enne aktsepteerimist)
  status: 'offered' | 'accepted' | 'declined' | 'void';
  createdBy: string;
}

export type BuyerStatus = 'active' | 'review' | 'frozen' | 'rejected' | 'pending';

export type Grade = 'A' | 'B' | 'C' | 'D';

export interface Buyer {
  id: string;
  reg: string;
  name: string;
  grade: Grade;
  limit: number;
  utilized: number;
  openAr: number;
  status: BuyerStatus;
  dpd: number;
  pep: boolean;
  pepNote?: string;
  sector: string;
  relationFlag?: string;
  override?: { rulesResult: string; rulesLimit: number; reason: string };
  // R08: AML-otsuse kolm seisundit — reegli soovitus / ootel nelja silma / kehtiv otsus
  amlDecision?: {
    proposed: number;
    state: 'proposal' | 'four-eyes' | 'confirmed';
    requester?: string;
    approver?: string;
    conditions?: string;
  };
}

// R01: sanktsioonivaste juhtum on eraldi olek — seda ei tohi teine sündmus üle kirjutada
export interface SanctionCase {
  buyerId: string;
  score: number;
  openedAt: string;
  state: 'open' | 'cleared';
  decision?: string;
  evidence?: string;
  decider?: string;
  clearedAt?: string;
}

export type EventType = 'emta_drop' | 'board_change' | 'ownership_change' | 'sanctions_update';
export type EventSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export type EventAction = 'FREEZE' | 'REVIEW' | 'MONITOR';
export type EventState = 'auto-applied' | 'pending-confirm' | 'resolved';

export interface PlatformEvent {
  id: string;
  time: string;
  buyerId: string;
  type: EventType;
  severity: EventSeverity;
  detail: string;
  action: EventAction;
  state: EventState;
  ruleId: string;
}

export type InvoiceStatus = 'financed' | 'open' | 'paid';

export interface Invoice {
  id: string;
  nr: string;
  buyerId: string;
  amount: number;
  issued: string;
  due: string;
  status: InvoiceStatus;
  viban: string;
  reference: string;
  retention: number;
  evidence: 'E3' | 'E2' | 'E1';
  // R05: aktsepteeritud maksepikenduse lisatasu (läheb müüjale nõude osana)
  extensionFee?: number;
  // R02: tasumise hetkel fikseeritud tegelik finantseeritud põhiosa (0 kui arvet ei finantseeritud)
  paidFinancedPart?: number;
}

export interface AuditLine {
  id: string;
  time: string;
  actor: string;
  text: string;
}

export interface RuleRow {
  when: string;
  input?: string;
  action: string;
  result: string;
  limitResult?: string;
  annotation: string;
  matched?: boolean;
}

export type ScreenResult = 'clear' | 'pep' | 'sanctions' | 'adverse' | 'highrisk' | 'related';

export interface OnboardingStep {
  id: string;
  title: string;
  state: 'done' | 'attention' | 'blocked' | 'waiting';
  note: string;
  detail?: string[];
  table?: { name: string; rows: RuleRow[] };
}
