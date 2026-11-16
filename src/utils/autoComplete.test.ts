import test from 'node:test';
import assert from 'node:assert/strict';
import { getStoredAppointments } from './storage';
import { Appointment } from './bookingLogic';

// localStorage de mentira (o Node não tem)
function install(seed: Appointment[]) {
  const data = new Map<string, string>([['purazi_appointments', JSON.stringify(seed)], ['purazi_demo_cleaned_v1', '1']]);
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  return data;
}

const fmt = (d: Date) => ({
  dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  timeStr: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
});
const apt = (id: string, hoursFromNow: number, status: Appointment['status']): Appointment => ({
  id, code: `PRZ-${id}`, clientName: 'Maria', clientPhone: '24981234567', serviceId: 'corte', serviceName: 'Corte',
  price: 55, durationMinutes: 45, status, createdAt: '', ...fmt(new Date(Date.now() + hoursFromNow * 3600_000)),
});

test('modo local: confirmado há mais de 12h vira concluído e fica gravado', () => {
  const data = install([apt('A', -13, 'confirmed'), apt('B', -5, 'confirmed'), apt('C', 48, 'confirmed'), apt('D', -30, 'cancelled')]);
  const list = Object.fromEntries(getStoredAppointments().map((a) => [a.id, a.status]));
  assert.deepEqual(list, { A: 'completed', B: 'confirmed', C: 'confirmed', D: 'cancelled' });
  const gravado = Object.fromEntries((JSON.parse(data.get('purazi_appointments')!) as Appointment[]).map((a) => [a.id, a.status]));
  assert.equal(gravado.A, 'completed', 'a conclusão fica salva no navegador');
});

test('modo local: ler de novo não muda nada além do necessário', () => {
  install([apt('A', -13, 'confirmed'), apt('C', 48, 'confirmed')]);
  const primeira = getStoredAppointments();
  const segunda = getStoredAppointments();
  assert.deepEqual(primeira, segunda);
});
