import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { useMetas } from '../context/MetasContext.jsx';
import { salvarProporcoes, resetarProporcoes } from '../api.js';
import { brl, brlCompacto, pct, brlComSinal } from '../utils/format.js';
import ChartCard from '../components/charts/ChartCard.jsx';
import PizzaVendedores from '../components/charts/PizzaVendedores.jsx';
import TooltipBRL from '../components/charts/TooltipBRL.jsx';
import { COR_PRIMARIA, COR_ALERTA, COR_CRITICO, COR_TRILHA, eixoBRL } from '../components/charts/paleta.js';

const corStatus = (p) => (p >= 1 ? COR_PRIMARIA : p >= 0.6 ? COR_ALERTA : COR_CRITICO);
const arred2 = (n) => Math.round(n * 100) / 100;

export default function EquipePage() {
  const { id } = useParams();
  const { resultado, recalcular } = useMetas();
  const equipe = resultado?.equipes.find((e) => e.id === id);

  // ----- edicao das fatias (%) -----
  const [fatias, setFatias] = useState(null); // { membroId: fracao 0..1 }
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  const membrosBrutos = useMemo(() => equipe?.membros ?? [], [equipe]);
  const fatiaPadrao = useMemo(() => {
    const soma = membrosBrutos.reduce((s, m) => s + (m.metaAntiga || 0), 0);
    const mapa = {};
    for (const m of membrosBrutos) {
      mapa[m.id] = soma > 0 ? m.metaAntiga / soma : 1 / (membrosBrutos.length || 1);
    }
    return mapa;
  }, [membrosBrutos]);

  useEffect(() => {
    if (!equipe || equipe.semMembros) {
      setFatias(null);
      return;
    }
    const mapa = {};
    for (const m of equipe.membros) mapa[m.id] = m.proporcao ?? 0;
    setFatias(mapa);
    setMsg('');
    setErro('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!resultado) return <div className="skeleton">Sem dados.</div>;
  if (!equipe) {
    return (
      <div className="pagina">
        <p>Equipe nao encontrada. <Link to="/equipes">Voltar</Link></p>
      </div>
    );
  }

  const semMembros = equipe.semMembros || (equipe.membros?.length ?? 0) === 0;
  const membros = (equipe.membros ?? []).map((m) => ({
    ...m,
    equipeNome: equipe.nome,
    nomeCurto: m.nome.split(' ')[0] + ' ' + (m.nome.split(' ')[1]?.[0] ?? '') + '.',
    pct: m.execucao?.pctAtingido ?? 0,
  }));
  const ex = equipe.execucao;

  // Ajusta a fatia de um membro; o restante e redistribuido entre os outros
  // proporcionalmente as fatias atuais deles (somando sempre 100%).
  const ajustarFatia = (idAlvo, pctTexto) => {
    setMsg('');
    const novo = Math.min(Math.max((Number(pctTexto) || 0) / 100, 0), 1);
    const outros = membros.map((m) => m.id).filter((x) => x !== idAlvo);
    const somaOutros = outros.reduce((s, x) => s + (fatias[x] ?? 0), 0);
    const resto = 1 - novo;
    const prox = { [idAlvo]: novo };
    if (somaOutros <= 1e-9) {
      outros.forEach((x) => (prox[x] = outros.length ? resto / outros.length : 0));
    } else {
      outros.forEach((x) => (prox[x] = (fatias[x] ?? 0) * (resto / somaOutros)));
    }
    setFatias(prox);
  };

  const somaFatias = fatias ? Object.values(fatias).reduce((s, v) => s + v, 0) : 1;
  const alterado =
    fatias && membros.some((m) => Math.abs((fatias[m.id] ?? 0) - (m.proporcao ?? 0)) > 1e-6);

  const aplicar = async () => {
    setSalvando(true);
    setErro('');
    setMsg('');
    try {
      await salvarProporcoes(equipe.id, fatias);
      await recalcular();
      setMsg('Fatias salvas. Metas recalculadas.');
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const restaurar = async () => {
    setSalvando(true);
    setErro('');
    setMsg('');
    try {
      await resetarProporcoes(equipe.id);
      await recalcular();
      setFatias({ ...fatiaPadrao });
      setMsg('Fatias voltaram a proporcao pela meta antiga.');
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="pagina">
      <div className="pagina-head">
        <h2>{equipe.nome}</h2>
        <p>
          <Link to="/equipes">Equipes</Link> / detalhamento &middot;{' '}
          {equipe.regiao ? `${equipe.regiao} · ` : ''}
          {semMembros ? 'equipe sem membros' : `${membros.length} membros`}
          {equipe.proporcoesManuais && <span className="tag-manual">fatias ajustadas manualmente</span>}
        </p>
      </div>

      <div className="kpi-grid">
        <div className="stat destaque">
          <div className="rotulo">Nova meta da equipe</div>
          <div className="valor">{brlCompacto(equipe.novaMeta)}</div>
          <div className="sub">antes {brlCompacto(equipe.metaAntiga)} ({brlComSinal(equipe.variacao)})</div>
        </div>
        <div className="stat">
          <div className="rotulo">Realizado</div>
          <div className="valor">{brlCompacto(equipe.realizado)}</div>
          <div className="sub">{pct(ex.pctAtingido)} da meta</div>
        </div>
        <div className="stat">
          <div className="rotulo">Falta vender</div>
          <div className="valor">{brlCompacto(ex.restante)}</div>
          <div className="sub">ritmo {brlCompacto(ex.ritmoDiarioNecessario)}/dia</div>
        </div>
        <div className="stat">
          <div className={`valor${ex.atingeMetaNoRitmo ? '' : ' negativo'}`}>
            {ex.atingeMetaNoRitmo ? 'No ritmo' : 'Abaixo do ritmo'}
          </div>
          <div className="rotulo">Projecao</div>
          <div className="sub">{brlCompacto(ex.projecaoFimPeriodo)} previstos</div>
        </div>
      </div>

      {semMembros && (
        <div className="card" style={{ padding: 20, color: 'var(--texto-suave)', fontSize: 14 }}>
          Esta equipe nao tem membros cadastrados &mdash; e uma linha unica com meta e
          realizado proprios.
        </div>
      )}

      {!semMembros && fatias && (
        <div className="card">
          <div className="card-titulo">
            Fatia de cada vendedor na meta da equipe
            <span className="card-titulo-sub">
              &nbsp;&mdash; edite um % e os outros se ajustam para somar 100%
            </span>
          </div>
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th className="num" style={{ width: 140 }}>Fatia (%)</th>
                  <th className="num">Nova meta resultante</th>
                  <th className="num">Δ vs. atual</th>
                </tr>
              </thead>
              <tbody>
                {membros.map((m) => {
                  const f = fatias[m.id] ?? 0;
                  const novaMetaPrev = f * equipe.novaMeta;
                  return (
                    <tr key={m.id}>
                      <td className="forte">{m.nome}</td>
                      <td className="num">
                        <input
                          className="input-pct"
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={arred2(f * 100)}
                          onChange={(e) => ajustarFatia(m.id, e.target.value)}
                        />
                      </td>
                      <td className="num mono">{brl(novaMetaPrev)}</td>
                      <td className={`num mono ${novaMetaPrev - m.novaMeta >= 0 ? 'pos' : 'neg'}`}>
                        {brlComSinal(novaMetaPrev - m.novaMeta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="forte">Total</td>
                  <td className="num mono forte">{(somaFatias * 100).toFixed(2)}%</td>
                  <td className="num mono forte">{brl(somaFatias * equipe.novaMeta)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="import-acoes">
            <button className="botao" onClick={aplicar} disabled={!alterado || salvando}>
              {salvando ? 'Salvando...' : 'Salvar fatias'}
            </button>
            <button className="link-btn" onClick={restaurar} disabled={salvando}>
              Restaurar (proporcao pela meta antiga)
            </button>
          </div>
          {msg && <div className="import-ok" style={{ marginTop: 10 }}>{msg}</div>}
          {erro && <div className="erro" style={{ marginTop: 10 }}>{erro}</div>}
        </div>
      )}

      {!semMembros && (
      <>
      <div className="chart-grid">
        <ChartCard titulo="Participacao dos membros" subtitulo="fatia na meta da equipe" altura={320}>
          <PizzaVendedores vendedores={membros} />
        </ChartCard>

        <ChartCard titulo="Meta x realizado por membro" subtitulo="valores em R$ sobre cada barra" altura={340}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={membros} margin={{ left: 4, right: 8, top: 22, bottom: 72 }}>
              <CartesianGrid vertical={false} stroke={COR_TRILHA} />
              <XAxis
                dataKey="nomeCurto"
                angle={-40}
                textAnchor="end"
                interval={0}
                height={72}
                tick={{ fontSize: 10 }}
              />
              <YAxis tickFormatter={eixoBRL} tick={{ fontSize: 11 }} width={70} />
              <Tooltip content={<TooltipBRL />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="novaMeta" name="Nova meta" fill={COR_TRILHA} radius={[3, 3, 0, 0]}>
                <LabelList
                  dataKey="novaMeta"
                  position="top"
                  formatter={(v) => brlCompacto(v)}
                  style={{ fontSize: 9, fill: 'var(--texto-suave)', fontWeight: 600 }}
                />
              </Bar>
              <Bar dataKey="realizado" name="Realizado" radius={[3, 3, 0, 0]}>
                {membros.map((m) => (
                  <Cell key={m.id} fill={corStatus(m.pct)} />
                ))}
                <LabelList
                  dataKey="realizado"
                  position="top"
                  formatter={(v) => brlCompacto(v)}
                  style={{ fontSize: 9, fill: '#2f3640', fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="card">
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Membro</th>
                <th className="num">Proporcao</th>
                <th className="num">Nova meta</th>
                <th className="num">Realizado</th>
                <th className="num">% atingido</th>
                <th className="num">Meta/dia</th>
                <th className="num">Ritmo p/ fechar</th>
              </tr>
            </thead>
            <tbody>
              {membros.map((m) => (
                <tr key={m.id}>
                  <td className="forte">{m.nome}</td>
                  <td className="num mono">
                    {pct(m.proporcao)}
                    {m.proporcaoManual && <span className="ponto-manual" title="fatia manual" />}
                  </td>
                  <td className="num mono">{brl(m.novaMeta)}</td>
                  <td className="num mono">{brl(m.realizado)}</td>
                  <td className="num mono">{pct(m.pct)}</td>
                  <td className="num mono">{brlCompacto(m.execucao?.metaDiaria ?? 0)}</td>
                  <td className="num mono">{brlCompacto(m.execucao?.ritmoDiarioNecessario ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
