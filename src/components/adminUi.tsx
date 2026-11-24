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

/* ───────────── Sistema visual do painel ─────────────
   Três níveis de superfície, para o olho separar "página" de "bloco" de "item":
   1. fundo da página  → #0a0a0c
   2. Section (bloco)  → #121216 com faixa de cabeçalho, ícone e barra de cor na lateral
   3. item dentro do bloco → card / cardInset (um tom mais claro / mais escuro)
   E cada função tem uma cor própria (TONE), usada de forma consistente em todas as telas. */

export const card = 'bg-[#17171c] border border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';
export const cardInset = 'bg-black/25 border border-white/[0.07]';
export const inp =
  'h-11 w-full bg-black/40 border border-white/10 focus:border-white/45 outline-none px-3 text-sm text-white placeholder:text-white/30 transition-colors';
export const lbl = 'block text-[11px] uppercase tracking-[0.18em] text-white/45 mb-1.5';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 h-10 px-4 border border-white/15 hover:border-white/40 hover:bg-white/5 text-xs uppercase tracking-[0.14em] font-semibold text-white/85 transition-colors cursor-pointer';
export const btnSolid =
  'inline-flex items-center justify-center gap-2 h-11 px-6 bg-white text-black hover:bg-neutral-200 text-xs uppercase tracking-[0.16em] font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
export const btnSuccess =
  'inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-emerald-400 hover:bg-emerald-300 text-black text-xs uppercase tracking-[0.12em] font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
export const btnDangerGhost =
  'inline-flex items-center justify-center gap-1.5 h-10 px-3 border border-white/15 hover:border-rose-400/50 hover:text-rose-300 text-xs uppercase tracking-[0.12em] font-semibold text-white/70 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

/** Cor por função. As classes ficam escritas por extenso para o Tailwind enxergar todas. */
export type Tone = 'neutral' | 'emerald' | 'sky' | 'warn' | 'rose' | 'violet';
export const TONE: Record<Tone, { text: string; bar: string; dot: string; soft: string; border: string }> = {
  neutral: { text: 'text-white/75', bar: 'bg-white/35', dot: 'bg-white/50', soft: 'bg-white/[0.06]', border: 'border-white/15' },
  emerald: { text: 'text-emerald-300', bar: 'bg-emerald-400', dot: 'bg-emerald-400', soft: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  sky: { text: 'text-sky-300', bar: 'bg-sky-400', dot: 'bg-sky-400', soft: 'bg-sky-400/10', border: 'border-sky-400/30' },
  warn: { text: 'text-[#f0b968]', bar: 'bg-[#f0b968]', dot: 'bg-[#f0b968]', soft: 'bg-[#f0b968]/10', border: 'border-[#f0b968]/30' },
  rose: { text: 'text-rose-300', bar: 'bg-rose-400', dot: 'bg-rose-400', soft: 'bg-rose-400/10', border: 'border-rose-400/30' },
  violet: { text: 'text-violet-300', bar: 'bg-violet-400', dot: 'bg-violet-400', soft: 'bg-violet-400/10', border: 'border-violet-400/30' },
};

export const STATUS = {
  confirmed: { label: 'Confirmado', tone: 'emerald' as Tone, cls: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25' },
  completed: { label: 'Concluído', tone: 'sky' as Tone, cls: 'text-sky-300 bg-sky-400/10 border-sky-400/25' },
  cancelled: { label: 'Cancelado', tone: 'rose' as Tone, cls: 'text-rose-300 bg-rose-400/10 border-rose-400/25' },
} as const;

/** Cor de cada categoria de serviço */
export const CATEGORY_TONE: Record<string, Tone> = {
  cabelo: 'sky',
  barba: 'warn',
  combo: 'violet',
  visagismo: 'emerald',
  outro: 'neutral',
};

export const StatusBadge: React.FC<{ status: keyof typeof STATUS }> = ({ status }) => {
  const st = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] font-semibold border px-2 py-0.5 ${st.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${TONE[st.tone].dot}`} />
      {st.label}
    </span>
  );
};

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

/** Cabeçalho da página (título grande + ações), separado do conteúdo por uma linha. */
export const PageHead: React.FC<{ title: string; subtitle?: string; eyebrow?: string; right?: React.ReactNode }> = ({ title, subtitle, eyebrow, right }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 pb-6 mb-7 border-b border-white/[0.1]">
    <div>
      {eyebrow && <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-white/35">{eyebrow}</p>}
      <h2 className="font-serif text-[2rem] sm:text-4xl leading-none">{title}</h2>
      {subtitle && <p className="mt-2.5 text-sm text-white/50 first-letter:uppercase">{subtitle}</p>}
    </div>
    {right}
  </div>
);

/** Título de grupo: separa blocos de assuntos diferentes dentro da mesma página. */
export const SectionLabel: React.FC<{ children: React.ReactNode; tone?: Tone; hint?: string; right?: React.ReactNode }> = ({
  children, tone = 'neutral', hint, right,
}) => (
  <div className="flex items-center gap-3 mt-9 mb-3.5 first:mt-0">
    <span className={`w-2 h-2 rounded-full shrink-0 ${TONE[tone].dot}`} />
    <h3 className="text-[11px] uppercase tracking-[0.24em] font-semibold text-white/65 whitespace-nowrap">{children}</h3>
    <span className="flex-1 h-px bg-white/[0.09]" />
    {hint && <span className="text-[11px] text-white/35 text-right">{hint}</span>}
    {right}
  </div>
);

/** Bloco: cabeçalho com ícone e título + corpo. É o que faz cada função parecer uma "caixa" própria. */
export const Section: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  right?: React.ReactNode;
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, tone = 'neutral', right, flush, className = '', children }) => {
  const t = TONE[tone];
  return (
    <section className={`relative overflow-hidden bg-[#121216] border border-white/[0.1] ${className}`}>
      <span aria-hidden className={`absolute left-0 top-0 bottom-0 w-[3px] ${t.bar}`} />
      <header className="flex flex-wrap items-center justify-between gap-3 pl-6 pr-4 sm:pr-5 py-4 bg-white/[0.04] border-b border-white/[0.09]">
        <div className="flex items-center gap-3 min-w-0">
          {icon && <span className={`w-10 h-10 shrink-0 flex items-center justify-center border ${t.border} ${t.soft} ${t.text}`}>{icon}</span>}
          <div className="min-w-0">
            <h3 className="font-serif text-xl sm:text-2xl leading-tight">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs sm:text-[13px] text-white/45 leading-snug">{subtitle}</p>}
          </div>
        </div>
        {right}
      </header>
      <div className={flush ? '' : 'p-4 sm:p-6 pl-5 sm:pl-7'}>{children}</div>
    </section>
  );
};

/** Aviso (folga, intervalo, bloqueio): faixa colorida, claramente diferente de um agendamento. */
export const Notice: React.FC<{ tone: Tone; icon: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }> = ({
  tone, icon, title, children, action,
}) => {
  const t = TONE[tone];
  return (
    <div className={`flex items-center justify-between gap-3 border border-l-[3px] ${t.border} ${t.soft} px-4 py-3`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className={`shrink-0 ${t.text}`}>{icon}</span>
        <p className="text-sm min-w-0 text-white/70">
          <b className={`font-semibold ${t.text}`}>{title}</b>
          {children && <span className="text-white/60"> · {children}</span>}
        </p>
      </div>
      {action}
    </div>
  );
};

/** Indicador numérico. `featured` = cartão claro (o dado mais importante da tela). */
export const Stat: React.FC<{
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: Tone;
  featured?: boolean;
}> = ({ label, value, hint, icon, tone = 'neutral', featured }) => {
  const t = TONE[tone];
  if (featured) {
    return (
      <div className="relative bg-[#ecece8] text-black border border-white/70 p-4 sm:p-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-black/55">{label}</p>
          <p className="mt-2 font-serif text-3xl sm:text-4xl leading-none tabular-nums">{value}</p>
          {hint && <p className="mt-2 text-xs text-black/60 truncate">{hint}</p>}
        </div>
        <span className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-black/10 text-black/75">{icon}</span>
      </div>
    );
  }
  return (
    <div className={`${card} relative overflow-hidden p-4 sm:p-5 flex items-start justify-between gap-3`}>
      <span aria-hidden className={`absolute left-0 right-0 top-0 h-[3px] ${t.bar}`} />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">{label}</p>
        <p className={`mt-2 font-serif text-3xl sm:text-4xl leading-none tabular-nums ${tone === 'neutral' ? '' : t.text}`}>{value}</p>
        {hint && <p className="mt-2 text-xs text-white/40 truncate">{hint}</p>}
      </div>
      <span className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-full border ${t.border} ${t.soft} ${t.text}`}>{icon}</span>
    </div>
  );
};

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
