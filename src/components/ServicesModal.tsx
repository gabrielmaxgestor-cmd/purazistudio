import React from 'react';
import { X, Clock, Check, Sparkles } from 'lucide-react';
import { Service } from '../utils/bookingLogic';

interface ServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  onSelectServiceForBooking: (serviceId: string) => void;
}

export const ServicesModal: React.FC<ServicesModalProps> = ({
  isOpen,
  onClose,
  services,
  onSelectServiceForBooking,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl bg-[#151518] text-white border border-neutral-800 shadow-2xl p-6 sm:p-8 z-10 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Tabela de Serviços PURAZI Studio"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
          <div>
            <span className="text-[10px] tracking-[0.25em] uppercase text-neutral-400 font-bold block">
              PURΛZI Studio
            </span>
            <h3 className="font-['Cinzel'] text-xl text-white font-bold">
              Menu de Serviços &amp; Visagismo
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-full hover:bg-neutral-800 transition-colors"
            aria-label="Fechar serviços"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5">
          {services.map((service) => (
            <div
              key={service.id}
              className="p-5 bg-[#1a1a1d] border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 pr-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-base text-white">{service.name}</h4>
                  {service.category === 'combo' && (
                    <span className="text-[9px] uppercase tracking-wider bg-amber-950 text-amber-200 border border-amber-800/50 px-2 py-0.5 font-bold">
                      Recomendado
                    </span>
                  )}
                </div>

                {service.description && (
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {service.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Duração média: {service.durationMinutes} minutos</span>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800">
                <span className="text-xl font-bold text-white font-mono">
                  R$ {service.price.toFixed(2).replace('.', ',')}
                </span>

                <button
                  onClick={() => {
                    onClose();
                    onSelectServiceForBooking(service.id);
                  }}
                  className="bg-white text-black hover:bg-neutral-200 px-4 py-2 text-xs uppercase tracking-widest font-bold rounded-none transition-colors cursor-pointer"
                >
                  Agendar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
          <p className="text-xs text-neutral-500">
            Atendimento com hora marcada e pontualidade britânica. Avenida Nilo Peçanha, 1027 - Valença/RJ.
          </p>
        </div>
      </div>
    </div>
  );
};
