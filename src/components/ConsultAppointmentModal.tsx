import React, { useState } from 'react';
import {
  X,
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import {
  Appointment,
  AVAILABLE_HOURS,
  canRescheduleOrCancel,
  isTimeSlotAvailable,
  generateNext90Days,
  DayOption,
} from '../utils/bookingLogic';
import {
  getStoredAppointments,
  saveAppointment,
  updateAppointmentStatus,
  getStoredBlockedSlots,
} from '../utils/storage';

interface ConsultAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppointmentsUpdated?: () => void;
}

export const ConsultAppointmentModal: React.FC<ConsultAppointmentModalProps> = ({
  isOpen,
  onClose,
  onAppointmentsUpdated,
}) => {
  const [queryCode, setQueryCode] = useState('');
  const [queryPhone, setQueryPhone] = useState('');
  const [foundAppointment, setFoundAppointment] = useState<Appointment | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDay, setRescheduleDay] = useState<DayOption | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [rescheduleDays] = useState<DayOption[]>(() => generateNext90Days());

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    setIsRescheduling(false);
    setSearchAttempted(true);

    const appointments = getStoredAppointments();
    const cleanPhone = queryPhone.replace(/\D/g, '');
    const cleanCode = queryCode.trim().toUpperCase();

    const match = appointments.find((a) => {
      if (cleanCode && cleanPhone) {
        return a.code === cleanCode && a.clientPhone === cleanPhone;
      }
      if (cleanCode) {
        return a.code === cleanCode;
      }
      if (cleanPhone) {
        return a.clientPhone === cleanPhone;
      }
      return false;
    });

    setFoundAppointment(match || null);
  };

  const handleCancelAppointment = () => {
    if (!foundAppointment) return;

    const check = canRescheduleOrCancel(
      foundAppointment.dateStr,
      foundAppointment.timeStr,
      new Date(),
      2
    );

    if (!check.allowed) {
      setActionMessage({
        type: 'error',
        text: check.reason || 'Não é possível cancelar com menos de 2 horas de antecedência.',
      });
      return;
    }

    if (window.confirm('Tem certeza que deseja cancelar este agendamento?')) {
      const updated = updateAppointmentStatus(foundAppointment.id, 'cancelled');
      const refreshed = updated.find((a) => a.id === foundAppointment.id);
      setFoundAppointment(refreshed || null);
      setActionMessage({
        type: 'success',
        text: 'Agendamento cancelado com sucesso. O horário foi liberado para outros clientes.',
      });
      if (onAppointmentsUpdated) onAppointmentsUpdated();
    }
  };

  const handleConfirmReschedule = () => {
    if (!foundAppointment || !rescheduleDay || !rescheduleTime) {
      setActionMessage({
        type: 'error',
        text: 'Por favor, selecione a nova data e horário desejado.',
      });
      return;
    }

    // Verify availability
    const available = isTimeSlotAvailable(
      rescheduleDay.dateStr,
      rescheduleTime,
      getStoredAppointments(),
      getStoredBlockedSlots()
    );

    if (!available) {
      setActionMessage({
        type: 'error',
        text: 'Este horário acabou de ser ocupado. Por favor, escolha outro.',
      });
      return;
    }

    const updatedAppointment: Appointment = {
      ...foundAppointment,
      dateStr: rescheduleDay.dateStr,
      timeStr: rescheduleTime,
      status: 'confirmed',
    };

    saveAppointment(updatedAppointment);
    setFoundAppointment(updatedAppointment);
    setIsRescheduling(false);
    setActionMessage({
      type: 'success',
      text: `Agendamento remarcado com sucesso para ${rescheduleDay.fullLabel} às ${rescheduleTime}!`,
    });
    if (onAppointmentsUpdated) onAppointmentsUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-lg bg-[#151517] text-white border border-neutral-800 shadow-2xl p-6 sm:p-8 z-10 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Consultar Meu Agendamento"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
          <div>
            <span className="text-[10px] tracking-[0.25em] uppercase text-neutral-400 font-bold block">
              PURΛZI Studio
            </span>
            <h3 className="font-['Cinzel'] text-xl text-white font-bold">
              Consultar Meu Agendamento
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-full hover:bg-neutral-800 transition-colors"
            aria-label="Fechar consulta"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Alerts */}
        {actionMessage && (
          <div
            className={`p-3.5 rounded text-xs mb-5 flex items-start gap-2.5 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-200'
                : 'bg-red-950/60 border border-red-800/60 text-red-200'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4 mb-6">
          <p className="text-xs text-neutral-400">
            Digite o <strong>Código do Agendamento</strong> (ex: PRZ-4921) e/ou seu <strong>WhatsApp</strong> para localizar sua reserva:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="search-code" className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">
                Código (PRZ-XXXX)
              </label>
              <input
                id="search-code"
                type="text"
                placeholder="Ex: PRZ-4921"
                value={queryCode}
                onChange={(e) => setQueryCode(e.target.value.toUpperCase())}
                className="w-full bg-[#1b1b1e] border border-neutral-800 text-white px-3.5 py-2.5 text-xs font-mono uppercase focus:outline-none focus:border-amber-200 rounded-none placeholder:text-neutral-600"
              />
            </div>

            <div>
              <label htmlFor="search-phone" className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">
                WhatsApp
              </label>
              <input
                id="search-phone"
                type="text"
                placeholder="(24) 99999-9999"
                value={queryPhone}
                onChange={(e) => setQueryPhone(e.target.value)}
                className="w-full bg-[#1b1b1e] border border-neutral-800 text-white px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-200 rounded-none placeholder:text-neutral-600"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-white text-black hover:bg-neutral-200 py-3 text-xs uppercase tracking-[0.2em] font-bold rounded-none flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Localizar Agendamento</span>
          </button>
        </form>

        {/* Search Result */}
        {searchAttempted && !foundAppointment && (
          <div className="bg-[#1b1b1e] border border-neutral-800 p-6 text-center text-xs text-neutral-400 space-y-2">
            <p>Nenhum agendamento encontrado com os dados informados.</p>
            <p className="text-[11px] text-neutral-500">
              Verifique se digitou o código corretamente ou chame nosso suporte no WhatsApp (24) 99999-9999.
            </p>
          </div>
        )}

        {foundAppointment && (
          <div className="space-y-4">
            {/* Card Details */}
            <div className="bg-[#1b1b1e] border border-neutral-800 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Código</span>
                  <p className="font-mono text-base font-bold text-amber-200">{foundAppointment.code}</p>
                </div>

                <span
                  className={`text-[10px] uppercase tracking-wider px-2.5 py-1 font-bold ${
                    foundAppointment.status === 'confirmed'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : foundAppointment.status === 'cancelled'
                      ? 'bg-red-950 text-red-300 border border-red-800'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {foundAppointment.status === 'confirmed'
                    ? 'Confirmado'
                    : foundAppointment.status === 'cancelled'
                    ? 'Cancelado'
                    : 'Concluído'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Cliente:</span>
                  <span className="text-white font-medium">{foundAppointment.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Serviço:</span>
                  <span className="text-white font-medium">{foundAppointment.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Data marcada:</span>
                  <span className="text-white font-medium">{foundAppointment.dateStr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Horário:</span>
                  <span className="text-amber-200 font-bold text-sm">{foundAppointment.timeStr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Valor a pagar:</span>
                  <span className="text-white font-bold">R$ {foundAppointment.price.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-800/80">
                  <span>Local:</span>
                  <span>Av. Nilo Peçanha, 1027 - Valença/RJ</span>
                </div>
              </div>
            </div>

            {/* Rescheduling Form Drawer Mode */}
            {isRescheduling && (
              <div className="bg-[#18181b] border border-amber-200/40 p-4 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                    Escolha a nova data e horário
                  </h4>
                  <button
                    onClick={() => setIsRescheduling(false)}
                    className="text-neutral-400 hover:text-white text-[11px]"
                  >
                    Cancelar remarcação
                  </button>
                </div>

                {/* Day selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {rescheduleDays.slice(0, 30).map((d) => (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => {
                        setRescheduleDay(d);
                        setRescheduleTime(null);
                      }}
                      className={`flex-shrink-0 w-16 py-2 text-center border text-[11px] ${
                        rescheduleDay?.dateStr === d.dateStr
                          ? 'border-amber-200 bg-neutral-900 text-white font-bold'
                          : 'border-neutral-800 bg-neutral-900/50 text-neutral-400'
                      }`}
                    >
                      <span>{d.dayName}</span>
                      <strong className="block text-sm">{d.dayNumber}</strong>
                    </button>
                  ))}
                </div>

                {/* Hours grid */}
                <div className="grid grid-cols-4 gap-2">
                  {AVAILABLE_HOURS.map((hr) => {
                    const avail = rescheduleDay
                      ? isTimeSlotAvailable(rescheduleDay.dateStr, hr, getStoredAppointments(), getStoredBlockedSlots())
                      : false;
                    const isSel = rescheduleTime === hr;

                    if (!avail) {
                      return (
                        <div key={hr} className="py-2 text-center text-[11px] text-neutral-600 line-through bg-neutral-900">
                          {hr}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={hr}
                        type="button"
                        onClick={() => setRescheduleTime(hr)}
                        className={`py-2 text-center text-[11px] border font-medium ${
                          isSel
                            ? 'border-amber-200 bg-neutral-900 text-amber-200 font-bold'
                            : 'border-neutral-800 bg-[#1f1f23] text-neutral-200 hover:bg-neutral-800'
                        }`}
                      >
                        {hr}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmReschedule}
                  className="w-full bg-white text-black font-bold py-2.5 text-xs uppercase tracking-wider rounded-none hover:bg-neutral-200 cursor-pointer"
                >
                  Salvar Nova Data &amp; Horário
                </button>
              </div>
            )}

            {/* Actions for Confirmed appointments */}
            {foundAppointment.status === 'confirmed' && !isRescheduling && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const check = canRescheduleOrCancel(
                      foundAppointment.dateStr,
                      foundAppointment.timeStr,
                      new Date(),
                      2
                    );
                    if (!check.allowed) {
                      setActionMessage({
                        type: 'error',
                        text: check.reason || 'Remarcações devem ser feitas com no mínimo 2h de antecedência.',
                      });
                      return;
                    }
                    setIsRescheduling(true);
                  }}
                  className="border border-neutral-700 hover:border-white py-2.5 px-3 text-xs uppercase tracking-wider text-neutral-200 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-200" />
                  <span>Remarcar</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelAppointment}
                  className="border border-red-900/60 hover:bg-red-950/40 text-red-300 py-2.5 px-3 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
