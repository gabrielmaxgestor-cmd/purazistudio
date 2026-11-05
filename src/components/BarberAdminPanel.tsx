import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  DollarSign,
  Users,
  Scissors,
  Lock,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Phone,
  MessageCircle,
  AlertCircle,
  TrendingUp,
  Settings,
  CalendarRange,
} from 'lucide-react';
import {
  Service,
  Appointment,
  BlockedSlot,
  BarberSettings,
  DEFAULT_BARBER_SETTINGS,
  generateHoursForSchedule,
} from '../utils/bookingLogic';
import {
  getStoredAppointments,
  updateAppointmentStatus,
  getStoredServices,
  saveServices,
  getStoredBlockedSlots,
  saveBlockedSlots,
  getStoredBarberSettings,
  saveBarberSettings,
} from '../utils/storage';

interface BarberAdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export const BarberAdminPanel: React.FC<BarberAdminPanelProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'agenda' | 'horarios' | 'servicos' | 'clientes' | 'resumo'>('agenda');
  const [agendaView, setAgendaView] = useState<'day' | 'week'>('day');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [settings, setSettings] = useState<BarberSettings>(DEFAULT_BARBER_SETTINGS);

  // Selected date for Agenda
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Form states for new service
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('45');
  const [newServiceCategory, setNewServiceCategory] = useState<Service['category']>('cabelo');

  // Form states for new block
  const [blockDate, setBlockDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [blockHour, setBlockHour] = useState<string>(''); // empty = full day
  const [blockReason, setBlockReason] = useState('Folga programada');

  // Settings form states
  const [fixedOffDays, setFixedOffDays] = useState<number[]>([0]);
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('20:00');
  const [intervalMinutes, setIntervalMinutes] = useState('45');

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAppointments(getStoredAppointments());
      setServices(getStoredServices());
      setBlockedSlots(getStoredBlockedSlots());
      const s = getStoredBarberSettings();
      setSettings(s);
      setFixedOffDays(s.fixedOffDays || [0]);
      setWorkStart(s.workStart || '09:00');
      setWorkEnd(s.workEnd || '20:00');
      setIntervalMinutes(String(s.intervalMinutes || 45));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleUpdateStatus = (id: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    const updated = updateAppointmentStatus(id, status);
    setAppointments(updated);
    showNotification(`Status do agendamento atualizado para ${status === 'completed' ? 'Concluído' : status === 'cancelled' ? 'Cancelado' : 'Confirmado'}.`);
    if (onDataChanged) onDataChanged();
  };

  // Save Barber schedule and fixed off-days
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const newSettings: BarberSettings = {
      fixedOffDays,
      workStart,
      workEnd,
      intervalMinutes: parseInt(intervalMinutes, 10),
    };
    setSettings(newSettings);
    saveBarberSettings(newSettings);
    showNotification('Configurações de horário e folgas fixas salvas! Refletidas no agendamento.');
    if (onDataChanged) onDataChanged();
  };

  const toggleFixedOffDay = (dayIndex: number) => {
    setFixedOffDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  // Block slots logic
  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    const newBlock: BlockedSlot = {
      id: `blk-${Date.now()}`,
      dateStr: blockDate,
      timeStr: blockHour || undefined,
      reason: blockReason || 'Bloqueio de agenda',
    };
    const updated = [newBlock, ...blockedSlots];
    setBlockedSlots(updated);
    saveBlockedSlots(updated);
    showNotification('Horário bloqueado com sucesso na agenda.');
    if (onDataChanged) onDataChanged();
  };

  const handleRemoveBlock = (id: string) => {
    const updated = blockedSlots.filter((b) => b.id !== id);
    setBlockedSlots(updated);
    saveBlockedSlots(updated);
    showNotification('Bloqueio removido. Horário liberado.');
    if (onDataChanged) onDataChanged();
  };

  // Service logic
  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim() || !newServicePrice) return;

    const newSvc: Service = {
      id: `svc-${Date.now()}`,
      name: newServiceName.trim(),
      price: parseFloat(newServicePrice),
      durationMinutes: parseInt(newServiceDuration, 10),
      category: newServiceCategory,
    };

    const updated = [...services, newSvc];
    setServices(updated);
    saveServices(updated);
    setNewServiceName('');
    setNewServicePrice('');
    showNotification(`Serviço "${newSvc.name}" cadastrado com sucesso.`);
    if (onDataChanged) onDataChanged();
  };

  const handleDeleteService = (id: string) => {
    if (services.length <= 1) {
      alert('É necessário manter pelo menos um serviço cadastrado.');
      return;
    }
    const updated = services.filter((s) => s.id !== id);
    setServices(updated);
    saveServices(updated);
    showNotification('Serviço removido.');
    if (onDataChanged) onDataChanged();
  };

  // Agenda logic: Day vs Week
  const dateAppointments = appointments.filter((a) => a.dateStr === selectedDate);
  const dailyRevenue = dateAppointments
    .filter((a) => a.status !== 'cancelled')
    .reduce((sum, a) => sum + a.price, 0);

  // Week appointments calculation
  const getWeekDays = (baseDateStr: string) => {
    const [yyyy, mm, dd] = baseDateStr.split('-').map(Number);
    const curr = new Date(yyyy, mm - 1, dd);
    const first = curr.getDate() - curr.getDay(); // Sunday as start
    const week: { dateStr: string; label: string; dayName: string }[] = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = 0; i < 7; i++) {
      const next = new Date(curr);
      next.setDate(first + i);
      const y = next.getFullYear();
      const m = String(next.getMonth() + 1).padStart(2, '0');
      const d = String(next.getDate()).padStart(2, '0');
      week.push({
        dateStr: `${y}-${m}-${d}`,
        label: `${d}/${m}`,
        dayName: dayNames[next.getDay()],
      });
    }
    return week;
  };

  const currentWeek = getWeekDays(selectedDate);

  // Client history aggregation
  const clientMap = new Map<string, {
    name: string;
    phone: string;
    appointmentsCount: number;
    totalSpent: number;
    lastVisit: string;
    favoriteService: string;
  }>();

  appointments.forEach((apt) => {
    const existing = clientMap.get(apt.clientPhone);
    if (!existing) {
      clientMap.set(apt.clientPhone, {
        name: apt.clientName,
        phone: apt.clientPhone,
        appointmentsCount: 1,
        totalSpent: apt.status !== 'cancelled' ? apt.price : 0,
        lastVisit: apt.dateStr,
        favoriteService: apt.serviceName,
      });
    } else {
      existing.appointmentsCount += 1;
      if (apt.status !== 'cancelled') existing.totalSpent += apt.price;
      if (apt.dateStr > existing.lastVisit) existing.lastVisit = apt.dateStr;
    }
  });

  const clients = Array.from(clientMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);

  // Monthly summary calculation
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthAppointments = appointments.filter((a) => a.dateStr.startsWith(currentMonthStr));
  const monthCompleted = monthAppointments.filter((a) => a.status === 'completed' || a.status === 'confirmed');
  const monthRevenue = monthCompleted.reduce((sum, a) => sum + a.price, 0);
  const averageTicket = monthCompleted.length > 0 ? monthRevenue / monthCompleted.length : 0;

  const daysLabels = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl bg-[#141416] border border-neutral-800 text-white shadow-2xl flex flex-col h-[92vh] overflow-hidden rounded-none">
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-800 bg-[#18181b] flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Cinzel'] tracking-[0.2em] text-base font-bold text-amber-200">
                PURΛZI
              </span>
              <span className="text-[10px] tracking-widest uppercase bg-amber-950 text-amber-300 border border-amber-800/60 px-2 py-0.5">
                Painel Administrativo
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 font-sans">
              Gestão de agenda, horários, folgas fixas, serviços e clientes
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Fechar painel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-neutral-800 bg-[#111113] px-4 sm:px-6 shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('agenda')}
            className={`py-3.5 px-4 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'agenda'
                ? 'border-amber-400 text-amber-200 bg-neutral-900/60'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Agenda (Dia / Semana)</span>
          </button>

          <button
            onClick={() => setActiveTab('horarios')}
            className={`py-3.5 px-4 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'horarios'
                ? 'border-amber-400 text-amber-200 bg-neutral-900/60'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Folgas Fixas &amp; Horários</span>
          </button>

          <button
            onClick={() => setActiveTab('servicos')}
            className={`py-3.5 px-4 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'servicos'
                ? 'border-amber-400 text-amber-200 bg-neutral-900/60'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Serviços &amp; Preços</span>
          </button>

          <button
            onClick={() => setActiveTab('clientes')}
            className={`py-3.5 px-4 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'clientes'
                ? 'border-amber-400 text-amber-200 bg-neutral-900/60'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Histórico de Clientes</span>
          </button>

          <button
            onClick={() => setActiveTab('resumo')}
            className={`py-3.5 px-4 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'resumo'
                ? 'border-amber-400 text-amber-200 bg-neutral-900/60'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Resumo do Mês</span>
          </button>
        </div>

        {/* Feedback Notification */}
        {notification && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-200 px-6 py-2.5 text-xs flex items-center gap-2 shrink-0 animate-in fade-in duration-200">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Main Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: AGENDA (DIA / SEMANA) */}
          {activeTab === 'agenda' && (
            <div className="space-y-6">
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#19191c] border border-neutral-800 p-4">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-neutral-400 block font-mono">
                      Data de Referência
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-[#141416] border border-neutral-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-300 font-mono rounded-none"
                    />
                  </div>

                  <div className="pt-3">
                    <span className="text-xs text-neutral-300 font-mono">
                      Faturamento do dia: <strong className="text-emerald-400">R$ {dailyRevenue.toFixed(2).replace('.', ',')}</strong>
                    </span>
                  </div>
                </div>

                {/* Day / Week View Toggle */}
                <div className="flex items-center gap-1 border border-neutral-700 bg-[#141416] p-1">
                  <button
                    onClick={() => setAgendaView('day')}
                    className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                      agendaView === 'day' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Visão do Dia
                  </button>
                  <button
                    onClick={() => setAgendaView('week')}
                    className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                      agendaView === 'week' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Visão da Semana
                  </button>
                </div>
              </div>

              {/* Day View */}
              {agendaView === 'day' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300 font-mono flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-300" />
                    <span>Agendamentos para {selectedDate} ({dateAppointments.length} horários marcados)</span>
                  </h3>

                  {dateAppointments.length === 0 ? (
                    <div className="bg-[#19191c] border border-neutral-800 p-8 text-center text-xs text-neutral-400 font-sans">
                      Nenhum agendamento marcado para esta data. Os horários continuam disponíveis para reserva online.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {dateAppointments
                        .sort((a, b) => a.timeStr.localeCompare(b.timeStr))
                        .map((apt) => (
                          <div
                            key={apt.id}
                            className="bg-[#19191c] border border-neutral-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-neutral-700 transition-colors"
                          >
                            <div className="flex items-start gap-4">
                              <span className="font-mono text-base font-bold text-amber-300 bg-neutral-900 border border-neutral-800 px-3 py-1.5 shrink-0">
                                {apt.timeStr}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-white text-sm">{apt.clientName}</h4>
                                  <span className="text-[10px] uppercase font-mono text-neutral-500">
                                    {apt.code}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-300 font-sans mt-0.5">
                                  {apt.serviceName} • <span className="font-mono">{apt.durationMinutes} min</span> •{' '}
                                  <strong className="text-white">R$ {apt.price.toFixed(2).replace('.', ',')}</strong>
                                </p>
                                <a
                                  href={`https://wa.me/55${apt.clientPhone}?text=Ol%C3%A1%20${encodeURIComponent(apt.clientName)}%2C%20tudo%20bem%3F%20Confirmando%20seu%20hor%C3%A1rio%20hoje%20na%20PURAZI%20Studio%20%C3%A0s%20${apt.timeStr}.`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline mt-1 font-sans"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>{apt.clientPhone}</span>
                                </a>
                              </div>
                            </div>

                            {/* Status & actions */}
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              {apt.status === 'confirmed' ? (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(apt.id, 'completed')}
                                    className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 text-xs px-3 py-1.5 uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                                  >
                                    Concluir
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                                    className="bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 text-xs px-3 py-1.5 uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <span
                                  className={`text-xs uppercase font-mono tracking-wider px-3 py-1 border ${
                                    apt.status === 'completed'
                                      ? 'bg-neutral-900 text-neutral-300 border-neutral-700'
                                      : 'bg-red-950/40 text-red-400 border-red-900/60'
                                  }`}
                                >
                                  {apt.status === 'completed' ? 'Atendimento Concluído' : 'Cancelado'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Week View */}
              {agendaView === 'week' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300 font-mono flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-amber-300" />
                    <span>Semana de {currentWeek[0]?.dateStr} até {currentWeek[6]?.dateStr}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                    {currentWeek.map((day) => {
                      const dayApts = appointments.filter((a) => a.dateStr === day.dateStr);
                      const isSelected = selectedDate === day.dateStr;
                      const dayRevenue = dayApts
                        .filter((a) => a.status !== 'cancelled')
                        .reduce((s, a) => s + a.price, 0);

                      return (
                        <div
                          key={day.dateStr}
                          onClick={() => {
                            setSelectedDate(day.dateStr);
                            setAgendaView('day');
                          }}
                          className={`bg-[#19191c] border p-3 cursor-pointer transition-all hover:border-amber-300/60 ${
                            isSelected ? 'border-amber-300 ring-1 ring-amber-300/40' : 'border-neutral-800'
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
                            <span className="text-xs font-bold text-white uppercase font-mono">{day.dayName}</span>
                            <span className="text-xs text-neutral-400 font-mono">{day.label}</span>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="text-neutral-400">
                              Agendados: <strong className="text-white">{dayApts.length}</strong>
                            </div>
                            <div className="text-emerald-400 font-mono text-[11px]">
                              R$ {dayRevenue.toFixed(0)}
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-neutral-800/60 space-y-1">
                            {dayApts.slice(0, 3).map((a) => (
                              <div key={a.id} className="text-[10px] text-neutral-300 truncate">
                                <span className="font-mono text-amber-300">{a.timeStr}</span> {a.clientName.split(' ')[0]}
                              </div>
                            ))}
                            {dayApts.length > 3 && (
                              <span className="text-[9px] text-neutral-500 font-mono block">
                                +{dayApts.length - 3} outros
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FOLGAS FIXAS & HORÁRIOS DE EXPEDIENTE */}
          {activeTab === 'horarios' && (
            <div className="space-y-8">
              {/* Card 1: Horários de Atendimento & Folgas Fixas (Reflete no agendamento) */}
              <div className="bg-[#19191c] border border-amber-300/30 p-6 space-y-6">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-amber-300 font-mono font-bold block mb-1">
                    Regra Geral de Atendimento
                  </span>
                  <h3 className="font-['Cinzel'] text-lg text-white font-bold">
                    Folgas Semanais Fixas &amp; Horário de Serviço
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 font-sans">
                    Os dias e horários configurados aqui refletem automaticamente no site, impedindo agendamentos em dias que a barbearia estiver fechada ou fora do expediente.
                  </p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {/* Fixed Off Days Checkboxes */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-neutral-300 font-bold mb-2">
                      Dias de Folga Fixa (Fechado):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {daysLabels.map((label, idx) => {
                        const isOff = fixedOffDays.includes(idx);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleFixedOffDay(idx)}
                            className={`p-3 border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                              isOff
                                ? 'bg-red-950/40 border-red-500/60 text-red-200'
                                : 'bg-[#141416] border-neutral-800 text-neutral-300 hover:border-neutral-700'
                            }`}
                          >
                            <span>{label}</span>
                            <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 ${
                              isOff ? 'bg-red-900 text-white' : 'bg-neutral-800 text-neutral-500'
                            }`}>
                              {isOff ? 'Folga' : 'Aberto'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Work hours: Start and End */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-neutral-800">
                    <div>
                      <label htmlFor="work-start" className="block text-xs uppercase tracking-wider text-neutral-400 mb-1">
                        Início do Expediente
                      </label>
                      <select
                        id="work-start"
                        value={workStart}
                        onChange={(e) => setWorkStart(e.target.value)}
                        className="w-full bg-[#141416] border border-neutral-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-300 font-mono"
                      >
                        <option value="07:00">07:00</option>
                        <option value="08:00">08:00</option>
                        <option value="08:30">08:30</option>
                        <option value="09:00">09:00</option>
                        <option value="09:30">09:30</option>
                        <option value="10:00">10:00</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="work-end" className="block text-xs uppercase tracking-wider text-neutral-400 mb-1">
                        Fim do Expediente
                      </label>
                      <select
                        id="work-end"
                        value={workEnd}
                        onChange={(e) => setWorkEnd(e.target.value)}
                        className="w-full bg-[#141416] border border-neutral-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-300 font-mono"
                      >
                        <option value="17:00">17:00</option>
                        <option value="18:00">18:00</option>
                        <option value="18:30">18:30</option>
                        <option value="19:00">19:00</option>
                        <option value="19:30">19:30</option>
                        <option value="20:00">20:00</option>
                        <option value="21:00">21:00</option>
                        <option value="22:00">22:00</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="interval-min" className="block text-xs uppercase tracking-wider text-neutral-400 mb-1">
                        Intervalo entre Cortes
                      </label>
                      <select
                        id="interval-min"
                        value={intervalMinutes}
                        onChange={(e) => setIntervalMinutes(e.target.value)}
                        className="w-full bg-[#141416] border border-neutral-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-300 font-mono"
                      >
                        <option value="30">30 minutos</option>
                        <option value="45">45 minutos (Padrão PURΛZI)</option>
                        <option value="60">60 minutos</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="bg-white text-black hover:bg-neutral-200 py-3 px-6 text-xs uppercase tracking-[0.2em] font-bold transition-all shadow-md cursor-pointer"
                  >
                    Salvar Horários &amp; Folgas Fixas
                  </button>
                </form>
              </div>

              {/* Card 2: Bloqueios Pontuais e Férias */}
              <div className="bg-[#19191c] border border-neutral-800 p-6 space-y-5">
                <div>
                  <h3 className="font-['Cinzel'] text-base text-white font-bold">
                    Bloqueios Pontuais de Horário ou Datas
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 font-sans">
                    Bloqueie um horário específico (ex: intervalo de almoço) ou um dia inteiro pontual (médico, imprevisto).
                  </p>
                </div>

                <form onSubmit={handleAddBlock} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label htmlFor="blk-date" className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">
                      Data
                    </label>
                    <input
                      id="blk-date"
                      type="date"
                      required
                      value={blockDate}
                      onChange={(e) => setBlockDate(e.target.value)}
                      className="w-full bg-[#141416] border border-neutral-700 px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-300"
                    />
                  </div>

                  <div>
                    <label htmlFor="blk-hour" className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">
                      Horário (opcional)
                    </label>
                    <select
                      id="blk-hour"
                      value={blockHour}
                      onChange={(e) => setBlockHour(e.target.value)}
                      className="w-full bg-[#141416] border border-neutral-700 px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-300"
                    >
                      <option value="">O dia inteiro</option>
                      {generateHoursForSchedule(settings).map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="blk-reason" className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">
                      Motivo
                    </label>
                    <input
                      id="blk-reason"
                      type="text"
                      placeholder="Ex: Almoço / Folga"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="w-full bg-[#141416] border border-neutral-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-300 font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-neutral-800 hover:bg-neutral-700 text-white py-2 px-4 text-xs uppercase tracking-wider font-semibold border border-neutral-600 transition-colors cursor-pointer h-[37px]"
                  >
                    Adicionar Bloqueio
                  </button>
                </form>

                {/* Blocked slots list */}
                <div className="pt-4 border-t border-neutral-800 space-y-2">
                  <h4 className="text-xs uppercase tracking-wider text-neutral-400 font-mono">
                    Bloqueios Pontuais Ativos ({blockedSlots.length})
                  </h4>

                  {blockedSlots.length === 0 ? (
                    <p className="text-xs text-neutral-500 font-sans">Nenhum bloqueio pontual cadastrado.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {blockedSlots.map((b) => (
                        <div
                          key={b.id}
                          className="bg-[#141416] border border-neutral-800 p-3 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono text-amber-300 block">
                              {b.dateStr} {b.timeStr ? `às ${b.timeStr}` : '(Dia inteiro)'}
                            </span>
                            <span className="text-neutral-400 font-sans text-[11px]">{b.reason}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveBlock(b.id)}
                            className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                            title="Remover bloqueio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SERVIÇOS & PREÇOS */}
          {activeTab === 'servicos' && (
            <div className="space-y-6">
              {/* Form to add service */}
              <div className="bg-[#19191c] border border-neutral-800 p-5 space-y-4">
                <h3 className="font-['Cinzel'] text-base text-white font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-300" />
                  <span>Cadastrar Novo Serviço</span>
                </h3>

                <form onSubmit={handleAddService} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label htmlFor="svc-name" className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">
                      Nome do Serviço
                    </label>
                    <input
                      id="svc-name"
                      type="text"
                      required
                      placeholder="Ex: Barba Terapia"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      className="w-full bg-[#141416] border border-neutral-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-300"
                    />
                  </div>

                  <div>
                    <label htmlFor="svc-price" className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">
                      Preço (R$)
                    </label>
                    <input
                      id="svc-price"
                      type="number"
                      step="0.50"
                      required
                      placeholder="55.00"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(e.target.value)}
                      className="w-full bg-[#141416] border border-neutral-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-300 font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="svc-duration" className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">
                      Duração (minutos)
                    </label>
                    <select
                      id="svc-duration"
                      value={newServiceDuration}
                      onChange={(e) => setNewServiceDuration(e.target.value)}
                      className="w-full bg-[#141416] border border-neutral-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-300 font-mono"
                    >
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                      <option value="75">75 min</option>
                      <option value="90">90 min</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="bg-white text-black hover:bg-neutral-200 py-2.5 px-4 text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer h-[37px]"
                  >
                    Salvar Serviço
                  </button>
                </form>
              </div>

              {/* Service list */}
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider text-neutral-400 font-mono">
                  Serviços Ativos no Agendamento Online ({services.length})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((s) => (
                    <div
                      key={s.id}
                      className="bg-[#19191c] border border-neutral-800 p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{s.name}</h4>
                          <span className="text-[10px] uppercase font-mono bg-neutral-800 px-1.5 py-0.2 text-neutral-400">
                            {s.category}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 font-mono mt-1">
                          {s.durationMinutes} minutos • <strong className="text-amber-300">R$ {s.price.toFixed(2).replace('.', ',')}</strong>
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteService(s.id)}
                        className="text-neutral-500 hover:text-red-400 p-2 cursor-pointer transition-colors"
                        title="Remover serviço"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HISTÓRICO DE CLIENTES */}
          {activeTab === 'clientes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-['Cinzel'] text-base text-white font-bold">
                    Histórico de Clientes Cadastrados
                  </h3>
                  <p className="text-xs text-neutral-400 font-sans">
                    Total de {clients.length} clientes únicos que já agendaram na PURAZI Studio
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {clients.map((c, idx) => (
                  <div
                    key={idx}
                    className="bg-[#19191c] border border-neutral-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-white text-sm">{c.name}</h4>
                      <p className="text-xs text-neutral-400 font-sans mt-0.5">
                        WhatsApp: <strong className="text-neutral-200 font-mono">{c.phone}</strong> •{' '}
                        Última visita: <span className="font-mono">{c.lastVisit}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="text-right">
                        <span className="text-neutral-400 block text-[10px] uppercase">Total Atendimentos</span>
                        <strong className="text-white text-sm">{c.appointmentsCount}</strong>
                      </div>

                      <div className="text-right">
                        <span className="text-neutral-400 block text-[10px] uppercase">Gasto Total</span>
                        <strong className="text-emerald-400 text-sm">R$ {c.totalSpent.toFixed(2).replace('.', ',')}</strong>
                      </div>

                      <a
                        href={`https://wa.me/55${c.phone}?text=Ol%C3%A1%20${encodeURIComponent(c.name)}%2C%20tudo%20bem%3F%20Mensagem%20da%20PURAZI%20Studio.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded cursor-pointer transition-colors"
                        title="Falar no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: RESUMO DO MÊS */}
          {activeTab === 'resumo' && (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-amber-300 font-mono font-bold block mb-1">
                  Mês Corrente: {currentMonthStr}
                </span>
                <h3 className="font-['Cinzel'] text-xl text-white font-bold">
                  Resumo Financeiro &amp; Produtividade
                </h3>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#19191c] border border-neutral-800 p-5 space-y-2">
                  <span className="text-xs uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-300" />
                    <span>Atendimentos no Mês</span>
                  </span>
                  <span className="text-3xl font-bold font-mono text-white block">
                    {monthCompleted.length}
                  </span>
                  <span className="text-[11px] text-neutral-500 font-sans block">
                    Total de clientes atendidos ou com horário reservado
                  </span>
                </div>

                <div className="bg-[#19191c] border border-neutral-800 p-5 space-y-2">
                  <span className="text-xs uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Faturamento do Mês</span>
                  </span>
                  <span className="text-3xl font-bold font-mono text-emerald-400 block">
                    R$ {monthRevenue.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[11px] text-neutral-500 font-sans block">
                    Total líquido de cortes e serviços não-cancelados
                  </span>
                </div>

                <div className="bg-[#19191c] border border-neutral-800 p-5 space-y-2">
                  <span className="text-xs uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <span>Ticket Médio</span>
                  </span>
                  <span className="text-3xl font-bold font-mono text-blue-300 block">
                    R$ {averageTicket.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[11px] text-neutral-500 font-sans block">
                    Média por cliente atendido no PURAZI Studio
                  </span>
                </div>
              </div>

              {/* Notice */}
              <div className="bg-[#19191c] border border-neutral-800 p-5 text-xs text-neutral-400 leading-relaxed font-sans space-y-2">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">
                  Dica de Gestão PURAZI Studio:
                </h4>
                <p>
                  As folgas fixas definidas na aba <strong>Folgas Fixas &amp; Horários</strong> bloqueiam os dias correspondentes na mini agenda da página inicial e no painel deslizante, garantindo que nenhum cliente consiga marcar horários quando você estiver descansando.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
