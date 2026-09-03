import { useMetas, listarVendedores } from '../context/MetasContext.jsx';
import KpiCards from '../components/KpiCards.jsx';
import ChartCard from '../components/charts/ChartCard.jsx';
import PizzaParticipacao from '../components/charts/PizzaParticipacao.jsx';
import ParticipacaoEquipes from '../components/charts/ParticipacaoEquipes.jsx';
import ProgressoEquipes from '../components/charts/ProgressoEquipes.jsx';
import MetaDiariaVendedores from '../components/charts/MetaDiariaVendedores.jsx';
import MetaDiariaEquipes from '../components/charts/MetaDiariaEquipes.jsx';
import BurnupChart from '../components/charts/BurnupChart.jsx';
import Comemoracao from '../components/Comemoracao.jsx';
import { construirBurnup } from '../utils/burnup.js';

export default function DashboardPage() {
  const { resultado, carregando } = useMetas();

  if (!resultado) {
    return <div className="skeleton">{carregando ? 'Carregando indicadores...' : 'Sem dados.'}</div>;
  }

  const { periodo } = resultado.parametros;
  const exec = resultado.totais.execucaoLancamento ?? resultado.totais.execucao;
  const bateuMeta =
    exec.pctAtingido >= 1 ||
    resultado.totais.totalRealizado >= resultado.parametros.metaGlobal;
  const equipesLanc = resultado.equipes.filter((e) => e.lancamentoDiario);
  const idsLanc = new Set(equipesLanc.map((e) => e.id));
  const vendedoresLanc = listarVendedores(resultado).filter((v) => idsLanc.has(v.equipeId));
  const equipesOutras = resultado.equipes.filter((e) => !e.lancamentoDiario);

  const burnup = construirBurnup({
    meta: resultado.totais.metaLancamento,
    realizado: resultado.totais.realizadoLancamento,
    diasUteisTotais: periodo.diasUteisTotais,
    diasDecorridos: periodo.diasDecorridos,
    serieReal: resultado.serieRealizadoLancamento,
  });

  return (
    <div className="pagina">
      <div className="pagina-head">
        <h2>Dashboard</h2>
        <p>
          Execucao real por lancamento diario / importacao de PDF, para todas as equipes.
        </p>
      </div>

      <Comemoracao ativo={bateuMeta} />

      <KpiCards resultado={resultado} />

      <div className="chart-grid">
        <PizzaParticipacao resultado={resultado} />

        <ChartCard
          titulo="Participacao por regiao"
          subtitulo="fatia de cada regiao na nova meta"
          altura={340}
        >
          <ParticipacaoEquipes equipes={resultado.regioes ?? resultado.equipes} />
        </ChartCard>

        <ChartCard
          titulo="Meta diaria por equipe (para bater a meta)"
          subtitulo="(nova meta - realizado) / dias que faltam - todas as equipes"
          altura={360}
          className="chart-largo"
        >
          <MetaDiariaEquipes equipes={resultado.equipes} />
        </ChartCard>

        <ChartCard
          titulo="Progresso ate a meta - por equipe"
          subtitulo="realizado x quanto falta"
          altura={260}
          className="chart-largo"
        >
          <ProgressoEquipes equipes={equipesLanc} />
        </ChartCard>

        <ChartCard
          titulo="Forecast / Burn-up - lancamento diario"
          subtitulo={
            burnup.atingeNoPrazo
              ? `no ritmo atual a meta e batida por volta do dia util ${Math.round(burnup.diaPrevisto)} de ${burnup.diasUteisTotais}`
              : Number.isFinite(burnup.diaPrevisto)
                ? `no ritmo atual a meta so seria batida no dia util ${Math.round(burnup.diaPrevisto)} (apos o fim do periodo)`
                : 'sem realizado suficiente para projetar'
          }
          altura={340}
          className="chart-largo"
        >
          <BurnupChart burnup={burnup} />
        </ChartCard>

        <ChartCard
          titulo="Quanto vender por dia - vendedores (lancamento diario)"
          subtitulo="ritmo ideal x ritmo necessario para fechar no prazo"
          altura={340}
          className="chart-largo"
        >
          <MetaDiariaVendedores vendedores={vendedoresLanc} />
        </ChartCard>
      </div>
    </div>
  );
}
