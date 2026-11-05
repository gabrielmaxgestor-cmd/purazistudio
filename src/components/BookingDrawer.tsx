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
  Sparkles,
} from 'lucide-react';
import {
  Service,
  Appointment,
  BlockedSlot,
  DayOption,
  AVAILABLE_HOURS,
  generateNext90Days,
  isTimeSlotAvailable,
  generateBookingCode,
  isValidPhone,
  formatWhatsAppBookingMessage,
} from '../utils/bookingLogic';
import { saveAppointment, getStoredBlockedSlots, getStoredAppointments } from '../utils/storage';

interface BookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  preselectedServiceId?: string | null;
  preselectedDateStr?: string;
  preselectedTimeStr?: string;
  onBookingComplete?: (appointment: Appointment) => void;
}

export const BookingDrawer: React.FC<BookingDrawerProps> = ({
  isOpen,
  onClose,
  services,
  preselectedServiceId,
  preselectedDateStr,
  preselectedTimeStr,
  onBookingComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
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
      const allDays = generateNext90Days();
      setDays(allDays);
      let initialDay = allDays[0];
      if (preselectedDateStr) {
        const foundDay = allDays.find(d => d.dateStr === preselectedDateStr);
        if (foundDay) initialDay = foundDay;
      }
      setSelectedDay(initialDay);

      if (preselectedTimeStr) {
        setSelectedTime(preselectedTimeStr);
      }

      setBlockedSlots(getStoredBlockedSlots());
      setAppointments(getStoredAppointments());

      if (preselectedServiceId) {
        const found = services.find(s => s.id === preselectedServiceId);
        if (found) {
          setSelectedService(found);
          if (preselectedDateStr && preselectedTimeStr) {
            setStep(3);
          } else {
            setStep(2);
          }
        }
      } else if (preselectedDateStr && preselectedTimeStr) {
        setStep(1);
      }
    } else {
      // Reset if closed and not completed
      if (!confirmedAppointment) {
        setStep(1);
        setSelectedTime(null);
        setFormError(null);
      }
    }
  }, [isOpen, preselectedServiceId, services]);

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

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    if (selectedDay && selectedTime) {
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleSelectDay = (day: DayOption) => {
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
    // Basic phone formatting for BR (XX) XXXXX-XXXX
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
      getStoredBlockedSlots()
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
    // Add duration
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

      {/* Drawer Container */}
      <aside
        className="relative w-full max-w-xl bg-[#141416] text-white h-full shadow-2xl flex flex-col z-10 border-l border-neutral-800 animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-label="Painel de Agendamento PURAZI"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-neutral-800/80 flex items-center justify-between bg-[#18181b]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Cinzel'] tracking-[0.2em] text-base font-bold text-white">
                PUR<span className="text-amber-200">Λ</span>ZI
              </span>
              <span className="text-[10px] tracking-widest uppercase bg-neutral-800 px-2 py-0.5 text-neutral-300">
                Agendamento
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 font-sans">
              Confirme em 1 minuto • Sem cadastro nem senha
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-full hover:bg-neutral-800 transition-colors"
            aria-label="Fechar painel de agendamento"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-[#111113] border-b border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-1.5 ${step === 1 ? 'text-amber-200 font-semibold' : step > 1 ? 'text-white' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-amber-200 text-black font-bold' : step > 1 ? 'bg-neutral-700 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                1
              </span>
              <span>Serviço</span>
            </span>

            <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />

            <span className={`flex items-center gap-1.5 ${step === 2 ? 'text-amber-200 font-semibold' : step > 2 ? 'text-white' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-amber-200 text-black font-bold' : step > 2 ? 'bg-neutral-700 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                2
              </span>
              <span>Data/Hora</span>
            </span>

            <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />

            <span className={`flex items-center gap-1.5 ${step >= 3 ? 'text-amber-200 font-semibold' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 3 ? 'bg-amber-200 text-black font-bold' : 'bg-neutral-800 text-neutral-400'}`}>
                3
              </span>
              <span>Seus dados</span>
            </span>
          </div>

          <span className="text-[11px] text-neutral-500 hidden sm:inline">Passo {step} de 4</span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {formError && (
            <div className="bg-red-950/60 border border-red-800/60 text-red-200 p-3.5 rounded text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 1: Lista Simples de Serviços */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-['Cinzel'] text-lg text-white font-semibold">
                  Escolha o Serviço
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Selecione o procedimento que deseja realizar com nossos barbeiros visagistas.
                </p>
              </div>

              <div className="space-y-2.5">
                {services.map((service) => {
                  const isSelected = selectedService?.id === service.id;
                  return (
                    <div
                      key={service.id}
                      onClick={() => handleSelectService(service)}
                      className={`p-4 border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-amber-200 bg-neutral-900/90 shadow-md ring-1 ring-amber-200/50'
                          : 'border-neutral-800/80 bg-[#19191c] hover:border-neutral-600 hover:bg-neutral-800/50'
                      }`}
                    >
                      <div className="space-y-1 pr-4">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm text-white">{service.name}</h4>
                          {service.category === 'combo' && (
                            <span className="text-[9px] uppercase tracking-wider bg-amber-950 text-amber-200 border border-amber-800/50 px-1.5 py-0.2 rounded">
                              Destaque
                            </span>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
                            {service.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-neutral-400 pt-1">
                          <Clock className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{service.durationMinutes} minutos</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-bold text-white block">
                          R$ {service.price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[11px] text-amber-200 font-medium inline-block mt-1">
                          Selecionar &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Data e Horário (Faixa horizontal com os próximos 90 dias e botões de horário embaixo) */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Selected service summary tag */}
              {selectedService && (
                <div className="bg-neutral-900 border border-neutral-800 p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-neutral-400">Serviço:</span>{' '}
                    <strong className="text-white">{selectedService.name}</strong>
                    <span className="text-neutral-500 ml-2">({selectedService.durationMinutes} min)</span>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-amber-200 hover:underline text-[11px] cursor-pointer"
                  >
                    Alterar
                  </button>
                </div>
              )}

              {/* 90 Days Horizontal Strip */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-['Cinzel'] text-sm uppercase tracking-wider text-white font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-200" />
                    Selecione a Data (Próximos 90 dias)
                  </h3>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => scrollDays('left')}
                      className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                      aria-label="Ver dias anteriores"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => scrollDays('right')}
                      className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                      aria-label="Ver próximos dias"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div
                  ref={daysScrollRef}
                  className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent snap-x"
                >
                  {days.map((day) => {
                    const isSelected = selectedDay?.dateStr === day.dateStr;
                    return (
                      <button
                        key={day.dateStr}
                        onClick={() => handleSelectDay(day)}
                        className={`flex-shrink-0 w-[72px] py-3 text-center border transition-all cursor-pointer snap-start ${
                          isSelected
                            ? 'border-amber-200 bg-neutral-900 text-white ring-1 ring-amber-200/50 shadow-md'
                            : 'border-neutral-800 bg-[#1a1a1d] text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800'
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-sans">
                          {day.dayName}
                        </span>
                        <span className="text-lg font-bold text-white block my-0.5">
                          {day.dayNumber}
                        </span>
                        <span className="text-[10px] uppercase text-neutral-500 block">
                          {day.monthName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots Grid with Struck-through for occupied */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-['Cinzel'] text-sm uppercase tracking-wider text-white font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-200" />
                    Horários Disponíveis
                  </h3>
                  {selectedDay && (
                    <span className="text-xs text-neutral-400 font-sans">
                      {selectedDay.fullLabel}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {AVAILABLE_HOURS.map((hour) => {
                    const available = selectedDay
                      ? isTimeSlotAvailable(selectedDay.dateStr, hour, appointments, blockedSlots)
                      : false;
                    const isSelected = selectedTime === hour;

                    if (!available) {
                      return (
                        <div
                          key={hour}
                          title="Horário ocupado ou indisponível"
                          className="py-2.5 px-3 border border-neutral-800/60 bg-neutral-900/50 text-neutral-600 text-center text-xs line-through cursor-not-allowed select-none"
                        >
                          {hour}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={hour}
                        onClick={() => setSelectedTime(hour)}
                        className={`py-2.5 px-3 border text-center text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-200 bg-neutral-900 text-amber-200 ring-1 ring-amber-200/50 font-bold'
                            : 'border-neutral-800 bg-[#1c1c20] text-neutral-200 hover:border-neutral-600 hover:bg-neutral-800'
                        }`}
                      >
                        {hour}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4 mt-3 text-[11px] text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 border border-neutral-700 bg-[#1c1c20] inline-block" />
                    Disponível
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 border border-neutral-800 bg-neutral-900 line-through inline-block text-[8px] text-center text-neutral-600">
                      -
                    </span>
                    Ocupado / Riscado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 border border-amber-200 bg-neutral-900 inline-block" />
                    Selecionado
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="pt-4 flex items-center justify-between border-t border-neutral-800">
                <button
                  onClick={() => setStep(1)}
                  className="text-neutral-400 hover:text-white text-xs uppercase tracking-wider cursor-pointer"
                >
                  &larr; Voltar
                </button>

                <button
                  onClick={handleProceedToDetails}
                  disabled={!selectedTime}
                  className={`px-6 py-3 text-xs uppercase tracking-[0.2em] font-semibold transition-all rounded-none ${
                    selectedTime
                      ? 'bg-white text-black hover:bg-neutral-200 cursor-pointer shadow-lg'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Seus Dados (Só nome e WhatsApp, sem cadastro nem senha) */}
          {step === 3 && (
            <form onSubmit={handleConfirmBooking} className="space-y-6">
              <div>
                <h3 className="font-['Cinzel'] text-lg text-white font-semibold">
                  Seus Dados para Contato
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Sem cadastro demorado e sem senha. Apenas o necessário para confirmar seu atendimento e enviar lembrete no WhatsApp.
                </p>
              </div>

              {/* Booking Summary Box */}
              <div className="bg-[#1a1a1d] border border-neutral-800 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Serviço:</span>
                  <span className="text-white font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Data &amp; Horário:</span>
                  <span className="text-amber-200 font-medium">
                    {selectedDay?.fullLabel} às {selectedTime}
                  </span>
                </div>
                <div className="flex justify-between border-t border-neutral-800/80 pt-2 font-medium">
                  <span className="text-neutral-400">Total a pagar no local:</span>
                  <span className="text-white text-sm font-bold">
                    R$ {selectedService?.price.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="client-name" className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">
                    Nome Completo <span className="text-amber-200">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-500" />
                    <input
                      id="client-name"
                      type="text"
                      required
                      placeholder="Ex: Carlos Eduardo"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-[#18181b] border border-neutral-800 text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-200 transition-colors placeholder:text-neutral-600 rounded-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="client-phone" className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">
                    WhatsApp <span className="text-amber-200">*</span>
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
                      className="w-full bg-[#18181b] border border-neutral-800 text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-200 transition-colors placeholder:text-neutral-600 rounded-none"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Você receberá o código e comprovante direto no seu WhatsApp.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-between border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-neutral-400 hover:text-white text-xs uppercase tracking-wider cursor-pointer"
                >
                  &larr; Voltar
                </button>

                <button
                  type="submit"
                  className="bg-white text-black hover:bg-neutral-200 px-6 py-3 text-xs uppercase tracking-[0.2em] font-bold rounded-none transition-all shadow-lg cursor-pointer"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Confirmação (Resumo, Código, Adicionar ao Calendário, WhatsApp) */}
          {step === 4 && confirmedAppointment && (
            <div className="space-y-6 text-center animate-in fade-in duration-300">
              <div className="w-14 h-14 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[10px] tracking-[0.25em] uppercase text-emerald-400 font-bold block mb-1">
                  Agendado com Sucesso
                </span>
                <h3 className="font-['Cinzel'] text-xl text-white font-bold">
                  Nos vemos em breve, {confirmedAppointment.clientName.split(' ')[0]}!
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Seu horário foi reservado e está garantido na nossa agenda.
                </p>
              </div>

              {/* Ticket Card with Unique Code */}
              <div className="bg-[#19191c] border border-amber-200/40 p-5 text-left relative overflow-hidden shadow-xl">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest block">Código do Agendamento</span>
                    <span className="font-mono text-xl font-bold tracking-wider text-amber-200">
                      {confirmedAppointment.code}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider bg-neutral-800 text-neutral-300 px-2 py-1 border border-neutral-700">
                    Confirmado
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Serviço:</span>
                    <span className="text-white font-medium">{confirmedAppointment.serviceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Data:</span>
                    <span className="text-white font-medium">{confirmedAppointment.dateStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Horário:</span>
                    <span className="text-amber-200 font-bold text-sm">{confirmedAppointment.timeStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Duração:</span>
                    <span className="text-neutral-300">{confirmedAppointment.durationMinutes} minutos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Valor a pagar:</span>
                    <span className="text-white font-bold">
                      R$ {confirmedAppointment.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-800/80 pt-2 text-[11px]">
                    <span className="text-neutral-400">Localização:</span>
                    <span className="text-neutral-300 text-right">
                      Av. Nilo Peçanha, 1027 - Valença/RJ
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Calendário & WhatsApp */}
              <div className="space-y-3 pt-2">
                <a
                  href={`https://wa.me/5524999999999?text=${formatWhatsAppBookingMessage(confirmedAppointment)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-black font-semibold py-3.5 px-4 text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-colors rounded-none shadow-lg cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar Confirmação no WhatsApp</span>
                </a>

                <button
                  onClick={handleDownloadCalendar}
                  className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-4 text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-colors border border-neutral-700 rounded-none cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-200" />
                  <span>Adicionar ao Calendário (.ICS)</span>
                </button>
              </div>

              {/* Footer Note */}
              <div className="pt-4 border-t border-neutral-800 text-center">
                <p className="text-[11px] text-neutral-400">
                  Guarde seu código <strong className="text-white font-mono">{confirmedAppointment.code}</strong> para consultar ou remarcar até 2h antes.
                </p>
                <button
                  onClick={onClose}
                  className="mt-3 text-xs text-amber-200 hover:underline uppercase tracking-wider"
                >
                  Fechar Painel
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
