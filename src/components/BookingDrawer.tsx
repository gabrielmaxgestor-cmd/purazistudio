import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Check, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Clock, User, Phone, MessageCircle,
  Download, AlertCircle, Scissors, Crown, Sparkles, Star, Zap, Pencil,
} from 'lucide-react';
import { SITE } from '../utils/siteConfig';
import {
  Service, Appointment, BlockedSlot, DayOption, BarberSettings, DEFAULT_BARBER_SETTINGS,
  generateHoursForSchedule, getDaySchedule, isSlotFreeForDuration, isValidPhone,
  formatWhatsAppBookingMessage, todayStr,
} from '../utils/bookingLogic';
import { loadPublicData, createAppointment, friendlyError } from '../data/api';

interface BookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  preselectedServiceId?: string | null;
  initialDay?: DayOption | null;
  initialTime?: string | null;
  onBookingComplete?: (appointment: Appointment) => void;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEK_HEAD = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
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
const longDate = (s: string) => parseDate(s).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDate = (s: string) => parseDate(s).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');

const CATEGORY_ICON: Record<Service['category'], React.ReactNode> = {
  cabelo: <Scissors className="w-5 h-5" />,
  barba: <User className="w-5 h-5" />,
  combo: <Crown className="w-5 h-5" />,
  visagismo: <Sparkles className="w-5 h-5" />,
  outro: <Star className="w-5 h-5" />,
};

const STEPS = ['Serviço', 'Data e hora', 'Seus dados'];

export const BookingDrawer: React.FC<BookingDrawerProps> = ({
  isOpen, onClose, services, preselectedServiceId, initialDay, initialTime, onBookingComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [settings, setSettings] = useState<BarberSettings>(DEFAULT_BARBER_SETTINGS);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  });

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);
  const [serviceList, setServiceList] = useState<Service[]>(services);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);

  // Busca horários ocupados/bloqueados e serviços direto do banco (sem dados pessoais de ninguém)
  const refreshData = async () => {
    try {
      const d = await loadPublicData();
      setSettings(d.settings);
      setAppointments(d.busy);
      setBlocked(d.blocked);
      setServiceList(d.services);
      setLoadError(null);
    } catch (e) {
      setLoadError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => setServiceList(services), [services]);

  // Ao abrir: carrega dados atuais e começa um agendamento novo
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    refreshData();
    setConfirmed(null);
    setFormError(null);
    setClientName('');
    setClientPhone('');

    const found = preselectedServiceId ? services.find((s) => s.id === preselectedServiceId) || null : null;
    setSelectedService(found);
    if (initialDay && initialTime) {
      setSelectedDate(initialDay.dateStr);
      setSelectedTime(initialTime);
      const d = parseDate(initialDay.dateStr);
      setViewMonth({ y: d.getFullYear(), m: d.getMonth() });
    } else {
      setSelectedDate(null);
      setSelectedTime(null);
      const t = new Date();
      setViewMonth({ y: t.getFullYear(), m: t.getMonth() });
    }
    setStep(found ? (initialDay && initialTime ? 3 : 2) : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // trava a rolagem do site por trás e volta ao topo a cada etapa
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step]);

  const duration = selectedService?.durationMinutes || 30;
  const free = (dateStr: string, time: string) =>
    isSlotFreeForDuration(dateStr, time, duration, appointments, blocked, settings);

  // limites do calendário: hoje até +89 dias
  const first = todayStr();
  const last = addDays(first, 89);

  // situação de cada dia do mês exibido
  const monthCells = useMemo(() => {
    const { y, m } = viewMonth;
    const lead = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const cells: ({ dateStr: string; day: number; state: 'ok' | 'off' | 'full' | 'out' } | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= total; d++) {
      const dateStr = todayStr(new Date(y, m, d));
      let state: 'ok' | 'off' | 'full' | 'out' = 'ok';
      if (dateStr < first || dateStr > last) state = 'out';
      else if (!getDaySchedule(dateStr, settings)) state = 'off';
      else if (!generateHoursForSchedule(settings, dateStr).some((h) => free(dateStr, h))) state = 'full';
      cells.push({ dateStr, day: d, state });
    }
    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth, settings, appointments, blocked, duration]);

  const slots = useMemo(() => {
    if (!selectedDate) return [];
    return generateHoursForSchedule(settings, selectedDate).map((time) => ({ time, ok: free(selectedDate, time) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, settings, appointments, blocked, duration]);

  const groups = [
    { label: 'Manhã', items: slots.filter((s) => s.time < '12:00') },
    { label: 'Tarde', items: slots.filter((s) => s.time >= '12:00' && s.time < '18:00') },
    { label: 'Noite', items: slots.filter((s) => s.time >= '18:00') },
  ].filter((g) => g.items.length > 0);

  const monthIndex = viewMonth.y * 12 + viewMonth.m;
  const firstMonth = parseDate(first).getFullYear() * 12 + parseDate(first).getMonth();
  const lastMonth = parseDate(last).getFullYear() * 12 + parseDate(last).getMonth();
  const goMonth = (delta: number) => {
    const idx = monthIndex + delta;
    setViewMonth({ y: Math.floor(idx / 12), m: idx % 12 });
  };

  const findNextFree = () => {
    for (let i = 0; i < 90; i++) {
      const d = addDays(first, i);
      const h = generateHoursForSchedule(settings, d).find((t) => free(d, t));
      if (h) {
        setSelectedDate(d);
        setSelectedTime(h);
        const dd = parseDate(d);
        setViewMonth({ y: dd.getFullYear(), m: dd.getMonth() });
        setFormError(null);
        return;
      }
    }
    setFormError('Não encontramos horários livres nos próximos 90 dias. Fale conosco pelo WhatsApp.');
  };

  /* ----- ações ----- */
  const next = () => {
    setFormError(null);
    if (step === 1) {
      if (!selectedService) return setFormError('Escolha um serviço para continuar.');
      // mudou de serviço: o horário escolhido pode não caber mais
      if (selectedDate && selectedTime && !free(selectedDate, selectedTime)) setSelectedTime(null);
      setStep(selectedDate && selectedTime && free(selectedDate, selectedTime) ? 3 : 2);
    } else if (step === 2) {
      if (!selectedDate || !selectedTime) return setFormError('Escolha um dia e um horário.');
      setStep(3);
    }
  };
  const back = () => {
    setFormError(null);
    if (step > 1 && step < 4) setStep((step - 1) as 1 | 2 | 3);
  };

  const handlePhone = (val: string) => {
    let c = val.replace(/\D/g, '').slice(0, 11);
    if (c.length > 6) c = `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}`;
    else if (c.length > 2) c = `(${c.slice(0, 2)}) ${c.slice(2)}`;
    else if (c.length > 0) c = `(${c}`;
    setClientPhone(c);
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!clientName.trim()) return setFormError('Informe seu nome.');
    if (!isValidPhone(clientPhone)) return setFormError('Informe um WhatsApp válido com DDD (ex.: 24 99999-9999).');
    if (!selectedService || !selectedDate || !selectedTime) return setFormError('Dados do agendamento incompletos.');

    setSubmitting(true);
    setFormError(null);
    try {
      const apt = await createAppointment({
        serviceId: selectedService.id,
        dateStr: selectedDate,
        timeStr: selectedTime,
        name: clientName.trim(),
        phone: clientPhone,
      });
      setConfirmed(apt);
      setStep(4);
      onBookingComplete?.(apt);
    } catch (err) {
      const code = (err as { code?: string }).code;
      setFormError(friendlyError(err));
      // horário perdido para outra pessoa (ou regra mudou): atualiza a agenda e volta para escolher outro
      if (code && ['slot_taken', 'blocked', 'past_time', 'outside_hours', 'day_off', 'invalid_time'].includes(code)) {
        setSelectedTime(null);
        setStep(2);
        setLoading(true);
        await refreshData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const downloadIcs = () => {
    if (!confirmed) return;
    const [yyyy, mm, dd] = confirmed.dateStr.split('-');
    const [hh, mi] = confirmed.timeStr.split(':').map(Number);
    const endTotal = hh * 60 + mi + confirmed.durationMinutes;
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${yyyy}${mm}${dd}T${pad(hh)}${pad(mi)}00`;
    const end = `${yyyy}${mm}${dd}T${pad(Math.floor(endTotal / 60) % 24)}${pad(endTotal % 60)}00`;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PURAZI Studio//Barbearia & Visagismo//PT', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `SUMMARY:PURAZI Studio - ${confirmed.serviceName}`,
      `DESCRIPTION:Código ${confirmed.code} - ${confirmed.clientName}`,
      `LOCATION:${SITE.address} - ${SITE.neighborhood}, ${SITE.city}`,
      `DTSTART:${start}`, `DTEND:${end}`, 'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `agendamento-purazi-${confirmed.code}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const spot = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--sx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--sy', `${e.clientY - r.top}px`);
  };

  if (!isOpen) return null;

  const inputCls =
    'w-full h-14 bg-black/40 border border-white/12 focus:border-white/55 outline-none pl-12 pr-4 text-[15px] text-white placeholder:text-white/30 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_.3s_ease-out]" onClick={onClose} aria-hidden="true" />

      <aside
        className="relative z-10 w-full max-w-[560px] h-[100dvh] bg-[#0f0f12] text-white flex flex-col border-l border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-[drawerIn_.45s_cubic-bezier(.2,.8,.2,1)]"
        role="dialog"
        aria-modal="true"
        aria-label="Agendamento online"
      >
        {/* Cabeçalho */}
        <header className="shrink-0 flex items-center justify-between px-5 sm:px-7 h-[72px] border-b border-white/[0.08] pt-[env(safe-area-inset-top,0px)] box-content">
          <div className="flex items-center gap-3 min-w-0">
            {step > 1 && step < 4 && (
              <button onClick={back} className="w-10 h-10 -ml-2 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer" aria-label="Voltar">
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <img src="/assets/logo-purazi-white.png" alt="PURAZI Studio" className="h-8 w-auto" />
          </div>
          <button onClick={onClose} className="w-10 h-10 -mr-2 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer" aria-label="Fechar agendamento">
            <X className="w-6 h-6" />
          </button>
        </header>

        {/* Progresso: uma única barra, 3 etapas */}
        {step < 4 && (
          <div className="shrink-0 px-5 sm:px-7 pt-4 pb-3 border-b border-white/[0.08]">
            <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step}>
              {STEPS.map((_, i) => (
                <span key={i} className="h-[3px] flex-1 bg-white/12 overflow-hidden">
                  <span className={`block h-full bg-white transition-transform duration-500 origin-left ${step >= i + 1 ? 'scale-x-100' : 'scale-x-0'}`} />
                </span>
              ))}
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-white/50">
              Passo {step} de 3 · <span className="text-white">{STEPS[step - 1]}</span>
            </p>
          </div>
        )}

        {/* Conteúdo */}
        <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-7 py-7">
          <div key={step} className="animate-[stepIn_.45s_cubic-bezier(.2,.8,.2,1)]">
            {/* ───── 1 · Serviço ───── */}
            {step === 1 && (
              <div>
                <h2 className="font-serif text-[2.3rem] sm:text-[2rem] leading-[1.1]">Qual serviço você quer?</h2>
                <p className="mt-2 text-sm text-white/50">Toque em um serviço para selecioná-lo.</p>
                <div className="mt-6 space-y-3" role="radiogroup" aria-label="Serviços">
                  {serviceList.map((s) => {
                    const on = selectedService?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => { setSelectedService(s); setFormError(null); }}
                        onMouseMove={spot}
                        className={`spot w-full text-left border p-4 sm:p-5 flex items-center gap-4 transition-all duration-300 cursor-pointer ${
                          on ? 'border-white bg-white/[0.07]' : 'border-white/10 hover:border-white/35 bg-white/[0.015]'
                        }`}
                      >
                        <span className={`relative z-10 w-11 h-11 shrink-0 rounded-full flex items-center justify-center border transition-colors ${on ? 'bg-white text-black border-white' : 'border-white/15 text-white/70'}`}>
                          {on ? <Check className="w-5 h-5" /> : CATEGORY_ICON[s.category]}
                        </span>
                        <span className="relative z-10 flex-1 min-w-0">
                          <span className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-base leading-snug">{s.name}</span>
                            {s.category === 'combo' && <span className="text-[9px] uppercase tracking-[0.16em] font-bold bg-white text-black px-1.5 py-0.5">Mais pedido</span>}
                          </span>
                          {s.description && <span className="block mt-1 text-sm leading-relaxed text-white/55 line-clamp-2">{s.description}</span>}
                          <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/45"><Clock className="w-3.5 h-3.5" />{s.durationMinutes} min</span>
                        </span>
                        <span className="relative z-10 font-serif text-2xl shrink-0">{brl(s.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ───── 2 · Data e hora ───── */}
            {step === 2 && (
              <div className={loading ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
                <h2 className="font-serif text-[2.3rem] sm:text-[2rem] leading-[1.1]">Escolha o dia e o horário</h2>

                <button onClick={findNextFree} type="button" className="group mt-5 w-full flex items-center justify-between gap-3 border border-white/15 hover:border-white/45 bg-white/[0.03] px-4 h-12 text-sm cursor-pointer transition-colors">
                  <span className="flex items-center gap-2.5"><Zap className="w-4 h-4" />Primeiro horário livre</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                {/* Calendário */}
                <div className="mt-6 border border-white/10 p-4 sm:p-5 bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => goMonth(-1)} disabled={monthIndex <= firstMonth} className="w-9 h-9 flex items-center justify-center border border-white/12 hover:border-white/45 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors" aria-label="Mês anterior"><ChevronLeft className="w-4 h-4" /></button>
                    <p className="font-serif text-xl capitalize">{MONTHS[viewMonth.m]} <span className="text-white/45">{viewMonth.y}</span></p>
                    <button onClick={() => goMonth(1)} disabled={monthIndex >= lastMonth} className="w-9 h-9 flex items-center justify-center border border-white/12 hover:border-white/45 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors" aria-label="Próximo mês"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {WEEK_HEAD.map((d, i) => <span key={i} className="text-center text-[10px] uppercase tracking-wider text-white/35 py-1">{d}</span>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {monthCells.map((c, i) =>
                      !c ? <span key={`e${i}`} /> : (
                        <button
                          key={c.dateStr}
                          type="button"
                          disabled={c.state !== 'ok'}
                          onClick={() => { setSelectedDate(c.dateStr); setSelectedTime(null); setFormError(null); }}
                          aria-label={`${longDate(c.dateStr)}${c.state === 'off' ? ', folga' : c.state === 'full' ? ', sem horários' : ''}`}
                          aria-pressed={selectedDate === c.dateStr}
                          className={`relative aspect-square flex flex-col items-center justify-center text-base sm:text-sm transition-all ${
                            selectedDate === c.dateStr
                              ? 'bg-white text-black font-bold scale-105'
                              : c.state === 'ok'
                              ? 'hover:bg-white/12 cursor-pointer'
                              : 'text-white/20 cursor-not-allowed'
                          } ${c.dateStr === first && selectedDate !== c.dateStr ? 'ring-1 ring-white/50' : ''}`}
                        >
                          {c.day}
                          {c.state === 'full' && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-rose-400/70" />}
                          {c.state === 'ok' && selectedDate !== c.dateStr && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400/80" />}
                        </button>
                      )
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-white/40">
                    <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />Com horários</span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400/70" />Lotado</span>
                    <span>Sem marcador: folga</span>
                  </div>
                </div>

                {/* Horários */}
                <div className="mt-7">
                  {!selectedDate ? (
                    <div className="border border-dashed border-white/15 py-10 text-center text-sm text-white/40">
                      <CalendarIcon className="w-6 h-6 mx-auto mb-3 text-white/25" />
                      Selecione um dia no calendário para ver os horários.
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/50 mb-4 first-letter:uppercase">{longDate(selectedDate)}</p>
                      {groups.map((g) => (
                        <div key={g.label} className="mb-5">
                          <p className="text-xs text-white/40 mb-2.5">{g.label}</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {g.items.map((s, i) => (
                              <button
                                key={s.time}
                                type="button"
                                disabled={!s.ok}
                                onClick={() => { setSelectedTime(s.time); setFormError(null); }}
                                aria-pressed={selectedTime === s.time}
                                style={{ animationDelay: `${i * 30}ms` }}
                                className={`slot-in h-14 sm:h-12 text-base sm:text-sm font-mono tabular-nums border transition-all ${
                                  selectedTime === s.time
                                    ? 'bg-white text-black border-white font-bold scale-[1.03]'
                                    : s.ok
                                    ? 'border-white/15 hover:border-white hover:bg-white/10 cursor-pointer'
                                    : 'border-white/[0.06] text-white/20 line-through cursor-not-allowed'
                                }`}
                              >
                                {s.time}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      {groups.length === 0 && <p className="text-sm text-white/45">Este dia não tem horários disponíveis.</p>}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ───── 3 · Dados ───── */}
            {step === 3 && selectedService && selectedDate && selectedTime && (
              <div>
                <h2 className="font-serif text-[2.3rem] sm:text-[2rem] leading-[1.1]">Quase lá!</h2>
                <p className="mt-2 text-sm text-white/50">Confira o resumo e informe seus dados.</p>

                <div className="mt-6 border border-white/12 divide-y divide-white/[0.08] bg-white/[0.025]">
                  {[
                    { icon: <Scissors className="w-4 h-4" />, label: 'Serviço', value: selectedService.name, sub: `${selectedService.durationMinutes} min`, go: 1 as const },
                    { icon: <CalendarIcon className="w-4 h-4" />, label: 'Data e hora', value: longDate(selectedDate), sub: `às ${selectedTime}`, go: 2 as const },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-4 p-4">
                      <span className="w-9 h-9 shrink-0 rounded-full bg-white/[0.07] flex items-center justify-center text-white/70">{r.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{r.label}</p>
                        <p className="text-[15px] font-medium truncate first-letter:uppercase">{r.value} <span className="text-white/50 font-normal">· {r.sub}</span></p>
                      </div>
                      <button type="button" onClick={() => setStep(r.go)} className="text-white/45 hover:text-white p-2 cursor-pointer" aria-label={`Alterar ${r.label}`}><Pencil className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-4">
                    <span className="text-sm text-white/60">Total a pagar no estúdio</span>
                    <span className="font-serif text-3xl">{brl(selectedService.price)}</span>
                  </div>
                </div>

                <form id="booking-form" onSubmit={confirm} className="mt-7 space-y-4" noValidate>
                  <div>
                    <label htmlFor="bk-name" className="block text-[11px] uppercase tracking-[0.2em] text-white/50 mb-2">Seu nome</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                      <input id="bk-name" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Como podemos te chamar?" className={inputCls} autoComplete="name" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="bk-phone" className="block text-[11px] uppercase tracking-[0.2em] text-white/50 mb-2">WhatsApp</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                      <input id="bk-phone" value={clientPhone} onChange={(e) => handlePhone(e.target.value)} placeholder="(24) 99999-9999" inputMode="tel" className={inputCls} autoComplete="tel" />
                    </div>
                    <p className="mt-2 text-xs text-white/35">Usamos só para confirmar ou remarcar seu horário.</p>
                  </div>
                </form>
              </div>
            )}

            {/* ───── 4 · Confirmado ───── */}
            {step === 4 && confirmed && (
              <div className="text-center">
                <div className="mx-auto w-24 h-24 rounded-full border border-emerald-400/40 bg-emerald-400/10 flex items-center justify-center">
                  <svg viewBox="0 0 52 52" className="w-12 h-12" fill="none" stroke="#6ee7b7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path className="draw-check" d="M14 27l8 8 16-17" />
                  </svg>
                </div>
                <h2 className="mt-6 font-serif text-[2.2rem] leading-tight">Agendamento confirmado</h2>
                <p className="mt-2 text-sm text-white/55">Te esperamos no estúdio, {confirmed.clientName.split(' ')[0]}.</p>

                <div className="mt-8 text-left border border-white/12 bg-white/[0.03]">
                  <div className="p-5 text-center border-b border-dashed border-white/20">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Seu código</p>
                    <p className="mt-1 font-mono text-3xl tracking-[0.12em]">{confirmed.code}</p>
                  </div>
                  <dl className="p-5 space-y-3 text-sm">
                    {[
                      ['Serviço', confirmed.serviceName],
                      ['Data', `${longDate(confirmed.dateStr)}`],
                      ['Horário', confirmed.timeStr],
                      ['Valor', brl(confirmed.price)],
                      ['Local', `${SITE.address} · ${SITE.city}`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4"><dt className="text-white/45">{k}</dt><dd className="text-right font-medium first-letter:uppercase">{v}</dd></div>
                    ))}
                  </dl>
                </div>

                <div className="mt-6 grid gap-3">
                  <a href={`https://wa.me/${SITE.whatsappNumber}?text=${formatWhatsAppBookingMessage(confirmed)}`} target="_blank" rel="noopener noreferrer" className="h-14 inline-flex items-center justify-center gap-2.5 bg-white text-black hover:bg-neutral-200 text-xs uppercase tracking-[0.18em] font-bold transition-colors">
                    <MessageCircle className="w-4 h-4" /> Avisar o barbeiro no WhatsApp
                  </a>
                  <button onClick={downloadIcs} className="h-12 inline-flex items-center justify-center gap-2.5 border border-white/20 hover:border-white/50 text-xs uppercase tracking-[0.16em] font-semibold cursor-pointer transition-colors">
                    <Download className="w-4 h-4" /> Adicionar ao calendário
                  </button>
                  <button onClick={onClose} className="h-10 text-xs uppercase tracking-[0.16em] text-white/50 hover:text-white cursor-pointer transition-colors">Fechar</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé fixo com resumo e ação principal */}
        {step < 4 && (
          <footer className="shrink-0 border-t border-white/[0.1] bg-[#121216] px-5 sm:px-7 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            {(formError || loadError) && (
              <p role="alert" className="mb-3 flex items-start gap-2 text-[13px] text-rose-300 bg-rose-500/10 border border-rose-400/20 px-3 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{formError || loadError}
              </p>
            )}
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                {selectedService ? (
                  <>
                    <p className="font-serif text-2xl leading-none">{brl(selectedService.price)}</p>
                    <p className="mt-1 text-xs text-white/45 truncate">
                      {selectedService.name}
                      {selectedDate && selectedTime && step >= 2 ? ` · ${shortDate(selectedDate)} ${selectedTime}` : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-white/40">Nenhum serviço selecionado</p>
                )}
              </div>
              {step < 3 ? (
                <button
                  key="btn-continue"
                  type="button"
                  onClick={next}
                  disabled={step === 1 ? !selectedService : !selectedTime}
                  className="h-14 px-7 inline-flex items-center gap-2 bg-white text-black hover:bg-neutral-200 disabled:bg-white/12 disabled:text-white/35 disabled:cursor-not-allowed text-xs uppercase tracking-[0.18em] font-bold transition-colors cursor-pointer"
                >
                  Continuar <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button key="btn-confirm" type="submit" form="booking-form" disabled={submitting} className="h-14 px-7 inline-flex items-center gap-2 bg-white text-black hover:bg-neutral-200 disabled:opacity-60 disabled:cursor-wait text-xs uppercase tracking-[0.18em] font-bold transition-colors cursor-pointer">
                  <Check className="w-4 h-4" /> {submitting ? 'Confirmando…' : 'Confirmar'}
                </button>
              )}
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
};
