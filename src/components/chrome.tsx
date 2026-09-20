import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, MinusCircle, PauseCircle } from 'lucide-react';
import type { BuyerStatus, EventAction, RuleRow } from '@/lib/types';
import { BASE, ELIGIBILITY_EXCLUSIONS } from '@/lib/data';
import { eur, useStore } from '@/lib/store';

export function StatusChip({ status }: { status: BuyerStatus | 'paid' | 'financed' | 'open' | 'matched' | 'partial' | 'exception' | 'connected' | 'required' | 'planned' | 'offered' | 'accepted' | 'declined' | 'void' | EventAction }) {
  const map: Record<string, { cls: string; label: string; icon: ReactNode }> = {
    active: { cls: 'border-success/30 bg-success/10 text-success', label: 'Aktiivne', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    review: { cls: 'border-warning/30 bg-warning/10 text-warning', label: 'Läbivaatusel', icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
    frozen: { cls: 'border-destructive/30 bg-destructive/10 text-destructive', label: 'Peatatud', icon: <PauseCircle className="h-3 w-3 mr-1" /> },
    rejected: { cls: 'border-destructive/30 bg-destructive/10 text-destructive', label: 'Keelatud', icon: <XCircle className="h-3 w-3 mr-1" /> },
    pending: { cls: 'border-warning/30 bg-warning/10 text-warning', label: 'Ootel', icon: <Clock className="h-3 w-3 mr-1" /> },
    paid: { cls: 'border-success/30 bg-success/10 text-success', label: 'Laekunud', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    financed: { cls: 'border-info/30 bg-info/10 text-info', label: 'Finantseeritud', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    open: { cls: 'border-info/30 bg-info/10 text-info', label: 'Avatud', icon: <Clock className="h-3 w-3 mr-1" /> },
    matched: { cls: 'border-success/30 bg-success/10 text-success', label: 'Sobitatud', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    partial: { cls: 'border-warning/30 bg-warning/10 text-warning', label: 'Osaline', icon: <Clock className="h-3 w-3 mr-1" /> },
    exception: { cls: 'border-destructive/30 bg-destructive/10 text-destructive', label: 'Erand', icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
    connected: { cls: 'border-success/30 bg-success/10 text-success', label: 'Ühendatud (demo)', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    required: { cls: 'border-warning/30 bg-warning/10 text-warning', label: 'Vajalik enne tootmist', icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
    planned: { cls: 'border-border bg-muted text-muted-foreground', label: 'Planeeritud', icon: <MinusCircle className="h-3 w-3 mr-1" /> },
    offered: { cls: 'border-info/30 bg-info/10 text-info', label: 'Pakutud', icon: <Clock className="h-3 w-3 mr-1" /> },
    accepted: { cls: 'border-success/30 bg-success/10 text-success', label: 'Aktsepteeritud', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    declined: { cls: 'border-border bg-muted text-muted-foreground', label: 'Keeldutud', icon: <MinusCircle className="h-3 w-3 mr-1" /> },
    void: { cls: 'border-destructive/30 bg-destructive/10 text-destructive', label: 'Kehtetu', icon: <XCircle className="h-3 w-3 mr-1" /> },
    FREEZE: { cls: 'border-destructive/30 bg-destructive/10 text-destructive', label: 'Peatamine', icon: <PauseCircle className="h-3 w-3 mr-1" /> },
    REVIEW: { cls: 'border-warning/30 bg-warning/10 text-warning', label: 'Läbivaatus', icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
    MONITOR: { cls: 'border-border bg-muted text-muted-foreground', label: 'Jälgimisel', icon: <MinusCircle className="h-3 w-3 mr-1" /> },
  };
  const m = map[status] ?? map.pending;
  return <Badge variant="outline" className={m.cls + ' rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-transparent'}>{m.icon}{m.label}</Badge>;
}

export function StepCheck({ title, state, note, children }: { title: string; state: 'done' | 'attention' | 'blocked' | 'waiting'; note?: string; children?: React.ReactNode }) {
  const icon =
    state === 'done' ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" /> :
    state === 'attention' ? <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" /> :
    state === 'blocked' ? <XCircle className="h-5 w-5 text-red-500 shrink-0" /> :
    <Clock className="h-5 w-5 text-gray-400 shrink-0" />;
  return (
    <div className="border rounded-lg bg-white">
      <div className="flex items-center gap-3 px-4 py-3">
        {icon}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{title}</div>
          {note && <div className="text-xs text-muted-foreground truncate">{note}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function RuleTableDialog({ name, rows, version = 'RB-2026.09' }: { name: string; rows: RuleRow[]; version?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-7">Ava otsusetabel</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">{name}</DialogTitle>
        </DialogHeader>
        <div className="text-[11px] text-muted-foreground mb-2 font-mono">HR Policy Unique · kehtiv versioon {version} · efektiivne alates 01.09.2026</div>
        <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse min-w-[640px]">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-1.5 pr-2 font-medium">#</th>
              <th className="py-1.5 pr-2 font-medium">Tingimus</th>
              <th className="py-1.5 pr-2 font-medium">Jätka</th>
              <th className="py-1.5 pr-2 font-medium">Tulemus</th>
              <th className="py-1.5 pr-2 font-medium">Limiit</th>
              <th className="py-1.5 font-medium">Annotatsioon</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.matched ? 'bg-emerald-50' : ''}>
                <td className="py-2 pr-2 align-top text-muted-foreground">{i + 1}</td>
                <td className="py-2 pr-2 align-top font-mono whitespace-nowrap">{r.when}</td>
                <td className="py-2 pr-2 align-top font-mono">{r.action}</td>
                <td className="py-2 pr-2 align-top font-mono font-semibold">{r.result}</td>
                <td className="py-2 pr-2 align-top font-mono">{r.limitResult ?? '—'}</td>
                <td className="py-2 align-top">{r.annotation}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {rows.some((r) => r.matched) && <div className="text-[11px] text-emerald-700 mt-2">■ roheline rida — selle protsessi puhul rakendunud reegel</div>}
      </DialogContent>
    </Dialog>
  );
}

export function EvidenceBadge({ level }: { level: 'E1' | 'E2' | 'E3' }) {
  const map = {
    E1: { cls: 'bg-gray-100 text-gray-700 hover:bg-gray-100', label: 'E1 · sisemine kinnitus' },
    E2: { cls: 'bg-sky-100 text-sky-800 hover:bg-sky-100', label: 'E2 · tarnekinnitus' },
    E3: { cls: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100', label: 'E3 · 3. osapoole tõend' },
  } as const;
  const m = map[level];
  return <Badge className={m.cls + ' font-medium text-[11px]'}>{m.label}</Badge>;
}

export function Waterfall({ compact }: { compact?: boolean }) {
  const { base } = useStore();
  // Kõik arvud tuletatakse BASE konstandist ja store'i tuletatud väärtustest — käsitsi dubleeritud konstandid eemaldatud
  const lines: { label: string; value: number; kind?: 'bad' | 'total' }[] = [
    { label: 'Bruto nõuded müügiarvetelt (AR)', value: base.grossAr, kind: 'total' },
    ...BASE.ineligible.map((i) => ({ label: `Välistatud: ${i.name.charAt(0).toLowerCase() + i.name.slice(1)} (${i.count} arvet)`, value: -i.amount, kind: 'bad' as const })),
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Finantseerimisbaas (borrowing base)</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1.5">
        {lines.map((l) => (
          <div key={l.label} className="flex justify-between">
            <span className="text-muted-foreground">{l.label}</span>
            <span className={l.kind === 'bad' ? 'text-red-600' : 'font-semibold'}>{l.value < 0 ? '−' : ''}{eur(Math.abs(l.value))}</span>
          </div>
        ))}
        {base.frozenOpenAr > 0 && (
          <div className="flex justify-between text-red-600">
            <span className="flex items-center"><PauseCircle className="h-3.5 w-3.5 mr-1" />Peatatud ostjate nõuded</span>
            <span>−{eur(base.frozenOpenAr)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-medium">
          <span>Neto finantseeritav baas</span><span>{eur(base.netEligible)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Kaalutud finantseerimismäär</span><span>{Math.round(BASE.blendedRate * 100)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Finantseerimise maht</span><span>{eur(base.advance)}</span>
        </div>
        <Separator />
        {BASE.reserves.map((r) => (
          <div key={r.name} className="flex justify-between">
            <span className="text-muted-foreground">Reserv: {r.name}</span>
            <span className="text-red-600">−{eur(r.amount)}</span>
          </div>
        ))}
        <Separator />
        <div className="flex justify-between font-medium">
          <span>Bruto kättesaadav (faktooringulimiit {eur(BASE.facilityLimit)})</span><span>{eur(base.grossAvailability)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Väljamakstud finantseering</span><span>−{eur(base.fundsEmployed)}</span>
        </div>
        {base.frozenFinanced > 0 && (
          <div className="flex justify-between text-[13px]">
            <span className="text-muted-foreground flex items-center"><PauseCircle className="h-3.5 w-3.5 mr-1 text-red-600" />sh peatatud ostjate finantseeritud osa (intress peatatud, RK-01)</span><span className="text-red-600">{eur(base.frozenFinanced)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold pt-1">
          <span>Kohe kättesaadav finantseering</span><span className={base.availableNow < 0 ? 'text-red-600' : 'text-emerald-700'}>{eur(base.availableNow)}</span>
        </div>
        <div className="text-[11px] text-muted-foreground pt-2 border-t">
          <span className="font-medium text-slate-600">Baasist välistatakse samuti:</span>
          <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
            {ELIGIBILITY_EXCLUSIONS.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
        {!compact && <div className="text-[11px] text-muted-foreground pt-1">Öine sulgemine 23:59 EET — päris süsteemis juriidiline kirje (demos näidis) · reeglid RB-2026.09 · #182</div>}
      </CardContent>
    </Card>
  );
}

export function Separator() {
  return <div className="border-t my-1.5" />;
}

export function StatCard({ label, value, hint, tone, icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'danger' | 'warning' | 'success'; icon?: ReactNode }) {
  const toneCls = tone === 'danger' ? 'text-destructive' : tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : '';
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">{label}{icon}</div>
        <div className={'text-2xl font-semibold tabular-nums mt-1 ' + toneCls}>{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}
