import React, { useState, useEffect } from 'react';
import { BookingDrawer } from './components/BookingDrawer';
import { ConsultAppointmentModal } from './components/ConsultAppointmentModal';
import { BarberAdminPanel } from './components/BarberAdminPanel';
import { ServicesModal } from './components/ServicesModal';
import { Navbar } from './components/Navbar';
import { MiniBookingAgenda } from './components/MiniBookingAgenda';
import { HaircutCarouselSection } from './components/HaircutCarouselSection';
import { Service, DayOption } from './utils/bookingLogic';
import { getStoredServices } from './utils/storage';
import { Calendar, Search, ShieldCheck, Scissors, ArrowRight } from 'lucide-react';

export default function App() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOption | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setServices(getStoredServices());
  }, [refreshKey]);

  const handleOpenBookingWithService = (serviceId?: string) => {
    setSelectedServiceId(serviceId || null);
    setSelectedDay(null);
    setSelectedTime(null);
    setBookingOpen(true);
  };

  const handleMiniAgendaSelect = (day: DayOption, time: string) => {
    setSelectedDay(day);
    setSelectedTime(time);
    setSelectedServiceId(null);
    setBookingOpen(true);
  };

  const handleDataChanged = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const scrollToTop = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="top" className="min-h-screen bg-[#0f0f0f] text-white">
      {/* ========================================================================= */}
      {/* 1. BARRA DE NAVEGAÇÃO SUPERIOR CONFORME REQUISITO 1                        */}
      {/* Fixa, discreta, transparente sobre o cinza inicial e grafite com desfoque  */}
      {/* ========================================================================= */}
      <Navbar
        onOpenBooking={() => handleOpenBookingWithService()}
        onOpenConsult={() => setConsultOpen(true)}
        onOpenServices={() => setServicesOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      {/* ========================================================================= */}
      {/* ESTRUTURA ORIGINAL FIEL AO DESIGN ANEXADO PELO USUÁRIO                    */}
      {/* Imagem original com 100% de nitidez, sem manchas ou blocos cortados       */}
      {/* Caixas de textos interativas identificadas e posicionadas com precisão    */}
      {/* ========================================================================= */}
      <main className="page relative max-w-[1366px] mx-auto leading-none bg-[#0f0f0f]">
        <h1 className="sr">PURAZI Studio — Aqui, cada detalhe valoriza sua melhor versão. Barbearia em Valença/RJ</h1>

        {/* Imagem base com o design original anexado pelo usuário */}
        <img
          src="/assets/purazi-landing.webp"
          alt="PURAZI Studio — Barbearia &amp; Visagismo em Valença/RJ"
          width={1366}
          height={3520}
          loading="eager"
          className="bg-canvas"
        />

        {/* ========================================================================= */}
        {/* 1. HERO: Título e Logotipo Oficial                                        */}
        {/* ========================================================================= */}
        {/* Caixa de identificação do Título Principal */}
        <div
          className="h pointer-events-auto rounded transition-colors group"
          style={{
            left: '49.78%',
            top: '4.26%',
            width: '42.00%',
            height: '6.50%',
          }}
          title="PURAZI Studio: Aqui, cada detalhe valoriza sua melhor versão."
        >
          <span className="sr">Aqui, cada detalhe valoriza sua melhor versão.</span>
        </div>

        {/* Caixa de clique do Logotipo Oficial PURAZI Studio no Hero */}
        <a
          href="#top"
          onClick={scrollToTop}
          className="h rounded transition-all duration-200 hover:ring-1 hover:ring-neutral-400/30"
          style={{
            left: '76.13%',
            top: '12.35%',
            width: '16.10%',
            height: '2.40%',
          }}
          title="PURAZI Studio — Voltar ao topo"
          aria-label="PURAZI Studio — Voltar ao topo"
        >
          <span className="sr">PURAZI Studio</span>
        </a>

        {/* ========================================================================= */}
        {/* 2. DOBRA 2: 'Agende seu horário abaixo:' + Subtítulo + Botão Único         */}
        {/* Conforme solicitação: apenas um botão destacado e único com a CTA           */}
        {/* 'Iniciar agendamento online', alinhado ao texto                             */}
        {/* ========================================================================= */}
        {/* Caixa de identificação do título: 'Agende seu horário abaixo:' */}
        <div
          className="h rounded select-text"
          style={{
            left: '20.00%',
            top: '21.50%',
            width: '60.00%',
            height: '2.50%',
          }}
          title="Agende seu horário abaixo"
        >
          <span className="sr">Agende seu horário abaixo:</span>
        </div>

        {/* Caixa de identificação do subtítulo: 'Rápido, prático e sem intermediários...' */}
        <div
          className="h rounded select-text"
          style={{
            left: '20.00%',
            top: '24.00%',
            width: '60.00%',
            height: '1.40%',
          }}
          title="Rápido, prático e sem intermediários. Escolha o serviço, barbeiro e confirme em 1 minuto."
        >
          <span className="sr">Rápido, prático e sem intermediários. Escolha o serviço, barbeiro e confirme em 1 minuto.</span>
        </div>

        {/* Botão Único e Destacado: 'Iniciar agendamento online' - alinhado ao texto */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-auto w-full flex justify-center px-4"
          style={{
            top: '27.4%',
          }}
        >
          <button
            type="button"
            onClick={() => handleOpenBookingWithService()}
            className="group relative inline-flex items-center justify-center gap-3.5 bg-black text-white hover:bg-neutral-900 border-2 border-amber-400 hover:border-amber-300 px-8 sm:px-14 py-4 sm:py-5 text-xs sm:text-sm md:text-base font-bold tracking-[0.25em] uppercase rounded-none shadow-[0_12px_35px_rgba(0,0,0,0.85),0_0_25px_rgba(251,191,36,0.35)] hover:shadow-[0_15px_45px_rgba(0,0,0,0.95),0_0_35px_rgba(251,191,36,0.6)] transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 cursor-pointer"
            aria-label="Iniciar agendamento online"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 group-hover:scale-125 transition-transform animate-pulse" />
            <span>Iniciar agendamento online</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 3. DOBRA 3: Localização com Pin e Endereço Avenida Nilo Peçanha           */}
        {/* ========================================================================= */}
        <a
          id="secao-localizacao"
          href="https://www.google.com/maps/search/?api=1&query=Avenida+Nilo+Pe%C3%A7anha+1027+Valen%C3%A7a+RJ"
          target="_blank"
          rel="noopener noreferrer"
          className="h rounded cursor-pointer transition-all duration-200 hover:ring-1 hover:ring-red-400/40 hover:bg-white/[0.02]"
          style={{
            left: '24.30%',
            top: '52.00%',
            width: '61.00%',
            height: '8.54%',
          }}
          aria-label="Avenida Nilo Peçanha, 1027 - Valença/RJ. Abrir no Google Maps"
          title="Abrir localização no Google Maps: Avenida Nilo Peçanha, 1027 - Valença/RJ"
        >
          <span className="sr">Avenida Nilo Peçanha, 1027 - Valença/RJ</span>
        </a>

        {/* ========================================================================= */}
        {/* 4. DOBRA 4: Carrossel contínuo de fotos de corte + WhatsApp               */}
        {/* Posicionado logo abaixo da localização (top 61.2% até 88.8%)              */}
        {/* Texto visível, aprimorado, sem conflito visual com o restante da página  */}
        {/* ========================================================================= */}
        <div
          className="absolute inset-x-0 z-20 overflow-hidden"
          style={{
            top: '61.2%',
            height: '27.6%',
          }}
        >
          <HaircutCarouselSection />
        </div>

        {/* ========================================================================= */}
        {/* 5. RODAPÉ INSTITUCIONAL COM IDENTIFICAÇÃO EXATA DE CAIXAS DE TEXTO       */}
        {/* ========================================================================= */}

        {/* Logotipo PURAZI Studio no Rodapé */}
        <a
          href="#top"
          onClick={scrollToTop}
          className="h rounded transition-all duration-200 hover:ring-1 hover:ring-white/20"
          style={{
            left: '9.30%',
            top: '89.20%',
            width: '15.00%',
            height: '2.00%',
          }}
          title="PURAZI Studio — Voltar ao início"
          aria-label="PURAZI Studio"
        >
          <span className="sr">PURAZI Studio</span>
        </a>

        {/* Coluna 1: Descrição Institucional */}
        <div
          className="h rounded select-text"
          style={{
            left: '9.30%',
            top: '91.55%',
            width: '27.50%',
            height: '2.60%',
          }}
          title="Aqui, cada detalhe valoriza sua melhor versão."
        >
          <span className="sr">
            Aqui, cada detalhe valoriza sua melhor versão. Barbearia moderna com agendamento online inteligente, pontualidade e técnicas de visagismo sob medida.
          </span>
        </div>

        {/* Coluna 1: Cidade (Valença . Rio de Janeiro) */}
        <div
          className="h rounded select-text"
          style={{
            left: '9.30%',
            top: '94.60%',
            width: '20.00%',
            height: '1.20%',
          }}
          title="Valença · Rio de Janeiro"
        >
          <span className="sr">Valença · Rio de Janeiro</span>
        </div>

        {/* Coluna 2: Título 'Acesso Rápido' */}
        <div
          className="h rounded select-text"
          style={{
            left: '49.00%',
            top: '89.20%',
            width: '18.00%',
            height: '1.20%',
          }}
          title="Acesso Rápido"
        >
          <span className="sr">Acesso Rápido</span>
        </div>

        {/* Coluna 2 - Link 1: 'Início' */}
        <a
          href="#top"
          onClick={scrollToTop}
          className="h rounded cursor-pointer transition-all duration-200 hover:ring-1 hover:ring-white/30 hover:bg-white/[0.04]"
          style={{
            left: '49.00%',
            top: '90.42%',
            width: '12.00%',
            height: '1.01%',
          }}
          aria-label="Início"
          title="Voltar ao início"
        >
          <span className="sr">Início</span>
        </a>

        {/* Coluna 2 - Link 2: 'Agendar Horário' */}
        <button
          type="button"
          onClick={() => handleOpenBookingWithService()}
          className="h rounded cursor-pointer transition-all duration-200 hover:ring-1 hover:ring-amber-300/40 hover:bg-white/[0.04]"
          style={{
            left: '49.00%',
            top: '91.51%',
            width: '18.00%',
            height: '1.01%',
          }}
          aria-label="Agendar Horário"
          title="Agendar Horário online"
        >
          <span className="sr">Agendar Horário</span>
        </button>

        {/* Coluna 2 - Link 3: 'Localização & Estrutura' */}
        <a
          href="https://www.google.com/maps/search/?api=1&query=Avenida+Nilo+Pe%C3%A7anha+1027+Valen%C3%A7a+RJ"
          target="_blank"
          rel="noopener noreferrer"
          className="h rounded cursor-pointer transition-all duration-200 hover:ring-1 hover:ring-white/30 hover:bg-white/[0.04]"
          style={{
            left: '49.00%',
            top: '92.63%',
            width: '22.00%',
            height: '1.01%',
          }}
          aria-label="Localização e Estrutura"
          title="Localização e Estrutura no Google Maps"
        >
          <span className="sr">Localização &amp; Estrutura</span>
        </a>

        {/* Coluna 2 - Link 4: 'Falar no WhatsApp' */}
        <a
          href="https://wa.me/5524999999999?text=Ol%C3%A1!%20Vim%20pelo%20site%20do%20PURAZI%20Studio."
          target="_blank"
          rel="noopener noreferrer"
          className="h rounded cursor-pointer transition-all duration-200 hover:ring-1 hover:ring-emerald-400/40 hover:bg-white/[0.04]"
          style={{
            left: '49.00%',
            top: '93.72%',
            width: '18.00%',
            height: '1.01%',
          }}
          aria-label="Falar no WhatsApp"
          title="Falar no WhatsApp"
        >
          <span className="sr">Falar no WhatsApp</span>
        </a>

        {/* Coluna 2 - Link 5: 'Consultar Meu Agendamento' */}
        <button
          type="button"
          onClick={() => setConsultOpen(true)}
          className="h rounded cursor-pointer transition-all duration-200 hover:ring-1 hover:ring-amber-300/40 hover:bg-white/[0.04]"
          style={{
            left: '49.00%',
            top: '94.81%',
            width: '25.00%',
            height: '1.01%',
          }}
          aria-label="Consultar Meu Agendamento"
          title="Consultar Meu Agendamento"
        >
          <span className="sr">Consultar Meu Agendamento</span>
        </button>

        {/* Coluna 3: Título 'Contato e Gestão' */}
        <div
          className="h rounded select-text"
          style={{
            left: '74.10%',
            top: '89.20%',
            width: '20.00%',
            height: '1.20%',
          }}
          title="Contato e Gestão"
        >
          <span className="sr">Contato e Gestão</span>
        </div>

        {/* Coluna 3 - Link 1: Endereço Av. Nilo Peçanha, 1027 */}
        <a
          href="https://www.google.com/maps/search/?api=1&query=Avenida+Nilo+Pe%C3%A7anha+1027+Valen%C3%A7a+RJ"
          target="_blank"
          rel="noopener noreferrer"
          className="h rounded cursor-pointer transition-all duration-200 hover:ring-1 hover:ring-white/30 hover:bg-white/[0.04]"
          style={{
            left: '74.10%',
            top: '90.50%',
            width: '24.00%',
            height: '1.10%',
          }}
          title="Ver no Google Maps: Av. Nilo Peçanha, 1027 · Valença/RJ"
          aria-label="Av. Nilo Peçanha, 1027 · Valença/RJ"
        >
          <span className="sr">Av. Nilo Peçanha, 1027 · Valença/RJ</span>
        </a>

        {/* Coluna 3 - Link 2: Telefone (24) 99999-9999 */}
        <a
          href="tel:+5524999999999"
          className="h rounded cursor-pointer transition-all duration-200 hover:ring-1 hover:ring-amber-300/40 hover:bg-white/[0.04]"
          style={{
            left: '74.10%',
            top: '92.20%',
            width: '18.00%',
            height: '1.50%',
          }}
          aria-label="Telefone (24) 99999-9999"
          title="Ligar para (24) 99999-9999"
        >
          <span className="sr">(24) 99999-9999</span>
        </a>

        {/* Coluna 3 - Link 3: 'Painel Administrativo do Barbeiro' */}
        <button
          type="button"
          onClick={() => setAdminOpen(true)}
          className="h rounded cursor-pointer transition-all duration-200 hover:ring-1 hover:ring-amber-400/50 hover:bg-white/[0.04]"
          style={{
            left: '74.10%',
            top: '93.91%',
            width: '25.00%',
            height: '1.01%',
          }}
          aria-label="Painel Administrativo do Barbeiro"
          title="Acessar Painel Administrativo"
        >
          <span className="sr">Painel Administrativo do Barbeiro</span>
        </button>
      </main>

      {/* Barra flutuante de ações rápidas, discreta e elegante */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-2 bg-[#161619]/90 backdrop-blur-md border border-neutral-700/60 rounded-full p-1.5 px-3 sm:px-4 shadow-2xl transition-transform hover:scale-102">
        <button
          type="button"
          onClick={() => handleOpenBookingWithService()}
          className="flex items-center gap-1.5 sm:gap-2 text-xs uppercase tracking-wider font-semibold bg-white text-black hover:bg-neutral-200 transition-colors px-3 py-1.5 rounded-full cursor-pointer shadow-md"
        >
          <Calendar className="w-3.5 h-3.5 text-neutral-900" />
          <span>Agendar</span>
        </button>

        <button
          type="button"
          onClick={() => setServicesOpen(true)}
          className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white px-2.5 py-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title="Ver tabela completa de serviços"
        >
          <Scissors className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Serviços</span>
        </button>

        <button
          type="button"
          onClick={() => setConsultOpen(true)}
          className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white px-2.5 py-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title="Consultar agendamento existente"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Consultar</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminOpen(true)}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-amber-400 px-2 py-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title="Painel Administrativo do Barbeiro"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="sr">Painel</span>
        </button>
      </div>

      {/* Gaveta interativa de Agendamento */}
      <BookingDrawer
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        services={services}
        preselectedServiceId={selectedServiceId}
        initialDay={selectedDay}
        initialTime={selectedTime}
        onBookingComplete={handleDataChanged}
      />

      {/* Modal de Consulta e Cancelamento de Agendamento */}
      <ConsultAppointmentModal
        isOpen={consultOpen}
        onClose={() => setConsultOpen(false)}
      />

      {/* Modal de Tabela de Serviços e Visagismo */}
      <ServicesModal
        isOpen={servicesOpen}
        onClose={() => setServicesOpen(false)}
        services={services}
        onSelectServiceForBooking={(serviceId) => {
          setServicesOpen(false);
          handleOpenBookingWithService(serviceId);
        }}
      />

      {/* Painel Administrativo do Barbeiro */}
      <BarberAdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        onDataChanged={handleDataChanged}
      />
    </div>
  );
}
