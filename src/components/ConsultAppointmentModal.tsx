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
  canRescheduleOrCancel,
  isSlotFreeForDuration,
  generateNext90Days,
  generateHoursForSchedule,
  DayOption,
  DEFAULT_BARBER_SETTINGS,
} from '../utils/bookingLogic';
import {
  PublicData,
  loadPublicData,
  lookupAppointment,
  cancelAppointment,
  rescheduleAppointment,
  friendlyError,
} from '../data/api';

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

  const [pub, setPub] = useState<PublicData | null>(null);
  const [working, setWorking] = useState(false);

  const settings = pub?.settings || DEFAULT_BARBER_SETTINGS;
  const rescheduleDays = generateNext90Days(new Date(), settings);

  // ocupações de outras pessoas (o próprio horário atual do cliente não conta como ocupado)
  const othersBusy = (() => {
    const list = pub?.busy ?? [];
    if (!foundAppointment) return list;
    const i = list.findIndex(
      (b) => b.dateStr === foundAppointment.dateStr && b.timeStr === foundAppointment.timeStr && b.durationMinutes === foundAppointment.durationMinutes
    );
    return i < 0 ? list : list.filter((_, k) => k !== i);
  })();

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    setIsRescheduling(false);
    setSearchAttempted(true);

    if (!queryCode.trim() || queryPhone.replace(/\D/g, '').length < 10) {
      setFoundAppointment(null);
      setActionMessage({ type: 'error', text: 'Informe o código do agendamento e o WhatsApp usado na reserva (com DDD).' });
      return;
    }
    setWorking(true);
    try {
      setFoundAppointment(await lookupAppointment(queryCode, queryPhone));
    } catch (err) {
      setFoundAppointment(null);
      setActionMessage({ type: 'error', text: friendlyError(err) });
    } finally {
      setWorking(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!foundAppointment) return;

    // Regra de 12h (o banco também confere — esta checagem só evita um clique desnecessário)
    const check = canRescheduleOrCancel(foundAppointment.dateStr, foundAppointment.timeStr, new Date(), 12);
    if (!check.allowed) {
      setActionMessage({ type: 'error', text: check.reason || 'Cancelamentos devem ser feitos com no mínimo 12 horas de antecedência.' });
      return;
    }

    if (window.confirm('Tem certeza que deseja cancelar este agendamento?')) {
      setWorking(true);
      try {
        const updated = await cancelAppointment(foundAppointment.code, foundAppointment.clientPhone);
        setFoundAppointment(updated);
        setActionMessage({ type: 'success', text: 'Agendamento cancelado com sucesso. O horário foi liberado na agenda.' });
        if (onAppointmentsUpdated) onAppointmentsUpdated();
      } catch (err) {
        setActionMessage({ type: 'error', text: friendlyError(err) });
      } finally {
        setWorking(false);
      }
    }
  };

  const handleConfirmReschedule = async () => {
    if (!foundAppointment || !rescheduleDay || !rescheduleTime) {
      setActionMessage({ type: 'error', text: 'Por favor, selecione a nova data e horário desejado.' });
      return;
    }
    setWorking(true);
    try {
      const updated = await rescheduleAppointment(foundAppointment.code, foundAppointment.clientPhone, rescheduleDay.dateStr, rescheduleTime);
      setFoundAppointment(updated);
      setIsRescheduling(false);
      setActionMessage({ type: 'success', text: `Agendamento remarcado com sucesso para ${rescheduleDay.fullLabel} às ${rescheduleTime}!` });
      if (onAppointmentsUpdated) onAppointmentsUpdated();
    } catch (err) {
      setActionMessage({ type: 'error', text: friendlyError(err) });
      // atualiza a lista de horários ocupados
      loadPublicData().then(setPub).catch(() => undefined);
    } finally {
      setWorking(false);
    }
  };

  const canModify = foundAppointment
    ? canRescheduleOrCancel(foundAppointment.dateStr, foundAppointment.timeStr, new Date(), 12).allowed
    : false;

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
        className="relative w-full max-w-xl bg-[#141416] border border-neutral-800 text-white shadow-2xl p-6 sm:p-8 z-10 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consult-title"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white p-2 transition-colors cursor-pointer"
          aria-label="Fechar consulta"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-['Cinzel'] tracking-[0.2em] text-sm font-bold text-amber-200">
              PURΛZI
            </span>
            <span className="text-[10px] tracking-widest uppercase bg-neutral-800 text-neutral-300 px-2 py-0.5">
              Área do Cliente
            </span>
          </div>
          <h2 id="consult-title" className="font-['Cinzel'] text-xl sm:text-2xl text-white font-bold">
            Consultar Meu Agendamento
          </h2>
          <p className="text-xs text-neutral-400 mt-1 font-sans">
            Informe o código do agendamento (ex.: PRZ-4921) e o WhatsApp usado na reserva para visualizar, remarcar ou cancelar até 12 horas antes.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="q-code" className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">
                Código do Agendamento
              </label>
              <input
                id="q-code"
                type="text"
                placeholder="Ex: PRZ-4921"
                value={queryCode}
                onChange={(e) => setQueryCode(e.target.value)}
                className="w-full bg-[#19191c] border border-neutral-800 px-3.5 py-2.5 text-xs text-white uppercase placeholder:normal-case placeholder:text-neutral-600 focus:outline-none focus:border-amber-200 font-mono rounded-none"
              />
            </div>

            <div>
              <label htmlFor="q-phone" className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">
                Seu WhatsApp
              </label>
              <input
                id="q-phone"
                type="tel"
                placeholder="(24) 99999-9999"
                value={queryPhone}
                onChange={(e) => setQueryPhone(e.target.value)}
                className="w-full bg-[#19191c] border border-neutral-800 px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-200 font-sans rounded-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-white text-black hover:bg-neutral-200 py-3 text-xs uppercase tracking-[0.2em] font-bold transition-colors flex items-center justify-center gap-2 rounded-none cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>{working && !isRescheduling ? 'Buscando…' : 'Localizar Agendamento'}</span>
          </button>
        </form>

        {/* Action message */}
        {actionMessage && (
          <div
            className={`p-3.5 mb-6 text-xs flex items-start gap-2.5 rounded-none ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
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

        {/* Found Result Card */}
        {foundAppointment ? (
          <div className="bg-[#19191c] border border-neutral-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-mono">Código</span>
                <span className="font-mono text-base font-bold text-amber-200">{foundAppointment.code}</span>
              </div>
              <span
                className={`text-[10px] uppercase tracking-wider px-2 py-0.5 font-bold ${
                  foundAppointment.status === 'confirmed'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                    : foundAppointment.status === 'completed'
                    ? 'bg-neutral-800 text-neutral-300'
                    : 'bg-red-950 text-red-400 border border-red-800/60'
                }`}
              >
                {foundAppointment.status === 'confirmed'
                  ? 'Confirmado'
                  : foundAppointment.status === 'completed'
                  ? 'Concluído'
                  : 'Cancelado'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-neutral-500 block text-[11px]">Cliente</span>
                <span className="font-medium text-white">{foundAppointment.clientName}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Serviço</span>
                <span className="font-medium text-white">{foundAppointment.serviceName}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Data &amp; Horário</span>
                <span className="font-bold text-amber-200">{foundAppointment.dateStr.split('-').reverse().join('/')} às {foundAppointment.timeStr}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Valor</span>
                <span className="font-bold text-white">R$ {foundAppointment.price.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            {/* Actions for Active Appointment */}
            {foundAppointment.status === 'confirmed' && (
              <div className="pt-3 border-t border-neutral-800 flex flex-col sm:flex-row gap-2">
                {canModify ? (
                  <>
                    <button
                      onClick={() => {
                        const next = !isRescheduling;
                        setIsRescheduling(next);
                        if (next) loadPublicData().then(setPub).catch((err) => setActionMessage({ type: 'error', text: friendlyError(err) }));
                      }}
                      className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-2.5 px-3 text-xs uppercase tracking-wider font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-200" />
                      <span>{isRescheduling ? 'Fechar Remarcação' : 'Remarcar Horário'}</span>
                    </button>

                    <button
                      onClick={handleCancelAppointment}
                      className="bg-red-950/60 hover:bg-red-900/80 border border-red-800/50 text-red-300 py-2.5 px-4 text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                    >
                      Cancelar Horário
                    </button>
                  </>
                ) : (
                  <p className="text-[11px] text-amber-200/90 bg-amber-950/30 border border-amber-800/40 p-2.5 text-center w-full">
                    Este agendamento ocorre em menos de 12 horas. Remarcações e cancelamentos só podem ser solicitados diretamente pelo WhatsApp.
                  </p>
                )}
              </div>
            )}

            {/* Rescheduling Sub-panel */}
            {isRescheduling && foundAppointment.status === 'confirmed' && (
              <div className="mt-4 pt-4 border-t border-neutral-800 space-y-4 animate-in fade-in duration-200">
                <h4 className="text-xs uppercase tracking-wider text-amber-200 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Escolha a Nova Data &amp; Horário</span>
                </h4>

                {/* Days carousel */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {rescheduleDays.slice(0, 30).map((day) => {
                    const isSelected = rescheduleDay?.dateStr === day.dateStr;
                    return (
                      <button
                        key={day.dateStr}
                        disabled={day.isOffDay}
                        onClick={() => {
                          setRescheduleDay(day);
                          setRescheduleTime(null);
                        }}
                        className={`shrink-0 w-16 py-2 px-1 text-center border text-xs cursor-pointer ${
                          day.isOffDay
                            ? 'border-neutral-900 bg-neutral-950 text-neutral-600 opacity-40 cursor-not-allowed'
                            : isSelected
                            ? 'border-amber-200 bg-neutral-900 text-amber-200 font-bold'
                            : 'border-neutral-800 bg-[#1c1c20] text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <span className="text-[9px] uppercase block text-neutral-400">{day.dayName}</span>
                        <span className="text-sm font-bold block">{day.dayNumber}</span>
                        <span className="text-[9px] uppercase block text-neutral-500">{day.monthName}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Available Hours */}
                {rescheduleDay && (
                  <div>
                    <span className="text-[11px] text-neutral-400 block mb-2 font-mono">
                      Horários para {rescheduleDay.fullLabel}:
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {generateHoursForSchedule(settings, rescheduleDay.dateStr).map((hour) => {
                        const available = isSlotFreeForDuration(
                          rescheduleDay.dateStr,
                          hour,
                          foundAppointment.durationMinutes,
                          othersBusy,
                          pub?.blocked ?? [],
                          settings
                        );
                        const isSelected = rescheduleTime === hour;

                        if (!available) {
                          return (
                            <span
                              key={hour}
                              className="py-1.5 px-2 border border-neutral-900 text-neutral-600 text-center text-xs line-through"
                            >
                              {hour}
                            </span>
                          );
                        }

                        return (
                          <button
                            key={hour}
                            onClick={() => setRescheduleTime(hour)}
                            className={`py-1.5 px-2 border text-center text-xs cursor-pointer ${
                              isSelected
                                ? 'border-amber-200 bg-neutral-900 text-amber-200 font-bold'
                                : 'border-neutral-800 bg-[#1c1c20] text-neutral-300 hover:border-neutral-600'
                            }`}
                          >
                            {hour}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleConfirmReschedule}
                  disabled={!rescheduleDay || !rescheduleTime || working}
                  className={`w-full py-2.5 text-xs uppercase tracking-wider font-bold transition-all ${
                    rescheduleDay && rescheduleTime
                      ? 'bg-amber-400 text-black hover:bg-amber-300 cursor-pointer shadow-md'
                      : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                  }`}
                >
                  Confirmar Nova Data ({rescheduleTime || 'Selecione um horário'})
                </button>
              </div>
            )}
          </div>
        ) : searchAttempted ? (
          <div className="bg-[#19191c] border border-neutral-800 p-6 text-center text-xs text-neutral-400">
            Nenhum agendamento encontrado para os dados informados. Verifique se o código ou o telefone com DDD estão corretos.
          </div>
        ) : null}
      </div>
    </div>
  );
};
