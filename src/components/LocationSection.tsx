import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import { MagneticButton } from './MagneticButton';
import { SplitWords } from './SplitWords';
import { BarberSettings, getDaySchedule } from '../utils/bookingLogic';
import { SITE, MAPS_LINK, MAPS_EMBED, WAZE_LINK } from '../utils/siteConfig';

/* ------------------------------------------------------------------ */
/*  Status "Aberto agora" — usa o expediente real configurado no painel */
/*  (inclui folgas fixas e horários próprios por dia da semana).        */
/*  Sempre calculado no fuso de Brasília, onde fica a barbearia.        */
/* ------------------------------------------------------------------ */

const TZ = 'America/Sao_Paulo';
const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const pad = (n: number) => String(n).padStart(2, '0');
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const fmt = (t: string) => {
  const [h, m] = t.split(':');
  return m === '00' ? `${h}h` : `${h}h${m}`;
};

interface OpenStatus {
  open: boolean;
  detail: string;
}

function computeStatus(settings: BarberSettings): OpenStatus {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const y = get('year');
  const m = get('month');
  const d = get('day');
  const minutes = get('hour') * 60 + get('minute');

  // data (YYYY-MM-DD) e dia da semana de "hoje + n dias" em Brasília
  const dayAt = (n: number) => {
    const dt = new Date(Date.UTC(y, m - 1, d + n));
    return {
      dateStr: `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`,
      weekday: dt.getUTCDay(),
    };
  };

  const today = getDaySchedule(dayAt(0).dateStr, settings);
  if (today) {
    const start = toMin(today.start);
    const end = toMin(today.end);
    if (minutes >= start && minutes < end) {
      const left = end - minutes;
      return { open: true, detail: left <= 45 ? `fecha em ${left} min` : `fecha às ${fmt(today.end)}` };
    }
    if (minutes < start) return { open: false, detail: `abre hoje às ${fmt(today.start)}` };
  }

  for (let i = 1; i <= 7; i++) {
    const { dateStr, weekday } = dayAt(i);
    const sched = getDaySchedule(dateStr, settings);
    if (sched) {
      return { open: false, detail: `abre ${i === 1 ? 'amanhã' : DAY_NAMES[weekday]} às ${fmt(sched.start)}` };
    }
  }
  return { open: false, detail: 'consulte nossos horários' };
}

/* Pin de localização vermelho do design */
const LocationPin: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 140" className={className} aria-hidden="true">
    <path d="M50 0C22.4 0 0 22.4 0 50c0 37.5 50 90 50 90s50-52.5 50-90C100 22.4 77.6 0 50 0z" fill="#ff1414" />
    <path d="M50 0C22.4 0 0 22.4 0 50c0 37.5 50 90 50 90V0z" fill="#c70f17" />
    <circle cx="50" cy="48" r="21" fill="#212025" />
  </svg>
);

interface Props {
  settings: BarberSettings;
  hoursLabel: string;
}

export const LocationSection: React.FC<Props> = ({ settings, hoursLabel }) => {
  const [mapActive, setMapActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<OpenStatus>(() => computeStatus(settings));

  const wrapRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<number | undefined>(undefined);

  /* ---- "Aberto agora": recalcula ao mudar o expediente e a cada 30 s ---- */
  useEffect(() => {
    setStatus(computeStatus(settings));
    const id = window.setInterval(() => setStatus(computeStatus(settings)), 30000);
    return () => window.clearInterval(id);
  }, [settings]);

  /* ---- Mapa com inclinação 3D leve (só com mouse; desliga ao explorar o mapa) ---- */
  useEffect(() => {
    const wrap = wrapRef.current;
    const el = tiltRef.current;
    if (!wrap || !el) return;
    if (window.matchMedia('(hover: none)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (mapActive) {
      gsap.to(el, { rotationX: 0, rotationY: 0, duration: 0.6, ease: 'power3.out' });
      return;
    }

    gsap.set(el, { transformPerspective: 1100, transformOrigin: '50% 50%' });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power3' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power3' });

    const move = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry(px * 9);
      rx(-py * 7);
    };
    const leave = () => {
      rx(0);
      ry(0);
    };
    wrap.addEventListener('pointermove', move);
    wrap.addEventListener('pointerleave', leave);
    return () => {
      wrap.removeEventListener('pointermove', move);
      wrap.removeEventListener('pointerleave', leave);
      leave();
    };
  }, [mapActive]);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const spotMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--sx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--sy', `${e.clientY - r.top}px`);
  };

  const copyAddress = async () => {
    const text = `${SITE.address} - ${SITE.city}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // alternativa para navegadores que bloqueiam a área de transferência
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* sem suporte: nada a fazer */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2400);
  };

  return (
    <section
      id="secao-localizacao"
      className="relative py-14 sm:py-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-14 items-center"
    >
      {/* ====================== Coluna de texto ====================== */}
      <div className="min-w-0">
        <p data-reveal="up" className="shiny-text text-xs sm:text-[11px] uppercase tracking-[0.4em] font-semibold">
          Localização
        </p>

        {/* Status: Aberto agora / Fechado */}
        <div
          data-reveal="up"
          data-delay="0.1"
          role="status"
          className="mt-5 inline-flex flex-wrap items-center gap-x-3 gap-y-1 border border-white/12 bg-white/[0.03] px-4 py-2.5 backdrop-blur-sm"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {status.open && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/70 animate-ping" />}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${status.open ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
          </span>
          <span className="text-[11px] uppercase tracking-[0.22em] font-semibold text-white">
            {status.open ? 'Aberto agora' : 'Fechado agora'}
          </span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">· {status.detail}</span>
        </div>

        {/* Pin + endereço em destaque tipográfico */}
        <div className="mt-9 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-7">
          <div data-pin className="relative shrink-0 w-14 sm:w-[clamp(50px,6vw,84px)]">
            {/* ondas de radar saindo da ponta do pin */}
            <span className="absolute left-1/2 bottom-0 w-0 h-0" aria-hidden="true">
              <span className="radar-ring w-24 h-9 sm:w-32 sm:h-12" />
              <span className="radar-ring r2 w-24 h-9 sm:w-32 sm:h-12" />
              <span className="radar-ring r3 w-24 h-9 sm:w-32 sm:h-12" />
            </span>
            <LocationPin className="relative block w-full h-auto pin-float drop-shadow-[0_10px_18px_rgba(255,20,20,0.35)]" />
          </div>

          <h2 data-split className="font-serif font-light leading-[0.98] min-w-0">
            <span className="block mb-3 font-sans text-[11px] sm:text-xs uppercase tracking-[0.42em] text-white/55">
              <SplitWords text="Avenida" attr="data-word" />
            </span>
            <span className="block text-[clamp(2.7rem,5.3vw,4.9rem)]">
              <SplitWords text="Nilo Peçanha" attr="data-word" />
            </span>
            <span className="block mt-4 text-[clamp(1.35rem,2.5vw,2.15rem)] text-white/75">
              <SplitWords text="1027 · Valença/RJ" attr="data-word" />
            </span>
          </h2>
        </div>

        <p
          data-reveal="up"
          data-delay="0.25"
          className="mt-9 text-[13px] sm:text-xs uppercase tracking-[0.22em] text-neutral-400 sm:text-neutral-500"
        >
          {hoursLabel}
        </p>

        {/* Ações: abrir rota no Maps / Waze e copiar endereço */}
        <div data-reveal="up" data-delay="0.3" className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
          <MagneticButton href={MAPS_LINK} ariaLabel="Abrir a rota no Google Maps">
            Abrir no Maps
            <ArrowUpRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </MagneticButton>
          <MagneticButton href={WAZE_LINK} variant="outline" ariaLabel="Abrir a rota no Waze">
            Abrir no Waze
            <ArrowUpRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </MagneticButton>
        </div>

        <button
          type="button"
          onClick={copyAddress}
          className="group mt-6 inline-flex items-center gap-2.5 text-[13px] sm:text-xs uppercase tracking-[0.22em] text-neutral-400 hover:text-white border-b border-white/20 hover:border-white py-2 sm:pb-1 sm:pt-0 cursor-pointer transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Endereço copiado' : 'Copiar endereço'}
        </button>
        <span className="sr-only" aria-live="polite">
          {copied ? 'Endereço copiado para a área de transferência' : ''}
        </span>
      </div>

      {/* ====================== Mapa em cartão 3D ====================== */}
      <div ref={wrapRef} className="relative">
        <div ref={tiltRef} className="relative will-change-transform">
          <div
            data-map
            onMouseMove={spotMove}
            className="spot beam relative h-[380px] sm:h-[460px] border border-white/10 bg-[#111113] overflow-hidden shadow-[0_40px_90px_-40px_rgba(255,20,20,0.35)]"
          >
            <iframe
              title="Mapa do PURAZI Studio"
              src={MAPS_EMBED}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 w-full h-full border-0"
              style={{ filter: 'grayscale(1) invert(0.92) contrast(0.92) brightness(0.95)' }}
            />
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_70px_rgba(0,0,0,0.65)]" />

            {/* pin vermelho animado + radar, fixos no centro do mapa (somem quando o mapa é explorado) */}
            <div
              aria-hidden="true"
              className={`absolute left-1/2 top-1/2 w-0 h-0 pointer-events-none z-[2] transition-opacity duration-500 ${
                mapActive ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <span className="radar-ring w-40 h-16" />
              <span className="radar-ring r2 w-40 h-16" />
              <span className="radar-ring r3 w-40 h-16" />
              <span className="absolute left-0 bottom-0 -translate-x-1/2">
                <LocationPin className="block w-8 h-auto pin-float drop-shadow-[0_8px_14px_rgba(255,20,20,0.55)]" />
              </span>
            </div>

            {/* cartão flutuante com o nome e o endereço */}
            <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-[17rem] z-[2] pointer-events-none border border-white/12 bg-black/60 backdrop-blur-md px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-red-400 font-semibold">{SITE.name}</p>
              <p className="mt-1 text-sm text-white">{SITE.address}</p>
              <p className="text-xs text-neutral-400">{SITE.city}</p>
            </div>

            {!mapActive && (
              <button
                onClick={() => setMapActive(true)}
                className="absolute inset-0 z-10 cursor-pointer"
                aria-label="Ativar o mapa para interagir"
              >
                <span className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-2.5 text-[11px] sm:text-[10px] uppercase tracking-[0.2em] text-white/90">
                  Toque para explorar o mapa
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
