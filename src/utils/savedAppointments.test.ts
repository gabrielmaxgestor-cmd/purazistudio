import test from 'node:test';
import assert from 'node:assert/strict';
import { Appointment } from './bookingLogic';
import { getSaved, upsertSaved, removeSaved, clearSaved, getRemember, setRemember } from './savedAppointments';

// localStorage de mentira (o Node não tem)
function installStorage(opts: { throws?: boolean } = {}) {
  const data = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => {
      if (opts.throws) throw new Error('bloqueado');
      return data.has(k) ? data.get(k)! : null;
    },
    setItem: (k: string, v: string) => {
      if (opts.throws) throw new Error('bloqueado');
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
    clear: () => data.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  return data;
}

const apt = (over: Partial<Appointment> = {}): Appointment => ({
  id: 'id-' + (over.code ?? 'PRZ-AAAAAA'),
  code: 'PRZ-AAAAAA',
  clientName: 'Maria',
  clientPhone: '24981234567',
  serviceId: 'corte',
  serviceName: 'Corte',
  price: 50,
  durationMinutes: 45,
  dateStr: '2999-01-10',
  timeStr: '10:30',
  status: 'confirmed',
  createdAt: '',
  ...over,
});

test('salva um agendamento confirmado e devolve na lista', () => {
  installStorage();
  upsertSaved(apt());
  const list = getSaved();
  assert.equal(list.length, 1);
  assert.equal(list[0].code, 'PRZ-AAAAAA');
  assert.equal(list[0].phone, '24981234567');
});

test('guarda só dígitos do WhatsApp, mesmo se vier formatado', () => {
  installStorage();
  upsertSaved(apt({ clientPhone: '(24) 98123-4567' }));
  assert.equal(getSaved()[0].phone, '24981234567');
});

test('atualizar o mesmo código troca data/hora em vez de duplicar', () => {
  installStorage();
  upsertSaved(apt());
  upsertSaved(apt({ dateStr: '2999-02-01', timeStr: '11:15' }));
  const list = getSaved();
  assert.equal(list.length, 1);
  assert.equal(list[0].dateStr, '2999-02-01');
  assert.equal(list[0].timeStr, '11:15');
});

test('agendamento cancelado é removido da memória', () => {
  installStorage();
  upsertSaved(apt());
  upsertSaved(apt({ status: 'cancelled' }));
  assert.equal(getSaved().length, 0);
});

test('agendamentos que já passaram são apagados automaticamente', () => {
  const data = installStorage();
  upsertSaved(apt({ code: 'PRZ-OLD111', dateStr: '2000-01-01' }));
  upsertSaved(apt({ code: 'PRZ-NEW222', dateStr: '2999-01-01' }));
  const list = getSaved();
  assert.deepEqual(list.map((s) => s.code), ['PRZ-NEW222']);
  assert.ok(!(data.get('purazi_saved_appointments_v1') ?? '').includes('PRZ-OLD111'), 'o vencido deve sair do armazenamento');
});

test('lista vem ordenada por data e hora', () => {
  installStorage();
  upsertSaved(apt({ code: 'PRZ-BBBBBB', dateStr: '2999-03-01', timeStr: '09:00' }));
  upsertSaved(apt({ code: 'PRZ-AAAAAA', dateStr: '2999-01-01', timeStr: '15:00' }));
  upsertSaved(apt({ code: 'PRZ-CCCCCC', dateStr: '2999-01-01', timeStr: '09:00' }));
  assert.deepEqual(getSaved().map((s) => s.code), ['PRZ-CCCCCC', 'PRZ-AAAAAA', 'PRZ-BBBBBB']);
});

test('guarda no máximo 8 agendamentos', () => {
  installStorage();
  for (let i = 1; i <= 12; i++) upsertSaved(apt({ code: `PRZ-N${String(i).padStart(5, '0')}`, dateStr: `2999-01-${String(i).padStart(2, '0')}` }));
  assert.equal(getSaved().length, 8);
});

test('removeSaved e clearSaved', () => {
  installStorage();
  upsertSaved(apt({ code: 'PRZ-AAAAAA' }));
  upsertSaved(apt({ code: 'PRZ-BBBBBB', dateStr: '2999-02-02' }));
  removeSaved('PRZ-AAAAAA');
  assert.deepEqual(getSaved().map((s) => s.code), ['PRZ-BBBBBB']);
  clearSaved();
  assert.equal(getSaved().length, 0);
});

test('desligar "lembrar" apaga o que já estava salvo e para de salvar', () => {
  installStorage();
  assert.equal(getRemember(), true); // padrão: ligado
  upsertSaved(apt());
  setRemember(false);
  assert.equal(getRemember(), false);
  assert.equal(getSaved().length, 0);
  upsertSaved(apt({ code: 'PRZ-ZZZZZZ' }));
  assert.equal(getSaved().length, 0, 'não pode salvar com a opção desligada');
  setRemember(true);
  upsertSaved(apt({ code: 'PRZ-ZZZZZZ' }));
  assert.equal(getSaved().length, 1);
});

test('dados corrompidos ou de formato errado não derrubam o site', () => {
  const data = installStorage();
  data.set('purazi_saved_appointments_v1', '{isso não é json');
  assert.deepEqual(getSaved(), []);
  data.set('purazi_saved_appointments_v1', JSON.stringify([{ code: 1 }, null, 'x', { code: 'PRZ-OK1234', phone: '24981234567', dateStr: '2999-01-01', timeStr: '10:00', serviceName: 'Corte' }]));
  assert.deepEqual(getSaved().map((s) => s.code), ['PRZ-OK1234']);
});

test('navegador que bloqueia o armazenamento: nada quebra', () => {
  installStorage({ throws: true });
  assert.doesNotThrow(() => upsertSaved(apt()));
  assert.doesNotThrow(() => removeSaved('PRZ-AAAAAA'));
  assert.doesNotThrow(() => clearSaved());
  assert.deepEqual(getSaved(), []);
  assert.equal(getRemember(), false);
});
