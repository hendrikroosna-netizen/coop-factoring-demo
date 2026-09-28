import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE, BUYERS, INVOICES } from '../src/lib/data.ts';
import { applyInvoicePayment, applyPaymentAllocation, canOfferInvoice, canSubmitCreditDraft, cents, decisionContextFingerprint, invoiceFinancedOutstanding, invoiceOutstanding, invoicePaidPrincipal, invoicePrincipalOutstanding, migrateInvoice, seedDemoPayments } from '../src/lib/finance.ts';

function seed() {
  return { invoices: INVOICES.map(migrateInvoice), buyers: BUYERS.map((b) => ({ ...b })), offers: [], demoPayments: seedDemoPayments() };
}
const split = [{ invoiceId: 'inv1', amount: 8400 }, { invoiceId: 'inv2', amount: 1600 }];
const confirm = (state, allocations = split) => applyPaymentAllocation(state, 'ai-gtc-10000', allocations, 'Anna Liiv');

test('€10,000 receipt updates principal, finance and buyer aggregates together', () => {
  const initial = seed();
  const result = confirm(initial);
  assert.equal(result.error, null);
  assert.equal(result.principalDelta, 10000);
  assert.equal(result.financedDelta, 8000);
  assert.equal(result.feeDelta, 0);
  const [first, second] = result.state.invoices;
  assert.equal(first.status, 'paid');
  assert.equal(first.amount, 8400);
  assert.equal(second.amount, 5800);
  assert.equal(second.status, 'financed');
  assert.equal(invoiceOutstanding(second), 4200);
  assert.equal(invoiceFinancedOutstanding(second), 3360);
  assert.equal(result.state.buyers[0].openAr, 4200);
  assert.equal(result.state.buyers[0].utilized, 5800);
  assert.equal(BASE.grossAr - result.state.invoices.reduce((n, i) => n + invoicePaidPrincipal(i), 0), 4810000);
  assert.equal(BASE.fundsEmployed - result.state.invoices.reduce((n, i) => n + (i.paidFinancedPart ?? 0), 0), 2932000);
  assert.equal(initial.invoices[0].status, 'financed', 'input state stays immutable');
});

test('receipt confirmation is idempotent, including after JSON persistence', () => {
  const first = confirm(seed());
  const again = confirm(first.state);
  assert.equal(again.alreadyApplied, true);
  assert.equal(again.state, first.state);
  assert.equal(again.financedDelta, 0);
  const restored = JSON.parse(JSON.stringify(first.state));
  restored.invoices = restored.invoices.map(migrateInvoice);
  const afterReload = confirm(restored);
  assert.equal(afterReload.alreadyApplied, true);
  assert.equal(invoiceOutstanding(afterReload.state.invoices[1]), 4200);
});

test('settling a partial invoice releases only the remaining financed principal', () => {
  const partial = confirm(seed()).state.invoices[1];
  const remainder = applyInvoicePayment(partial, invoiceOutstanding(partial));
  assert.equal(remainder.principalDelta, 4200);
  assert.equal(remainder.financedDelta, 3360);
  assert.equal(remainder.invoice.paidFinancedPart, 4640);
  assert.equal(remainder.invoice.paidPrincipal, 5800);
  assert.equal(invoiceOutstanding(remainder.invoice), 0);
  assert.equal(invoiceFinancedOutstanding(remainder.invoice), 0);
  assert.equal(remainder.invoice.status, 'paid');
  assert.throws(() => applyInvoicePayment(remainder.invoice, 1));
});

test('unfinanced invoice receipts never release financed exposure', () => {
  const unfinanced = seed().invoices.find((i) => i.id === 'inv6');
  const partial = applyInvoicePayment(unfinanced, 1000);
  assert.equal(partial.financedDelta, 0);
  assert.equal(partial.invoice.status, 'open');
  const final = applyInvoicePayment(partial.invoice, 6300);
  assert.equal(final.financedDelta, 0);
  assert.equal(final.invoice.paidFinancedPart, 0);
});

test('accepted extension fee settles separately and cannot release financing', () => {
  const invoice = { ...seed().invoices[0], extensionFee: 67.20 };
  const principal = applyInvoicePayment(invoice, 8400);
  assert.equal(principal.invoice.status, 'financed');
  assert.equal(invoicePrincipalOutstanding(principal.invoice), 0);
  assert.equal(invoiceOutstanding(principal.invoice), 67.20);
  assert.equal(invoiceFinancedOutstanding(principal.invoice), 0);
  const fee = applyInvoicePayment(principal.invoice, 67.20);
  assert.equal(fee.financedDelta, 0);
  assert.equal(fee.principalDelta, 0);
  assert.equal(fee.feeDelta, 67.20);
  assert.equal(fee.invoice.status, 'paid');
});

test('cumulative rounding releases each original financed cent exactly once', () => {
  let invoice = { ...seed().invoices[0], amount: 0.03, retention: 0.01, originalFinancedPart: 0.02 };
  let financing = 0;
  for (let n = 0; n < 3; n++) {
    const result = applyInvoicePayment(invoice, 0.01);
    financing += cents(result.financedDelta);
    invoice = result.invoice;
  }
  assert.equal(financing, 2);
  assert.equal(invoice.paidPrincipal, 0.03);
  assert.equal(invoice.status, 'paid');
});

test('invalid allocations fail atomically', () => {
  const state = seed();
  const before = JSON.stringify(state);
  for (const allocations of [
    [],
    [{ invoiceId: 'inv1', amount: 10000 }],
    [{ invoiceId: 'inv1', amount: 5000 }, { invoiceId: 'inv1', amount: 5000 }],
    [{ invoiceId: 'inv3', amount: 10000 }],
    [{ invoiceId: 'inv6', amount: 5000 }, { invoiceId: 'inv1', amount: 5000 }],
    [{ invoiceId: 'inv1', amount: -1 }, { invoiceId: 'inv2', amount: 10001 }],
    [{ invoiceId: 'inv1', amount: 4200.001 }, { invoiceId: 'inv2', amount: 5799.999 }],
    [{ invoiceId: 'inv1', amount: Number.NaN }],
    [{ invoiceId: 'inv1', amount: Number.POSITIVE_INFINITY }],
    [{ invoiceId: 'inv1', amount: 8400 }, { invoiceId: 'inv2', amount: 1500 }],
  ]) {
    const result = confirm(state, allocations);
    assert.ok(result.error);
    assert.equal(result.state, state);
    assert.equal(JSON.stringify(state), before);
  }
  assert.ok(applyPaymentAllocation(state, 'unknown', split, 'Anna').error);
  assert.ok(applyPaymentAllocation(state, 'ai-gtc-10000', split, ' ').error);
});

test('stale payment proposal cannot settle an invoice already paid elsewhere', () => {
  const state = seed();
  state.invoices[0] = applyInvoicePayment(state.invoices[0], 8400).invoice;
  const result = confirm(state);
  assert.ok(result.error);
  assert.equal(result.state, state);
});

test('receipts void outstanding offers but preserve previously accepted fees', () => {
  const state = seed();
  state.invoices[1].extensionFee = 46.40;
  state.offers = [
    { id: 'o1', invoiceId: 'inv1', status: 'offered', days: 45, fee: 67.2, feePct: 0.8, createdBy: 'Marten' },
    { id: 'o2', invoiceId: 'inv2', status: 'accepted', days: 45, fee: 46.4, feePct: 0.8, createdBy: 'Marten' },
  ];
  const result = confirm(state);
  assert.equal(result.state.offers[0].status, 'void');
  assert.equal(result.state.offers[1].status, 'accepted');
  assert.equal(invoiceOutstanding(result.state.invoices[1]), 4246.4);
});

test('growth eligibility blocks restrictions, missing evidence and partial receipts', () => {
  const state = seed();
  const invoice = state.invoices[0];
  const buyer = state.buyers[0];
  assert.equal(canOfferInvoice(invoice, buyer), true);
  for (const status of ['review', 'frozen', 'rejected', 'pending']) assert.equal(canOfferInvoice(invoice, { ...buyer, status }), false);
  assert.equal(canOfferInvoice(invoice, { ...buyer, relationFlag: 'seotud' }), false);
  assert.equal(canOfferInvoice(invoice, { ...buyer, pep: true }), false);
  assert.equal(canOfferInvoice(invoice, buyer, { state: 'open' }), false);
  assert.equal(canOfferInvoice({ ...invoice, evidence: 'E1' }, buyer), false);
  assert.equal(canOfferInvoice(applyInvoicePayment(invoice, 100).invoice, buyer), false);
});

test('version2 paid invoices migrate without repaying principal or fees', () => {
  const legacy = { ...INVOICES[0], status: 'paid', extensionFee: 67.2, paidFinancedPart: 6720 };
  const migrated = migrateInvoice(legacy);
  assert.equal(migrated.paidPrincipal, 8400);
  assert.equal(migrated.paidExtensionFee, 67.2);
  assert.equal(invoiceOutstanding(migrated), 0);
  assert.equal(invoiceFinancedOutstanding(migrated), 0);
  assert.deepEqual(migrateInvoice(migrated), migrated);
});

test('fresh seed after reset has no allocation state shared with previous session', () => {
  const allocated = confirm(seed()).state;
  const fresh = seed();
  assert.equal(allocated.demoPayments[0].status, 'allocated');
  assert.equal(fresh.demoPayments[0].status, 'unallocated');
  assert.equal(fresh.demoPayments[0].allocations.length, 0);
  assert.equal(invoiceOutstanding(fresh.invoices[0]), 8400);
});

test('risk restrictions block credit memo submission without blocking receipt settlement', () => {
  const state = seed();
  const buyer = state.buyers[0];
  assert.equal(canSubmitCreditDraft(buyer, undefined, []), true);
  assert.equal(canSubmitCreditDraft({ ...buyer, status: 'frozen' }, undefined, []), false);
  assert.equal(canSubmitCreditDraft(buyer, { state: 'open' }, []), false);
  assert.equal(canSubmitCreditDraft({ ...buyer, pep: true }, undefined, []), false);
  assert.equal(canSubmitCreditDraft({ ...buyer, relationFlag: 'seotud' }, undefined, []), false);
  const event = { buyerId: buyer.id, state: 'auto-applied', action: 'REVIEW' };
  assert.equal(canSubmitCreditDraft(buyer, undefined, [event]), false);
  assert.equal(canSubmitCreditDraft(buyer, undefined, [{ ...event, state: 'resolved' }]), true);
  state.buyers[0].status = 'frozen';
  assert.equal(confirm(state).error, null, 'incoming funds may settle an existing frozen buyer debt');
});

test('a persisted credit memo retains the old context after payment changes balances', () => {
  const initial = seed();
  const context = decisionContextFingerprint(initial.buyers[0], undefined, []);
  const saved = JSON.parse(JSON.stringify({ text: 'Kasutatud limiit 13 800 €', kind: 'credit', status: 'draft', contextFingerprint: context }));
  assert.equal(saved.contextFingerprint, decisionContextFingerprint(JSON.parse(JSON.stringify(initial.buyers[0])), undefined, []), 'reload alone does not invalidate a memo');
  const afterPayment = confirm(initial).state;
  const currentContext = decisionContextFingerprint(afterPayment.buyers[0], undefined, []);
  assert.notEqual(saved.contextFingerprint, currentContext, 'reopening must retain this mismatch rather than stamp the current context');
  assert.equal(saved.text, 'Kasutatud limiit 13 800 €', 'historical memo is preserved until an explicit refresh is saved');
  const legacy = { text: saved.text, kind: 'credit', status: 'draft' };
  assert.notEqual(legacy.contextFingerprint, currentContext, 'older v3 memos without context need an explicit refresh');
});

test('memo context tracks relevant risk changes without invalidating unrelated buyers', () => {
  const buyer = seed().buyers[0];
  const context = decisionContextFingerprint(buyer, undefined, []);
  const event = { buyerId: 'nordica', action: 'REVIEW', state: 'auto-applied', id: 'e1' };
  assert.equal(decisionContextFingerprint(buyer, undefined, [event]), context);
  assert.notEqual(decisionContextFingerprint(buyer, undefined, [{ ...event, buyerId: buyer.id }]), context);
  assert.notEqual(decisionContextFingerprint(buyer, { buyerId: buyer.id, state: 'open', score: 0.93 }, []), context);
  assert.notEqual(decisionContextFingerprint({ ...buyer, limit: buyer.limit + 1000 }, undefined, []), context);
});
