import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface Props {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'light' | 'outline';
  icon?: React.ReactNode;
  className?: string;
  strength?: number;
  ariaLabel?: string;
}

/**
 * Botão "magnético" (inspirado em Magnet/React Bits e Skiper UI): o botão e o texto
 * seguem o cursor de leve; no hover há preenchimento deslizante e brilho que cruza.
 */
export const MagneticButton: React.FC<Props> = ({
  children,
  onClick,
  href,
  variant = 'light',
  icon,
  className = '',
  strength = 0.28,
  ariaLabel,
}) => {
  const field = useRef<HTMLSpanElement>(null);
  const body = useRef<HTMLElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const area = field.current;
    const el = body.current;
    const txt = label.current;
    if (!area || !el || !txt) return;
    if (window.matchMedia('(hover: none)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
    const tx = gsap.quickTo(txt, 'x', { duration: 0.6, ease: 'power3' });
    const ty = gsap.quickTo(txt, 'y', { duration: 0.6, ease: 'power3' });

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      xTo(dx * strength);
      yTo(dy * strength);
      tx(dx * strength * 0.5);
      ty(dy * strength * 0.5);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
      tx(0);
      ty(0);
    };
    area.addEventListener('pointermove', move);
    area.addEventListener('pointerleave', leave);
    return () => {
      area.removeEventListener('pointermove', move);
      area.removeEventListener('pointerleave', leave);
    };
  }, [strength]);

  const isLight = variant === 'light';
  const base =
    'group relative inline-flex items-center justify-center gap-3 overflow-hidden h-16 sm:h-14 px-9 sm:px-10 text-[13px] sm:text-xs uppercase tracking-[0.22em] font-semibold whitespace-nowrap cursor-pointer select-none';
  const tone = isLight
    ? 'bg-white text-black animate-[glowPulse_3.2s_ease-in-out_infinite]'
    : 'beam border border-white/20 bg-black/40 backdrop-blur-sm text-white hover:text-black transition-colors duration-500';

  const content = (
    <>
      {/* preenchimento que sobe no hover */}
      <span
        aria-hidden="true"
        className={`absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.7,0,0.2,1)] ${
          isLight ? 'bg-neutral-300' : 'bg-white'
        }`}
      />
      {/* brilho que cruza */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent ${
          isLight ? 'via-black/10' : 'via-white/25'
        } to-transparent translate-x-0 group-hover:translate-x-[460%] transition-transform duration-[900ms] ease-out`}
      />
      <span ref={label} className="relative z-10 inline-flex items-center gap-3">
        {icon}
        {children}
      </span>
    </>
  );

  return (
    <span ref={field} className={`inline-block p-5 -m-5 ${className}`}>
      {href ? (
        <a
          ref={body as React.Ref<HTMLAnchorElement>}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ariaLabel}
          className={`${base} ${tone}`}
        >
          {content}
        </a>
      ) : (
        <button
          ref={body as React.Ref<HTMLButtonElement>}
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          className={`${base} ${tone}`}
        >
          {content}
        </button>
      )}
    </span>
  );
};
