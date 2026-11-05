import React, { useState } from 'react';
import { generateNext90Days, isTimeSlotAvailable, AVAILABLE_HOURS, DayOption } from '../utils/bookingLogic';
import { getStoredBlockedSlots, getStoredAppointments } from '../utils/storage';
import { Calendar, Clock, ChevronRight } from 'lucide-react';

interface MiniScheduleProps {
  onSelectSlot: (dateStr: string, timeStr: string) => void;
}

export const MiniSchedule: React.FC<MiniScheduleProps> = ({ onSelectSlot }) => {
  const days = generateNext90Days();
  const blockedSlots = getStoredBlockedSlots();
  const appointments = getStoredAppointments();

  const [selectedDay, setSelectedDay] = useState<DayOption>(days[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedDay && selectedTime) {
      onSelectSlot(selectedDay.dateStr, selectedTime);
    }
  };

  return (
    <div className="bg-[#18181b]/95 backdrop-blur-md border border-neutral-800 p-4 sm:p-6 shadow-2xl rounded-none max-w-xl mx-auto my-6 text-white font-sans">
      <div className="flex items-center gap-2 mb-4 border-b border-neutral-800 pb-3">
        <Calendar className="w-5 h-5 text-amber-200" />
        <div>
          <h3 className="font-['Cinzel'] text-sm sm:text-base font-bold uppercase tracking-wider text-white">
            Agende Seu Horário
          </h3>
          <p className="text-[11px] text-neutral-400">
            Selecione o dia e o horário desejado para avançar.
          </p>
        </div>
      </div>

      {/* Date horizontal strip */}
      <div className="mb-4">
        <span className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-2 font-medium">
          1. Escolha o dia
        </span>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-700">
          {days.slice(0, 30).map((day) => {
            const isSelected = selectedDay.dateStr === day.dateStr;

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => {
                  setSelectedDay(day);
                  setSelectedTime(null);
                }}
                className={`flex-shrink-0 px-3 py-2 text-center border transition-all text-xs ${
                  isSelected
                    ? 'border-amber-200 bg-white text-black font-bold shadow-md'
                    : 'border-neutral-800 bg-[#121214] text-neutral-300 hover:border-neutral-600 hover:text-white'
                }`}
              >
                <span className="block text-[10px] uppercase tracking-wider font-mono">
                  {day.dayName}
                </span>
                <span className="block text-sm font-bold">
                  {day.dayNumber}
                </span>
                <span className="block text-[9px] uppercase tracking-widest text-neutral-400">
                  {day.monthName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      <div className="mb-5">
        <span className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-2 font-medium">
          2. Escolha o horário ({selectedDay.fullLabel})
        </span>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-44 overflow-y-auto pr-1">
          {AVAILABLE_HOURS.map((time) => {
            const isAvailable = isTimeSlotAvailable(
              selectedDay.dateStr,
              time,
              appointments,
              blockedSlots
            );
            const isSelected = selectedTime === time;

            return (
              <button
                key={time}
                type="button"
                disabled={!isAvailable}
                onClick={() => setSelectedTime(time)}
                className={`py-2 px-1 text-center text-xs font-mono border transition-all ${
                  isSelected
                    ? 'border-amber-200 bg-amber-200 text-black font-bold shadow'
                    : !isAvailable
                    ? 'border-neutral-800/40 bg-neutral-900/30 text-neutral-600 line-through cursor-not-allowed'
                    : 'border-neutral-800 bg-[#121214] text-neutral-200 hover:border-neutral-600 hover:text-white'
                }`}
              >
                {time}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action CTA */}
      <button
        type="button"
        disabled={!selectedDay || !selectedTime}
        onClick={handleConfirm}
        className={`w-full py-3 px-4 text-xs tracking-[0.2em] uppercase font-bold flex items-center justify-center gap-2 rounded-none transition-all ${
          selectedDay && selectedTime
            ? 'bg-white text-black hover:bg-neutral-200 cursor-pointer shadow-lg'
            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
        }`}
      >
        <Clock className="w-4 h-4" />
        <span>Escolher Serviço &amp; Confirmar</span>
        <ChevronRight className="w-4 h-4 ml-1" />
      </button>
    </div>
  );
};
