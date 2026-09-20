import { useState } from 'react';
import {
  Building2, Landmark, HardHat, LayoutDashboard, Users, FileText, Inbox, BellRing,
  ShieldCheck, BookOpen, Receipt, ScrollText, Zap, RefreshCw, ChevronLeft, ChevronRight,
  ArrowLeftRight, SlidersHorizontal, CalendarClock,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { StoreProvider, useStore } from '@/lib/store';
import type { Persona } from '@/lib/types';
import { BankHome, BankRoleSwitch, BANK_ROLES } from '@/views/bank';
import { MerchantHome, MerchantRoleSwitch } from '@/views/merchant';
import { BuyerHome } from '@/views/buyer';
import { MANAGER } from '@/lib/data';
import { PerspectiveBanner } from '@/components/PerspectiveBanner';
import { cn } from '@/lib/utils';

const PERSONAS: { id: Persona; label: string; sub: string; role: string; icon: ReactNode }[] = [
  { id: 'bank', label: 'Coop Pank', sub: 'Kadri Rehe · krediidianalüütik', role: 'Pank', icon: <Landmark className="h-4 w-4" /> },
  { id: 'merchant', label: 'Bauhof Group', sub: 'CFO · faktooringi klient', role: 'Müüja', icon: <Building2 className="h-4 w-4" /> },
  { id: 'buyer', label: 'GTC Constructions', sub: 'raamatupidaja · ostja', role: 'Ostja', icon: <HardHat className="h-4 w-4" /> },
];

type Section = { id: string; label: string; icon: ReactNode; desc: string; group?: string };

const SECTIONS: Record<Persona, Section[]> = {
  bank: [
    { id: 'dashboard', label: 'Töölaud', icon: <LayoutDashboard className="h-4 w-4" />, desc: 'Portfelli seis, sündmuste voog ja finantseerimisbaas' },
    { id: 'portfolio', label: 'Portfell', icon: <Users className="h-4 w-4" />, desc: 'Ostjate limiidid ja reeglipõhised otsused' },
    { id: 'claims', label: 'Nõuded ja laekumised', icon: <ArrowLeftRight className="h-4 w-4" />, desc: 'Nõuete loomine, finantseerimine ja laekumiste sobitamine' },
    { id: 'merchant', label: 'Müüja vastuvõtt', icon: <Building2 className="h-4 w-4" />, desc: 'Bauhof Group AS faktooringutaotluse läbivaatus' },
    { id: 'aml', label: 'AML/KYC vastuvõtt', icon: <ShieldCheck className="h-4 w-4" />, desc: 'Uue ostja automaatne skreening ja limiit' },
    { id: 'rules', label: 'Reeglid ja mudelid', icon: <BookOpen className="h-4 w-4" />, desc: 'Otsusteguri reeglitabelid ja versioonid' },
    { id: 'pricing', label: 'Hinnakiri ja seadistus', icon: <Receipt className="h-4 w-4" />, desc: 'PR-reeglid, tasud ja näidisarvutus' },
    { id: 'audit', label: 'Auditi jälg', icon: <ScrollText className="h-4 w-4" />, desc: 'Iga sündmus, iga reegel, iga kinnitaja' },
    { id: 'settings', label: 'Seaded', icon: <SlidersHorizontal className="h-4 w-4" />, desc: 'Integratsioonid, mida pank vajab platvormi käitamiseks' },
    { id: 'demo', label: 'Sündmuste simulaator', icon: <Zap className="h-4 w-4" />, group: 'Demo tööriistad', desc: 'Käivita demosündmus ja jälgi automaatset korduvhindamist' },
  ],
  merchant: [
    { id: 'overview', label: 'Ülevaade', icon: <LayoutDashboard className="h-4 w-4" />, desc: 'Faktooringulimiit, kulud ja teavitused' },
    { id: 'buyers', label: 'Ostjad', icon: <Users className="h-4 w-4" />, desc: 'Ostjate register ja faktooringulimiidid' },
    { id: 'invoices', label: 'Arved', icon: <FileText className="h-4 w-4" />, desc: 'Kõik arved, tõendid ja vIBAN-id' },
    { id: 'sync', label: 'Andmeside', icon: <RefreshCw className="h-4 w-4" />, desc: 'Raamatupidamistarkvara ja pangaga automaatne andmeside' },
    { id: 'application', label: 'Taotlus ja leping', icon: <ScrollText className="h-4 w-4" />, desc: 'Faktooringutaotlus FAC-2026-0412 ja leping' },
  ],
  buyer: [
    { id: 'portal', label: 'Kliendiportaal', icon: <Inbox className="h-4 w-4" />, desc: 'Bauhofi kliendiportaal — arved ja maksetingimused' },
  ],
};

// Ärikliendihalduri (müüja alamroll) piiratud menüü — fasilitaati, reserve ega seadistusi ei näe
const MANAGER_SECTIONS: Section[] = [
  { id: 'overview', label: 'Minu kliendid', icon: <Users className="h-4 w-4" />, desc: 'Laagri kaupluse ärikliendid — limiidid, kasutus ja staatused' },
  { id: 'invoices', label: 'Arved', icon: <FileText className="h-4 w-4" />, desc: 'Minu klientide arved (piiratud vaade)' },
  { id: 'offers', label: 'Maksa hiljem', icon: <CalendarClock className="h-4 w-4" />, desc: 'Pikendatud maksetähtaja pakkumised klientidele' },
];

function Shell() {
  const { persona, setPersona, bankRole, merchantRole } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [sectionByPersona, setSectionByPersona] = useState<Record<Persona, string>>({
    bank: 'dashboard',
    merchant: 'overview',
    buyer: 'portal',
  });
  const section = sectionByPersona[persona];
  const activePersona = PERSONAS.find((p) => p.id === persona)!;
  // Ärikliendihalduri rollil on piiratud menüü (müüja persona alamroll)
  const sectionList = persona === 'merchant' && merchantRole === 'manager' ? MANAGER_SECTIONS : SECTIONS[persona];
  const activeSection = sectionList.find((s) => s.id === section) ?? sectionList[0];

  const pickSection = (id: string) => setSectionByPersona((m) => ({ ...m, [persona]: id }));

  const navItem = (active: boolean, extra?: string) =>
    cn(
      'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm w-full text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
      active ? 'bg-sidebar-accent font-medium text-sidebar-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
      collapsed && 'justify-center px-0',
      extra
    );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={cn('bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 sticky top-0 h-screen transition-all', collapsed ? 'w-[4.5rem]' : 'w-64')}>
        {/* Brand row — only real logos; GTC (fictional) gets plain text, no monogram */}
        <div className={cn('flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border', collapsed && 'justify-center px-0')}>
          {persona === 'bank' && <img src="/logos/coop-pank.svg" alt="Coop Pank" className="h-5" />}
          {persona === 'merchant' && <img src="/logos/bauhof.svg" alt="Bauhof" className="h-6" />}
          {persona === 'buyer' && !collapsed && <span className="text-sm text-sidebar-foreground">GTC Constructions OÜ</span>}
          {persona === 'buyer' && collapsed && <HardHat className="h-4 w-4 text-muted-foreground" />}
          {!collapsed && <span className="text-xs text-muted-foreground">| {activePersona.role}</span>}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Persona switcher as nav group */}
          <div>
            {!collapsed && <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vaated</div>}
            <div className="space-y-0.5" role="group" aria-label="Vaheta vaadet">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  aria-pressed={persona === p.id}
                  className={navItem(persona === p.id)}
                  title={collapsed ? `${p.label} — ${p.sub}` : p.sub}
                >
                  {p.icon}
                  {!collapsed && <span className="truncate">{p.label}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Persona sections, grouped */}
          {(() => {
            const groups: { name?: string; items: Section[] }[] = [];
            for (const s of sectionList) {
              const g = groups.find((x) => x.name === s.group);
              if (g) g.items.push(s);
              else groups.push({ name: s.group, items: [s] });
            }
            return groups.map((g, gi) => (
              <div key={g.name ?? 'main'}>
                {!collapsed && (g.name || gi > 0) && (
                  <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.name ?? 'Vaade'}</div>
                )}
                <div className="space-y-0.5">
                  {g.items.map((s) => (
                    <button key={s.id} onClick={() => pickSection(s.id)} aria-pressed={section === s.id} className={navItem(section === s.id)} title={collapsed ? s.label : undefined}>
                      {s.icon}
                      {!collapsed && <span className="truncate">{s.label}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ));
          })()}

          {/* Bank production checklist (preserved from earlier rounds) */}
          {persona === 'bank' && !collapsed && (
            <div>
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enne tootmisse</div>
              <div className="px-3 text-[11px] text-muted-foreground space-y-2">
                <div className="flex items-start gap-1.5"><BellRing className="h-3 w-3 mt-0.5 shrink-0" />Pandi-registri päring reg-koodi kaupa</div>
                <div className="flex items-start gap-1.5"><BellRing className="h-3 w-3 mt-0.5 shrink-0" />Tarnekinnituse tasemed (ePOD)</div>
                <div className="flex items-start gap-1.5"><BellRing className="h-3 w-3 mt-0.5 shrink-0" />Krediidikindlustuse liini sidumine</div>
                <div className="flex items-start gap-1.5"><BellRing className="h-3 w-3 mt-0.5 shrink-0" />Smart-ID allkirjastamine</div>
              </div>
            </div>
          )}
        </nav>

        {/* Footer: role + disclaimer + collapse */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          {!collapsed && (
            <>
              <div className="flex items-center gap-2.5 px-1">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold shrink-0">
                  {persona === 'bank' ? 'KR' : persona === 'merchant' ? 'CFO' : 'RP'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-sidebar-foreground truncate">{activePersona.role}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{activePersona.sub}</div>
                </div>
              </div>
              <div className="px-1 text-[11px] text-muted-foreground">Näidisandmed — demo: kõik numbrid fiktiivsed.</div>
            </>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center justify-center gap-1.5 w-full rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-label={collapsed ? 'Laienda külgriba' : 'Ahenda külgriba'}
            title={collapsed ? 'Laienda külgriba' : 'Ahenda külgriba'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" />Ahenda</>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="border-b px-6 py-5 flex items-start gap-4 shrink-0">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{activeSection.label}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{activeSection.desc}</p>
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground shrink-0 pt-1">
            {persona === 'bank' && section === 'dashboard' && <BankRoleSwitch />}
            {persona === 'merchant' && section === 'overview' && <MerchantRoleSwitch />}
            {activePersona.icon}
            <span>
              {persona === 'bank' && <>Coop Pank · {BANK_ROLES.find((r) => r.id === bankRole)?.label}</>}
              {persona === 'merchant' && (merchantRole === 'manager' ? <>Bauhof Group · {MANAGER.role} · {MANAGER.store} ({MANAGER.name})</> : <>Bauhof Group · CFO</>)}
              {persona === 'buyer' && <>{activePersona.label} · {activePersona.sub}</>}
            </span>
          </div>
        </header>
        <PerspectiveBanner />
        <main className="flex-1 overflow-y-auto p-6">
          {persona === 'bank' && <BankHome section={section} onNavigate={pickSection} />}
          {persona === 'merchant' && <MerchantHome section={section} />}
          {persona === 'buyer' && <BuyerHome />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
