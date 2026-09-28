import { useState } from 'react';
import { FilePenLine, ShieldAlert, Send, CheckCircle2 } from 'lucide-react';
import { AiPanel } from '@/components/ai-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DEMO_AS_OF } from '@/lib/data';
import { decisionContextFingerprint } from '@/lib/finance';
import { eur, useStore } from '@/lib/store';

export function AiDecisionAssistant({ buyerId }: { buyerId: string }) {
  return <DecisionContent key={buyerId} buyerId={buyerId} />;
}

function DecisionContent({ buyerId }: { buyerId: string }) {
  const { buyers, events, sanctionCases, aiDrafts, saveAiDraft } = useStore();
  // Read the buyer from the shared state so changes made with the event simulator
  // immediately invalidate recommendations in an already open buyer dialog.
  const buyer = buyers.find((item) => item.id === buyerId);
  const saved = aiDrafts[buyerId];
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [draftContext, setDraftContext] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!buyer) return null;

  const sanction = sanctionCases[buyerId];
  const activeEvents = events.filter((event) => event.buyerId === buyerId && event.state !== 'resolved');
  const sanctionOpen = sanction?.state === 'open';
  const restricted = sanctionOpen || buyer.status !== 'active' || Boolean(buyer.relationFlag) || (buyer.pep && buyer.amlDecision?.state !== 'confirmed');
  const complete = [buyer.limit, buyer.utilized, buyer.dpd].every(Number.isFinite) && buyer.limit > 0 && buyer.utilized >= 0;
  const sampleAvailable = buyer.id === 'gtc' && !restricted && complete && activeEvents.length === 0 && buyer.dpd === 0;
  const kind = sampleAvailable ? 'credit' : 'information';
  const context = decisionContextFingerprint(buyer, sanction, events);
  const savedStale = !!saved && saved.contextFingerprint !== context;
  const draftStale = editing && draftContext !== context;
  const available = Math.max(0, buyer.limit - buyer.utilized);

  const recommendation = sanctionOpen
    ? 'Lahenda sanktsioonivaste enne krediidiotsust'
    : buyer.status === 'frozen'
      ? 'Selgita peatamise põhjus ja kogu vajalikud tõendid'
      : buyer.relationFlag
        ? 'Küsi seotud osapoole kohta lisateavet'
        : buyer.pep && buyer.amlDecision?.state !== 'confirmed'
          ? 'Täienda tugevdatud taustakontrolli'
          : buyer.status === 'rejected'
            ? 'Kontrolli tagasilükkamise aluseid enne uut menetlust'
            : buyer.status === 'review'
              ? 'Täienda toimikut enne läbivaatuse lõpetamist'
              : buyer.status === 'pending'
                ? 'Kogu otsustamiseks puuduv teave'
                : sampleAvailable
                  ? `Säilita praegune ${eur(buyer.limit)} limiit`
                  : 'Koonda värsked andmed käsitsi otsustamiseks';

  const informationNeed = sanctionOpen
    ? 'Palun lisa sanktsioonivaste uurimise tõendid ja AML-spetsialisti järeldus. Vaste lahendatakse eraldi menetluses.'
    : buyer.relationFlag
      ? 'Palun täpsusta võimalikku seost müüjaga ning lisa seost kinnitavad või välistavad dokumendid.'
      : buyer.pep && buyer.amlDecision?.state !== 'confirmed'
        ? 'Palun lisa tugevdatud taustakontrolli tulemused, rahaliste vahendite päritolu ning AML-spetsialisti hinnang.'
        : 'Palun lisa täielik makseajalugu, värsked taustaandmed ja selgitused toimikus märgitud riskisündmuste kohta.';

  const proposedText = sampleAvailable
    ? `Ettepanek: säilitada ${buyer.name} limiit ${eur(buyer.limit)}. Kasutatud limiit on ${eur(buyer.utilized)} ja vaba limiit ${eur(available)}. Praegune makseviivitus on ${buyer.dpd} päeva. Limiidi suurendamise vajadus ei ole olemasolevate andmetega põhjendatud. Enne otsust kontrollida makseajaloo täielikkust ja taustaandmete värskust. AI riskihinnang on simuleeritud näide. Kehtiva otsuse kinnitab panga töötaja.`
    : `${buyer.name}: ${informationNeed} ${restricted ? 'Kehtivad piirangud jäävad jõusse kuni panga eraldi otsuseni.' : 'Uue riskihinnangu koostamiseks on vaja kontrollitud andmeid.'}`;

  const startDraft = (existing = false) => {
    const reuseSaved = existing && saved?.kind === kind;
    setText(reuseSaved ? saved.text : proposedText);
    // A saved memo retains its original evidence snapshot. Legacy memos without
    // a snapshot are historical text only until explicitly regenerated.
    setDraftContext(reuseSaved ? saved.contextFingerprint ?? '' : context);
    setEditing(true);
    setError('');
    setMessage('');
  };

  const persist = (submit: boolean) => {
    if (draftContext !== context) {
      setError('Ostja andmed on muutunud. Koosta värske mustand ja vaata see uuesti üle.');
      return;
    }
    const result = saveAiDraft(buyerId, text, kind, submit, draftContext);
    if (result) { setError(result); return; }
    setError('');
    setMessage(submit
      ? 'Mustand on esitatud inimese ülevaatusele. Ostja limiit ja staatus ei muutunud.'
      : kind === 'information'
        ? 'Lisainfo päringu mustand salvestatud. Päringut ei ole välja saadetud.'
        : 'Krediidiotsuse mustand salvestatud.');
    setEditing(false);
  };

  return (
    <AiPanel title="AI otsustusabi" className="h-fit">
      <div className="space-y-4 text-[13px] min-w-0">
        <div>
          <h3 className="font-semibold text-base leading-snug">{recommendation}</h3>
          <p className="mt-1.5 text-muted-foreground leading-relaxed">
            {sampleAvailable
              ? 'Kinnitatud limiit ei ole täielikult kasutatud. Soovitus aitab analüütikul otsuse põhjenduse ette valmistada.'
              : 'Enne uut soovitust tuleb puuduv teave üle vaadata. AI aitab koostada lisainfo päringu.'}
          </p>
        </div>

        {restricted && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-amber-900 flex gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p>{sanctionOpen ? 'Avatud sanktsioonijuhtum. ' : ''}Olemasolevad piirangud jäävad jõusse. AI ei muuda limiiti ega kinnita otsust.</p>
          </div>
        )}

        <div className="rounded-lg bg-slate-50 border p-3">
          <div className="text-xs text-muted-foreground">Järgmise arve hilinemine üle 30 päeva</div>
          {sampleAvailable ? (
            <>
              <div className="font-semibold mt-1">Madal · näidishinnang</div>
              <div className="grid grid-cols-3 gap-1 mt-3" aria-hidden="true">
                <div className="h-1.5 rounded bg-primary" /><div className="h-1.5 rounded bg-slate-200" /><div className="h-1.5 rounded bg-slate-200" />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1"><span>Madal</span><span>Keskmine</span><span>Kõrge</span></div>
              <p className="text-[11px] text-muted-foreground mt-2">Simuleeritud näidismudel 0.1 · ei ole arvutatud krediidiskoor.</p>
            </>
          ) : (
            <>
              <div className="font-medium mt-1">Hinnangut ei kuvata</div>
              <p className="text-xs text-muted-foreground mt-1">{restricted ? 'Toimik vajab kontrolli.' : activeEvents.length ? 'Riskisündmuse järel on vaja uut hindamist.' : 'Kontrollitud andmeid on prognoosiks liiga vähe.'} Riskiskoori ei tuletata puuduvast infost.</p>
            </>
          )}
        </div>

        <details open className="border-t pt-3">
          <summary className="cursor-pointer font-medium text-primary rounded focus-visible:outline focus-visible:outline-2">Millel soovitus põhineb?</summary>
          <dl className="mt-2 space-y-1.5 text-xs">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Ostja toimik · kinnitatud limiit</dt><dd className="font-medium whitespace-nowrap">{buyer.status === 'pending' ? 'Kinnitamata' : eur(buyer.limit)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Kasutatud / vaba limiit</dt><dd className="font-medium text-right">{eur(buyer.utilized)} / {eur(available)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Praegune makseviivitus</dt><dd className="font-medium">{buyer.dpd} päeva</dd></div>
            {buyer.relationFlag && <div className="pt-1 text-amber-800">Toimiku märge: {buyer.relationFlag}</div>}
            {activeEvents.slice(0, 3).map((event) => <div key={event.id} className="border-l-2 border-amber-300 pl-2 py-1 text-muted-foreground"><span className="font-medium text-foreground">{event.ruleId} · {event.time}</span><br />{event.detail}</div>)}
          </dl>
          <p className="mt-2 text-[11px] text-muted-foreground">Demo alusandmed seisuga {DEMO_AS_OF}; saldod kajastavad tehtud demotoiminguid.</p>
        </details>

        <div className="text-xs rounded-md bg-slate-50 p-3">
          <p className="font-medium mb-1">Mida tuleb veel kontrollida?</p>
          <p className="text-muted-foreground">{sampleAvailable ? 'Täielik makseajalugu ja värsked taustaandmed. Praeguse viivituse puudumine ei tõenda tulevast maksevõimet.' : informationNeed}</p>
        </div>

        {saved && !editing && (
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="secondary">{saved.status === 'submitted' ? 'Ootab inimese ülevaatust' : 'Mustand salvestatud'}</Badge>
              <span className="text-[11px] text-muted-foreground">{new Date(saved.updatedAt).toLocaleString('et-EE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p className="text-xs whitespace-pre-wrap break-words">{saved.text}</p>
            <p className="text-[11px] text-muted-foreground">Salvestatud memo kajastab selle koostamise hetke. Enne esitamist kontrolli summad ja asjaolud üle.</p>
            {savedStale && <p className="text-xs text-amber-800" role="status">{saved.contextFingerprint ? 'Toimiku andmed on pärast memo koostamist muutunud.' : 'Selle varasema memo alusandmete seisu ei ole salvestatud.'} Varasem tekst on säilitatud. Enne uuesti salvestamist või esitamist koosta värske mustand.</p>}
          </div>
        )}

        {editing ? (
          <div className="space-y-3">
            <label htmlFor={`ai-decision-draft-${buyerId}`} className="font-medium block">{kind === 'credit' ? 'Krediidiotsuse mustand' : 'Lisainfo päringu mustand'}</label>
            <textarea id={`ai-decision-draft-${buyerId}`} className="w-full min-h-44 rounded-md border p-3 bg-white text-[13px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" value={text} onChange={(event) => { setText(event.target.value); setError(''); }} />
            {draftStale && <p role="alert" className="text-xs text-amber-800">See tekst pärineb varasemast või kontrollimata andmeseisust. Koosta värske mustand enne salvestamist või esitamist. Salvestatud ajalooline memo säilib kuni uue mustandi salvestamiseni.</p>}
            <div className="flex flex-wrap gap-2">
              {draftStale ? <Button type="button" size="sm" onClick={() => startDraft()}>Koosta värske mustand</Button> : <>
                <Button type="button" size="sm" variant={kind === 'credit' ? 'outline' : 'default'} disabled={!text.trim()} onClick={() => persist(false)}>Salvesta mustand</Button>
                {kind === 'credit' && <Button type="button" size="sm" className="h-auto min-h-8 whitespace-normal" disabled={!text.trim()} onClick={() => persist(true)}><Send className="h-3.5 w-3.5" aria-hidden="true" />Esita inimese ülevaatusele</Button>}
              </>}
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Tühista</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="h-auto min-h-8 whitespace-normal" onClick={() => startDraft(Boolean(saved))}><FilePenLine className="h-3.5 w-3.5" aria-hidden="true" />{saved?.kind === kind ? savedStale ? 'Vaata varasemat mustandit' : 'Muuda mustandit' : kind === 'credit' ? 'Koosta otsuse mustand' : 'Koosta lisainfo päring'}</Button>
            {savedStale && saved.kind === kind && <Button type="button" size="sm" variant="outline" onClick={() => startDraft()}>Koosta värske mustand</Button>}
          </div>
        )}
        {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        {message && <p role="status" className="text-xs text-emerald-800 flex items-start gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />{message}</p>}
      </div>
    </AiPanel>
  );
}
