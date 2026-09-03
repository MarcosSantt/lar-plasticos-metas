/**
 * Constroi a serie de burn-up (acumulado) para um alvo e um realizado.
 *
 * Se `serieReal` (lancamentos diarios consolidados) for informada, o realizado
 * acumulado usa os dados reais dia a dia. Senao, e estimado de forma linear
 * ate o dia corrente (media diaria).
 *
 * A projecao segue a media diaria realizada ate o fim do periodo (e um pouco
 * alem, para mostrar quando a meta seria batida).
 *
 * @param {object} p
 * @param {number} p.meta              alvo (nova meta)
 * @param {number} p.realizado         total realizado ate hoje
 * @param {number} p.diasUteisTotais   dias uteis do periodo
 * @param {number} p.diasDecorridos    dias uteis ja transcorridos
 * @param {Array}  [p.serieReal]       [{ dia, acum, futuro }] consolidado real
 */
export function construirBurnup({
  meta,
  realizado,
  diasUteisTotais,
  diasDecorridos,
  serieReal = null,
}) {
  const totais = Math.max(diasUteisTotais, 1);
  const decorridos = Math.min(Math.max(diasDecorridos, 0), totais);
  const metaDiaria = meta / totais;

  const temReal = Array.isArray(serieReal) && serieReal.length > 0;
  const realAcumHoje = temReal
    ? serieReal.filter((p) => !p.futuro).reduce((max, p) => Math.max(max, p.acum), 0)
    : realizado;

  const mediaDiaria = decorridos > 0 ? realAcumHoje / decorridos : 0;
  const diaPrevisto = mediaDiaria > 0 ? meta / mediaDiaria : Infinity;
  const atingeNoPrazo = Number.isFinite(diaPrevisto) && diaPrevisto <= totais;

  const limite = Math.min(
    Math.max(totais, Number.isFinite(diaPrevisto) ? Math.ceil(diaPrevisto) : totais),
    Math.ceil(totais * 1.5),
  );

  const acumRealPorDia = temReal
    ? new Map(serieReal.filter((p) => !p.futuro).map((p) => [p.dia, p.acum]))
    : null;

  const serie = [];
  for (let d = 0; d <= limite; d++) {
    const ponto = { dia: d, ideal: Math.min(metaDiaria * d, meta) };

    if (d <= decorridos) {
      ponto.realizado =
        acumRealPorDia && acumRealPorDia.has(d)
          ? acumRealPorDia.get(d)
          : d === 0
            ? 0
            : mediaDiaria * d;
    }
    if (d >= decorridos) ponto.projecao = realAcumHoje + mediaDiaria * (d - decorridos);
    serie.push(ponto);
  }

  return {
    serie,
    meta,
    metaDiaria,
    mediaDiaria,
    diaPrevisto,
    atingeNoPrazo,
    diasUteisTotais: totais,
    diasDecorridos: decorridos,
    real: temReal,
  };
}
