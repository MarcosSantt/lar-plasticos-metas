import { brl, brlCompacto, pct, brlComSinal } from '../utils/format.js';

export default function KpiCards({ resultado }) {
  if (!resultado) return null;
  const { parametros, totais } = resultado;
  // Execucao consolidada considera apenas as equipes com lancamento diario.
  const ex = totais.execucaoLancamento ?? totais.execucao;

  // "Falta vender" e o % sao comparados direto com a Meta Global.
  const realizado = totais.realizadoLancamento ?? totais.totalRealizado;
  const faltaParaMetaGlobal = Math.max(parametros.metaGlobal - realizado, 0);
  const pctMetaGlobal = parametros.metaGlobal > 0 ? realizado / parametros.metaGlobal : 0;

  const cards = [
    {
      rotulo: 'Meta Global',
      valor: brlCompacto(parametros.metaGlobal),
      sub: `fator ${parametros.fatorGlobal.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}x`,
      destaque: true,
    },
    {
      rotulo: 'Realizado no periodo',
      valor: brlCompacto(realizado),
      sub: `${pct(pctMetaGlobal)} da Meta Global`,
    },
    {
      rotulo: 'Falta vender',
      valor: brlCompacto(faltaParaMetaGlobal),
      sub: `para a Meta Global - ${parametros.periodo.diasRestantes} dias uteis restantes`,
    },
    {
      rotulo: 'Nova meta diaria',
      valor: brlCompacto(ex.metaDiariaNecessaria ?? ex.ritmoDiarioNecessario),
      sub: `ideal ${brlCompacto(ex.metaDiaria)}/dia`,
    },
    {
      rotulo: 'Projecao no ritmo atual',
      valor: brlCompacto(ex.projecaoFimPeriodo),
      sub: ex.atingeMetaNoRitmo
        ? `sobra ${brlComSinal(ex.gapProjetado)}`
        : `gap ${brlComSinal(ex.gapProjetado)}`,
      status: ex.atingeMetaNoRitmo ? 'ok' : 'ruim',
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((c) => (
        <div key={c.rotulo} className={`stat${c.destaque ? ' destaque' : ''}`}>
          <div className="rotulo">{c.rotulo}</div>
          <div className={`valor${c.status === 'ruim' ? ' negativo' : ''}`}>{c.valor}</div>
          <div className="sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
