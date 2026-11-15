import { Appointment, todayStr } from './bookingLogic';

/**
 * Memória dos agendamentos NESTE aparelho (localStorage).
 * Guarda só o necessário para consultar sem digitar: código, WhatsApp, data, hora e serviço.
 * Nada disso sai do navegador. Tudo é protegido com try/catch porque alguns navegadores
 * (aba anônima do Safari, por exemplo) bloqueiam o localStorage.
 */

const KEY = 'purazi_saved_appointments_v1';
const PREF = 'purazi_remember_v1';
const MAX_SAVED = 10;

export interface SavedAppointment {
  code: string;
  phone: string; // só dígitos
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:MM
  serviceName: string;
}

const isSaved = (v: unknown): v is SavedAppointment => {
  const o = v as Record<string, unknown> | null;
  return (
    !!o &&
    typeof o.code === 'string' &&
    typeof o.phone === 'string' &&
    typeof o.dateStr === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(o.dateStr) &&
    typeof o.timeStr === 'string' &&
    typeof o.serviceName === 'string'
  );
};

const byDate = (a: SavedAppointment, b: SavedAppointment) =>
  `${a.dateStr} ${a.timeStr}`.localeCompare(`${b.dateStr} ${b.timeStr}`);

function readRaw(): SavedAppointment[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(isSaved) : [];
  } catch {
    return [];
  }
}

function writeRaw(list: SavedAppointment[]): void {
  try {
    if (list.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* sem armazenamento disponível: o site segue funcionando, só não lembra */
  }
}

/** O cliente quer que este aparelho lembre dos agendamentos? (padrão: sim) */
export function getRemember(): boolean {
  try {
    return localStorage.getItem(PREF) !== '0';
  } catch {
    return false;
  }
}

/** Desligar apaga tudo que já estava salvo. */
export function setRemember(on: boolean): void {
  try {
    if (on) localStorage.removeItem(PREF);
    else {
      localStorage.setItem(PREF, '0');
      localStorage.removeItem(KEY);
    }
  } catch {
    /* ignora */
  }
}

/** Agendamentos salvos que ainda não passaram (os vencidos são apagados na hora). */
export function getSaved(): SavedAppointment[] {
  if (!getRemember()) return [];
  const today = todayStr();
  const all = readRaw();
  const valid = all.filter((a) => a.dateStr >= today).sort(byDate);
  if (valid.length !== all.length) writeRaw(valid);
  return valid;
}

/** Salva (ou atualiza) um agendamento confirmado. Cancelado/concluído é removido. */
export function upsertSaved(a: Appointment): void {
  if (!getRemember()) return;
  const rest = readRaw().filter((s) => s.code !== a.code);
  if (a.status === 'confirmed') {
    rest.push({
      code: a.code,
      phone: a.clientPhone.replace(/\D/g, ''),
      dateStr: a.dateStr,
      timeStr: a.timeStr,
      serviceName: a.serviceName,
    });
  }
  writeRaw(rest.sort(byDate).slice(0, MAX_SAVED));
}

export function removeSaved(code: string): void {
  writeRaw(readRaw().filter((s) => s.code !== code));
}

export function clearSaved(): void {
  writeRaw([]);
}
