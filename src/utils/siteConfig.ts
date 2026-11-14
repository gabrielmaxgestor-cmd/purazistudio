/**
 * Configurações do site em um só lugar.
 * Troque aqui o WhatsApp, telefone e endereço — o site inteiro se atualiza.
 */
export const SITE = {
  name: 'PURAZI Studio',
  tagline: 'Aqui, cada detalhe valoriza sua melhor versão.',

  // ⚠️ TROCAR pelo número real (somente números, com 55 + DDD). Ex.: 5524988887777
  whatsappNumber: '5524999999999',
  phoneDisplay: '(24) 99999-9999',

  address: 'Av. Nilo Peçanha, 1027',
  neighborhood: 'Centro',
  city: 'Valença/RJ',

  instagramUrl: 'https://www.instagram.com/purazistudio/',
  instagramHandle: '@purazistudio',
};

export const MAPS_QUERY = 'Avenida Nilo Peçanha 1027 Valença RJ';
export const MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAPS_QUERY)}`;
export const WAZE_LINK = `https://waze.com/ul?q=${encodeURIComponent(MAPS_QUERY)}&navigate=yes`;
export const MAPS_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(MAPS_QUERY)}&output=embed`;

export const whatsappLink = (text = 'Olá! Vim pelo site do PURAZI Studio.') =>
  `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(text)}`;
