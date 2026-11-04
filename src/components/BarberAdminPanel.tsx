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
} from 'lucide-react';
import {
  Service,
  Appointment,
  BlockedSlot,
  AVAILABLE_HOURS,
  generateNext90Days,
} from '../utils/bookingLogic';
import {
  getStoredAppointments,
  saveAppointment,
  updateAppointmentStatus,
  getStoredServices,
  saveServices,
  getStoredBlockedSlots,
  saveBlockedSlots,
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
  const [activeTab, setActiveTab] = useState<'agenda' | 'bloqueios' | 'servicos' | 'clientes' | 'resumo'>('agenda');
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);

  // Selected date for Agenda
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Form states for new service
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('30');
  const [newServiceCategory, setNewServiceCategory] = useState<Service['category']>('cabelo');

  // Form states for new block
  const [blockDate, setBlockDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [blockHour, setBlockHour] = useState<string>(''); // empty = full day
  const [blockReason, setBlockReason] = useState('Folga programada');

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAppointments(getStoredAppointments());
      setServices(getStoredServices());
      setBlockedSlots(getStoredBlockedSlots());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Agenda logic
  const dateAppointments = appointments.filter(a => a.dateStr === selectedDate);
  const dailyRevenue = dateAppointments
    .filter(a => a.status !== 'cancelled')
    .reduce((sum, a) => sum + a.price, 0);

  const handleUpdateStatus = (id: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    const updated = updateAppointmentStatus(id, status);
    setAppointments(updated);
    showNotification(`Status do agendamento atualizado para ${status === 'completed' ? 'Concluído' : status === 'cancelled' ? 'Cancelado' : 'Confirmado'}.`);
    if (onDataChanged) onDataChanged();
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
    const updated = blockedSlots.filter(b => b.id !== id);
    setBlockedSlots(updated);
    saveBlockedSlots(updated);
    showNotification('Bloqueio removido. Horário liberado para clientes.');
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
    const updated = services.filter(s => s.id !== id);
    setServices(updated);
    saveServices(updated);
    showNotification('Serviço removido.');
    if (onDataChanged) onDataChanged();
  };

  // Client history aggregation
  const clientMap = new Map<string, {
    name: string;
    phone: string;
    appointmentsCount: number;
    totalSpent: number;
    lastVisit: string;
    favoriteService: string;
  }>();

  appointments.forEach(apt => {
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

  const clientsList = Array.from(clientMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);

  // Month stats
  const currentMonthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthAppointments = appointments.filter(a => a.dateStr.startsWith(currentMonthPrefix));
  const monthCompletedOrConfirmed = monthAppointments.filter(a => a.status !== 'cancelled');
  const monthRevenue = monthCompletedOrConfirmed.reduce((sum, a) => sum + a.price, 0);
  const avgTicket = monthCompletedOrConfirmed.length > 0 ? monthRevenue / monthCompletedOrConfirmed.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Admin Window */}
      <div
        className="relative w-full max-w-5xl bg-[#141416] text-white border border-neutral-800 shadow-2xl z-10 flex flex-col max-h-[92vh] overflow-hidden rounded-none animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Painel Administrativo do Barbeiro"
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-[#1a1a1d] border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-['Cinzel'] text-xl font-bold tracking-[0.2em] text-white">
              PUR<span className="text-amber-200">Λ</span>ZI
            </span>
            <span className="text-[10px] tracking-widest uppercase bg-amber-950 text-amber-200 border border-amber-800/60 px-2 py-0.5">
              Gestão &amp; Barbeiro
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-full hover:bg-neutral-800 transition-colors"
            aria-label="Fechar painel administrativo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 bg-[#121214] border-b border-neutral-800/80 overflow-x-auto scrollbar-none text-xs">
          <button
            onClick={() => setActiveTab('agenda')}
            className={`py-3.5 px-3.5 font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'agenda'
                ? 'border-amber-200 text-amber-200'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Agenda &amp; Horários</span>
          </button>

          <button
            onClick={() => setActiveTab('bloqueios')}
            className={`py-3.5 px-3.5 font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'bloqueios'
                ? 'border-amber-200 text-amber-200'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Bloqueios &amp; Folgas</span>
          </button>

          <button
            onClick={() => setActiveTab('servicos')}
            className={`py-3.5 px-3.5 font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'servicos'
                ? 'border-amber-200 text-amber-200'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Serviços &amp; Preços</span>
          </button>

          <button
            onClick={() => setActiveTab('clientes')}
            className={`py-3.5 px-3.5 font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'clientes'
                ? 'border-amber-200 text-amber-200'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes ({clientsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('resumo')}
            className={`py-3.5 px-3.5 font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'resumo'
                ? 'border-amber-200 text-amber-200'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Resumo do Mês</span>
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="bg-emerald-950/90 border-b border-emerald-800 text-emerald-200 px-6 py-2.5 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: AGENDA */}
          {activeTab === 'agenda' && (
            <div className="space-y-6">
              {/* Date bar & Daily metrics */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#18181b] p-4 border border-neutral-800">
                <div className="flex items-center gap-3">
                  <label htmlFor="agenda-date" className="text-xs uppercase tracking-wider text-neutral-400">
                    Data da Agenda:
                  </label>
                  <input
                    id="agenda-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-[#121214] border border-neutral-700 text-white px-3 py-1.5 text-xs font-mono rounded-none"
                  />
                  <button
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                    className="text-amber-200 hover:underline text-xs"
                  >
                    Hoje
                  </button>
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-neutral-400">Atendimentos:</span>{' '}
                    <strong className="text-white">{dateAppointments.length}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400">Faturamento previsto:</span>{' '}
                    <strong className="text-amber-200 font-bold">R$ {dailyRevenue.toFixed(2).replace('.', ',')}</strong>
                  </div>
                </div>
              </div>

              {/* Appointments List for Day */}
              {dateAppointments.length === 0 ? (
                <div className="bg-[#18181b]/50 border border-neutral-800/80 p-12 text-center text-neutral-400 space-y-2">
                  <Calendar className="w-8 h-8 text-neutral-600 mx-auto" />
                  <p className="text-sm">Nenhum agendamento marcado para esta data.</p>
                  <p className="text-xs text-neutral-500">
                    Os horários continuam disponíveis para reservas de clientes no site.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dateAppointments
                    .sort((a, b) => a.timeStr.localeCompare(b.timeStr))
                    .map((apt) => (
                      <div
                        key={apt.id}
                        className={`p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          apt.status === 'completed'
                            ? 'bg-neutral-900/60 border-neutral-800 opacity-70'
                            : apt.status === 'cancelled'
                            ? 'bg-red-950/20 border-red-900/40 text-neutral-400'
                            : 'bg-[#19191d] border-neutral-700 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="bg-[#121214] border border-neutral-800 px-3 py-2 text-center shrink-0">
                            <span className="text-sm font-bold font-mono text-amber-200 block">{apt.timeStr}</span>
                            <span className="text-[10px] text-neutral-500 block">{apt.durationMinutes} min</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-white">{apt.clientName}</h4>
                              <span className="font-mono text-[10px] text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded">
                                {apt.code}
                              </span>
                            </div>

                            <p className="text-xs text-neutral-300 mt-0.5">
                              {apt.serviceName} •{' '}
                              <strong className="text-white">R$ {apt.price.toFixed(2).replace('.', ',')}</strong>
                            </p>

                            <a
                              href={`https://wa.me/55${apt.clientPhone}?text=Olá ${apt.clientName}! Aqui é do PURAZI Studio sobre seu horário às ${apt.timeStr}.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[11px] text-[#25D366] hover:underline mt-1"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>(24) {apt.clientPhone.slice(-8)}</span>
                            </a>
                          </div>
                        </div>

                        {/* Status Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {apt.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(apt.id, 'completed')}
                                className="bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/80 px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Concluir</span>
                              </button>

                              <button
                                onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                                className="bg-neutral-800 text-neutral-400 hover:text-red-300 hover:bg-neutral-700 px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Cancelar</span>
                              </button>
                            </>
                          )}

                          {apt.status === 'completed' && (
                            <span className="text-xs text-emerald-400 font-medium bg-emerald-950/80 px-2.5 py-1 border border-emerald-800">
                              ✓ Atendimento Concluído
                            </span>
                          )}

                          {apt.status === 'cancelled' && (
                            <span className="text-xs text-red-400 font-medium bg-red-950/80 px-2.5 py-1 border border-red-800">
                              ✕ Cancelado
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BLOQUEIO DE HORÁRIOS & FOLGAS */}
          {activeTab === 'bloqueios' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-['Cinzel'] text-base font-bold text-white">
                  Bloquear Horários ou Marcar Folgas
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Horários bloqueados aparecem riscados e desativados imediatamente no agendamento dos clientes.
                </p>
              </div>

              {/* Block Form */}
              <form onSubmit={handleAddBlock} className="bg-[#18181b] border border-neutral-800 p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-neutral-400 uppercase tracking-wider mb-1 font-medium">
                      Data do Bloqueio
                    </label>
                    <input
                      type="date"
                      value={blockDate}
                      onChange={(e) => setBlockDate(e.target.value)}
                      className="w-full bg-[#121214] border border-neutral-700 text-white px-3 py-2 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 uppercase tracking-wider mb-1 font-medium">
                      Horário Específico (ou Vazio p/ Dia Todo)
                    </label>
                    <select
                      value={blockHour}
                      onChange={(e) => setBlockHour(e.target.value)}
                      className="w-full bg-[#121214] border border-neutral-700 text-white px-3 py-2 text-xs"
                    >
                      <option value="">Dia Inteiro (Folga / Feriado)</option>
                      {AVAILABLE_HOURS.map((hr) => (
                        <option key={hr} value={hr}>
                          {hr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-400 uppercase tracking-wider mb-1 font-medium">
                      Motivo (Opcional)
                    </label>
                    <input
                      type="text"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Ex: Almoço / Folga"
                      className="w-full bg-[#121214] border border-neutral-700 text-white px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-amber-200 text-black hover:bg-amber-300 font-bold px-5 py-2 text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Confirmar Bloqueio</span>
                  </button>
                </div>
              </form>

              {/* Active Blocked Slots List */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                  Bloqueios Ativos ({blockedSlots.length})
                </h4>

                {blockedSlots.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic">Nenhum horário bloqueado no momento.</p>
                ) : (
                  <div className="divide-y divide-neutral-800 border border-neutral-800 bg-[#18181b]">
                    {blockedSlots.map((blk) => (
                      <div key={blk.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <Lock className="w-4 h-4 text-amber-200 shrink-0" />
                          <div>
                            <span className="font-medium text-white">
                              {blk.dateStr} — {blk.timeStr ? `Às ${blk.timeStr}` : 'Dia Inteiro (Folga)'}
                            </span>
                            <span className="text-neutral-500 ml-2">({blk.reason})</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveBlock(blk.id)}
                          className="text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Desbloquear</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CADASTRO DE SERVIÇOS & PREÇOS */}
          {activeTab === 'servicos' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-['Cinzel'] text-base font-bold text-white">
                  Cadastro de Serviços e Tabela de Preços
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Gerencie a duração e o valor de cada serviço oferecido na barbearia.
                </p>
              </div>

              {/* Add Service Form */}
              <form onSubmit={handleAddService} className="bg-[#18181b] border border-neutral-800 p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-neutral-400 uppercase tracking-wider mb-1 font-medium">
                      Nome do Serviço
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Barba Terapia Premium"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      className="w-full bg-[#121214] border border-neutral-700 text-white px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 uppercase tracking-wider mb-1 font-medium">
                      Preço (R$)
                    </label>
                    <input
                      type="number"
                      step="5"
                      min="10"
                      required
                      placeholder="50.00"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(e.target.value)}
                      className="w-full bg-[#121214] border border-neutral-700 text-white px-3 py-2 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 uppercase tracking-wider mb-1 font-medium">
                      Duração (Minutos)
                    </label>
                    <select
                      value={newServiceDuration}
                      onChange={(e) => setNewServiceDuration(e.target.value)}
                      className="w-full bg-[#121214] border border-neutral-700 text-white px-3 py-2 text-xs"
                    >
                      <option value="15">15 minutos</option>
                      <option value="30">30 minutos</option>
                      <option value="45">45 minutos</option>
                      <option value="60">60 minutos</option>
                      <option value="75">75 minutos</option>
                      <option value="90">90 minutos</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-white text-black hover:bg-neutral-200 font-bold px-5 py-2 text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Serviço</span>
                  </button>
                </div>
              </form>

              {/* Current Services List */}
              <div className="space-y-2">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    className="p-4 bg-[#18181b] border border-neutral-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{svc.name}</span>
                        <span className="text-[10px] text-neutral-400 bg-neutral-800 px-2 py-0.5 uppercase tracking-wider">
                          {svc.category}
                        </span>
                      </div>
                      <p className="text-neutral-400 text-[11px]">{svc.durationMinutes} minutos de atendimento</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-base font-bold text-white">
                        R$ {svc.price.toFixed(2).replace('.', ',')}
                      </span>
                      <button
                        onClick={() => handleDeleteService(svc.id)}
                        className="text-neutral-500 hover:text-red-400 p-1.5 transition-colors"
                        title="Excluir serviço"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: HISTÓRICO DE CLIENTES */}
          {activeTab === 'clientes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-['Cinzel'] text-base font-bold text-white">
                    Histórico &amp; Carteira de Clientes
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Clientes fidelizados com histórico de agendamentos e contato rápido.
                  </p>
                </div>
                <span className="text-xs text-neutral-400 bg-neutral-800 px-3 py-1">
                  Total: <strong>{clientsList.length} clientes</strong>
                </span>
              </div>

              <div className="overflow-x-auto border border-neutral-800 bg-[#18181b]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#121214] text-neutral-400 uppercase tracking-wider text-[10px] border-b border-neutral-800">
                    <tr>
                      <th className="p-3.5">Cliente</th>
                      <th className="p-3.5">WhatsApp</th>
                      <th className="p-3.5">Visitas</th>
                      <th className="p-3.5">Total Gasto</th>
                      <th className="p-3.5">Última Visita</th>
                      <th className="p-3.5 text-right">Contato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80 text-neutral-200">
                    {clientsList.map((client) => (
                      <tr key={client.phone} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="p-3.5 font-medium text-white">{client.name}</td>
                        <td className="p-3.5 font-mono text-neutral-400">
                          (24) {client.phone.slice(-8)}
                        </td>
                        <td className="p-3.5">
                          <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded text-[11px]">
                            {client.appointmentsCount}x
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-amber-200">
                          R$ {client.totalSpent.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-3.5 text-neutral-400">{client.lastVisit}</td>
                        <td className="p-3.5 text-right">
                          <a
                            href={`https://wa.me/55${client.phone}?text=Olá ${client.name}! Tudo bem? Passando para saber quando faremos seu próximo alinhamento no PURAZI Studio.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 px-2.5 py-1 text-[11px] rounded transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: RESUMO DO MÊS */}
          {activeTab === 'resumo' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-['Cinzel'] text-base font-bold text-white">
                  Resumo Financeiro &amp; Performance ({currentMonthPrefix})
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Métricas de atendimentos realizados e faturamento da barbearia.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-[#18181b] border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-neutral-400 text-xs">
                    <span>Atendimentos no Mês</span>
                    <Calendar className="w-4 h-4 text-amber-200" />
                  </div>
                  <p className="text-2xl font-bold text-white">{monthCompletedOrConfirmed.length}</p>
                  <p className="text-[11px] text-emerald-400">Atendimentos confirmados / realizados</p>
                </div>

                <div className="p-5 bg-[#18181b] border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-neutral-400 text-xs">
                    <span>Faturamento do Mês</span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">
                    R$ {monthRevenue.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-[11px] text-neutral-400">Receita bruta estimada</p>
                </div>

                <div className="p-5 bg-[#18181b] border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-neutral-400 text-xs">
                    <span>Ticket Médio</span>
                    <TrendingUp className="w-4 h-4 text-amber-200" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    R$ {avgTicket.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-[11px] text-neutral-400">Por cliente atendido</p>
                </div>
              </div>

              {/* Service Popularity Breakdown */}
              <div className="bg-[#18181b] border border-neutral-800 p-5 space-y-4">
                <h4 className="text-xs uppercase tracking-wider text-white font-semibold">
                  Distribuição de Serviços no Mês
                </h4>
                <div className="space-y-3">
                  {services.map((svc) => {
                    const count = monthAppointments.filter(a => a.serviceId === svc.id).length;
                    const percent = monthAppointments.length > 0
                      ? Math.round((count / monthAppointments.length) * 100)
                      : 0;

                    return (
                      <div key={svc.id} className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-neutral-300">{svc.name}</span>
                          <span className="text-neutral-400 font-mono">
                            {count} agendamento{count !== 1 ? 's' : ''} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-200 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
