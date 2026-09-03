// Paleta corporativa Lar Plasticos - verdes na frente, apoio em azul/roxo/ambar.
export const PALETA = [
  '#2ecc71',
  '#16a085',
  '#3498db',
  '#9b59b6',
  '#f39c12',
  '#27ae60',
  '#1abc9c',
  '#2980b9',
  '#8e44ad',
  '#e67e22',
  '#34495e',
  '#7f8c8d',
];

export const corPorIndice = (i) => PALETA[i % PALETA.length];

export const COR_PRIMARIA = '#2ecc71';
export const COR_PRIMARIA_ESCURA = '#27ae60';
export const COR_ALERTA = '#f39c12';
export const COR_CRITICO = '#e74c3c';
export const COR_TRILHA = '#e7ebee';

// Formata valores grandes de forma compacta para eixos (R$ 1,2 mi)
export const eixoBRL = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return `R$ ${n.toLocaleString('pt-BR')}`;
};
