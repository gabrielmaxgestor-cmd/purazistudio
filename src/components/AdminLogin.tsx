import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, X, ArrowRight } from 'lucide-react';
import { getAuthMode, login, setupPassword, lockRemainingMs } from '../utils/adminAuth';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

/** Tela de acesso exclusiva do barbeiro (login ou criação da senha no primeiro acesso). */
export const AdminLogin: React.FC<Props> = ({ onSuccess, onClose }) => {
  const mode = getAuthMode();
  const isSetup = mode === 'setup';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lockMs, setLockMs] = useState(lockRemainingMs());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (lockMs <= 0) return;
    const t = window.setInterval(() => setLockMs(lockRemainingMs()), 1000);
    return () => window.clearInterval(t);
  }, [lockMs]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isSetup && password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }
    setBusy(true);
    const res = isSetup ? await setupPassword(password) : await login(password);
    setBusy(false);
    if (res.ok) onSuccess();
    else {
      setError(res.error || 'Não foi possível entrar.');
      setLockMs(lockRemainingMs());
      setPassword('');
    }
  };

  const locked = lockMs > 0;
  const inputCls =
    'w-full h-12 bg-black/40 border border-white/10 focus:border-white/50 focus:bg-black/60 outline-none px-4 text-[15px] text-white placeholder:text-white/30 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0b]/95 backdrop-blur-md">
      {/* fundo: pontos suaves + brilho */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 45%, #000 20%, transparent 80%)',
          maskImage: 'radial-gradient(ellipse 60% 55% at 50% 45%, #000 20%, transparent 80%)',
        }}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors cursor-pointer"
        aria-label="Fechar"
      >
        <X className="w-6 h-6" />
      </button>

      <form
        onSubmit={submit}
        className="relative w-full max-w-[400px] border border-white/10 bg-[#141417]/90 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)] p-7 sm:p-9"
        autoComplete="off"
      >
        <div className="flex flex-col items-center text-center">
          <img src="/assets/logo-purazi-white.png" alt="PURAZI Studio" className="h-10 w-auto mb-7" />
          <div className="w-12 h-12 rounded-full border border-white/15 bg-white/5 flex items-center justify-center mb-4">
            {isSetup ? <ShieldCheck className="w-5 h-5 text-white" /> : <Lock className="w-5 h-5 text-white" />}
          </div>
          <h2 className="font-serif text-[1.7rem] leading-tight">
            {isSetup ? 'Criar senha do barbeiro' : 'Área do barbeiro'}
          </h2>
          <p className="mt-2 text-[13px] text-white/50 leading-relaxed">
            {isSetup
              ? 'Defina a senha que protege o painel neste aparelho. Guarde-a em local seguro.'
              : 'Acesso restrito. Entre com a sua senha para abrir o painel.'}
          </p>
        </div>

        <div className="mt-7 space-y-3">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSetup ? 'Nova senha (mín. 8 caracteres)' : 'Senha'}
              className={inputCls + ' pr-12'}
              autoFocus
              autoComplete={isSetup ? 'new-password' : 'current-password'}
              disabled={locked}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-white/50 hover:text-white cursor-pointer"
              aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {isSetup && (
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repita a senha"
              className={inputCls}
              autoComplete="new-password"
            />
          )}
        </div>

        {(error || locked) && (
          <p role="alert" className="mt-4 text-[13px] text-rose-300 bg-rose-500/10 border border-rose-400/20 px-3 py-2.5">
            {locked ? `Acesso bloqueado temporariamente. Tente em ${Math.ceil(lockMs / 60000)} min.` : error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || locked || !password}
          className="group mt-6 w-full h-12 bg-white text-black hover:bg-neutral-200 disabled:bg-white/15 disabled:text-white/35 disabled:cursor-not-allowed text-xs uppercase tracking-[0.22em] font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          {busy ? 'Verificando…' : isSetup ? 'Criar senha e entrar' : 'Entrar'}
          {!busy && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
        </button>
      </form>
    </div>
  );
};
