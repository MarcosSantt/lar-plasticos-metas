import { useEffect, useMemo, useRef, useState } from 'react';
import { useMetas } from '../context/MetasContext.jsx';
import { redistribuir } from '../api.js';
import { brl, brlCompacto, brlComSinal, pct, parseValorBR } from '../utils/format.js';
import ChartCard from '../components/charts/ChartCard.jsx';
import BurnupChart from '../components/charts/BurnupChart.jsx';
import { construirBurnup } from '../utils/burnup.js';

export default function SimuladorPage() {
  const { config, resultado, metaGlobalInput, setMetaGlobalInput, recalcular } = useMetas();

  const metaAtual = resultado?.parametros.metaGlobal ?? 0;
  const [metaSim, setMetaSim] = useState(metaAtual);
  const [sim, setSim] = useState(resultado);
  const [carregando, setCarregando] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (metaAtual && !metaSim) setMetaSim(metaAtual);
  }, [metaAtual, metaSim]);

  // Recalcula (debounce) sempre que a meta simulada muda.
  useEffect(() => {
    if (!metaSim || metaSim <= 0) return;
    clearTimeout(timer.current);
    setCarregando(true);
    timer.current = setTimeout(async () => {
      try {
        const dados = await redistribuir(metaSim);
        setSim(dados);
      } finally {
        setCarregando(false);
      }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [metaSim]);

  const { min, max } = useMemo(() => {
    const base = config?.montanteBaseAntigo ?? 18_948_000;
    return { min: Math.round(base * 0.6), max: Math.round(base * 1.5) };
  }, [config]);

  const linhas = useMemo(() => {
    if (!sim || !resultado) return [];
    return sim.equipes.map((e) => {
      const atual = resultado.equipes.find((x) => x.id === e.id);
      return {
        id: e.id,
        nome: e.nome,
        atual: atual?.novaMeta ?? 0,
        simulada: e.novaMeta,
        delta: e.novaMeta - (atual?.novaMeta ?? 0),
        pctAtingidoSim: e.execucao?.pctAtingido ?? 0,
      };
    });
  }, [sim, resultado]);

  const burnup = sim
    ? construirBurnup({
        meta: sim.totais.totalNovoEquipes,
        realizado: sim.totais.totalRealizado,
        diasUteisTotais: sim.parametros.periodo.diasUteisTotais,
        diasDecorridos: sim.parametros.periodo.diasDecorridos,
      })
    : null;

  const deltaTotal = sim && resultado ? sim.totais.totalNovoEquipes - resultado.totais.totalNovoEquipes : 0;
  const aplicado = parseValorBR(metaGlobalInput) === metaSim;

  return (
    <div className="pagina">
      <div className="pagina-head">
        <h2>Simulador "e se"</h2>
        <p>Arraste a Meta Global e veja o impacto por equipe antes de aplicar.</p>
      </div>

      <div className="card simulador-controle">
        <div className="simulador-valor">
          <span className="rotulo">Meta Global simulada</span>
          <strong>{brl(metaSim)}</strong>
          <span className="sub">
            atual {brlCompacto(metaAtual)} &middot;{' '}
            <span className={deltaTotal >= 0 ? 'pos' : 'neg'}>
              {brlComSinal(deltaTotal)} no total das equipes
            </span>
            {carregando && ' · calculando...'}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={100_000}
          value={Math.min(Math.max(metaSim, min), max)}
          onChange={(e) => setMetaSim(Number(e.target.value))}
          className="slider"
        />
        <div className="simulador-acoes">
          <input
            type="text"
            inputMode="numeric"
            value={metaSim}
            onChange={(e) => setMetaSim(parseValorBR(e.target.value) || 0)}
          />
          <button
            className="botao"
            type="button"
            disabled={aplicado}
            onClick={() => {
              setMetaGlobalInput(String(metaSim));
              recalcular();
            }}
          >
            {aplicado ? 'Aplicado' : 'Aplicar como Meta Global'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Equipe</th>
                <th className="num">Meta atual</th>
                <th className="num">Meta simulada</th>
                <th className="num">Variacao</th>
                <th className="num">% atingido (sim.)</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id}>
                  <td className="forte">{l.nome}</td>
                  <td className="num mono">{brl(l.atual)}</td>
                  <td className="num mono">{brl(l.simulada)}</td>
                  <td className={`num mono ${l.delta >= 0 ? 'pos' : 'neg'}`}>
                    {brlComSinal(l.delta)}
                  </td>
                  <td className="num mono">{pct(l.pctAtingidoSim)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {burnup && (
        <div className="chart-grid" style={{ marginTop: 18 }}>
          <ChartCard
            titulo="Burn-up com a meta simulada"
            subtitulo={
              burnup.atingeNoPrazo
                ? `bate a meta por volta do dia util ${Math.round(burnup.diaPrevisto)}`
                : 'nao bate a meta dentro do periodo no ritmo atual'
            }
            altura={340}
            className="chart-largo"
          >
            <BurnupChart burnup={burnup} />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
