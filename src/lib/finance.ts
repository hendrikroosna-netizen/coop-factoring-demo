import type { Buyer, DemoPayment, Invoice, PaymentAllocation, PlatformEvent, SanctionCase, TermOffer } from './types';

export const cents = (amount: number): number => Math.round(amount * 100);
export const euros = (amount: number): number => amount / 100;
const nonnegative = (amount: number) => Math.max(0, cents(amount));

export function invoicePaidPrincipal(invoice: Invoice): number {
  return invoice.paidPrincipal ?? (invoice.status === 'paid' ? invoice.amount : 0);
}

export function invoicePrincipalOutstanding(invoice: Invoice): number {
  return euros(Math.max(0, cents(invoice.amount) - cents(invoicePaidPrincipal(invoice))));
}

export function invoiceOutstanding(invoice: Invoice): number {
  const feePaid = invoice.paidExtensionFee ?? (invoice.status === 'paid' ? invoice.extensionFee ?? 0 : 0);
  return euros(cents(invoicePrincipalOutstanding(invoice)) + Math.max(0, cents(invoice.extensionFee ?? 0) - cents(feePaid)));
}

export function invoiceOriginalFinanced(invoice: Invoice): number {
  return invoice.originalFinancedPart ?? (invoice.status === 'financed' ? invoice.amount - invoice.retention : invoice.status === 'paid' ? invoice.paidFinancedPart ?? 0 : 0);
}

export function invoiceFinancedOutstanding(invoice: Invoice): number {
  return euros(Math.max(0, cents(invoiceOriginalFinanced(invoice)) - cents(invoice.paidFinancedPart ?? 0)));
}

export function canOfferInvoice(invoice: Invoice, buyer: Buyer | undefined, sanctionCase?: SanctionCase): boolean {
  return !!buyer && buyer.status === 'active' && buyer.limit > 0 && !buyer.relationFlag && sanctionCase?.state !== 'open'
    && (!buyer.pep || buyer.amlDecision?.state === 'confirmed')
    && invoice.status !== 'paid' && invoice.evidence !== 'E1' && invoicePrincipalOutstanding(invoice) > 0
    && invoicePaidPrincipal(invoice) === 0 && (invoice.paidExtensionFee ?? 0) === 0;
}

/** Only an informational memo may be submitted while a material control is open. */
export function canSubmitCreditDraft(buyer: Buyer | undefined, sanctionCase: SanctionCase | undefined, events: PlatformEvent[]): boolean {
  return !!buyer && buyer.status === 'active' && buyer.limit > 0 && !buyer.relationFlag && sanctionCase?.state !== 'open'
    && (!buyer.pep || buyer.amlDecision?.state === 'confirmed')
    && !events.some((event) => event.buyerId === buyer.id && event.state !== 'resolved' && event.action !== 'MONITOR');
}

/** Persist the context used to prepare a memo, rather than assigning today's
 * context when an old memo is opened. Unrelated buyers do not invalidate it. */
export function decisionContextFingerprint(buyer: Buyer, sanction: SanctionCase | undefined, events: PlatformEvent[]): string {
  return JSON.stringify({ buyer, sanction, events: events.filter((event) => event.buyerId === buyer.id && event.state !== 'resolved') });
}

/** Demo allocation policy: principal first, then extension fee. Principal receipts
 * release financed principal proportionally; the rest is the merchant's reserve.
 * Cumulative rounding guarantees that the last cent releases the exact balance. */
export function applyInvoicePayment(invoice: Invoice, amount: number): { invoice: Invoice; principalDelta: number; financedDelta: number; feeDelta: number } {
  const payment = cents(amount);
  if (!Number.isFinite(amount) || payment <= 0 || Math.abs(amount * 100 - payment) > 0.000001 || payment > cents(invoiceOutstanding(invoice))) {
    throw new Error('Laekumise summa peab olema positiivne, sendi täpsusega ja mitte suurem arve jäägist.');
  }
  const principalDelta = Math.min(payment, cents(invoicePrincipalOutstanding(invoice)));
  const newPrincipal = cents(invoicePaidPrincipal(invoice)) + principalDelta;
  const originalFinanced = nonnegative(invoiceOriginalFinanced(invoice));
  const newFinanced = cents(invoice.amount) > 0 ? Math.min(originalFinanced, Math.round(newPrincipal * originalFinanced / cents(invoice.amount))) : 0;
  const financedDelta = Math.max(0, newFinanced - cents(invoice.paidFinancedPart ?? 0));
  const feeDelta = payment - principalDelta;
  const next: Invoice = {
    ...invoice,
    originalFinancedPart: euros(originalFinanced),
    paidPrincipal: euros(newPrincipal),
    paidFinancedPart: euros(newFinanced),
    paidExtensionFee: euros(cents(invoice.paidExtensionFee ?? 0) + feeDelta),
  };
  if (invoiceOutstanding(next) === 0) next.status = 'paid';
  return { invoice: next, principalDelta: euros(principalDelta), financedDelta: euros(financedDelta), feeDelta: euros(feeDelta) };
}

export interface FinancialState {
  invoices: Invoice[];
  buyers: Buyer[];
  offers: TermOffer[];
  demoPayments: DemoPayment[];
}

export interface PaymentResult<T extends FinancialState> {
  state: T;
  error: string | null;
  alreadyApplied: boolean;
  principalDelta: number;
  financedDelta: number;
  feeDelta: number;
}

/** Pure transaction: validation succeeds for every allocation before anything changes. */
export function applyPaymentAllocation<T extends FinancialState>(state: T, paymentId: string, allocations: PaymentAllocation[], reviewer: string): PaymentResult<T> {
  const fail = (error: string): PaymentResult<T> => ({ state, error, alreadyApplied: false, principalDelta: 0, financedDelta: 0, feeDelta: 0 });
  const payment = state.demoPayments.find((p) => p.id === paymentId);
  if (!payment) return fail('Laekumist ei leitud.');
  if (payment.status === 'allocated') return { state, error: null, alreadyApplied: true, principalDelta: 0, financedDelta: 0, feeDelta: 0 };
  if (!reviewer.trim()) return fail('Valige jaotuse kinnitaja.');
  if (allocations.length === 0) return fail('Lisage vähemalt üks arve.');
  if (new Set(allocations.map((a) => a.invoiceId)).size !== allocations.length) return fail('Sama arve võib jaotuses esineda ainult üks kord.');
  let total = 0;
  for (const allocation of allocations) {
    if (!Number.isFinite(allocation.amount) || allocation.amount <= 0 || Math.abs(allocation.amount * 100 - cents(allocation.amount)) > 0.000001) return fail('Jaotuse summa peab olema positiivne ja sendi täpsusega.');
    const invoice = state.invoices.find((i) => i.id === allocation.invoiceId);
    if (!invoice || !payment.allowedInvoiceIds.includes(invoice.id) || invoice.buyerId !== payment.buyerId) return fail('Valitud arve ei kuulu selle näidislaekumise ostjale ega ulatusse.');
    if (invoice.status === 'paid' || cents(allocation.amount) > cents(invoiceOutstanding(invoice))) return fail('Arve on juba tasutud või jaotus ületab arve jääki. Värskendage ettepanekut.');
    total += cents(allocation.amount);
  }
  if (total !== cents(payment.amount)) return fail('Jaotuse summa peab võrduma laekumise kogusummaga.');
  let principalDelta = 0;
  let financedDelta = 0;
  let feeDelta = 0;
  const changedInvoices = new Map<string, Invoice>();
  for (const allocation of allocations) {
    const applied = applyInvoicePayment(state.invoices.find((i) => i.id === allocation.invoiceId)!, allocation.amount);
    principalDelta += cents(applied.principalDelta);
    financedDelta += cents(applied.financedDelta);
    feeDelta += cents(applied.feeDelta);
    changedInvoices.set(allocation.invoiceId, applied.invoice);
  }
  const next: T = {
    ...state,
    invoices: state.invoices.map((i) => changedInvoices.get(i.id) ?? i),
    buyers: state.buyers.map((b) => b.id === payment.buyerId ? { ...b, openAr: euros(Math.max(0, cents(b.openAr) - principalDelta)), utilized: euros(Math.max(0, cents(b.utilized) - financedDelta)) } : b),
    // A receipt changes the offer's original amount/basis; accepted fees remain on the invoice.
    offers: state.offers.map((o) => changedInvoices.has(o.invoiceId) && o.status === 'offered' ? { ...o, status: 'void' as const } : o),
    demoPayments: state.demoPayments.map((p) => p.id === paymentId ? { ...p, status: 'allocated' as const, allocations: allocations.map((a) => ({ ...a, amount: euros(cents(a.amount)) })), confirmedBy: reviewer.trim() } : p),
  };
  return { state: next, error: null, alreadyApplied: false, principalDelta: euros(principalDelta), financedDelta: euros(financedDelta), feeDelta: euros(feeDelta) };
}

export function seedDemoPayments(): DemoPayment[] {
  return [{ id: 'ai-gtc-10000', buyerId: 'gtc', amount: 10000, reference: 'Näidislaekumine: GTC koondmakse, puudulik RF-viide', status: 'unallocated', allocations: [], allowedInvoiceIds: ['inv1', 'inv2'] }];
}

/** Version 2 stored fully paid invoices without separate principal/fee fields. */
export function migrateInvoice(invoice: Invoice): Invoice {
  return {
    ...invoice,
    originalFinancedPart: invoiceOriginalFinanced(invoice),
    paidPrincipal: invoicePaidPrincipal(invoice),
    paidExtensionFee: invoice.paidExtensionFee ?? (invoice.status === 'paid' ? invoice.extensionFee ?? 0 : 0),
    paidFinancedPart: invoice.paidFinancedPart ?? 0,
  };
}
