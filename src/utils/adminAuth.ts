/**
 * Login do painel do barbeiro.
 *
 * IMPORTANTE: este site não tem servidor — tudo roda no navegador. Esta proteção impede que
 * clientes abram o painel por curiosidade, mas NÃO é segurança de nível bancário (quem tem
 * conhecimento técnico pode inspecionar o código do site). Para segurança real e agenda
 * compartilhada entre aparelhos, o próximo passo é um backend (ex.: Supabase Auth).
 *
 * Como funciona:
 *  - A senha nunca é guardada em texto puro: usa PBKDF2-SHA256 (150 mil iterações).
 *  - Modo "env": se existir VITE_ADMIN_PASSWORD_HASH no deploy, vale para todos os aparelhos.
 *  - Modo "local": sem a variável, o barbeiro cria a senha no 1º acesso (vale neste aparelho).
 *  - Após 5 tentativas erradas, bloqueia por alguns minutos.
 *  - A sessão dura 2h e some ao fechar a aba.
 */

const SALT = 'purazi-studio-v1';
const K_HASH = 'purazi_admin_hash';
const K_SESSION = 'purazi_admin_session';
const K_FAIL = 'purazi_admin_fail';
const SESSION_MS = 2 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const ENV_HASH: string | undefined = (import.meta as any).env?.VITE_ADMIN_PASSWORD_HASH || undefined;

export type AuthMode = 'env' | 'local' | 'setup';

export function getAuthMode(): AuthMode {
  if (ENV_HASH) return 'env';
  try {
    return localStorage.getItem(K_HASH) ? 'local' : 'setup';
  } catch {
    return 'setup';
  }
}

async function derive(password: string): Promise<string> {
  if (!window.crypto?.subtle) {
    throw new Error('Este navegador/conexão não permite criptografia segura. Acesse o site por https.');
  }
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(SALT), iterations: 150000, hash: 'SHA-256' },
    key,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------- bloqueio por tentativas ---------- */
interface FailState {
  count: number;
  until: number;
}
function readFail(): FailState {
  try {
    return JSON.parse(localStorage.getItem(K_FAIL) || '') as FailState;
  } catch {
    return { count: 0, until: 0 };
  }
}
export function lockRemainingMs(): number {
  return Math.max(0, readFail().until - Date.now());
}
function registerFailure() {
  const f = readFail();
  const count = (f.count || 0) + 1;
  // 5 erros => 1 min; cada novo erro dobra o tempo (máx. 30 min)
  const until =
    count >= MAX_ATTEMPTS ? Date.now() + Math.min(30, Math.pow(2, count - MAX_ATTEMPTS)) * 60 * 1000 : 0;
  localStorage.setItem(K_FAIL, JSON.stringify({ count, until }));
}
function clearFailures() {
  localStorage.removeItem(K_FAIL);
}

/* ---------- sessão ---------- */
function startSession() {
  sessionStorage.setItem(K_SESSION, String(Date.now() + SESSION_MS));
}
export function isLoggedIn(): boolean {
  try {
    const exp = Number(sessionStorage.getItem(K_SESSION) || 0);
    return exp > Date.now();
  } catch {
    return false;
  }
}
export function logout() {
  try {
    sessionStorage.removeItem(K_SESSION);
  } catch {
    /* ignora */
  }
}

/* ---------- ações ---------- */
export async function setupPassword(password: string): Promise<{ ok: boolean; error?: string }> {
  if (getAuthMode() !== 'setup') return { ok: false, error: 'A senha já foi definida.' };
  if (password.length < 8) return { ok: false, error: 'Use pelo menos 8 caracteres.' };
  try {
    localStorage.setItem(K_HASH, await derive(password));
    startSession();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function login(password: string): Promise<{ ok: boolean; error?: string }> {
  const wait = lockRemainingMs();
  if (wait > 0) {
    return { ok: false, error: `Muitas tentativas. Tente novamente em ${Math.ceil(wait / 60000)} min.` };
  }
  try {
    const expected = ENV_HASH || localStorage.getItem(K_HASH) || '';
    const given = await derive(password);
    if (expected && safeEqual(given, expected.toLowerCase())) {
      clearFailures();
      startSession();
      return { ok: true };
    }
    registerFailure();
    const left = Math.max(0, MAX_ATTEMPTS - (readFail().count || 0));
    return { ok: false, error: left > 0 ? `Senha incorreta. Restam ${left} tentativa(s).` : 'Senha incorreta. Acesso bloqueado temporariamente.' };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function changePassword(current: string, next: string): Promise<{ ok: boolean; error?: string }> {
  if (getAuthMode() !== 'local') return { ok: false, error: 'A senha deste site é definida no deploy (variável de ambiente).' };
  if (next.length < 8) return { ok: false, error: 'A nova senha precisa ter pelo menos 8 caracteres.' };
  try {
    const stored = localStorage.getItem(K_HASH) || '';
    if (!safeEqual(await derive(current), stored)) return { ok: false, error: 'Senha atual incorreta.' };
    localStorage.setItem(K_HASH, await derive(next));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Hash da senha atual (modo local) para colar em VITE_ADMIN_PASSWORD_HASH e valer em todos os aparelhos. */
export function getExportableHash(): string {
  try {
    return localStorage.getItem(K_HASH) || '';
  } catch {
    return '';
  }
}
