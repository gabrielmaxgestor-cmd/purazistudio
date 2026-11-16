import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, MessageCircle, Pencil, RotateCcw, XCircle } from 'lucide-react';
import { Appointment, todayStr, isClosedForReopen } from '../utils/bookingLogic';
import { STATUS, ConfirmDelete, brl, parseDate, fmtPhone, initials, card, inp, lbl, btnGhost, btnSolid } from './adminUi';

const maskPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const fullDate = (s: string) =>
  parseDate(s).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).replace('.,', ',').replace('.', '');

/** Número de resumo do cliente (sem ícone: no celular o valor "R$ 155,00" precisa caber numa linha só). */
const Tile: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className={`${card} p-4 sm:p-5`}>
    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">{label}</p>
    <p className="mt-2 font-serif text-2xl sm:text-3xl leading-none whitespace-nowrap">{value}</p>
    {hint && <p className="mt-2 text-xs text-white/40">{hint}</p>}
  </div>
);

type Filter = 'all' | 'upcoming' | 'done' | 'cancelled';

interface Props {
  phone: string;
  /** todos os agendamentos deste cliente (passados, futuros e cancelados) */
  appointments: Appointment[];
  busy: boolean;
  onBack: () => void;
  onSetStatus: (id: string, status: Appointment['status']) => void;
  onDeleteAppointment: (id: string) => void;
  onCancelFuture: (count: number) => void;
  onDeleteClient: () => void;
  /** devolve true se salvou (para fechar o formulário) */
  onUpdateClient: (name: string, newPhone: string) => Promise<boolean>;
}

export const ClientHistory: React.FC<Props> = ({
  phone, appointments, busy, onBack, onSetStatus, onDeleteAppointment, onCancelFuture, onDeleteClient, onUpdateClient,
}) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const now = (() => {
    const d = new Date();
    return `${todayStr(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  })();
  const isFuture = (a: Appointment) => `${a.dateStr} ${a.timeStr}` >= now;

  const info = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => `${b.dateStr} ${b.timeStr}`.localeCompare(`${a.dateStr} ${a.timeStr}`));
    const upcoming = sorted.filter((a) => a.status === 'confirmed' && isFuture(a));
    // realizado = concluído, ou confirmado cuja data/hora já passou
    const done = sorted.filter((a) => a.status === 'completed' || (a.status === 'confirmed' && !isFuture(a)));
    const cancelled = sorted.filter((a) => a.status === 'cancelled');
    const spent = done.reduce((s, a) => s + a.price, 0);
    const fav = Object.entries(
      done.reduce<Record<string, number>>((acc, a) => ((acc[a.serviceName] = (acc[a.serviceName] || 0) + 1), acc), {})
    ).sort((a, b) => b[1] - a[1])[0]?.[0];
    const since = [...appointments].map((a) => a.dateStr).sort()[0];
    return { sorted, upcoming, done, cancelled, spent, fav, since, name: sorted[0]?.clientName ?? '' };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments]);

  const list = useMemo(() => {
    if (filter === 'upcoming') return [...info.upcoming].reverse();
    if (filter === 'done') return info.done;
    if (filter === 'cancelled') return info.cancelled;
    return info.sorted;
  }, [filter, info]);

  const startEdit = () => {
    setEditName(info.name);
    setEditPhone(maskPhone(phone));
    setEditing(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onUpdateClient(editName, editPhone)) setEditing(false);
  };

  const chips: { id: Filter; label: string; n: number }[] = [
    { id: 'all', label: 'Todos', n: info.sorted.length },
    { id: 'upcoming', label: 'Próximos', n: info.upcoming.length },
    { id: 'done', label: 'Realizados', n: info.done.length },
    { id: 'cancelled', label: 'Cancelados', n: info.cancelled.length },
  ];

  return (
    <section>
      <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white cursor-pointer transition-colors">
        <ChevronLeft className="w-4 h-4" /> Voltar para clientes
      </button>

      {/* cabeçalho do cliente */}
      <div className={`${card} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="w-16 h-16 shrink-0 rounded-full bg-white/[0.07] border border-white/10 flex items-center justify-center font-serif text-2xl">{initials(info.name)}</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-3xl leading-tight truncate">{info.name}</h2>
            <p className="text-sm text-white/55">{fmtPhone(phone)}</p>
            {info.since && <p className="mt-1 text-xs text-white/40">Cliente desde {fullDate(info.since)}{info.fav ? ` · Favorito: ${info.fav}` : ''}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`https://wa.me/55${phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={btnGhost}>
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <button type="button" onClick={() => (editing ? setEditing(false) : startEdit())} className={btnGhost}>
              <Pencil className="w-4 h-4" /> {editing ? 'Fechar edição' : 'Editar dados'}
            </button>
          </div>
        </div>

        {editing && (
          <form onSubmit={saveEdit} className="mt-6 pt-6 border-t border-white/[0.07] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl} htmlFor="ce-name">Nome</label>
                <input id="ce-name" value={editName} onChange={(e) => setEditName(e.target.value)} className={inp} maxLength={80} required />
              </div>
              <div>
                <label className={lbl} htmlFor="ce-phone">WhatsApp</label>
                <input id="ce-phone" value={editPhone} onChange={(e) => setEditPhone(maskPhone(e.target.value))} inputMode="tel" className={inp} required />
              </div>
            </div>
            <p className="text-xs text-white/45 leading-relaxed">
              Vale para todo o histórico deste cliente. Se você trocar o WhatsApp, o cliente passa a usar o número novo para consultar os agendamentos
              (os códigos continuam os mesmos). Se o número novo já for de outro cliente, os dois históricos são unidos.
            </p>
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className={btnSolid}>Salvar alterações</button>
              <button type="button" onClick={() => setEditing(false)} className={btnGhost + ' !h-11'}>Cancelar</button>
            </div>
          </form>
        )}
      </div>

      {/* números */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <Tile label="Realizados" value={String(info.done.length)} hint="concluídos ou já passados" />
        <Tile label="Próximos" value={String(info.upcoming.length)} hint="horários futuros" />
        <Tile label="Cancelados" value={String(info.cancelled.length)} />
        <Tile label="Total gasto" value={brl(info.spent)} hint="atendimentos realizados" />
      </div>

      {/* ações em massa */}
      <div className={`${card} p-4 sm:p-5 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div className="flex flex-wrap gap-2">
          <ConfirmDelete
            label={`Cancelar horários futuros (${info.upcoming.length})`}
            icon={<XCircle className="w-3.5 h-3.5" />}
            disabled={busy || info.upcoming.length === 0}
            onConfirm={() => onCancelFuture(info.upcoming.length)}
          />
          <ConfirmDelete label="Excluir cliente" disabled={busy} onConfirm={onDeleteClient} />
        </div>
        <p className="text-xs text-white/40 sm:max-w-sm leading-relaxed">
          Excluir o cliente apaga todo o histórico dele e tira esses atendimentos do faturamento. Para só liberar a agenda, use “Cancelar horários futuros”.
        </p>
      </div>

      {/* histórico */}
      <div className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-serif text-2xl">Histórico</h3>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar histórico">
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={filter === c.id}
                onClick={() => setFilter(c.id)}
                className={`h-9 px-3.5 border text-[11px] uppercase tracking-[0.14em] font-semibold cursor-pointer transition-colors ${
                  filter === c.id ? 'bg-white text-black border-white' : 'border-white/15 text-white/60 hover:border-white/40 hover:text-white'
                }`}
              >
                {c.label} <span className={filter === c.id ? 'text-black/50' : 'text-white/35'}>{c.n}</span>
              </button>
            ))}
          </div>
        </div>

        {list.length === 0 ? (
          <div className={`${card} py-12 text-center text-white/45`}>Nenhum agendamento neste filtro.</div>
        ) : (
          <div className="space-y-3">
            {list.map((a) => {
              const st = STATUS[a.status];
              const future = isFuture(a);
              return (
                <article key={a.id} className={`${card} p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4 ${a.status === 'cancelled' ? 'opacity-65' : ''}`}>
                  <div className="lg:w-44 shrink-0">
                    <p className="font-serif text-2xl leading-none tabular-nums">{a.timeStr}</p>
                    <p className="mt-1.5 text-xs text-white/55 first-letter:uppercase">{fullDate(a.dateStr)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{a.serviceName}</p>
                    <p className="mt-1 text-xs text-white/50">
                      {a.durationMinutes} min · {brl(a.price)} · <span className="font-mono">{a.code}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`text-[10px] uppercase tracking-[0.14em] font-semibold border px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                      {a.status === 'confirmed' && future && (
                        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold border border-amber-400/30 bg-amber-400/10 text-amber-200 px-2 py-0.5">Futuro</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.status === 'confirmed' && future && (
                      <ConfirmDelete label="Cancelar" icon={<XCircle className="w-3.5 h-3.5" />} disabled={busy} onConfirm={() => onSetStatus(a.id, 'cancelled')} />
                    )}
                    {a.status === 'confirmed' && !future && (
                      <button type="button" disabled={busy} onClick={() => onSetStatus(a.id, 'completed')} className={btnGhost + ' !h-9 !px-3 !text-[11px]'}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Concluir
                      </button>
                    )}
                    {a.status !== 'confirmed' &&
                      (isClosedForReopen(a.dateStr, a.timeStr) ? (
                        <span
                          className="inline-flex items-center h-9 px-3 text-[11px] uppercase tracking-[0.14em] text-white/35 border border-white/10"
                          title="12h depois do horário marcado o atendimento é encerrado e não pode ser reaberto"
                        >
                          Encerrado
                        </span>
                      ) : (
                        <button type="button" disabled={busy} onClick={() => onSetStatus(a.id, 'confirmed')} className={btnGhost + ' !h-9 !px-3 !text-[11px]'}>
                          <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                        </button>
                      ))}
                    <ConfirmDelete label="Excluir" disabled={busy} onConfirm={() => onDeleteAppointment(a.id)} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
