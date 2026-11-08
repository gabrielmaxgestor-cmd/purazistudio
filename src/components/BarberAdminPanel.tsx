import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Calendar, Clock, Scissors, Users, TrendingUp, Plus, Trash2, CheckCircle2, XCircle, RotateCcw,
  MessageCircle, ChevronLeft, ChevronRight, LogOut, KeyRound, Pencil, Search, Ban, Save, Check, Copy,
} from 'lucide-react';
import {
  Service, Appointment, BlockedSlot, BarberSettings, DEFAULT_BARBER_SETTINGS,
  getDaySchedule, todayStr,
} from '../utils/bookingLogic';
import {
  getStoredAppointments, updateAppointmentStatus, getStoredServices, saveServices,
  getStoredBlockedSlots, saveBlockedSlots, getStoredBarberSettings, saveBarberSettings,
} from '../utils/storage';
import { isLoggedIn, logout, changePassword, getAuthMode, getExportableHash } from '../utils/adminAuth';
import { AdminLogin } from './AdminLogin';

/* ───────────────────────── helpers ───────────────────────── */

type Tab = 'agenda' | 'horarios' | 'servicos' | 'clientes' | 'resumo';

const WEEK_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const WEEK_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // segunda → domingo

const brl = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;
const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s: string, n: number) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return todayStr(d);
};
const longDate = (s: string) =>
  parseDate(s).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const shortBR = (s: string) => s.split('-').reverse().slice(0, 2).join('/');
const fmtPhone = (p: string) => {
  const d = p.replace(/\D/g, '');
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : p;
};
const countSlots = (start: string, end: string, interval: number) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const total = eh * 60 + em - (sh * 60 + sm);
  return total > 0 ? Math.ceil(total / (interval || 45)) : 0;
};
const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

const card = 'bg-[#141417] border border-white/[0.08]';
const inp =
  'h-11 w-full bg-black/40 border border-white/10 focus:border-white/45 outline-none px-3 text-sm text-white placeholder:text-white/30 transition-colors';
const lbl = 'block text-[11px] uppercase tracking-[0.18em] text-white/45 mb-1.5';
const btnGhost =
  'inline-flex items-center justify-center gap-2 h-10 px-4 border border-white/15 hover:border-white/40 hover:bg-white/5 text-xs uppercase tracking-[0.14em] font-semibold text-white/85 transition-colors cursor-pointer';
const btnSolid =
  'inline-flex items-center justify-center gap-2 h-11 px-6 bg-white text-black hover:bg-neutral-200 text-xs uppercase tracking-[0.16em] font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

const STATUS = {
  confirmed: { label: 'Confirmado', cls: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25' },
  completed: { label: 'Concluído', cls: 'text-sky-300 bg-sky-400/10 border-sky-400/25' },
  cancelled: { label: 'Cancelado', cls: 'text-rose-300 bg-rose-400/10 border-rose-400/25' },
} as const;

const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string }> = ({ on, onChange, label }) => (
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

const PageHead: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode }> = ({ title, subtitle, right }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
    <div>
      <h2 className="font-serif text-[1.9rem] sm:text-4xl leading-none">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-white/50 first-letter:uppercase">{subtitle}</p>}
    </div>
    {right}
  </div>
);

const Stat: React.FC<{ label: string; value: string; hint?: string; icon: React.ReactNode }> = ({ label, value, hint, icon }) => (
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
const ConfirmDelete: React.FC<{ onConfirm: () => void; label?: string }> = ({ onConfirm, label = 'Remover' }) => {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className={`inline-flex items-center gap-1.5 h-9 px-3 text-[11px] uppercase tracking-[0.14em] font-semibold border transition-colors cursor-pointer ${
        armed ? 'bg-rose-500 border-rose-500 text-white' : 'border-white/15 text-white/60 hover:text-rose-300 hover:border-rose-400/40'
      }`}
    >
      <Trash2 className="w-3.5 h-3.5" />
      {armed ? 'Confirmar?' : label}
    </button>
  );
};

/* ───────────────────────── raiz: login + painel ───────────────────────── */

interface BarberAdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export const BarberAdminPanel: React.FC<BarberAdminPanelProps> = ({ isOpen, onClose, onDataChanged }) => {
  const [authed, setAuthed] = useState(isLoggedIn());

  useEffect(() => {
    if (isOpen) setAuthed(isLoggedIn());
  }, [isOpen]);

  // expira a sessão enquanto o painel está aberto
  useEffect(() => {
    if (!isOpen || !authed) return;
    const t = window.setInterval(() => {
      if (!isLoggedIn()) setAuthed(false);
    }, 30000);
    return () => window.clearInterval(t);
  }, [isOpen, authed]);

  if (!isOpen) return null;
  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} onClose={onClose} />;
  return (
    <AdminShell
      onClose={onClose}
      onLogout={() => {
        logout();
        setAuthed(false);
        onClose();
      }}
      onDataChanged={onDataChanged}
    />
  );
};

/* ───────────────────────── painel ───────────────────────── */

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'agenda', label: 'Agenda', icon: <Calendar className="w-5 h-5" /> },
  { id: 'horarios', label: 'Horários', icon: <Clock className="w-5 h-5" /> },
  { id: 'servicos', label: 'Serviços', icon: <Scissors className="w-5 h-5" /> },
  { id: 'clientes', label: 'Clientes', icon: <Users className="w-5 h-5" /> },
  { id: 'resumo', label: 'Resumo', icon: <TrendingUp className="w-5 h-5" /> },
];

const AdminShell: React.FC<{ onClose: () => void; onLogout: () => void; onDataChanged?: () => void }> = ({
  onClose, onLogout, onDataChanged,
}) => {
  const [tab, setTab] = useState<Tab>('agenda');
  const [agendaView, setAgendaView] = useState<'day' | 'week'>('day');
  const [selectedDate, setSelectedDate] = useState(todayStr());

  const [appointments, setAppointments] = useState<Appointment[]>(() => getStoredAppointments());
  const [services, setServices] = useState<Service[]>(() => getStoredServices());
  const [blocked, setBlocked] = useState<BlockedSlot[]>(() => getStoredBlockedSlots());
  const [settings, setSettings] = useState<BarberSettings>(() => getStoredBarberSettings());

  const [toast, setToast] = useState<string | null>(null);
  const [securityOpen, setSecurityOpen] = useState(false);

  // formulário de horários
  const [defStart, setDefStart] = useState(settings.workStart);
  const [defEnd, setDefEnd] = useState(settings.workEnd);
  const [interval, setIntervalMin] = useState(String(settings.intervalMinutes || 45));
  const [offDays, setOffDays] = useState<number[]>(settings.fixedOffDays || []);
  const [custom, setCustom] = useState<Record<number, { start: string; end: string } | undefined>>(settings.daySchedules || {});

  // formulário de bloqueio
  const [blkDate, setBlkDate] = useState(todayStr());
  const [blkMode, setBlkMode] = useState<'day' | 'range'>('range');
  const [blkFrom, setBlkFrom] = useState('12:00');
  const [blkTo, setBlkTo] = useState('14:00');
  const [blkReason, setBlkReason] = useState('');

  // serviços
  const emptyDraft = { name: '', price: '', duration: '45', category: 'cabelo' as Service['category'], description: '' };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [clientQuery, setClientQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !securityOpen && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, securityOpen]);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };
  const changed = () => onDataChanged?.();

  /* ----- agenda ----- */
  const setStatus = (id: string, status: Appointment['status']) => {
    setAppointments(updateAppointmentStatus(id, status));
    notify(status === 'completed' ? 'Atendimento concluído.' : status === 'cancelled' ? 'Agendamento cancelado — horário liberado.' : 'Agendamento reaberto.');
    changed();
  };

  const dayApts = useMemo(
    () => appointments.filter((a) => a.dateStr === selectedDate).sort((a, b) => a.timeStr.localeCompare(b.timeStr)),
    [appointments, selectedDate]
  );
  const dayBlocks = blocked.filter((b) => b.dateStr === selectedDate);
  const dayActive = dayApts.filter((a) => a.status !== 'cancelled');
  const dayRevenue = dayActive.reduce((s, a) => s + a.price, 0);
  const daySchedule = getDaySchedule(selectedDate, settings);
  const nowStr = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
  const nextApt = selectedDate === todayStr() ? dayActive.find((a) => a.status === 'confirmed' && a.timeStr >= nowStr) : dayActive.find((a) => a.status === 'confirmed');

  const weekStart = useMemo(() => {
    const d = parseDate(selectedDate);
    const diff = (d.getDay() + 6) % 7; // segunda = 0
    return addDays(selectedDate, -diff);
  }, [selectedDate]);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  /* ----- horários ----- */
  const built: BarberSettings = useMemo(() => {
    const ds: Record<number, { start: string; end: string }> = {};
    WEEK_ORDER.forEach((wd) => {
      const c = custom[wd];
      if (!offDays.includes(wd) && c && (c.start !== defStart || c.end !== defEnd)) ds[wd] = c;
    });
    return { fixedOffDays: offDays, workStart: defStart, workEnd: defEnd, intervalMinutes: parseInt(interval, 10) || 45, daySchedules: ds };
  }, [offDays, custom, defStart, defEnd, interval]);

  const dirty = JSON.stringify(built) !== JSON.stringify({ ...DEFAULT_BARBER_SETTINGS, ...settings, daySchedules: settings.daySchedules || {} });

  const saveSettings = () => {
    if (defStart >= defEnd) return notify('O horário de fechamento precisa ser depois da abertura.');
    for (const wd of WEEK_ORDER) {
      const c = built.daySchedules?.[wd];
      if (c && c.start >= c.end) return notify(`${WEEK_LONG[wd]}: o fechamento precisa ser depois da abertura.`);
    }
    saveBarberSettings(built);
    setSettings(built);
    notify('Horários salvos! Já valem na agenda dos clientes.');
    changed();
  };

  const addBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (blkMode === 'range' && blkFrom >= blkTo) return notify('O horário final precisa ser depois do inicial.');
    const nb: BlockedSlot = {
      id: `blk-${Date.now()}`,
      dateStr: blkDate,
      timeStr: blkMode === 'day' ? undefined : blkFrom,
      endTimeStr: blkMode === 'day' ? undefined : blkTo,
      reason: blkReason.trim() || (blkMode === 'day' ? 'Folga' : 'Bloqueio'),
    };
    const next = [nb, ...blocked];
    setBlocked(next);
    saveBlockedSlots(next);
    setBlkReason('');
    notify(blkMode === 'day' ? 'Dia bloqueado.' : `Horários de ${blkFrom} às ${blkTo} bloqueados.`);
    changed();
  };

  const removeBlock = (id: string) => {
    const next = blocked.filter((b) => b.id !== id);
    setBlocked(next);
    saveBlockedSlots(next);
    notify('Bloqueio removido — horários liberados.');
    changed();
  };

  const applyPreset = (p: 'day' | 'morning' | 'afternoon' | 'evening') => {
    const day = getDaySchedule(blkDate, settings) || { start: defStart, end: defEnd };
    if (p === 'day') return setBlkMode('day');
    setBlkMode('range');
    if (p === 'morning') { setBlkFrom(day.start); setBlkTo('12:00'); }
    if (p === 'afternoon') { setBlkFrom('12:00'); setBlkTo('18:00'); }
    if (p === 'evening') { setBlkFrom('18:00'); setBlkTo(day.end); }
  };

  const upcomingBlocks = [...blocked].filter((b) => b.dateStr >= todayStr()).sort((a, b) => a.dateStr.localeCompare(b.dateStr) || (a.timeStr || '').localeCompare(b.timeStr || ''));

  /* ----- serviços ----- */
  const startEdit = (s: Service) => {
    setEditingId(s.id);
    setDraft({ name: s.name, price: String(s.price), duration: String(s.durationMinutes), category: s.category, description: s.description || '' });
    document.getElementById('admin-main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const resetDraft = () => { setDraft(emptyDraft); setEditingId(null); };

  const submitService = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(draft.price.replace(',', '.'));
    if (!draft.name.trim() || isNaN(price)) return notify('Informe o nome e o preço do serviço.');
    const data = { name: draft.name.trim(), price, durationMinutes: parseInt(draft.duration, 10) || 30, category: draft.category, description: draft.description.trim() || undefined };
    const next = editingId
      ? services.map((s) => (s.id === editingId ? { ...s, ...data } : s))
      : [...services, { id: `svc-${Date.now()}`, ...data }];
    setServices(next);
    saveServices(next);
    notify(editingId ? 'Serviço atualizado.' : `Serviço "${data.name}" cadastrado.`);
    resetDraft();
    changed();
  };

  const deleteService = (id: string) => {
    if (services.length <= 1) return notify('Mantenha pelo menos um serviço cadastrado.');
    const next = services.filter((s) => s.id !== id);
    setServices(next);
    saveServices(next);
    notify('Serviço removido.');
    changed();
  };

  /* ----- clientes / resumo ----- */
  const clients = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; visits: number; spent: number; last: string; fav: Record<string, number> }>();
    appointments.forEach((a) => {
      const c = map.get(a.clientPhone) || { name: a.clientName, phone: a.clientPhone, visits: 0, spent: 0, last: a.dateStr, fav: {} };
      if (a.status !== 'cancelled') {
        c.visits += 1;
        c.spent += a.price;
        c.fav[a.serviceName] = (c.fav[a.serviceName] || 0) + 1;
      }
      if (a.dateStr >= c.last) { c.last = a.dateStr; c.name = a.clientName; }
      map.set(a.clientPhone, c);
    });
    return Array.from(map.values()).sort((a, b) => b.spent - a.spent);
  }, [appointments]);
  const filteredClients = clients.filter((c) => (c.name + c.phone).toLowerCase().includes(clientQuery.toLowerCase()));

  const month = todayStr().slice(0, 7);
  const monthApts = appointments.filter((a) => a.dateStr.startsWith(month));
  const monthValid = monthApts.filter((a) => a.status !== 'cancelled');
  const monthRevenue = monthValid.reduce((s, a) => s + a.price, 0);
  const ticket = monthValid.length ? monthRevenue / monthValid.length : 0;
  const monthCancelled = monthApts.length - monthValid.length;
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(todayStr(), i - 6);
    const total = appointments.filter((a) => a.dateStr === d && a.status !== 'cancelled').reduce((s, a) => s + a.price, 0);
    return { d, total };
  });
  const maxBar = Math.max(1, ...last7.map((x) => x.total));
  const topServices = Object.entries(
    monthValid.reduce<Record<string, number>>((acc, a) => ((acc[a.serviceName] = (acc[a.serviceName] || 0) + 1), acc), {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  /* ───────────────────────── render ───────────────────────── */
  return (
    <div className="fixed inset-0 z-50 bg-[#0c0c0e] text-white flex flex-col md:flex-row h-[100dvh]" role="dialog" aria-modal="true" aria-label="Painel do barbeiro">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col min-h-0 border-r border-white/[0.08] bg-[#101013]">
        <div className="px-6 pt-7 pb-6 border-b border-white/[0.08]">
          <img src="/assets/logo-purazi-white.png" alt="PURAZI Studio" className="h-9 w-auto" />
          <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-white/40">Painel do barbeiro</p>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`relative w-full flex items-center gap-3 h-12 px-4 text-sm font-medium transition-colors cursor-pointer ${
                tab === n.id ? 'bg-white/[0.07] text-white' : 'text-white/55 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {tab === n.id && <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-white" />}
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>
        <div className="shrink-0 p-3 border-t border-white/[0.08] space-y-1">
          <button onClick={() => setSecurityOpen(true)} className="w-full flex items-center gap-3 h-11 px-4 text-sm text-white/55 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer">
            <KeyRound className="w-4 h-4" /> Segurança
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-3 h-11 px-4 text-sm text-white/55 hover:text-rose-300 hover:bg-white/[0.04] transition-colors cursor-pointer">
            <LogOut className="w-4 h-4" /> Sair
          </button>
          <button onClick={onClose} className="w-full flex items-center gap-3 h-11 px-4 text-sm text-white/55 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer">
            <X className="w-4 h-4" /> Fechar painel
          </button>
        </div>
      </aside>

      {/* Barra superior (mobile) */}
      <header className="md:hidden shrink-0 flex items-center justify-between h-14 px-4 border-b border-white/[0.08] bg-[#101013] pt-[env(safe-area-inset-top,0px)] box-content">
        <img src="/assets/logo-purazi-white.png" alt="PURAZI Studio" className="h-7 w-auto" />
        <div className="flex items-center">
          <button onClick={() => setSecurityOpen(true)} className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white cursor-pointer" aria-label="Segurança"><KeyRound className="w-5 h-5" /></button>
          <button onClick={onLogout} className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-rose-300 cursor-pointer" aria-label="Sair"><LogOut className="w-5 h-5" /></button>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white cursor-pointer" aria-label="Fechar painel"><X className="w-6 h-6" /></button>
        </div>
      </header>

      {/* Conteúdo (rola sozinho) */}
      <main id="admin-main" className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10 pb-28 md:pb-12">
          {/* ───────── AGENDA ───────── */}
          {tab === 'agenda' && (
            <section>
              <PageHead
                title="Agenda"
                subtitle={longDate(selectedDate)}
                right={
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex border border-white/15">
                      {(['day', 'week'] as const).map((v) => (
                        <button key={v} onClick={() => setAgendaView(v)} className={`h-10 px-4 text-xs uppercase tracking-[0.14em] font-semibold cursor-pointer transition-colors ${agendaView === v ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}>
                          {v === 'day' ? 'Dia' : 'Semana'}
                        </button>
                      ))}
                    </div>
                    <button className={btnGhost} onClick={() => setSelectedDate(addDays(selectedDate, agendaView === 'day' ? -1 : -7))} aria-label="Anterior"><ChevronLeft className="w-4 h-4" /></button>
                    <button className={btnGhost} onClick={() => setSelectedDate(todayStr())}>Hoje</button>
                    <button className={btnGhost} onClick={() => setSelectedDate(addDays(selectedDate, agendaView === 'day' ? 1 : 7))} aria-label="Próximo"><ChevronRight className="w-4 h-4" /></button>
                    <input type="date" value={selectedDate} onChange={(e) => e.target.value && setSelectedDate(e.target.value)} className={inp + ' !w-auto'} aria-label="Escolher data" />
                  </div>
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <Stat label="Agendamentos" value={String(dayActive.length)} hint={daySchedule ? `${dayApts.length - dayActive.length} cancelado(s)` : 'Dia de folga'} icon={<Calendar className="w-4 h-4" />} />
                <Stat label="Faturamento do dia" value={brl(dayRevenue)} hint="exceto cancelados" icon={<TrendingUp className="w-4 h-4" />} />
                <Stat label={selectedDate === todayStr() ? 'Próximo cliente' : 'Primeiro cliente'} value={nextApt ? nextApt.timeStr : '—'} hint={nextApt ? nextApt.clientName : 'Sem agendamentos'} icon={<Clock className="w-4 h-4" />} />
              </div>

              {agendaView === 'day' ? (
                <div className="space-y-3">
                  {!daySchedule && (
                    <div className="flex items-center gap-3 p-4 border border-amber-400/25 bg-amber-400/[0.07] text-amber-200 text-sm"><Ban className="w-4 h-4 shrink-0" /> Este dia é folga fixa — não recebe agendamentos.</div>
                  )}
                  {dayBlocks.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 p-4 border border-amber-400/25 bg-amber-400/[0.07]">
                      <div className="flex items-center gap-3 text-amber-200 text-sm min-w-0">
                        <Ban className="w-4 h-4 shrink-0" />
                        <span className="truncate"><b className="font-semibold">{!b.timeStr ? 'Dia inteiro bloqueado' : b.endTimeStr ? `Bloqueado ${b.timeStr}–${b.endTimeStr}` : `Bloqueado ${b.timeStr}`}</b> · {b.reason}</span>
                      </div>
                      <ConfirmDelete onConfirm={() => removeBlock(b.id)} label="Liberar" />
                    </div>
                  ))}

                  {dayApts.length === 0 && daySchedule && (
                    <div className={`${card} py-16 px-6 text-center`}>
                      <Calendar className="w-8 h-8 mx-auto text-white/25" />
                      <p className="mt-4 font-serif text-2xl">Nenhum agendamento neste dia</p>
                      <p className="mt-1 text-sm text-white/45">Quando um cliente marcar pelo site, ele aparece aqui.</p>
                    </div>
                  )}

                  {dayApts.map((a) => {
                    const st = STATUS[a.status];
                    return (
                      <article key={a.id} className={`${card} flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 ${a.status === 'cancelled' ? 'opacity-60' : ''}`}>
                        <div className="sm:w-24 shrink-0">
                          <p className="font-serif text-3xl leading-none tabular-nums">{a.timeStr}</p>
                          <p className="mt-1 text-[11px] text-white/40">{a.durationMinutes} min</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold truncate">{a.clientName}</h3>
                            <span className={`text-[10px] uppercase tracking-[0.14em] font-semibold border px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                          </div>
                          <p className="mt-1 text-sm text-white/60 truncate">{a.serviceName} · <span className="text-white">{brl(a.price)}</span></p>
                          <p className="mt-0.5 text-xs text-white/40">{fmtPhone(a.clientPhone)} · {a.code}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <a href={`https://wa.me/55${a.clientPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={btnGhost + ' !px-3'} aria-label="Chamar no WhatsApp"><MessageCircle className="w-4 h-4" /></a>
                          {a.status === 'confirmed' ? (
                            <>
                              <button onClick={() => setStatus(a.id, 'completed')} className="inline-flex items-center gap-1.5 h-10 px-4 bg-emerald-400 hover:bg-emerald-300 text-black text-xs uppercase tracking-[0.12em] font-bold cursor-pointer transition-colors"><CheckCircle2 className="w-4 h-4" />Concluir</button>
                              <button onClick={() => setStatus(a.id, 'cancelled')} className="inline-flex items-center gap-1.5 h-10 px-3 border border-white/15 hover:border-rose-400/50 hover:text-rose-300 text-xs uppercase tracking-[0.12em] font-semibold text-white/70 cursor-pointer transition-colors"><XCircle className="w-4 h-4" />Cancelar</button>
                            </>
                          ) : (
                            <button onClick={() => setStatus(a.id, 'confirmed')} className={btnGhost}><RotateCcw className="w-4 h-4" />Reabrir</button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {weekDays.map((d) => {
                    const sch = getDaySchedule(d, settings);
                    const list = appointments.filter((a) => a.dateStr === d && a.status !== 'cancelled');
                    const rev = list.reduce((s, a) => s + a.price, 0);
                    const reduced = sch && (sch.start !== settings.workStart || sch.end !== settings.workEnd);
                    const isToday = d === todayStr();
                    return (
                      <button key={d} onClick={() => { setSelectedDate(d); setAgendaView('day'); }} className={`${card} text-left p-4 hover:border-white/30 transition-colors cursor-pointer ${isToday ? '!border-white/40' : ''} ${!sch ? 'opacity-55' : ''}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">{WEEK_SHORT[parseDate(d).getDay()]} · {shortBR(d)}</span>
                          {isToday && <span className="text-[10px] uppercase font-bold bg-white text-black px-1.5 py-0.5">Hoje</span>}
                        </div>
                        <p className="mt-3 font-serif text-4xl leading-none">{list.length}</p>
                        <p className="mt-1 text-xs text-white/45">{list.length === 1 ? 'agendamento' : 'agendamentos'} · {brl(rev)}</p>
                        <p className="mt-3 text-[11px] text-white/50">{!sch ? 'Folga' : reduced ? `Reduzido ${sch.start}–${sch.end}` : `${sch.start}–${sch.end}`}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ───────── HORÁRIOS ───────── */}
          {tab === 'horarios' && (
            <section className="space-y-6">
              <PageHead title="Horários" subtitle="Defina o expediente, folgas e horários reduzidos por dia da semana." />

              <div className={`${card} p-5 sm:p-6`}>
                <h3 className="font-serif text-2xl">Expediente padrão</h3>
                <p className="text-sm text-white/45 mt-1 mb-5">Vale para todos os dias abertos, a menos que você defina um horário próprio abaixo.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><label className={lbl} htmlFor="ds">Abre às</label><input id="ds" type="time" value={defStart} onChange={(e) => setDefStart(e.target.value)} className={inp} /></div>
                  <div><label className={lbl} htmlFor="de">Fecha às</label><input id="de" type="time" value={defEnd} onChange={(e) => setDefEnd(e.target.value)} className={inp} /></div>
                  <div>
                    <label className={lbl} htmlFor="di">Intervalo entre horários</label>
                    <select id="di" value={interval} onChange={(e) => setIntervalMin(e.target.value)} className={inp}>
                      {[15, 20, 30, 40, 45, 60].map((m) => <option key={m} value={m} className="bg-[#141417]">{m} minutos</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className={`${card} p-5 sm:p-6`}>
                <h3 className="font-serif text-2xl">Dias da semana</h3>
                <p className="text-sm text-white/45 mt-1 mb-5">Ex.: no sábado, deixe aberto só até as 14h. O dia continua recebendo agendamentos nos horários que sobrarem.</p>
                <div className="divide-y divide-white/[0.07]">
                  {WEEK_ORDER.map((wd) => {
                    const open = !offDays.includes(wd);
                    const c = custom[wd];
                    const start = c?.start ?? defStart;
                    const end = c?.end ?? defEnd;
                    const isCustom = open && (start !== defStart || end !== defEnd);
                    const slots = countSlots(start, end, parseInt(interval, 10) || 45);
                    return (
                      <div key={wd} className="py-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
                        <div className="flex items-center justify-between lg:w-56 gap-4">
                          <div className="flex items-center gap-3">
                            <Switch on={open} label={`${WEEK_LONG[wd]} aberto`} onChange={(v) => setOffDays((p) => (v ? p.filter((d) => d !== wd) : [...p, wd]))} />
                            <span className={`font-medium ${open ? '' : 'text-white/40'}`}>{WEEK_LONG[wd]}</span>
                          </div>
                          {!open && <span className="text-[10px] uppercase tracking-[0.14em] font-semibold border border-white/15 text-white/50 px-2 py-0.5">Folga</span>}
                          {open && isCustom && <span className="text-[10px] uppercase tracking-[0.14em] font-semibold border border-amber-400/30 bg-amber-400/10 text-amber-200 px-2 py-0.5">Reduzido</span>}
                        </div>
                        <div className={`flex flex-wrap items-center gap-3 flex-1 ${open ? '' : 'opacity-30 pointer-events-none'}`}>
                          <input type="time" value={start} onChange={(e) => setCustom((p) => ({ ...p, [wd]: { start: e.target.value, end } }))} className={inp + ' !w-32'} aria-label={`${WEEK_LONG[wd]} abre às`} />
                          <span className="text-white/35 text-sm">até</span>
                          <input type="time" value={end} onChange={(e) => setCustom((p) => ({ ...p, [wd]: { start, end: e.target.value } }))} className={inp + ' !w-32'} aria-label={`${WEEK_LONG[wd]} fecha às`} />
                          <span className="text-xs text-white/40">{slots} horários</span>
                          {isCustom && <button type="button" onClick={() => setCustom((p) => ({ ...p, [wd]: undefined }))} className="text-xs text-white/50 hover:text-white underline underline-offset-4 cursor-pointer">usar padrão</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`sticky bottom-20 md:bottom-4 z-10 flex items-center justify-between gap-4 p-4 border backdrop-blur-md transition-colors ${dirty ? 'bg-[#1b1b20]/95 border-white/30' : 'bg-[#141417]/80 border-white/[0.08]'}`}>
                <p className="text-sm text-white/60">{dirty ? 'Você tem alterações não salvas.' : 'Horários atualizados.'}</p>
                <button onClick={saveSettings} disabled={!dirty} className={btnSolid}><Save className="w-4 h-4" />Salvar horários</button>
              </div>

              <div className={`${card} p-5 sm:p-6`}>
                <h3 className="font-serif text-2xl">Bloqueios pontuais</h3>
                <p className="text-sm text-white/45 mt-1 mb-5">Bloqueie só um período de um dia (ex.: consulta médica 14h–16h) ou o dia inteiro, sem mexer no expediente padrão.</p>
                <form onSubmit={addBlock} className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {([['day', 'Dia inteiro'], ['morning', 'Manhã'], ['afternoon', 'Tarde'], ['evening', 'Noite']] as const).map(([k, l]) => (
                      <button key={k} type="button" onClick={() => applyPreset(k)} className="h-9 px-3.5 border border-white/15 hover:border-white/45 text-[11px] uppercase tracking-[0.14em] font-semibold text-white/75 hover:text-white cursor-pointer transition-colors">{l}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><label className={lbl} htmlFor="bd">Data</label><input id="bd" type="date" value={blkDate} min={todayStr()} onChange={(e) => setBlkDate(e.target.value)} className={inp} required /></div>
                    <div><label className={lbl} htmlFor="bf">Das</label><input id="bf" type="time" value={blkFrom} onChange={(e) => setBlkFrom(e.target.value)} disabled={blkMode === 'day'} className={inp + ' disabled:opacity-30'} /></div>
                    <div><label className={lbl} htmlFor="bt">Até</label><input id="bt" type="time" value={blkTo} onChange={(e) => setBlkTo(e.target.value)} disabled={blkMode === 'day'} className={inp + ' disabled:opacity-30'} /></div>
                    <div><label className={lbl} htmlFor="br">Motivo (opcional)</label><input id="br" value={blkReason} onChange={(e) => setBlkReason(e.target.value)} placeholder="Ex.: consulta" className={inp} /></div>
                  </div>
                  <button type="submit" className={btnSolid}><Plus className="w-4 h-4" />{blkMode === 'day' ? 'Bloquear dia inteiro' : 'Bloquear horários'}</button>
                </form>

                <div className="mt-7 border-t border-white/[0.07] pt-5">
                  <p className={lbl}>Bloqueios agendados</p>
                  {upcomingBlocks.length === 0 ? (
                    <p className="text-sm text-white/40 py-3">Nenhum bloqueio futuro.</p>
                  ) : (
                    <ul className="divide-y divide-white/[0.07]">
                      {upcomingBlocks.map((b) => (
                        <li key={b.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{shortBR(b.dateStr)} · {WEEK_SHORT[parseDate(b.dateStr).getDay()]} — <span className="text-amber-200">{!b.timeStr ? 'Dia inteiro' : b.endTimeStr ? `${b.timeStr} às ${b.endTimeStr}` : b.timeStr}</span></p>
                            <p className="text-xs text-white/40 truncate">{b.reason}</p>
                          </div>
                          <ConfirmDelete onConfirm={() => removeBlock(b.id)} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ───────── SERVIÇOS ───────── */}
          {tab === 'servicos' && (
            <section className="space-y-6">
              <PageHead title="Serviços" subtitle="O que aparece na agenda dos clientes, com preço e duração." />
              <form onSubmit={submitService} className={`${card} p-5 sm:p-6 space-y-4`}>
                <h3 className="font-serif text-2xl">{editingId ? 'Editar serviço' : 'Novo serviço'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2"><label className={lbl} htmlFor="sn">Nome</label><input id="sn" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inp} placeholder="Ex.: Corte social" /></div>
                  <div><label className={lbl} htmlFor="sp">Preço (R$)</label><input id="sp" inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} className={inp} placeholder="55" /></div>
                  <div><label className={lbl} htmlFor="sd">Duração (min)</label><input id="sd" type="number" min={5} step={5} value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} className={inp} /></div>
                  <div>
                    <label className={lbl} htmlFor="sc">Categoria</label>
                    <select id="sc" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Service['category'] })} className={inp}>
                      {(['cabelo', 'barba', 'combo', 'visagismo', 'outro'] as const).map((c) => <option key={c} value={c} className="bg-[#141417]">{c[0].toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3"><label className={lbl} htmlFor="sx">Descrição (opcional)</label><input id="sx" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={inp} placeholder="O que está incluso" /></div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className={btnSolid}>{editingId ? <><Check className="w-4 h-4" />Salvar alterações</> : <><Plus className="w-4 h-4" />Cadastrar serviço</>}</button>
                  {editingId && <button type="button" onClick={resetDraft} className={btnGhost + ' !h-11'}>Cancelar</button>}
                </div>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {services.map((s) => (
                  <article key={s.id} className={`${card} p-5 flex flex-col gap-3 ${editingId === s.id ? '!border-white/50' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-[0.16em] text-white/45 border border-white/12 px-2 py-0.5">{s.category}</span>
                        <h3 className="mt-3 font-serif text-2xl leading-tight">{s.name}</h3>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-serif text-2xl">{brl(s.price)}</p>
                        <p className="text-xs text-white/45">{s.durationMinutes} min</p>
                      </div>
                    </div>
                    {s.description && <p className="text-sm text-white/50 leading-relaxed">{s.description}</p>}
                    <div className="flex gap-2 mt-auto pt-1">
                      <button onClick={() => startEdit(s)} className={btnGhost + ' !h-9 !px-3'}><Pencil className="w-3.5 h-3.5" />Editar</button>
                      <ConfirmDelete onConfirm={() => deleteService(s.id)} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ───────── CLIENTES ───────── */}
          {tab === 'clientes' && (
            <section>
              <PageHead title="Clientes" subtitle={`${clients.length} cliente(s) cadastrados pelos agendamentos`} />
              <div className="relative mb-5">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                <input value={clientQuery} onChange={(e) => setClientQuery(e.target.value)} placeholder="Buscar por nome ou telefone" className={inp + ' !h-12 pl-11'} aria-label="Buscar cliente" />
              </div>
              {filteredClients.length === 0 ? (
                <div className={`${card} py-14 text-center text-white/45`}><Users className="w-8 h-8 mx-auto text-white/25 mb-3" />Nenhum cliente encontrado.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredClients.map((c) => {
                    const fav = Object.entries(c.fav).sort((a, b) => b[1] - a[1])[0]?.[0];
                    return (
                      <article key={c.phone} className={`${card} p-4 sm:p-5 flex items-center gap-4`}>
                        <span className="w-12 h-12 shrink-0 rounded-full bg-white/[0.07] border border-white/10 flex items-center justify-center font-serif text-lg">{initials(c.name)}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{c.name}</h3>
                          <p className="text-xs text-white/45">{fmtPhone(c.phone)}</p>
                          <p className="mt-1.5 text-xs text-white/60">{c.visits} visita(s) · <span className="text-white">{brl(c.spent)}</span> · última {shortBR(c.last)}</p>
                          {fav && <p className="text-[11px] text-white/40 truncate">Favorito: {fav}</p>}
                        </div>
                        <a href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={btnGhost + ' !px-3'} aria-label={`WhatsApp de ${c.name}`}><MessageCircle className="w-4 h-4" /></a>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ───────── RESUMO ───────── */}
          {tab === 'resumo' && (
            <section className="space-y-6">
              <PageHead title="Resumo" subtitle={`Desempenho de ${parseDate(todayStr()).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`} />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="Faturamento" value={brl(monthRevenue)} hint="no mês" icon={<TrendingUp className="w-4 h-4" />} />
                <Stat label="Atendimentos" value={String(monthValid.length)} hint="no mês" icon={<Scissors className="w-4 h-4" />} />
                <Stat label="Ticket médio" value={brl(ticket)} hint="por atendimento" icon={<Calendar className="w-4 h-4" />} />
                <Stat label="Cancelados" value={String(monthCancelled)} hint="no mês" icon={<XCircle className="w-4 h-4" />} />
              </div>

              <div className={`${card} p-5 sm:p-6`}>
                <h3 className="font-serif text-2xl mb-5">Últimos 7 dias</h3>
                <div className="flex items-end gap-2 sm:gap-4 h-44">
                  {last7.map((x) => (
                    <div key={x.d} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                      <span className="text-[10px] text-white/45 tabular-nums">{x.total ? brl(x.total).replace('R$ ', '') : ''}</span>
                      <div className={`w-full ${x.d === todayStr() ? 'bg-white' : 'bg-white/30'} transition-all`} style={{ height: `${Math.max(4, (x.total / maxBar) * 100)}%` }} />
                      <span className="text-[10px] uppercase tracking-wider text-white/45">{WEEK_SHORT[parseDate(x.d).getDay()]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${card} p-5 sm:p-6`}>
                <h3 className="font-serif text-2xl mb-4">Serviços mais pedidos</h3>
                {topServices.length === 0 ? (
                  <p className="text-sm text-white/40">Ainda sem atendimentos neste mês.</p>
                ) : (
                  <ul className="space-y-3">
                    {topServices.map(([name, n]) => (
                      <li key={name}>
                        <div className="flex justify-between text-sm mb-1.5"><span>{name}</span><span className="text-white/50">{n}×</span></div>
                        <div className="h-1.5 bg-white/10"><div className="h-full bg-white" style={{ width: `${(n / topServices[0][1]) * 100}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Navegação inferior (mobile): sempre visível, sem rolagem lateral */}
      <nav className="md:hidden shrink-0 grid grid-cols-5 border-t border-white/[0.08] bg-[#101013] pb-[env(safe-area-inset-bottom,0px)]" aria-label="Seções do painel">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setTab(n.id)} className={`relative flex flex-col items-center justify-center gap-1 h-16 text-[10px] uppercase tracking-[0.12em] font-semibold cursor-pointer transition-colors ${tab === n.id ? 'text-white' : 'text-white/45'}`}>
            {tab === n.id && <span className="absolute top-0 left-4 right-4 h-[2px] bg-white" />}
            {n.icon}
            {n.label}
          </button>
        ))}
      </nav>

      {toast && (
        <div role="status" className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 max-w-[90vw] bg-white text-black text-sm font-medium px-5 py-3 shadow-2xl">
          {toast}
        </div>
      )}

      {securityOpen && <SecurityModal onClose={() => setSecurityOpen(false)} />}
    </div>
  );
};

/* ───────────────────────── segurança ───────────────────────── */

const SecurityModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const mode = getAuthMode();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const hash = getExportableHash();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await changePassword(cur, next);
    setMsg({ ok: r.ok, text: r.ok ? 'Senha alterada com sucesso.' : r.error || 'Erro ao alterar.' });
    if (r.ok) { setCur(''); setNext(''); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md bg-[#141417] border border-white/10 p-6 sm:p-7 max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-2 text-white/50 hover:text-white cursor-pointer" aria-label="Fechar"><X className="w-5 h-5" /></button>
        <h3 className="font-serif text-2xl">Segurança</h3>

        {mode === 'local' ? (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className={lbl} htmlFor="cp">Senha atual</label>
            <input id="cp" type="password" value={cur} onChange={(e) => setCur(e.target.value)} className={inp} autoComplete="current-password" />
            <label className={lbl} htmlFor="np">Nova senha (mín. 8 caracteres)</label>
            <input id="np" type="password" value={next} onChange={(e) => setNext(e.target.value)} className={inp} autoComplete="new-password" />
            {msg && <p className={`text-sm px-3 py-2 border ${msg.ok ? 'text-emerald-300 border-emerald-400/25 bg-emerald-400/10' : 'text-rose-300 border-rose-400/25 bg-rose-400/10'}`}>{msg.text}</p>}
            <button type="submit" disabled={!cur || !next} className={btnSolid + ' w-full'}>Alterar senha</button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-white/55 leading-relaxed">A senha deste site é definida no deploy (variável <code className="text-white">VITE_ADMIN_PASSWORD_HASH</code>) e vale em todos os aparelhos.</p>
        )}

        {mode === 'local' && hash && (
          <div className="mt-6 pt-5 border-t border-white/[0.08]">
            <p className={lbl}>Usar a mesma senha em todos os aparelhos</p>
            <p className="text-xs text-white/45 leading-relaxed mb-3">Copie o código abaixo e cadastre na Vercel como variável <code className="text-white/80">VITE_ADMIN_PASSWORD_HASH</code>. Depois publique de novo.</p>
            <div className="flex gap-2">
              <input readOnly value={hash} className={inp + ' font-mono text-[11px]'} onFocus={(e) => e.currentTarget.select()} aria-label="Código da senha" />
              <button type="button" onClick={() => { navigator.clipboard?.writeText(hash); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }} className={btnGhost + ' !px-3'} aria-label="Copiar">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
