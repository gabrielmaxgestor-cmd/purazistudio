import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronRight, ChevronLeft, ArrowRight, Check } from 'lucide-react';
import {
  DayOption,
  generateNext90Days,
  generateHoursForSchedule,
  isTimeSlotAvailable,
  BarberSettings,
  DEFAULT_BARBER_SETTINGS,
  Appointment,
  BlockedSlot,
} from '../utils/bookingLogic';
import {
  getStoredAppointments,
  getStoredBlockedSlots,
  getStoredBarberSettings,
} from '../utils/storage';

interface MiniBookingAgendaProps {
  onSelectDayAndTime: (day: DayOption, time: string) => void;
  refreshKey?: number;
}

export const MiniBookingAgenda: React.FC<MiniBookingAgendaProps> = ({
  onSelectDayAndTime,
  refreshKey = 0,
}) => {
  const [settings, setSettings] = useState<BarberSettings>(DEFAULT_BARBER_SETTINGS);
  const [days, setDays] = useState<DayOption[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayOption | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadedSettings = getStoredBarberSettings();
    setSettings(loadedSettings);

    const generatedDays = generateNext90Days(new Date(), loadedSettings);
    setDays(generatedDays);

    // Pick first open day if none selected
    const firstOpen = generatedDays.find(d => !d.isOffDay) || generatedDays[0];
    setSelectedDay(firstOpen);

    setAppointments(getStoredAppointments());
    setBlockedSlots(getStoredBlockedSlots());
    setSelectedTime(null);
  }, [refreshKey]);

  const hours = generateHoursForSchedule(settings);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -280 : 280;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleDayClick = (day: DayOption) => {
    if (day.isOffDay) return;
    setSelectedDay(day);
    setSelectedTime(null);
  };

  const handleTimeClick = (time: string) => {
    if (!selectedDay) return;
    setSelectedTime(time);
    // Instant smooth transition directly to step of choosing service & confirming
    onSelectDayAndTime(selectedDay, time);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#141416]/95 backdrop-blur-md border border-neutral-700/70 p-5 sm:p-7 shadow-2xl text-left select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-4 mb-5">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-amber-300 font-mono font-bold block mb-1">
            Passo 1 de 2
          </span>
          <h3 className="font-['Cormorant_Garamond',serif] text-2xl sm:text-3xl text-white font-normal">
            Escolha o dia e o horário
          </h3>
        </div>
        <p className="text-xs text-neutral-400 font-sans max-w-xs sm:text-right">
          Selecione abaixo para ir direto à escolha do serviço e confirmação.
        </p>
      </div>

      {/* Date Carousel */}
      <div className="relative mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Próximos 90 dias</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="p-1 rounded bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Dias anteriores"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="p-1 rounded bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Próximos dias"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Days Strip */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth"
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
                onClick={() => handleDayClick(day)}
                className={`shrink-0 flex flex-col items-center justify-center w-15 py-2.5 px-1 border transition-all cursor-pointer ${
                  isOff
                    ? 'border-neutral-900 bg-neutral-900/40 opacity-40 cursor-not-allowed'
                    : isSelected
                    ? 'bg-white text-black border-white shadow-lg scale-102 font-bold'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800'
                }`}
              >
                <span className={`text-[10px] uppercase tracking-wider font-mono ${
                  isSelected ? 'text-neutral-700' : 'text-neutral-500'
                }`}>
                  {day.dayName}
                </span>
                <span className="text-lg font-bold font-sans my-0.5">
                  {day.dayNumber}
                </span>
                <span className={`text-[9px] uppercase font-mono ${
                  isSelected ? 'text-neutral-700' : 'text-neutral-500'
                }`}>
                  {isOff ? 'Folga' : day.monthName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hours Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Horários disponíveis em {selectedDay?.fullLabel}</span>
          </span>
          <span className="text-[10px] text-neutral-500 font-mono">
            Riscado = ocupado
          </span>
        </div>

        {selectedDay?.isOffDay ? (
          <div className="bg-neutral-900/60 border border-neutral-800 p-6 text-center text-sm text-neutral-400 font-sans">
            Barbearia fechada neste dia conforme escala de folga fixa. Por favor, escolha outra data acima.
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {hours.map((hour) => {
              const isAvailable = selectedDay
                ? isTimeSlotAvailable(selectedDay.dateStr, hour, appointments, blockedSlots, settings)
                : false;
              const isSelected = selectedTime === hour;

              return (
                <button
                  key={hour}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => handleTimeClick(hour)}
                  className={`py-2 px-1 text-xs font-mono font-medium border text-center transition-all ${
                    !isAvailable
                      ? 'border-neutral-900 bg-neutral-950/60 text-neutral-600 line-through cursor-not-allowed opacity-40'
                      : isSelected
                      ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-md scale-102 cursor-pointer'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-200 hover:bg-neutral-800 hover:border-amber-400/60 hover:text-white cursor-pointer active:scale-95'
                  }`}
                  title={isAvailable ? `Escolher ${hour}` : 'Horário ocupado'}
                >
                  {hour}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Proceed hint */}
      <div className="mt-5 pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 font-sans">
        <span className="flex items-center gap-1.5">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Sem cadastro ou senha · Confirme em 1 minuto</span>
        </span>
        {selectedTime && (
          <button
            type="button"
            onClick={() => selectedDay && onSelectDayAndTime(selectedDay, selectedTime)}
            className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 font-semibold cursor-pointer underline underline-offset-4"
          >
            <span>Prosseguir com {selectedTime}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
