/**
 * Camada de dados do site.
 *  - Com VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY  -> usa o banco Supabase (agenda compartilhada).
 *  - Sem as variáveis                                  -> modo local (localStorage), como antes.
 * Os componentes só falam com este arquivo; nunca direto com o banco.
 */
import { supabase, supabaseEnabled } from '../lib/supabase';
import {
  Service, Appointment, BlockedSlot, BarberSettings, DEFAULT_BARBER_SETTINGS,
  isSlotFreeForDuration, generateBookingCode, canRescheduleOrCancel,
} from '../utils/bookingLogic';
import {
  getStoredAppointments, saveAppointment, updateAppointmentStatus, getStoredServices, saveServices,
  getStoredBlockedSlots, saveBlockedSlots, getStoredBarberSettings, saveBarberSettings,
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
  too_many: 'Você já tem 3 agendamentos em aberto. Fale conosco pelo WhatsApp para marcar outro.',
  not_found: 'Agendamento não encontrado. Confira o código e o WhatsApp informados.',
  not_confirmed: 'Esse agendamento não está mais ativo.',
  too_late: 'Remarcações e cancelamentos exigem 12h de antecedência. Fale conosco pelo WhatsApp.',
  invalid_status: 'Status inválido.',
  invalid_hours: 'O horário de fechamento precisa ser depois da abertura.',
  invalid_interval: 'Intervalo inválido.',
  invalid_days: 'Dia da semana inválido.',
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
    settings: { ...DEFAULT_BARBER_SETTINGS, ...d.settings, daySchedules: d.settings?.daySchedules || {} },
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
  updateAppointmentStatus(id, status);
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
