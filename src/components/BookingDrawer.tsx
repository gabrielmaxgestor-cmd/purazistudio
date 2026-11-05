import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  User,
  Phone,
  MessageCircle,
  Download,
  AlertCircle,
} from 'lucide-react';
import {
  Service,
  Appointment,
  BlockedSlot,
  DayOption,
  BarberSettings,
  DEFAULT_BARBER_SETTINGS,
  generateNext90Days,
  generateHoursForSchedule,
  isTimeSlotAvailable,
  generateBookingCode,
  isValidPhone,
  formatWhatsAppBookingMessage,
} from '../utils/bookingLogic';
import {
  saveAppointment,
  getStoredBlockedSlots,
  getStoredAppointments,
  getStoredBarberSettings,
} from '../utils/storage';

interface BookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  preselectedServiceId?: string | null;
  initialDay?: DayOption | null;
  initialTime?: string | null;
  onBookingComplete?: (appointment: Appointment) => void;
}

export const BookingDrawer: React.FC<BookingDrawerProps> = ({
  isOpen,
  onClose,
  services,
  preselectedServiceId,
  initialDay,
  initialTime,
  onBookingComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  const [settings, setSettings] = useState<BarberSettings>(DEFAULT_BARBER_SETTINGS);
  const [days, setDays] = useState<DayOption[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayOption | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const daysScrollRef = useRef<HTMLDivElement>(null);

  // Initialize days, preselected service, and refreshed appointments
  useEffect(() => {
    if (isOpen) {
      const barberSettings = getStoredBarberSettings();
      setSettings(barberSettings);

      const allDays = generateNext90Days(new Date(), barberSettings);
      setDays(allDays);

      setBlockedSlots(getStoredBlockedSlots());
      setAppointments(getStoredAppointments());

      // If initialDay and initialTime provided from MiniAgenda
      if (initialDay && initialTime) {
        setSelectedDay(initialDay);
        setSelectedTime(initialTime);
        // Step 1: user chooses service, then proceeds to Seus Dados
        setStep(1);
      } else {
        if (!selectedDay && allDays.length > 0) {
          const firstOpen = allDays.find(d => !d.isOffDay) || allDays[0];
          setSelectedDay(firstOpen);
        }
      }

      if (preselectedServiceId) {
        const found = services.find(s => s.id === preselectedServiceId);
        if (found) {
          setSelectedService(found);
          if (!initialDay || !initialTime) {
            setStep(2);
          }
        }
      }
    } else {
      if (!confirmedAppointment) {
        setStep(1);
        setSelectedTime(null);
        setFormError(null);
      }
    }
  }, [isOpen, preselectedServiceId, initialDay, initialTime, services]);

  // Handle closing with ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hours = generateHoursForSchedule(settings);

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setFormError(null);
  };

  const handleContinueFromService = () => {
    if (!selectedService) {
      setFormError('Escolha um serviço para continuar.');
      return;
    }
    setFormError(null);
    // Se data e horário já vieram da mini agenda, vai direto para "Seus Dados"
    setStep(selectedDay && selectedTime ? 3 : 2);
  };

  const formatDateBR = (dateStr: string) => dateStr.split('-').reverse().join('/');

  const handleSelectDay = (day: DayOption) => {
    if (day.isOffDay) return;
    setSelectedDay(day);
    setSelectedTime(null); // Reset time when changing date
  };

  const handleProceedToDetails = () => {
    if (!selectedDay || !selectedTime) {
      setFormError('Por favor, selecione uma data e um horário disponível.');
      return;
    }
    setFormError(null);
    setStep(3);
  };

  const handlePhoneChange = (val: string) => {
    let cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);
    
    if (cleaned.length > 6) {
      cleaned = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length > 2) {
      cleaned = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    } else if (cleaned.length > 0) {
      cleaned = `(${cleaned}`;
    }
    setClientPhone(cleaned);
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setFormError('Por favor, informe seu nome.');
      return;
    }
    if (!isValidPhone(clientPhone)) {
      setFormError('Por favor, informe um WhatsApp válido com DDD (ex: 24 99999-9999).');
      return;
    }

    if (!selectedService || !selectedDay || !selectedTime) {
      setFormError('Dados do agendamento incompletos.');
      return;
    }

    // Re-verify availability
    const stillAvailable = isTimeSlotAvailable(
      selectedDay.dateStr,
      selectedTime,
      getStoredAppointments(),
      getStoredBlockedSlots(),
      settings
    );

    if (!stillAvailable) {
      setFormError('Este horário acabou de ser ocupado. Por favor, selecione outro horário.');
      setStep(2);
      return;
    }

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      code: generateBookingCode(),
      clientName: clientName.trim(),
      clientPhone: clientPhone.replace(/\D/g, ''),
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      price: selectedService.price,
      durationMinutes: selectedService.durationMinutes,
      dateStr: selectedDay.dateStr,
      timeStr: selectedTime,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    saveAppointment(newAppointment);
    setConfirmedAppointment(newAppointment);
    setStep(4);
    if (onBookingComplete) {
      onBookingComplete(newAppointment);
    }
  };

  // Download .ics calendar file
  const handleDownloadCalendar = () => {
    if (!confirmedAppointment) return;

    const [yyyy, mm, dd] = confirmedAppointment.dateStr.split('-');
    const [hh, min] = confirmedAppointment.timeStr.split(':');
    
    const startIso = `${yyyy}${mm}${dd}T${hh}${min}00`;
    const endMinutes = Number(min) + confirmedAppointment.durationMinutes;
    const endHours = Number(hh) + Math.floor(endMinutes / 60);
    const endRemainderMin = endMinutes % 60;
    const endIso = `${yyyy}${mm}${dd}T${String(endHours).padStart(2, '0')}${String(endRemainderMin).padStart(2, '0')}00`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PURAZI Studio//Barbearia & Visagismo//PT',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `SUMMARY:PURAZI Studio - ${confirmedAppointment.serviceName}`,
      `DESCRIPTION:Agendamento de ${confirmedAppointment.serviceName} no PURAZI Studio.\\nCódigo: ${confirmedAppointment.code}\\nCliente: ${confirmedAppointment.clientName}`,
      'LOCATION:Avenida Nilo Peçanha, 1027 - Valença - RJ',
      `DTSTART:${startIso}`,
      `DTEND:${endIso}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `agendamento-purazi-${confirmedAppointment.code}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const scrollDays = (direction: 'left' | 'right') => {
    if (daysScrollRef.current) {
      const offset = direction === 'left' ? -260 : 260;
      daysScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container - Spacious, intuitive, luxurious */}
      <aside
        className="relative w-full max-w-2xl bg-[#121215] text-white h-[100dvh] shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col z-10 border-l border-neutral-800 animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-label="Painel de Agendamento PURAZI"
      >
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-800/80 flex items-center justify-between bg-[#161619]">
          <div className="flex items-center gap-3">
            <img
              src="/assets/logo-purazi-white.png"
              alt="PURΛZI Studio"
              className="h-6 sm:h-7 w-auto object-contain"
            />
            <span className="text-[10px] tracking-widest uppercase bg-amber-400/10 text-amber-300 border border-amber-400/20 px-2 py-0.5 font-mono">
              Agendamento Online
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Fechar painel de agendamento"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indicador de etapas (único) */}
        <ol className="px-5 sm:px-6 py-3 bg-[#0e0e11] border-b border-neutral-800 flex items-center gap-2 sm:gap-3 text-xs" aria-label="Etapas do agendamento">
          {[
            { n: 1, label: 'Serviço' },
            { n: 2, label: 'Data & Hora' },
            { n: 3, label: 'Seus Dados' },
          ].map((item, idx) => {
            const done = step > item.n;
            const active = step === item.n;
            return (
              <React.Fragment key={item.n}>
                {idx > 0 && <span className={`h-px flex-1 max-w-10 ${step >= item.n ? 'bg-amber-400/60' : 'bg-neutral-800'}`} aria-hidden="true" />}
                <li
                  className={`flex items-center gap-2 ${active ? 'text-amber-300 font-bold' : done ? 'text-neutral-300' : 'text-neutral-600'}`}
                  aria-current={active ? 'step' : undefined}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      active
                        ? 'bg-amber-400 text-black'
                        : done
                        ? 'bg-amber-400/15 text-amber-300 border border-amber-400/40'
                        : 'bg-neutral-900 text-neutral-600 border border-neutral-800'
                    }`}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : item.n}
                  </span>
                  <span className={active ? 'inline' : 'hidden sm:inline'}>{item.label}</span>
                </li>
              </React.Fragment>
            );
          })}
        </ol>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {formError && (
            <div className="bg-red-950/60 border border-red-800/60 text-red-200 p-3.5 rounded text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 1: Lista Simples com Nome, Duração e Preço (Corte, Barba, Combo, Sobrancelha) */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-neutral-800/80 pb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Escolha o Serviço
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1 font-sans">
                  Selecione o procedimento desejado para avançar à data e horário.
                </p>
                {selectedDay && selectedTime && (
                  <div className="mt-3 bg-neutral-900 border border-amber-400/40 p-3 text-xs text-amber-300 flex items-center justify-between">
                    <span>Horário pré-selecionado: <strong>{selectedDay.fullLabel} às {selectedTime}</strong></span>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-white hover:underline text-[11px] font-mono uppercase cursor-pointer"
                    >
                      Mudar data
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {services.map((service) => {
                  const isSelected = selectedService?.id === service.id;
                  return (
                    <button
                      type="button"
                      key={service.id}
                      onClick={() => handleSelectService(service)}
                      aria-pressed={isSelected}
                      className={`w-full text-left p-4 sm:p-5 border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-amber-400 bg-[#1a1a20] shadow-[0_0_20px_rgba(251,191,36,0.15)] ring-1 ring-amber-400'
                          : 'border-neutral-800 bg-[#161619] hover:border-neutral-600 hover:bg-[#1a1a1e]'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 pr-2">
                        <div className="flex items-center gap-2.5">
                          <h4 className="font-bold text-sm sm:text-base text-white tracking-tight">
                            {service.name}
                          </h4>
                          {service.category === 'combo' && (
                            <span className="text-[9px] uppercase tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/30 px-2 py-0.5 font-mono font-semibold">
                              Mais Escolhido
                            </span>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-xs text-neutral-400 leading-relaxed">
                            {service.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-neutral-400 pt-0.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-amber-400/80" />
                          <span>{service.durationMinutes} minutos</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end justify-center">
                        <span className="text-base sm:text-lg font-extrabold text-amber-300 font-sans block">
                          R$ {service.price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className={`text-[11px] font-semibold uppercase tracking-wider mt-1 px-2.5 py-1 transition-colors ${
                          isSelected
                            ? 'bg-amber-400 text-black'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}>
                          {isSelected ? 'Escolhido ✓' : 'Selecionar'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Data e Horário (Faixa horizontal com os próximos 90 dias e botões de horário embaixo) */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-neutral-800/80 pb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Escolha Data e Horário
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1 font-sans">
                  Toque em um dia e depois no horário que preferir.
                </p>
              </div>

              {/* Selected service summary tag */}
              {selectedService && (
                <div className="bg-[#18181c] border border-neutral-800 p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                    <span className="text-neutral-400 font-mono">Serviço:</span>
                    <strong className="text-white text-sm">{selectedService.name}</strong>
                    <span className="text-amber-300 font-mono font-bold">R$ {selectedService.price.toFixed(2).replace('.', ',')}</span>
                    <span className="text-neutral-500 font-mono hidden sm:inline">({selectedService.durationMinutes} min)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-amber-400 hover:text-amber-300 text-[11px] uppercase tracking-wider font-semibold underline underline-offset-2 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    Alterar serviço
                  </button>
                </div>
              )}

              {/* 90 Days Horizontal Strip */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] text-white font-bold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>Dia</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => scrollDays('left')}
                      className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                      aria-label="Ver dias anteriores"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollDays('right')}
                      className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                      aria-label="Ver próximos dias"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div
                  ref={daysScrollRef}
                  className="flex gap-2.5 overflow-x-auto p-1 pb-2 scrollbar-none snap-x"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {days.map((day) => {
                    const isSelected = selectedDay?.dateStr === day.dateStr;
                    const isOff = day.isOffDay;
                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        disabled={isOff}
                        onClick={() => handleSelectDay(day)}
                        className={`shrink-0 w-16 sm:w-18 py-3 text-center border transition-all cursor-pointer snap-start ${
                          isOff
                            ? 'border-neutral-900 bg-neutral-950 text-neutral-600 opacity-40 cursor-not-allowed'
                            : isSelected
                            ? 'border-amber-400 bg-white text-black shadow-lg scale-102 font-bold ring-2 ring-amber-400'
                            : 'border-neutral-800 bg-[#161619] text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800'
                        }`}
                      >
                        <span className={`text-[10px] uppercase tracking-wider block font-mono ${
                          isSelected ? 'text-neutral-700 font-bold' : 'text-neutral-500'
                        }`}>
                          {day.dayName}
                        </span>
                        <span className="text-xl font-extrabold block my-0.5 font-sans">
                          {day.dayNumber}
                        </span>
                        <span className={`text-[10px] uppercase block font-mono ${
                          isSelected ? 'text-neutral-700' : 'text-neutral-500'
                        }`}>
                          {isOff ? 'Folga' : day.monthName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots Grid with Struck-through for occupied */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] text-white font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Horário</span>
                  </span>
                  {selectedDay && (
                    <span className="text-xs text-amber-300 font-medium">
                      {selectedDay.fullLabel}
                    </span>
                  )}
                </div>

                {selectedDay?.isOffDay ? (
                  <div className="bg-neutral-900/80 border border-neutral-800 p-6 text-center text-xs text-neutral-400 font-sans">
                    Barbearia fechada neste dia conforme escala de folga fixa. Por favor, escolha outra data acima.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {hours.map((hour) => {
                      const available = selectedDay
                        ? isTimeSlotAvailable(selectedDay.dateStr, hour, appointments, blockedSlots, settings)
                        : false;
                      const isSelected = selectedTime === hour;

                      if (!available) {
                        return (
                          <div
                            key={hour}
                            title="Horário ocupado"
                            className="py-3 px-2 border border-neutral-900 bg-neutral-950/70 text-neutral-600 text-center text-xs line-through cursor-not-allowed select-none font-mono"
                          >
                            {hour}
                          </div>
                        );
                      }

                      return (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => setSelectedTime(hour)}
                          className={`py-3 px-2 border text-center text-xs font-mono font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-amber-400 bg-amber-400 text-black shadow-md scale-102 ring-1 ring-amber-300'
                              : 'border-neutral-800 bg-[#18181c] text-white hover:border-amber-400/70 hover:bg-neutral-800 active:scale-95'
                          }`}
                        >
                          {hour}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-neutral-500 font-sans">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 border border-neutral-700 bg-[#18181c] inline-block" />
                    Disponível
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 border border-neutral-900 bg-neutral-950 line-through inline-block text-[8px] text-center text-neutral-600">
                      -
                    </span>
                    Indisponível
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-400 inline-block" />
                    Selecionado
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Seus Dados (Só nome e WhatsApp, sem cadastro nem senha) */}
          {step === 3 && (
            <form id="booking-form" onSubmit={handleConfirmBooking} className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-neutral-800/80 pb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Seus Dados para Contato
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1 font-sans">
                  Confirmação instantânea sem burocracia, cadastro ou senha.
                </p>
              </div>

              {/* Booking Summary Box - Clean and Clear */}
              <div className="bg-[#18181c] border border-neutral-700/80 p-4 sm:p-5 space-y-2.5 text-xs sm:text-sm shadow-md">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 font-mono">Serviço:</span>
                  <span className="text-white font-bold">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 font-mono">Data &amp; Horário:</span>
                  <span className="text-amber-300 font-bold font-mono">
                    {selectedDay?.fullLabel} às {selectedTime}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 font-mono">Duração estimada:</span>
                  <span className="text-neutral-300 font-mono">{selectedService?.durationMinutes} minutos</span>
                </div>
                <div className="flex justify-between items-center border-t border-neutral-800 pt-3 mt-1 font-medium">
                  <span className="text-neutral-300 font-semibold font-mono">Total no local:</span>
                  <span className="text-amber-300 text-base sm:text-lg font-extrabold font-sans">
                    R$ {selectedService?.price.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="client-name" className="block text-xs uppercase tracking-wider text-neutral-300 mb-2 font-bold font-sans">
                    Nome Completo <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-500" />
                    <input
                      id="client-name"
                      type="text"
                      required
                      placeholder="Ex: Gabriel Oliveira"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-[#161619] border border-neutral-700 text-white pl-10 pr-4 py-3.5 text-sm sm:text-base focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors placeholder:text-neutral-600 rounded-none font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="client-phone" className="block text-xs uppercase tracking-wider text-neutral-300 mb-2 font-bold font-sans">
                    WhatsApp com DDD <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-500" />
                    <input
                      id="client-phone"
                      type="tel"
                      required
                      placeholder="(24) 99999-9999"
                      value={clientPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full bg-[#161619] border border-neutral-700 text-white pl-10 pr-4 py-3.5 text-sm sm:text-base focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors placeholder:text-neutral-600 rounded-none font-sans"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1.5 font-sans">
                    O código de agendamento e o comprovante serão enviados no seu WhatsApp.
                  </p>
                </div>
              </div>
            </form>
          )}

          {/* STEP 4: Confirmação (Resumo, Código, Adicionar ao Calendário, WhatsApp) */}
          {step === 4 && confirmedAppointment && (
            <div className="space-y-6 text-center animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-emerald-950/80 border-2 border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <Check className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] tracking-[0.3em] uppercase text-emerald-400 font-bold block mb-1 font-mono">
                  AGENDADO COM SUCESSO
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Nos vemos em breve, {confirmedAppointment.clientName.split(' ')[0]}!
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1 font-sans">
                  Seu horário foi reservado e está garantido na nossa agenda.
                </p>
              </div>

              {/* Ticket Card with Unique Code */}
              <div className="bg-[#18181c] border border-amber-400/60 p-5 sm:p-6 text-left relative overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5 mb-3.5">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest block font-mono">Código do Agendamento</span>
                    <span className="font-mono text-2xl font-extrabold tracking-wider text-amber-300">
                      {confirmedAppointment.code}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 font-mono font-bold">
                    Confirmado
                  </span>
                </div>

                <div className="space-y-2.5 text-xs sm:text-sm font-sans">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 font-mono">Serviço:</span>
                    <span className="text-white font-bold">{confirmedAppointment.serviceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 font-mono">Data:</span>
                    <span className="text-white font-medium">{formatDateBR(confirmedAppointment.dateStr)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 font-mono">Horário:</span>
                    <span className="text-amber-300 font-bold font-mono">{confirmedAppointment.timeStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 font-mono">Duração:</span>
                    <span className="text-neutral-300 font-mono">{confirmedAppointment.durationMinutes} minutos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 font-mono">Valor no local:</span>
                    <span className="text-white font-extrabold text-base">
                      R$ {confirmedAppointment.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-800/80 pt-2.5 text-xs">
                    <span className="text-neutral-400 font-mono">Localização:</span>
                    <span className="text-neutral-200 text-right">
                      Av. Nilo Peçanha, 1027 - Valença/RJ
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: WhatsApp & Calendário */}
              <div className="space-y-3 pt-2 font-sans">
                <a
                  href={`https://wa.me/5524999999999?text=${formatWhatsAppBookingMessage(confirmedAppointment)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold py-4 px-5 text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 transition-colors rounded-none shadow-lg cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  <span>Enviar Comprovante no WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={handleDownloadCalendar}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold py-3.5 px-4 text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-colors border border-neutral-700 rounded-none cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>Adicionar ao Calendário (.ICS)</span>
                </button>
              </div>

              {/* Footer Note */}
              <div className="pt-4 border-t border-neutral-800 text-center font-sans">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Guarde seu código <strong className="text-white font-mono">{confirmedAppointment.code}</strong> para consultar, remarcar ou cancelar até 12 horas antes.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 text-xs text-amber-300 hover:text-amber-200 font-bold uppercase tracking-wider underline cursor-pointer"
                >
                  Concluir e Fechar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé fixo: ação principal sempre visível (sem precisar rolar) */}
        {step !== 4 && (
          <div className="shrink-0 border-t border-neutral-800 bg-[#161619] px-5 sm:px-7 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex items-center gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                className="h-12 px-4 inline-flex items-center gap-1.5 text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-500 text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            )}

            {step === 1 && (
              <button
                type="button"
                onClick={handleContinueFromService}
                disabled={!selectedService}
                className={`flex-1 h-12 inline-flex items-center justify-center gap-2 text-xs uppercase tracking-[0.15em] font-bold transition-colors ${
                  selectedService
                    ? 'bg-white text-black hover:bg-amber-400 cursor-pointer'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                }`}
              >
                <span className="truncate">{selectedService ? `Continuar com ${selectedService.name}` : 'Selecione um serviço'}</span>
                {selectedService && <ChevronRight className="w-4 h-4 shrink-0" />}
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleProceedToDetails}
                disabled={!selectedTime}
                className={`flex-1 h-12 inline-flex items-center justify-center gap-2 text-xs uppercase tracking-[0.15em] font-bold transition-colors ${
                  selectedTime
                    ? 'bg-white text-black hover:bg-amber-400 cursor-pointer'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                }`}
              >
                <span className="truncate">{selectedTime ? `Continuar às ${selectedTime}` : 'Selecione um horário'}</span>
                {selectedTime && <ChevronRight className="w-4 h-4 shrink-0" />}
              </button>
            )}

            {step === 3 && (
              <button
                type="submit"
                form="booking-form"
                className="flex-1 h-12 inline-flex items-center justify-center gap-2 bg-amber-400 text-black hover:bg-amber-300 text-xs uppercase tracking-[0.15em] font-bold transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Agendamento</span>
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};
