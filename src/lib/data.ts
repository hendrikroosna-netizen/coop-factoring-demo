import type { Buyer, Invoice, RuleRow } from './types';

export const MERCHANT = {
  name: 'Bauhof Group AS',
  reg: '10636638',
  kmkr: 'EE100589638',
  address: 'J. Smuuli tee 41, Lasnamäe linnaosa, Tallinn',
  shareCapital: 3_061_690,
  emtak: '47121 — mitte-spetsialiseeritud jaekaubandus',
  turnover2024: '113,3 mln €',
  turnover2023: '116,6 mln €',
  eInvoiceOperator: 'Telema',
  boardMember: 'Lukas Kandratavičius',
  boardMemberSince: '25.03.2026',
  ubo: 'Nerius Numa',
  uboNote: 'Šveitsi resident — kontroll >50% hääleõiguse kaudu (alates 11.02.2026)',
  founded: '14.01.2000',
  registrySource: 'Allikas: äriregistri avaandmed (seisuga 18.09.2026).',
};

export const BUYERS: Buyer[] = [
  { id: 'gtc', reg: '12392790', name: 'GTC Constructions OÜ', grade: 'B', limit: 30000, utilized: 13800, openAr: 14200, status: 'active', dpd: 0, pep: false, sector: 'Ehitus' },
  { id: 'nordica', reg: '14198211', name: 'Nordica Ehitus OÜ', grade: 'A', limit: 85000, utilized: 61200, openAr: 63100, status: 'active', dpd: 0, pep: false, sector: 'Ehitus' },
  { id: 'kalju', reg: '10052437', name: 'Kalju Betoon OÜ', grade: 'B', limit: 46000, utilized: 39800, openAr: 40100, status: 'active', dpd: 4, pep: false, sector: 'Ehitus' },
  { id: 'viru', reg: '10288417', name: 'Viru Raudteed OÜ', grade: 'C', limit: 12000, utilized: 0, openAr: 0, status: 'review', dpd: 0, pep: false, sector: 'Ehitus', relationFlag: 'Seotud osapool — ühine aadress Bauhof tütarettevõttega' },
  { id: 'saare', reg: '10933761', name: 'Saare Puithooned OÜ', grade: 'A', limit: 54000, utilized: 22100, openAr: 22800, status: 'active', dpd: 0, pep: false, sector: 'Puit' },
  { id: 'laane', reg: '14829307', name: 'Lääne Ehitus OÜ', grade: 'B', limit: 15000, utilized: 0, openAr: 0, status: 'pending', dpd: 0, pep: true, pepNote: 'Juhatuse liige on Riigikogu liige (riiklik PEP — MLTFPA § 9 ametikohtade loetelu) → tugevdatud hoolsusmeetmed (EDD)', sector: 'Ehitus', amlDecision: { proposed: 7500, state: 'proposal', conditions: 'EDD: tugevdatud hoolsusmeetmed + kvartaalne andmekontroll' } },
  { id: 'tartu', reg: '10096508', name: 'Tartu Faasaadid AS', grade: 'B', limit: 38000, utilized: 17500, openAr: 18300, status: 'active', dpd: 0, pep: false, sector: 'Ehitus' },
  { id: 'parnu', reg: '11284555', name: 'Pärnu Torutööd OÜ', grade: 'C', limit: 9000, utilized: 8600, openAr: 8900, status: 'active', dpd: 11, pep: false, sector: 'Ehitus', override: { rulesResult: 'REFER (maksehäire ≤ 12 kk)', rulesLimit: 0, reason: 'KÄSITSI-01: pikaajaline koostöö, täiendav tagatis' } },
  { id: 'trem', reg: '14893071', name: 'TREM Tehnika OÜ', grade: 'D', limit: 0, utilized: 0, openAr: 0, status: 'rejected', dpd: 0, pep: false, sector: 'Tehnika' },
  { id: 'kh', reg: '16522893', name: 'KH Holding OÜ', grade: 'C', limit: 0, utilized: 0, openAr: 0, status: 'pending', dpd: 0, pep: false, sector: 'Holding' },
];

// Massportfell — automaatselt skooritud väikeste ostjate koond.
// Näidisriskipoliitika: automaatne alglimiit kuni 1 000 € + käitumispõhine automaatne kasv kuni 5 000 € ostja kohta.
// R03 kooskõla: limiitide summa 5,24M € (keskmine ~1 753 €/ostja) — tegelik kasutus tuletatakse fundsEmployed'ist.
export const MASS_PORTFOLIO_COUNT = 2990;
export const MASS_PORTFOLIO_OPEN_AR = 4_275_600;
export const MASS_PORTFOLIO_LIMIT_SUM = 5_240_000;
// Individuaalselt hinnatud ostjate limiidi kasutus (BUYERS utilized summa) — 163 000 €
export const HEAD_UTILIZED = BUYERS.reduce((s, b) => s + b.utilized, 0);

export const BASE = {
  grossAr: 4_820_000,
  ineligible: [
    { name: 'Tähtaja ületanud nõuded (>90 pv)', amount: 180_000, count: 46 },
    { name: 'Vaidlustatud nõuded', amount: 95_000, count: 12 },
    { name: 'Seotud osapooled', amount: 60_000, count: 3 },
    { name: 'Realiseerimata kreeditarved', amount: 42_000, count: 61 },
  ],
  blendedRate: 0.8,
  reserves: [
    { name: 'Kahanemine (kreeditarved, tagastused) · p90 × 1,5', amount: 210_000 },
    { name: 'Kreeditarved liikumises', amount: 38_000 },
    { name: 'Kontra-reserv (AP vs AR)', amount: 25_000 },
    { name: 'Tasude reserv', amount: 12_000 },
  ],
  fundsEmployed: 2_940_000,
  facilityLimit: 3_600_000,
};

// Massportfelli tegelikult väljamakstud põhiosa = kogu väljamakstud finantseering − individuaalsete ostjate kasutus
// (2 940 000 − 163 000 = 2 777 000 €) — FAC-01 60% piirangu nimetaja-alus. Eristatakse nõuete
// teoreetilisest finantseerimisväärtusest (MASS_PORTFOLIO_OPEN_AR × 80% = 3 420 480 €).
export const MASS_PORTFOLIO_FINANCED = BASE.fundsEmployed - HEAD_UTILIZED;

export const INVOICES: Invoice[] = [
  { id: 'inv1', nr: 'ARV-2026-04412', buyerId: 'gtc', amount: 8400, issued: '17.09.2026', due: '17.10.2026', status: 'financed', viban: 'EE91 4200 0100 1238 1145', reference: 'RF21 1149', retention: 1680, evidence: 'E3' },
  { id: 'inv2', nr: 'ARV-2026-04438', buyerId: 'gtc', amount: 5800, issued: '22.09.2026', due: '22.10.2026', status: 'financed', viban: 'EE91 4200 0100 1238 1145', reference: 'RF82 20260441', retention: 1160, evidence: 'E2' },
  { id: 'inv3', nr: 'ARV-2026-04455', buyerId: 'nordica', amount: 21400, issued: '25.09.2026', due: '25.10.2026', status: 'financed', viban: 'EE64 4200 0100 1552 9087', reference: 'RF51 202604412', retention: 4280, evidence: 'E3' },
  { id: 'inv4', nr: 'ARV-2026-04471', buyerId: 'kalju', amount: 9600, issued: '28.09.2026', due: '28.10.2026', status: 'financed', viban: 'EE07 4200 0100 1887 3412', reference: 'RF17 20260447', retention: 1920, evidence: 'E2' },
  { id: 'inv5', nr: 'ARV-2026-04489', buyerId: 'saare', amount: 12900, issued: '02.10.2026', due: '01.11.2026', status: 'open', viban: 'EE05 4200 0100 1440 1263', reference: 'RF09 202604489', retention: 2580, evidence: 'E3' },
  { id: 'inv6', nr: 'ARV-2026-04490', buyerId: 'gtc', amount: 7300, issued: '09.10.2026', due: '08.11.2026', status: 'open', viban: 'EE91 4200 0100 1238 1145', reference: 'RF79 202604490', retention: 1460, evidence: 'E1' },
];

export const MASTER_IBAN = 'EE59 4200 0000 0055 0001';

// R12: ühine demo arvestuskuupäev — kõik saldod, vanuseline jaotus ja staatused on esitatud selle seisuga
export const DEMO_AS_OF = '17.10.2026';

// --- Rule tables (DMN-style, annotations as in the live Dirisk engine) ---

export const LOAN_SIZE_TABLE: RuleRow[] = [
  { when: '<= 100000', action: '"AUTO"', result: 'OK', annotation: 'Taotletud faktooringulimiit on lubatud', matched: true },
  { when: '> 100000', action: '"SKIP_TO_DECISION"', result: 'NOK', limitResult: '0', annotation: 'Limiit ületab autokinnituse piiri — suunatakse krediidiotsusele' },
];

export const EVENT_RULES: { name: string; rows: RuleRow[] }[] = [
  {
    name: 'EV-01 · EMTA käibe langus (hooajakorrigeeritud, YoY)',
    rows: [
      { when: 'langus > 35% vs sama kvartal eelmisel aastal', action: '"AUTO"', result: 'FREEZE', annotation: 'Automaatne limiidi peatamine + kohene teade kaupmehele; võrdlus on hooajakorrigeeritud', matched: true },
      { when: 'langus 15–35% vs sama kvartal eelmisel aastal', action: '"AUTO"', result: 'REVIEW', annotation: 'Limiit säilib, nõutav krediidianalüütiku läbivaatus 5 tööpäeva jooksul' },
      { when: 'langus < 15%', action: '"AUTO"', result: 'MONITOR', annotation: 'Jälgimisnimekirja, sündmus logitakse' },
      { when: 'ehitussektori Q4→Q1 hooajaline langus', action: '"AUTO"', result: 'EI RAKENDU', annotation: 'Hooajakorrigeeritud võrdlus: sektori tüüpiline Q4→Q1 langus ei käivita reeglit' },
    ],
  },
  {
    name: 'EV-02 · Juhatuse liikme muutus',
    rows: [
      { when: 'uus liige, võõras isik', action: '"AUTO"', result: 'REVIEW', annotation: 'KYC uuesti kinnitada; PEP ja võlgade kontroll uuele liikmele' },
      { when: 'väljaastumine, ilma asenduseta', action: '"AUTO"', result: 'MONITOR', annotation: 'Sündmus logitakse, mõju hinnatakse kvartaalses ülevaates' },
    ],
  },
  {
    name: 'EV-03 · Osaluse muutus',
    rows: [
      { when: '≥ 50% omandi vahetus', action: '"AUTO"', result: 'FREEZE', annotation: 'Automaatne limiidi peatamine kuni UBO ja sanktsioonide uus skreening on tehtud', matched: true },
      { when: '< 50% omandi vahetus', action: '"AUTO"', result: 'REVIEW', annotation: 'UBO graafi uuendamine + läbivaatus' },
    ],
  },
  {
    name: 'EV-04 · Sanktsioonide nimekirja uuendus',
    rows: [
      { when: 'ostja või UBO uus match', action: '"AUTO"', result: 'FREEZE', annotation: 'Kohene limiidi peatamine + AML meeskonna alarm; tehingud keelatud kuni selguseni' },
      { when: 'match eemaldub nimekirjast', action: '"AUTO"', result: 'REVIEW', annotation: 'Eelnev skreening uuesti käivitatakse; peatamise võib nelja silma reeglil lõpetada' },
    ],
  },
];

export const SCREENING_TABLE: RuleRow[] = [
  { when: 'sanktsioonide match (täpne või hägusvaste ≥ 0,92)', action: '"SKIP_TO_DECISION"', result: 'NOK', limitResult: '0', annotation: 'Õiguslikult keelatud tehing — automaatne keeld' },
  { when: 'PEP (riiklik või kohalik)', action: '"AUTO"', result: 'REFER', limitResult: '50% limiidist', annotation: 'Tugevdatud hoolsusmeetmed (EDD); limiit kuni 50% standardist on näidisriskipoliitika — ei asenda EDD-d ega pädeva kinnitaja otsust' },
  { when: 'negatiivne meedia ≥ 2 allikat', action: '"AUTO"', result: 'REFER', annotation: 'Krediidianalüütiku läbivaatus enne otsust' },
  { when: 'kõrge riskiga jurisdiktsioon (FI riskinimekiri)', action: '"AUTO"', result: 'REFER', limitResult: '75% limiidist', annotation: 'Limiit kuni 75% standardist, suurem reserv' },
  { when: 'seotud osapool müüjaga', action: '"AUTO"', result: 'NOK', limitResult: '0', annotation: 'Seotud osapoole nõue ei kuulu faktooringu baasi' },
  { when: 'puhas tulemus kõigis nimekirjades', action: '"AUTO"', result: 'OK', annotation: 'Skreening läbitud, jätkatakse hindamist' },
];

export const SANCTIONS_LISTS = [
  'EL konsolideeritud finantssanktsioonide nimekiri',
  'ÜRO Julgeolekunõukogu konsolideeritud nimekiri',
  'OFAC SDN (USA)',
  'UK OFSI sanktsioonide nimekiri',
  'Välisministeeriumi sanktsioonide register',
];

export const PEP_SOURCES = [
  'MLTFPA § 9 ametikohtade loetelu (Riigi Teataja) — avalike ametlike allikate päringud',
  'EU PEP andmekogumid (OpenSanctions PEP)',
  'Kommertsandmebaas (PEP + negatiivne meedia) — demos näidis; Eestis eraldi riiklikku PEP-registrit ei ole',
];


// --- Merchant (seller) onboarding — modelled on Coop Pank's "Faktooringu taotlus" PDF form ---

export const MERCHANT_APP = {
  nr: 'FAC-2026-0412',
  submitted: '14.09.2026 09:32',
  decided: '17.09.2026 13:13',
  founded: 2000,
  sector: 'Ehitusmaterjalide jae- ja hulgimüük',
  employees: 214,
  bankAccountShare: 82,
  usedFactoringBefore: 'Jah — SEB faktooring 2019–2023, lõpetatud omavalikul',
  forecastTurnover: 113_300_000,
  invoicesPerMonth: 412,
  creditNotes12m: 1_180_000,
  buyerCount: 3000,
  contractualTerm: 32, // kaalutud lepinguline maksetähtaeg ostjatele (pv)
  avgPaymentTerm: 34, // DSO — tegelik laekumise kiirus, 12M (pv)
  avgInvoice: 11_700,
  debtorBalance: [
    { date: '30.06.2026', saldo: 5_230_000 },
    { date: '31.12.2025', saldo: 4_610_000 },
  ],
  requestedLimit: 3_600_000,
  requestedTerm: '12 kuud',
  domestic: 100,
  eu: 0,
  nonEu: 0,
  obligations: [
    { inst: 'Coop Pank AS', type: 'Arvelduskrediit', balance: 150_000, monthly: 0, due: '06.2027', collateral: '—' },
    { inst: 'Coop Liising AS', type: 'Liising (veokipark)', balance: 380_000, monthly: 9_100, due: '03.2030', collateral: 'Sõidukid' },
  ],
};

export const FACILITY_RULES: RuleRow[] = [
  { when: 'prognoos käive 12M ≥ 40M', action: '"AUTO"', result: 'OK', annotation: 'Müügiarvete maht toetab 3,6M € limiiti (3,2% käibest)', matched: true },
  { when: 'nõuete kahanemine ≤ 5%', action: '"AUTO"', result: 'OK', annotation: 'Kreeditarved 1 180 000 € = 2,0% faktooringusse esitatud krediitmüügi arvevoost (57,8M €/a, mitte kogukäibest) — finantseerimismäär 80%', matched: true },
  { when: 'kaalutud lepinguline maksetähtaeg ≤ 45 pv', action: '"AUTO"', result: 'OK', annotation: 'Lepinguline tähtaeg 32 pv ≤ 45 pv tingimusest; eraldi näitaja: tegelik laekumine DSO 34 pv (12M) — portfelli kvaliteet hea', matched: true },
  { when: 'varasem faktooring: jah, puhtalt', action: '"AUTO"', result: 'OK', annotation: 'Eelnev koostöö ilma regressikäivitusteta', matched: true },
  { when: 'tagatis: loovutatud nõudeõigus', action: '"AUTO"', result: 'OK', annotation: 'Lisatagatist ei nõuta (Coop Panga tava)', matched: true },
  { when: 'tarnekinnitus (ePOD) ≥ E2', action: '"AUTO"', result: 'OK', annotation: 'Finantseerimise miinimumtase: E2 — allkirjastatud tarnekinnitus (saateleht/CMR); E1 (müüja sisemine kinnitus) ei piisa', matched: true },
  { when: 'massportfelli aggregaatne kasutus ≤ 60% faktooringulimiidist', action: '"AUTO"', result: 'OK', annotation: 'Massportfelli tegelik väljamakstud põhiosa ≤ 60% faktooringulimiidist — ületamisel uued massportfelli ostjad vajavad käsitsi kinnitust', matched: true },
  { when: 'sektori osakaal > 70% individuaalselt hinnatud alamportfellist', action: '"AUTO"', result: 'ESKALEERI', annotation: 'Lävend on teadlikult määratud individuaalselt hinnatud alamportfelli kohta (massportfelli sektorijaotus on teadmata — eraldi jälgimisrisk); > 70% → automaatne eskaleerimine krediidikomiteesse (monitooring, mitte blokeering)' },
];


// --- Pricing: Coop Pank price list (hinnakiri) + engine pricing configuration ---

export const PRICE_LIST = [
  { item: 'Lepingu sõlmimine', price: 'kuni 1% faktooringulimiidi summast aastas, min 200 €' },
  { item: 'Faktooringulimiidi tähtaja pikendamine', price: 'kuni 1% faktooringulimiidi summast aastas, min 200 €' },
  { item: 'Faktooringulimiidi suurendamine', price: 'kuni 1% suurendatavast summast aastas, min 200 €' },
  { item: 'Arvete haldustasu', price: '0,1–0,5% arve(te) summast või fikseeritud tasu arve kohta' },
  { item: 'Ostja limiidi lisamine ja/või muutmine', price: '65 €' },
  { item: 'Platvormi automaatselt genereeritud ostjalimiidid ja reeglipõhised limiidimuudatused ²', price: 'tasuta (platvormi paketihinnas); 65 € kehtib käsitsi esitatud eritaotlustele' },
  { item: 'Saldokinnituse väljastamine', price: '10 €' },
  { item: 'Muude faktooringutingimuste muutmine', price: 'kokkuleppel, min 65 €' },
  { item: 'Aastane intressimäär', price: 'määratakse iga taotleja kohta eraldi' },
];

export const SERVICE_FEE_RULES: RuleRow[] = [
  { when: 'hinne A', action: '"AUTO"', result: '0,10%', annotation: 'Haldustasu arve summast', matched: false },
  { when: 'hinne B', action: '"AUTO"', result: '0,25%', annotation: 'Haldustasu arve summast', matched: true },
  { when: 'hinne C', action: '"AUTO"', result: '0,50%', annotation: 'Haldustasu arve summast + suurem reserv', matched: false },
  { when: 'hinne D / limiidita', action: '"AUTO"', result: '—', limitResult: '0', annotation: 'Ei finantseerita — tasu ei rakendu' },
];

export const INTEREST_RULES: RuleRow[] = [
  { when: 'baasmäär', action: '"AUTO"', result: 'EURIBOR 3M', annotation: 'EURIBOR 3M: 2,15% (näidisväärtus demos; päris süsteemis fikseeritakse arvepõhiselt)', matched: true },
  { when: 'marginaal: portfellihinnang A–B', action: '"AUTO"', result: '+2,10%', annotation: 'Varjatud faktooring, käibekapitalilaenude riskiklass', matched: true },
  { when: 'miinimum', action: '"AUTO"', result: '4,90%', annotation: 'Intressimäära alampiir aastas — rakendub enne regressisoodustust', matched: true },
  { when: 'soodustus: regressiga portfelli osa', action: '"AUTO"', result: '−0,35%', annotation: 'Riski jagamise eest müüjaga; regressisoodustus rakendub alampiira järel: max(2,15% + 2,10%; 4,90%) − 0,35% = 4,55%', matched: true },
  { when: 'intressi baas', action: '"AUTO"', result: 'finantseeritud osa (80%)', annotation: 'Intressi kantakse vaid finantseeritud osalt: arve summa − 20% garantiijääk (retention)', matched: true },
];

// --- RK-01 · Regressi tagasiostu reeglid ---

export const RECOURSE_RULES: RuleRow[] = [
  { when: '> 60 päeva üle tähtaja', action: '"AUTO"', result: 'BAASIST VÄLJA', annotation: 'Arve eemaldatakse finantseerimisbaasist', matched: true },
  { when: '> 90 päeva üle tähtaja', action: '"AUTO"', result: 'TAGASIOST', annotation: 'Tagasiost müüjalt (täisregressi osa)' },
  { when: 'vaidlus', action: '"AUTO"', result: 'BAASIST VÄLJA', annotation: 'Arve baasist välja kuni lahenduseni; EI ole tagasiost' },
  { when: 'EV-peatamine', action: '"AUTO"', result: 'EI TAGASIOSTU', annotation: 'Ei käivita tagasiostu juba finantseeritud arvetele; intress peatamisperioodil peatub' },
];

// --- A–D hindemudeli kriteeriumid ---

export const GRADE_CRITERIA: { grade: string; text: string }[] = [
  { grade: 'A', text: 'PD < 0,5% · ≥ 3 a positiivne käive · registri + EMTA puhas' },
  { grade: 'B', text: 'PD 0,5–1,5%' },
  { grade: 'C', text: 'PD 1,5–4% · maksehäireid ≤ 12 kk' },
  { grade: 'D', text: 'PD > 4% või aktiivne maksehäire — ei finantseerita' },
];

// --- ePOD tarnekinnituse tasemed ---

export const EPOD_LEVELS: { level: 'E1' | 'E2' | 'E3'; text: string }[] = [
  { level: 'E1', text: 'müüja sisemine kinnitus (ei piisa finantseerimiseks)' },
  { level: 'E2', text: 'allkirjastatud tarnekinnitus (saateleht/CMR) — miinimum finantseerimiseks' },
  { level: 'E3', text: 'ostja vastuvõtukinnitus konkreetse tarne kohta (RECADV / digitaalne ePOD-allkiri) — e-arve operaatori tehniline edastuskinnitus eraldiseisvalt kaubatõendina ei käitu' },
];

// --- Finantseerimisbaasi välistused (eligibility) ---

export const ELIGIBILITY_EXCLUSIONS = [
  'lepinguline loovutuskeeld',
  'ettemaksuarved',
  'ehituse garantiijääk (retention)',
  'cross-age: > 25% ostja arvetest > 60 pv viivises → ostja arved välistatud',
];

// --- Ühine tasuvus- ja intressimudel (müüja kogukulu kaart + panga CFO/RM töölauad) ---
// Allikas: INTEREST_RULES (PR-02), SERVICE_FEE_RULES (PR-01), PRICE_LIST (lepingutasu), MERCHANT_APP (arvevoog)
export const RATES = {
  euribor3m: 0.0215, // demos näidisväärtus (INTEREST_RULES baasmäär)
  margin: 0.021, // portfellihinnang A–B
  floor: 0.049, // intressimäära alampiir aastas
  recourseDiscount: 0.0035, // soodustus regressiga portfelli osa eest
};
// PR-02: alampiir rakendub enne regressisoodustust → max(2,15% + 2,10%; 4,90%) − 0,35% = 4,55%
export const EFFECTIVE_RATE = Math.max(RATES.euribor3m + RATES.margin, RATES.floor) - RATES.recourseDiscount;
export const UNFLOORED_RATE = RATES.euribor3m + RATES.margin - RATES.recourseDiscount; // 3,90% ilma alampiirita
export const FLOOR_GAP = RATES.floor - (RATES.euribor3m + RATES.margin); // 0,65pp — põranda lisatulu
export const FLOOR_OFF_EURIBOR = RATES.floor - RATES.margin; // põrand kaob, kui EURIBOR 3M > 3,15%
export const ANNUAL_FLOW = MERCHANT_APP.invoicesPerMonth * MERCHANT_APP.avgInvoice * 12; // 57 844 800 €
export const MONTHLY_FLOW = ANNUAL_FLOW / 12; // 4 820 400 €
// Hindekaalutud PR-01 vahemik (A–C miksi järgi, demos hinnang) — 0,185–0,25%
export const FEE_BAND = { low: 0.00185, high: 0.00252 };
export const ANNUAL_FEE_LOW = ANNUAL_FLOW * FEE_BAND.low; // ≈ 107 013 €
export const ANNUAL_FEE_HIGH = ANNUAL_FLOW * FEE_BAND.high; // ≈ 145 769 €
export const CONTRACT_FEE_YEAR = BASE.facilityLimit * 0.01; // kuni 36 000 € (PRICE_LIST: kuni 1% limiidist aastas)

export const pct = (r: number, decimals = 2) => (r * 100).toFixed(decimals).replace('.', ',') + '%';

// --- Maksetähtaja valikud (ostja kliendiportaali maksetingimused; sama loogika müüja "maksa hiljem" pakkumistel) ---
export const PAYMENT_TERMS = [
  { days: 30, feePct: 0, label: '30 päeva', desc: 'baastähtaeg, lisatasuta' },
  { days: 45, feePct: 0.8, label: '45 päeva', desc: '+0,8% arve summast' },
  { days: 60, feePct: 1.5, label: '60 päeva', desc: '+1,5% arve summast' },
];

// --- Bauhofi ärikliendihalduri demo-identiteet (fiktiivne nimi — päris on vaid struktuur: kauplused, rollinimetus) ---
export const MANAGER = { name: 'Marten Kask', store: 'Laagri kauplus', role: 'Ärikliendihaldur' };
export const MANAGER_CLIENT_IDS = ['gtc', 'kalju', 'tartu', 'parnu'];
