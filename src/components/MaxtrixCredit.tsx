import { MAXTRIX, maxtrixWhatsappLink } from '../utils/siteConfig';

const iconLink =
  'grid place-items-center w-8 h-8 rounded-full border border-white/15 text-neutral-400 transition-all duration-300 hover:text-[#05f994] hover:border-[#05f994] hover:shadow-[0_0_14px_rgba(5,249,148,0.35)] hover:-translate-y-0.5';

export function MaxtrixCredit() {
  return (
    <div className="max-w-[1366px] mx-auto mt-5 pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 opacity-70 hover:opacity-100 transition-opacity duration-300">
      <a
        href={MAXTRIX.instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Maxtrix: soluções digitais para negócios"
        className="group inline-flex items-center gap-2 text-xs tracking-wide text-neutral-400"
      >
        <span>Produzido por</span>
        <img src="/assets/maxtrix-logo.png" alt="" width={28} height={13} loading="lazy" className="h-[13px] w-auto" />
        <strong className="font-semibold uppercase tracking-[0.08em] text-white transition-colors group-hover:text-[#05f994]">
          {MAXTRIX.name}
        </strong>
      </a>

      <span className="text-[11px] tracking-wide text-neutral-500 order-last sm:order-none">{MAXTRIX.tagline}</span>

      <div className="inline-flex gap-2">
        <a href={MAXTRIX.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram da Maxtrix" className={iconLink}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
          </svg>
        </a>
        <a href={maxtrixWhatsappLink()} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp da Maxtrix" className={iconLink}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.5A9.9 9.9 0 1 0 12.04 2Zm0 1.8a8.1 8.1 0 1 1-4.3 15l-.3-.2-3.1.9.9-3-.2-.3A8.1 8.1 0 0 1 12.04 3.8Zm-3 3.6c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.7.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3l-1.9-.9c-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.5-.5-.7-.5Z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
