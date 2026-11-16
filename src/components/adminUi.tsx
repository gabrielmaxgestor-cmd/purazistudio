import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { BreakRule, todayStr } from '../utils/bookingLogic';

/* Estilos, formatadores e pequenos componentes compartilhados pelas telas do painel do barbeiro. */

export const WEEK_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
export const WEEK_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // segunda → domingo

export const brl = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return todayStr(d);
};
export const longDate = (s: string) =>
  parseDate(s).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
export const shortBR = (s: string) => s.split('-').reverse().slice(0, 2).join('/');
export const fmtPhone = (p: string) => {
  const d = p.replace(/\D/g, '');
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : p;
};
export const countSlots = (start: string, end: string, interval: number) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const total = eh * 60 + em - (sh * 60 + sm);
  return total > 0 ? Math.ceil(total / (interval || 45)) : 0;
};
export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

export const card = 'bg-[#141417] border border-white/[0.08]';
export const inp =
  'h-11 w-full bg-black/40 border border-white/10 focus:border-white/45 outline-none px-3 text-sm text-white placeholder:text-white/30 transition-colors';
export const lbl = 'block text-[11px] uppercase tracking-[0.18em] text-white/45 mb-1.5';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 h-10 px-4 border border-white/15 hover:border-white/40 hover:bg-white/5 text-xs uppercase tracking-[0.14em] font-semibold text-white/85 transition-colors cursor-pointer';
export const btnSolid =
  'inline-flex items-center justify-center gap-2 h-11 px-6 bg-white text-black hover:bg-neutral-200 text-xs uppercase tracking-[0.16em] font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

export const STATUS = {
  confirmed: { label: 'Confirmado', cls: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25' },
  completed: { label: 'Concluído', cls: 'text-sky-300 bg-sky-400/10 border-sky-400/25' },
  cancelled: { label: 'Cancelado', cls: 'text-rose-300 bg-rose-400/10 border-rose-400/25' },
} as const;

export const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string }> = ({ on, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${on ? 'bg-emerald-400' : 'bg-white/15'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
  </button>
);

export const PageHead: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode }> = ({ title, subtitle, right }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
    <div>
      <h2 className="font-serif text-[1.9rem] sm:text-4xl leading-none">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-white/50 first-letter:uppercase">{subtitle}</p>}
    </div>
    {right}
  </div>
);

export const Stat: React.FC<{ label: string; value: string; hint?: string; icon: React.ReactNode }> = ({ label, value, hint, icon }) => (
  <div className={`${card} p-4 sm:p-5 flex items-start justify-between gap-3`}>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 font-serif text-2xl sm:text-3xl leading-none">{value}</p>
      {hint && <p className="mt-2 text-xs text-white/40">{hint}</p>}
    </div>
    <span className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/70">{icon}</span>
  </div>
);

/** Botão de exclusão com confirmação em 2 toques (evita apagar sem querer) */
export const ConfirmDelete: React.FC<{ onConfirm: () => void; label?: string; icon?: React.ReactNode; disabled?: boolean }> = ({ onConfirm, label = 'Remover', icon, disabled }) => {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className={`inline-flex items-center gap-1.5 h-9 px-3 text-[11px] uppercase tracking-[0.14em] font-semibold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        armed ? 'bg-rose-500 border-rose-500 text-white' : 'border-white/15 text-white/60 hover:text-rose-300 hover:border-rose-400/40'
      }`}
    >
      {icon ?? <Trash2 className="w-3.5 h-3.5" />}
      {armed ? 'Confirmar?' : label}
    </button>
  );
};

/** Deixa a lista de intervalos sempre no mesmo formato (para comparar "salvo" x "editando"). */
export const normBreaks = (list: BreakRule[]): BreakRule[] =>
  list.map((b) => ({ start: b.start, end: b.end, days: [...b.days].sort((a, c) => a - c), label: (b.label || '').trim() }));
