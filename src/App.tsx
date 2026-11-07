import React, { useState, useEffect } from 'react';
import { BookingDrawer } from './components/BookingDrawer';
import { ConsultAppointmentModal } from './components/ConsultAppointmentModal';
import { BarberAdminPanel } from './components/BarberAdminPanel';
import { Navbar } from './components/Navbar';
import { Service, DayOption, BarberSettings, DEFAULT_BARBER_SETTINGS } from './utils/bookingLogic';
import { getStoredServices, getStoredBarberSettings } from './utils/storage';
import { SITE, MAPS_LINK, MAPS_EMBED, GALLERY, whatsappLink } from './utils/siteConfig';
import { ArrowRight, ArrowUpRight, Instagram } from 'lucide-react';

/* ---------- helpers de exibição ---------- */

const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

const formatTime = (t: string) => {
  const [h, m] = t.split(':');
  return m === '00' ? `${h}h` : `${h}h${m}`;
};

// Ex.: folga no domingo -> "Seg a Sáb"
const formatOpenDays = (off: number[]) => {
  const names: Record<number, string> = { 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb', 0: 'Dom' };
  const order = [1, 2, 3, 4, 5, 6, 0].filter((d) => !off.includes(d));
  if (order.length === 0) return '';
  const runs: number[][] = [];
  order.forEach((d) => {
    const last = runs[runs.length - 1];
    const prevIdx = last ? [1, 2, 3, 4, 5, 6, 0].indexOf(last[last.length - 1]) : -2;
    if (last && [1, 2, 3, 4, 5, 6, 0].indexOf(d) === prevIdx + 1) last.push(d);
    else runs.push([d]);
  });
  return runs
    .map((r) => (r.length >= 3 ? `${names[r[0]]} a ${names[r[r.length - 1]]}` : r.map((d) => names[d]).join(', ')))
    .join(' · ');
};

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] uppercase tracking-[0.32em] text-amber-400 font-medium">{children}</p>
);

export default function App() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOption | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<BarberSettings>(DEFAULT_BARBER_SETTINGS);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setServices(getStoredServices());
    setSettings(getStoredBarberSettings());
  }, [refreshKey]);

  // Entrada suave das seções (respeita "reduzir movimento" via CSS)
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [services.length]);

  const handleOpenBookingWithService = (serviceId?: string) => {
    setSelectedServiceId(serviceId || null);
    setSelectedDay(null);
    setSelectedTime(null);
    setBookingOpen(true);
  };

  const handleDataChanged = () => setRefreshKey((prev) => prev + 1);

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const openDays = formatOpenDays(settings.fixedOffDays);
  const hoursLabel = `${openDays ? openDays + ' · ' : ''}${formatTime(settings.workStart)} às ${formatTime(settings.workEnd)}`;

  return (
    <div id="top" className="min-h-screen bg-[#0b0b0c] text-[#f4f1ec]">
      <Navbar
        onOpenBooking={() => handleOpenBookingWithService()}
        onOpenConsult={() => setConsultOpen(true)}
        onOpenServices={() => scrollToId('servicos')}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      <div className="nav-spacer" aria-hidden="true" />

      <main>
        {/* ============================ 1. HERO ============================ */}
        <section className="relative overflow-hidden">
          <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-16 sm:py-24 lg:py-28 grid lg:grid-cols-[1.1fr_0.9fr] gap-14 lg:gap-20 items-center">
            <div className="reveal">
              <Eyebrow>Barbearia &amp; Visagismo · Valença/RJ</Eyebrow>
              <h1 className="mt-6 font-serif text-[2.6rem] sm:text-6xl lg:text-7xl leading-[1.04] font-medium tracking-tight text-[#f4f1ec]">
                Aqui, cada detalhe valoriza sua{' '}
                <em className="not-italic text-amber-300">melhor versão.</em>
              </h1>
              <p className="mt-7 max-w-md text-[15px] leading-relaxed text-[#9a968f]">
                Corte, barba e visagismo com hora marcada. Escolha o serviço, o dia e o horário em menos de um minuto.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
                <button
                  onClick={() => handleOpenBookingWithService()}
                  className="group inline-flex items-center justify-center gap-3 h-14 px-9 bg-amber-400 text-black hover:bg-amber-300 text-xs uppercase tracking-[0.22em] font-semibold transition-colors cursor-pointer"
                >
                  Agendar horário
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => scrollToId('servicos')}
                  className="text-xs uppercase tracking-[0.22em] text-[#f4f1ec] hover:text-amber-300 border-b border-white/25 hover:border-amber-300 pb-1 self-start sm:self-auto transition-colors cursor-pointer"
                >
                  Ver serviços
                </button>
              </div>

              <p className="mt-12 text-xs tracking-[0.18em] uppercase text-[#6f6b65]">{hoursLabel}</p>
            </div>

            <div className="reveal relative mx-auto w-full max-w-[420px] lg:max-w-none">
              <div className="absolute -inset-3 translate-x-3 translate-y-3 border border-amber-400/40" aria-hidden="true" />
              <img
                src="/assets/barber-photo-clean.webp"
                alt="Barbeiro do PURAZI Studio"
                width={600}
                height={640}
                loading="eager"
                className="relative w-full aspect-[4/5] object-cover object-top grayscale contrast-110"
              />
            </div>
          </div>
        </section>

        {/* ========================== 2. SERVIÇOS ========================== */}
        <section id="servicos" className="border-t border-white/10">
          <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-20 sm:py-28 grid lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-24">
            <div className="reveal">
              <Eyebrow>Serviços</Eyebrow>
              <h2 className="mt-5 font-serif text-4xl sm:text-5xl font-medium leading-tight">
                Atendimento sob medida
              </h2>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-[#9a968f]">
                Toque em um serviço para escolher o dia e o horário.
              </p>
            </div>

            <ul className="reveal border-t border-white/10">
              {services.map((service) => (
                <li key={service.id} className="border-b border-white/10">
                  <button
                    type="button"
                    onClick={() => handleOpenBookingWithService(service.id)}
                    className="group w-full text-left py-6 sm:py-7 flex items-start justify-between gap-6 cursor-pointer"
                  >
                    <span className="min-w-0">
                      <span className="block font-serif text-2xl sm:text-[1.65rem] text-[#f4f1ec] group-hover:text-amber-300 transition-colors">
                        {service.name}
                      </span>
                      {service.description && (
                        <span className="mt-2 block max-w-md text-sm leading-relaxed text-[#9a968f]">
                          {service.description}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-serif text-2xl text-[#f4f1ec]">{formatPrice(service.price)}</span>
                      <span className="mt-1 block text-[11px] uppercase tracking-[0.2em] text-[#6f6b65]">
                        {service.durationMinutes} min
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===================== 3. FAIXA DE IMAGEM ======================== */}
        <section className="relative h-[320px] sm:h-[460px] overflow-hidden border-t border-white/10">
          <img
            src="/assets/clipper-clean.webp"
            alt="Máquina de corte profissional"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-[center_62%] grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0c]/85 via-[#0b0b0c]/40 to-[#0b0b0c]/80" aria-hidden="true" />
          <div className="relative h-full max-w-[1200px] mx-auto px-6 sm:px-10 flex flex-col justify-center reveal">
            <Eyebrow>Visagismo</Eyebrow>
            <p className="mt-4 font-serif text-4xl sm:text-6xl font-medium leading-tight max-w-xl">
              Precisão em cada detalhe.
            </p>
          </div>
        </section>

        {/* ===================== 4. GALERIA (opcional) ===================== */}
        {GALLERY.length > 0 && (
          <section className="border-t border-white/10">
            <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-20 sm:py-28">
              <div className="reveal flex items-end justify-between gap-6 mb-12">
                <div>
                  <Eyebrow>Estilos</Eyebrow>
                  <h2 className="mt-5 font-serif text-4xl sm:text-5xl font-medium">Nosso trabalho</h2>
                </div>
                <a
                  href={SITE.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#f4f1ec] hover:text-amber-300 transition-colors"
                >
                  {SITE.instagramHandle} <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
              <div className="reveal grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                {GALLERY.map((img) => (
                  <img
                    key={img.src}
                    src={img.src}
                    alt={img.alt}
                    loading="lazy"
                    className="w-full aspect-[4/5] object-cover grayscale hover:grayscale-0 transition-all duration-700"
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ======================= 5. LOCALIZAÇÃO ========================== */}
        <section id="secao-localizacao" className="border-t border-white/10">
          <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="reveal">
              <Eyebrow>Localização</Eyebrow>
              <h2 className="mt-5 font-serif text-4xl sm:text-5xl font-medium leading-tight">Venha nos visitar</h2>

              <dl className="mt-10 space-y-6 text-[15px]">
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.22em] text-[#6f6b65]">Endereço</dt>
                  <dd className="mt-1.5 text-[#f4f1ec]">
                    {SITE.address} · {SITE.neighborhood}
                    <br />
                    {SITE.city}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.22em] text-[#6f6b65]">Horários</dt>
                  <dd className="mt-1.5 text-[#f4f1ec]">{hoursLabel}</dd>
                </div>
              </dl>

              <div className="mt-10 flex flex-wrap gap-3">
                <a
                  href={MAPS_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-12 px-7 border border-amber-400 text-amber-300 hover:bg-amber-400 hover:text-black text-xs uppercase tracking-[0.2em] font-semibold transition-colors"
                >
                  Como chegar <ArrowUpRight className="w-4 h-4" />
                </a>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center h-12 px-7 border border-white/20 text-[#f4f1ec] hover:border-white/60 text-xs uppercase tracking-[0.2em] font-semibold transition-colors"
                >
                  WhatsApp
                </a>
                <a
                  href={SITE.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram do PURAZI Studio"
                  className="inline-flex items-center justify-center gap-2 h-12 px-5 border border-white/20 text-[#f4f1ec] hover:border-white/60 text-xs uppercase tracking-[0.2em] font-semibold transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                  <span className="hidden sm:inline">Instagram</span>
                </a>
              </div>
            </div>

            <div className="reveal relative h-[320px] sm:h-[420px] border border-white/10 overflow-hidden bg-[#111113]">
              <iframe
                title="Mapa do PURAZI Studio"
                src={MAPS_EMBED}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 w-full h-full border-0"
                style={{ filter: 'grayscale(1) invert(0.92) contrast(0.9)' }}
              />
            </div>
          </div>
        </section>
      </main>

      {/* ============================ RODAPÉ ============================= */}
      <footer className="border-t border-white/10">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-14 flex flex-col md:flex-row md:items-start md:justify-between gap-10">
          <div className="max-w-xs">
            <img src="/assets/logo-purazi-white.png" alt="PURAZI Studio" className="h-8 w-auto" />
            <p className="mt-5 text-sm leading-relaxed text-[#9a968f]">{SITE.tagline}</p>
          </div>

          <nav className="flex flex-col gap-3 text-xs uppercase tracking-[0.2em] text-[#9a968f]">
            <button onClick={() => handleOpenBookingWithService()} className="text-left hover:text-white transition-colors cursor-pointer">Agendar horário</button>
            <button onClick={() => setConsultOpen(true)} className="text-left hover:text-white transition-colors cursor-pointer">Consultar agendamento</button>
            <button onClick={() => scrollToId('servicos')} className="text-left hover:text-white transition-colors cursor-pointer">Serviços</button>
            <button onClick={() => scrollToId('secao-localizacao')} className="text-left hover:text-white transition-colors cursor-pointer">Localização</button>
          </nav>

          <div className="text-sm text-[#9a968f] leading-relaxed">
            <p>{SITE.address} · {SITE.neighborhood}</p>
            <p>{SITE.city}</p>
            <a href={`tel:+${SITE.whatsappNumber}`} className="mt-3 inline-block text-[#f4f1ec] hover:text-amber-300 transition-colors">
              {SITE.phoneDisplay}
            </a>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-[#6f6b65]">
            <span>© {new Date().getFullYear()} PURAZI Studio</span>
            <button onClick={() => setAdminOpen(true)} className="hover:text-amber-300 transition-colors cursor-pointer">
              Área do barbeiro
            </button>
          </div>
        </div>
      </footer>

      <BookingDrawer
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        services={services}
        preselectedServiceId={selectedServiceId}
        initialDay={selectedDay}
        initialTime={selectedTime}
        onBookingComplete={handleDataChanged}
      />

      <ConsultAppointmentModal isOpen={consultOpen} onClose={() => setConsultOpen(false)} />

      <BarberAdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        onDataChanged={handleDataChanged}
      />
    </div>
  );
}
