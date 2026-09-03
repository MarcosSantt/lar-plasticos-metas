/** Numero ISO da semana (ano*100 + semana) para 'YYYY-MM-DD'. */
function chaveSemana(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = (dt.getDay() + 6) % 7; // segunda = 0
  dt.setDate(dt.getDate() - day + 3); // quinta-feira da semana
  const primeiraQuinta = new Date(dt.getFullYear(), 0, 4);
  const semana =
    1 +
    Math.round(
      ((dt - primeiraQuinta) / 86400000 - 3 + ((primeiraQuinta.getDay() + 6) % 7)) / 7,
    );
  return dt.getFullYear() * 100 + semana;
}

/** Agrupa uma lista ordenada de datas ISO em semanas: [{ semana: 1, dias: [...] }]. */
export function agruparPorSemana(dias) {
  const grupos = [];
  let atual = null;
  let n = 0;
  for (const d of dias) {
    const k = chaveSemana(d);
    if (!atual || atual.k !== k) {
      n += 1;
      atual = { k, semana: n, dias: [] };
      grupos.push(atual);
    }
    atual.dias.push(d);
  }
  return grupos;
}
