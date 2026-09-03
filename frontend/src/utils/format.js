const fmtBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const fmtBRLcompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const fmtPct = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const brl = (valor) => fmtBRL.format(Number(valor) || 0);
export const brlCompacto = (valor) => fmtBRLcompact.format(Number(valor) || 0);
export const pct = (valor) => fmtPct.format(Number(valor) || 0);

export const brlComSinal = (valor) => {
  const n = Number(valor) || 0;
  const sinal = n > 0 ? '+' : '';
  return sinal + fmtBRL.format(n);
};

/** Converte texto digitado no padrao BR ("19.500.000" ou "19.500.000,50") em numero. */
export const parseValorBR = (texto) => {
  if (typeof texto === 'number') return texto;
  const limpo = String(texto ?? '')
    .replace(/[^\d,]/g, '')
    .replace(',', '.');
  return Number(limpo);
};
