/**
 * Camada de dados do site.
 *  - Com VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY  -> usa o banco Supabase (agenda compartilhada).
 *  - Sem as variáveis                                  -> modo local (localStorage), como antes.
 * Os componentes só falam com este arquivo; nunca direto com o banco.
 */
import { supabase, supabaseEnabled } from '../lib/supabase';
import {
  Service, Appointment, BlockedSlot, BarberSettings, DEFAULT_BARBER_SETTINGS,
  isSlotFreeForDuration, generateBookingCode, canRescheduleOrCancel, todayStr, isValidPhone, isClosedForReopen,
} from '../utils/bookingLogic';
import {
  getStoredAppointments, saveAppointment, updateAppointmentStatus, getStoredServices, saveServices,
  getStoredBlockedSlots, saveBlockedSlots, getStoredBarberSettings, saveBarberSettings, setStoredAppointments,
} from '../utils/storage';
import { isLoggedIn } from '../utils/adminAuth';

export const dataMode: 'supabase' | 'local' = supabaseEnabled ? 'supabase' : 'local';

/* ───────────── erros em português ───────────── */

const MESSAGES: Record<string, string> = {
  slot_taken: 'Esse horário acabou de ser ocupado. Escolha outro horário.',
  day_off: 'Não atendemos neste dia.',
  outside_hours: 'Esse serviço não cabe nesse horário. Escolha um horário mais cedo.',
  invalid_time: 'Horário inválido. Escolha um dos horários disponíveis.',
  past_time: 'Esse horário já passou.',
  blocked: 'Esse horário está indisponível.',
  invalid_day: 'Data inválida. Agendamos até 90 dias à frente.',
  invalid_phone: 'Informe um WhatsApp válido com DDD (ex.: 24 99999-9999).',
  invalid_name: 'Informe seu nome.',
  invalid_service: 'Esse serviço não está mais disponível.',
  too_many: 'Você já tem 10 agendamentos em aberto. Fale conosco pelo WhatsApp para marcar outro.',
  not_found: 'Agendamento não encontrado. Confira o código e o WhatsApp informados.',
  not_confirmed: 'Esse agendamento não está mais ativo.',
  too_late: 'Remarcações e cancelamentos exigem 12h de antecedência. Fale conosco pelo WhatsApp.',
  too_many_attempts: 'Muitas tentativas com esse WhatsApp. Aguarde 15 minutos ou fale conosco pelo WhatsApp.',
  too_many_requests: 'Estamos com muitos pedidos agora. Tente de novo em alguns minutos ou fale conosco pelo WhatsApp.',
  invalid_status: 'Status inválido.',
  invalid_hours: 'O horário de fechamento precisa ser depois da abertura.',
  invalid_interval: 'Intervalo inválido.',
  invalid_days: 'Dia da semana inválido.',
  locked: 'Este atendimento já foi encerrado (12h depois do horário) e não pode ser reaberto.',
  invalid_breaks: 'Confira os intervalos: o fim precisa ser depois do início, escolha ao menos um dia e use no máximo 10 intervalos.',
  invalid_range: 'O horário final precisa ser depois do inicial.',
  last_service: 'Mantenha pelo menos um serviço cadastrado.',
  forbidden: 'Acesso negado.',
  invalid_credentials: 'E-mail ou senha incorretos.',
  not_admin: 'Esta conta não tem permissão de barbeiro.',
  network: 'Não foi possível conectar. Verifique sua internet e tente de novo.',
};

export class ApiError extends Error {
  code: string;
  constructor(code: string) {
    super(MESSAGES[code] || code);
    this.code = code;
  }
}

export function friendlyError(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  const msg = (e as Error)?.message || '';
  return MESSAGES[msg] || MESSAGES.network;
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new ApiError('network');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (MESSAGES[error.message]) throw new ApiError(error.message);
    if (error.code === '42501' || /permission denied|forbidden/i.test(error.message)) throw new ApiError('forbidden');
    throw new ApiError('network');
  }
  // algumas funções do banco devolvem {"error": "codigo"} em vez de lançar exceção (preserva o limite de tentativas)
  if (data && typeof data === 'object' && !Array.isArray(data) && typeof (data as { error?: unknown }).error === 'string') {
    throw new ApiError((data as { error: string }).error);
  }
  return data as T;
}

const cleanPhone = (p: string) => p.replace(/\D/g, '');

/* ───────────── dados públicos (site dos clientes) ───────────── */

export interface PublicData {
  services: Service[];
  settings: BarberSettings;
  /** Ocupações já existentes (sem dados pessoais) — usadas só para calcular horários livres */
  busy: Appointment[];
  blocked: BlockedSlot[];
}

const asBusy = (b: { dateStr: string; timeStr: string; durationMinutes: number }, i: number): Appointment => ({
  id: `busy-${i}`, code: '', clientName: '', clientPhone: '', serviceId: '', serviceName: '', price: 0,
  durationMinutes: b.durationMinutes, dateStr: b.dateStr, timeStr: b.timeStr, status: 'confirmed', createdAt: '',
});

export async function loadPublicData(): Promise<PublicData> {
  if (dataMode === 'local') {
    return {
      services: getStoredServices(),
      settings: getStoredBarberSettings(),
      busy: getStoredAppointments().filter((a) => a.status !== 'cancelled'),
      blocked: getStoredBlockedSlots(),
    };
  }
  const d = await rpc<any>('get_public_data');
  return {
    services: d.services as Service[],
    settings: { ...DEFAULT_BARBER_SETTINGS, ...d.settings, daySchedules: d.settings?.daySchedules || {}, breaks: d.settings?.breaks || [] },
    busy: (d.busy || []).map(asBusy),
    blocked: (d.blocked || []).map((b: any) => ({
      id: b.id, dateStr: b.dateStr, timeStr: b.timeStr || undefined, endTimeStr: b.endTimeStr || undefined, reason: b.reason || '',
    })),
  };
}

export interface NewAppointmentInput {
  serviceId: string;
  dateStr: string;
  timeStr: string;
  name: string;
  phone: string;
}

export async function createAppointment(input: NewAppointmentInput): Promise<Appointment> {
  if (dataMode === 'supabase') {
    return rpc<Appointment>('create_appointment', {
      p_service_id: input.serviceId, p_day: input.dateStr, p_time: input.timeStr,
      p_name: input.name, p_phone: input.phone,
    });
  }
  const services = getStoredServices();
  const svc = services.find((s) => s.id === input.serviceId);
  if (!svc) throw new ApiError('invalid_service');
  if (!isSlotFreeForDuration(input.dateStr, input.timeStr, svc.durationMinutes, getStoredAppointments(), getStoredBlockedSlots(), getStoredBarberSettings())) {
    throw new ApiError('slot_taken');
  }
  const apt: Appointment = {
    id: `apt-${Date.now()}`, code: generateBookingCode(), clientName: input.name.trim(), clientPhone: cleanPhone(input.phone),
    serviceId: svc.id, serviceName: svc.name, price: svc.price, durationMinutes: svc.durationMinutes,
    dateStr: input.dateStr, timeStr: input.timeStr, status: 'confirmed', createdAt: new Date().toISOString(),
  };
  saveAppointment(apt);
  return apt;
}

/** Consulta exige código E telefone (ninguém vê agendamentos de outras pessoas). */
export async function lookupAppointment(code: string, phone: string): Promise<Appointment | null> {
  if (dataMode === 'supabase') return rpc<Appointment | null>('lookup_appointment', { p_code: code, p_phone: phone });
  const c = code.trim().toUpperCase();
  const p = cleanPhone(phone);
  return getStoredAppointments().find((a) => a.code === c && a.clientPhone === p) || null;
}

/**
 * Consulta por código + WhatsApp. Devolve o agendamento do código digitado (1º item) e, depois,
 * os demais agendamentos futuros confirmados do mesmo WhatsApp. `null` = não encontrado.
 */
export async function lookupAppointments(code: string, phone: string): Promise<Appointment[] | null> {
  if (dataMode === 'supabase') {
    try {
      return await rpc<Appointment[] | null>('list_my_appointments', { p_code: code, p_phone: phone });
    } catch (e) {
      // banco ainda sem a função nova (SQL "my_appointments" não rodou): usa a consulta simples
      if (e instanceof ApiError && e.code === 'network') {
        const one = await lookupAppointment(code, phone);
        return one ? [one] : null;
      }
      throw e;
    }
  }
  const found = await lookupAppointment(code, phone);
  if (!found) return null;
  const p = cleanPhone(phone);
  const d = new Date();
  const now = `${todayStr(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const others = getStoredAppointments()
    .filter((a) => a.clientPhone === p && a.status === 'confirmed' && a.id !== found.id && `${a.dateStr} ${a.timeStr}` >= now)
    .sort((a, b) => `${a.dateStr} ${a.timeStr}`.localeCompare(`${b.dateStr} ${b.timeStr}`))
    .slice(0, 10);
  return [found, ...others];
}

export async function cancelAppointment(code: string, phone: string): Promise<Appointment> {
  if (dataMode === 'supabase') return rpc<Appointment>('cancel_appointment', { p_code: code, p_phone: phone });
  const found = await lookupAppointment(code, phone);
  if (!found) throw new ApiError('not_found');
  if (found.status !== 'confirmed') throw new ApiError('not_confirmed');
  if (!canRescheduleOrCancel(found.dateStr, found.timeStr, new Date(), 12).allowed) throw new ApiError('too_late');
  return updateAppointmentStatus(found.id, 'cancelled').find((a) => a.id === found.id) as Appointment;
}

export async function rescheduleAppointment(code: string, phone: string, dateStr: string, timeStr: string): Promise<Appointment> {
  if (dataMode === 'supabase') return rpc<Appointment>('reschedule_appointment', { p_code: code, p_phone: phone, p_day: dateStr, p_time: timeStr });
  const found = await lookupAppointment(code, phone);
  if (!found) throw new ApiError('not_found');
  if (found.status !== 'confirmed') throw new ApiError('not_confirmed');
  if (!canRescheduleOrCancel(found.dateStr, found.timeStr, new Date(), 12).allowed) throw new ApiError('too_late');
  const others = getStoredAppointments().filter((a) => a.id !== found.id);
  if (!isSlotFreeForDuration(dateStr, timeStr, found.durationMinutes, others, getStoredBlockedSlots(), getStoredBarberSettings())) {
    throw new ApiError('slot_taken');
  }
  const updated = { ...found, dateStr, timeStr };
  saveAppointment(updated);
  return updated;
}

/* ───────────── painel do barbeiro ───────────── */

export interface AdminData {
  appointments: Appointment[];
  blocked: BlockedSlot[];
  services: Service[];
  settings: BarberSettings;
}

export async function adminLoadLists(): Promise<Pick<AdminData, 'appointments' | 'blocked'>> {
  if (dataMode === 'local') return { appointments: getStoredAppointments(), blocked: getStoredBlockedSlots() };
  const [appointments, blocked] = await Promise.all([
    rpc<Appointment[]>('admin_list_appointments'),
    rpc<any[]>('admin_list_blocked'),
  ]);
  return {
    appointments,
    blocked: blocked.map((b) => ({ id: b.id, dateStr: b.dateStr, timeStr: b.timeStr || undefined, endTimeStr: b.endTimeStr || undefined, reason: b.reason || '' })),
  };
}

export async function adminLoad(): Promise<AdminData> {
  const [lists, pub] = await Promise.all([adminLoadLists(), loadPublicData()]);
  return { ...lists, services: pub.services, settings: pub.settings };
}

export async function adminSetStatus(id: string, status: Appointment['status']): Promise<void> {
  if (dataMode === 'supabase') return void (await rpc('admin_set_status', { p_id: id, p_status: status }));
  if (status === 'confirmed') {
    const found = getStoredAppointments().find((a) => a.id === id);
    if (found && isClosedForReopen(found.dateStr, found.timeStr)) throw new ApiError('locked');
  }
  updateAppointmentStatus(id, status);
}

/* ───────────── clientes (painel do barbeiro) ───────────── */

/** Remove UM agendamento do histórico. */
export async function adminDeleteAppointment(id: string): Promise<void> {
  if (dataMode === 'supabase') return void (await rpc('admin_delete_appointment', { p_id: id }));
  setStoredAppointments(getStoredAppointments().filter((a) => a.id !== id));
}

/** Cancela todos os horários futuros ainda confirmados do cliente. Devolve quantos foram cancelados. */
export async function adminCancelClientFuture(phone: string): Promise<number> {
  if (dataMode === 'supabase') return (await rpc<number>('admin_cancel_client_future', { p_phone: phone })) ?? 0;
  const p = cleanPhone(phone);
  const n = new Date();
  const now = `${todayStr(n)} ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  let count = 0;
  setStoredAppointments(
    getStoredAppointments().map((a) => {
      if (a.clientPhone === p && a.status === 'confirmed' && `${a.dateStr} ${a.timeStr}` >= now) {
        count += 1;
        return { ...a, status: 'cancelled' as const };
      }
      return a;
    })
  );
  return count;
}

/** Exclui o cliente: apaga TODOS os agendamentos do WhatsApp. Devolve quantos foram apagados. */
export async function adminDeleteClient(phone: string): Promise<number> {
  if (dataMode === 'supabase') return (await rpc<number>('admin_delete_client', { p_phone: phone })) ?? 0;
  const p = cleanPhone(phone);
  const all = getStoredAppointments();
  const rest = all.filter((a) => a.clientPhone !== p);
  if (rest.length === all.length) throw new ApiError('not_found');
  setStoredAppointments(rest);
  return all.length - rest.length;
}

/** Corrige nome e/ou WhatsApp do cliente em todo o histórico. WhatsApp que já existe em outro cliente une os históricos. */
export async function adminUpdateClient(phone: string, name: string, newPhone?: string): Promise<void> {
  if (dataMode === 'supabase') {
    return void (await rpc('admin_update_client', { p_phone: phone, p_name: name, p_new_phone: newPhone ?? null }));
  }
  const ph = cleanPhone(phone);
  const np = cleanPhone(newPhone || '') || ph;
  const nm = name.trim();
  if (nm.length < 2 || nm.length > 80) throw new ApiError('invalid_name');
  if (!isValidPhone(np)) throw new ApiError('invalid_phone');
  const all = getStoredAppointments();
  if (!all.some((a) => a.clientPhone === ph)) throw new ApiError('not_found');
  setStoredAppointments(all.map((a) => (a.clientPhone === ph || a.clientPhone === np ? { ...a, clientName: nm, clientPhone: np } : a)));
}

export async function adminSaveSettings(settings: BarberSettings): Promise<void> {
  if (dataMode === 'supabase') return void (await rpc('admin_save_settings', { p_settings: settings }));
  saveBarberSettings(settings);
}

export async function adminAddBlock(b: { dateStr: string; timeStr?: string; endTimeStr?: string; reason: string }): Promise<void> {
  if (dataMode === 'supabase') {
    return void (await rpc('admin_add_block', { p_day: b.dateStr, p_start: b.timeStr ?? null, p_end: b.endTimeStr ?? null, p_reason: b.reason }));
  }
  saveBlockedSlots([{ id: `blk-${Date.now()}`, ...b }, ...getStoredBlockedSlots()]);
}

export async function adminRemoveBlock(id: string): Promise<void> {
  if (dataMode === 'supabase') return void (await rpc('admin_remove_block', { p_id: id }));
  saveBlockedSlots(getStoredBlockedSlots().filter((b) => b.id !== id));
}

export type ServiceInput = Omit<Service, 'id'> & { id?: string };

export async function adminSaveService(s: ServiceInput): Promise<void> {
  if (dataMode === 'supabase') return void (await rpc('admin_upsert_service', { p_service: s }));
  const list = getStoredServices();
  saveServices(s.id ? list.map((x) => (x.id === s.id ? { ...x, ...s, id: x.id } : x)) : [...list, { ...s, id: `svc-${Date.now()}` } as Service]);
}

export async function adminDeleteService(id: string): Promise<void> {
  if (dataMode === 'supabase') return void (await rpc('admin_delete_service', { p_id: id }));
  const list = getStoredServices();
  if (list.length <= 1) throw new ApiError('last_service');
  saveServices(list.filter((x) => x.id !== id));
}

/* ───────────── login do barbeiro ───────────── */

/** Há sessão válida de barbeiro? (modo Supabase: usuário logado E presente na tabela admins) */
export async function adminHasSession(): Promise<boolean> {
  if (dataMode === 'local') return isLoggedIn();
  const { data } = await supabase!.auth.getSession();
  if (!data.session) return false;
  try {
    return (await rpc<boolean>('is_admin')) === true;
  } catch {
    return false;
  }
}

/** Só confere se ainda existe sessão (barato; usado de tempos em tempos). */
export async function adminSessionAlive(): Promise<boolean> {
  if (dataMode === 'local') return isLoggedIn();
  const { data } = await supabase!.auth.getSession();
  return !!data.session;
}

export async function adminSignIn(email: string, password: string): Promise<void> {
  if (!supabase) throw new ApiError('network');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    throw new ApiError(/invalid|credentials/i.test(error.message) ? 'invalid_credentials' : 'network');
  }
  if (!(await adminHasSession())) {
    await supabase.auth.signOut();
    throw new ApiError('not_admin');
  }
}

export async function adminSignOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

export async function adminChangePassword(newPassword: string): Promise<void> {
  if (!supabase) throw new ApiError('network');
  if (newPassword.length < 8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}
