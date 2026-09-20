import { useState } from 'react';
import { X, Landmark, Building2, HardHat, ArrowRight, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Persona } from '@/lib/types';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const SECTIONS: { id: Persona; label: string; icon: ReactNode; benefit: string; process: string[] }[] = [
  {
    id: 'bank',
    label: 'Pank · Coop Pank',
    icon: <Landmark className="h-4 w-4" />,
    benefit: '3 000 ostja automaatne hindamine ja järelvalve',
    process: ['Andmed', 'reeglid', 'limiit', 'järelvalve'],
  },
  {
    id: 'merchant',
    label: 'Bauhof · müüja',
    icon: <Building2 className="h-4 w-4" />,
    benefit: 'Raha arvete eest samal päeval, ostjatele pikem tähtaeg',
    process: ['Arve', 'tarnekinnitus (E2+)', 'väljamakse'],
  },
  {
    id: 'buyer',
    label: 'Ostja · GTC',
    icon: <HardHat className="h-4 w-4" />,
    benefit: 'Pikem maksetähtaeg, ettemaksuta tellimine',
    process: ['Tellimus', 'kaup', 'makse tähtajal'],
  },
];

export function PerspectiveBanner() {
  const { persona, setPersona } = useStore();
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem('coop-demo-banner-dismissed') !== '1';
    } catch {
      return true;
    }
  });
  return (
    <div className="bg-background border-b">
      {open && (
        <div className="px-6 pt-4 pb-3 relative">
          <button
            onClick={() => {
              try {
                localStorage.setItem('coop-demo-banner-dismissed', '1');
              } catch {
                /* localStorage pole saadaval */
              }
              setOpen(false);
            }}
            className="absolute top-3 right-4 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-md"
            aria-label="Sulge bänner"
            title="Sulge bänner"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-w-6xl">
            {SECTIONS.map((s) => {
              const active = persona === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPersona(s.id)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-xl border px-3 py-2 transition-colors text-left w-full shadow-sm bg-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    active ? 'border-primary/40 ring-1 ring-primary/20' : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {s.icon}
                    {s.label}
                    {active && <span className="ml-auto text-[11px] font-normal bg-primary/10 text-primary rounded-md px-2 py-0.5">aktiivne vaade</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">{s.benefit}</div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1 flex-wrap">
                    {s.process.map((p, i) => (
                      <span key={p} className="flex items-center gap-1">
                        {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/60" />}
                        {p}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="px-6 py-1.5 border-t flex items-center gap-1.5 justify-center">
        <Info className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-[11px] text-muted-foreground">Näidisandmed — demo: kõik isikud ja numbrid on fiktiivsed, välja arvatud müüja registriandmed.</span>
      </div>
    </div>
  );
}
