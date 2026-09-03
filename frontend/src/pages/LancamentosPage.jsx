import { useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from 'recharts';
import { useMetas } from '../context/MetasContext.jsx';
import { getVendas, putVenda } from '../api.js';
import { brl, brlCompacto, pct } from '../utils/format.js';
import { agruparPorSemana } from '../utils/semana.js';
import ChartCard from '../components/charts/ChartCard.jsx';
import TooltipBRL from '../components/charts/TooltipBRL.jsx';
import { COR_PRIMARIA, COR_ALERTA, COR_TRILHA, eixoBRL } from '../components/charts/paleta.js';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotuloDia = (iso) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${MESES[m - 1]}`;
};
const primeiroNome = (nome) => nome.split(' ')[0];

/** Le "1.234,56" / "R$ 1.234,56" / "1234.56" -> numero. */
function lerValorBR(texto) {
  const limpo = String(texto).replace(/[^\d,.-]/g, '');
  if (!limpo) return 0;
  if (limpo.includes(',')) return Number(limpo.replace(/\./g, '').replace(',', '.'));
  return Number(limpo);
}

/** Celula editavel: mostra R$ formatado; ao focar, vira numero puro para digitar. */
const CelulaValor = memo(function CelulaValor({ valor, onChange, className, titulo }) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState('');
  const n = Number(valor) || 0;
  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      title={titulo}
      value={editando ? rascunho : n ? brl(n) : ''}
      onFocus={() => {
        setRascunho(n ? String(n) : '');
        setEditando(true);
      }}
      onBlur={() => setEditando(false)}
      onChange={(e) => {
        setRascunho(e.target.value);
        onChange(e.target.value);
      }}
      placeholder="R$ 0"
    />
  );
});

export default function LancamentosPage() {
  const { resultado, recalcularSilencioso } = useMetas();
  const [dias, setDias] = useState([]);
  const [hoje, setHoje] = useState(null);
  const [vendas, setVendas] = useState({});
  const [realizadoMensal, setRealizadoMensal] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const pendentes = useRef(new Map());
  const timer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await getVendas();
        setDias(d.dias || []);
        setHoje(d.hoje || null);
        setVendas(d.vendasDiarias || {});
        setRealizadoMensal(d.realizadoMensal || {});
      } catch (e) {
        setErro(e.message);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const periodo = resultado?.parametros.periodo;
  const diasFaltam = periodo ? Math.max(periodo.diasRestantes, 1) : 1;
  const semanas = useMemo(() => agruparPorSemana(dias), [dias]);

  // Linhas: equipes com lancamentoDiario -> seus membros (ou a propria equipe se sem membros)
  const linhas = useMemo(() => {
    if (!resultado) return [];
    const out = [];
    for (const e of resultado.equipes.filter((x) => x.lancamentoDiario)) {
      if (e.semMembros) {
        out.push({ id: e.id, nome: e.nome, equipe: e.nome, novaMeta: e.novaMeta });
      } else {
        for (const m of e.membros) {
          out.push({ id: m.id, nome: m.nome, equipe: e.nome, novaMeta: m.novaMeta });
        }
      }
    }
    return out;
  }, [resultado]);

  const totalLinha = (id) =>
    dias.reduce((acc, d) => acc + (Number(vendas[id]?.[d]) || 0), 0);

  // Enriquece cada linha com realizado/%/nova meta diaria (client-side, ao vivo)
  const linhasCalc = useMemo(
    () =>
      linhas.map((l) => {
        const somaDias = totalLinha(l.id);
        const mensal = realizadoMensal[l.id]?.valor ?? null;
        const realizado = mensal != null ? mensal : somaDias;
        return {
          ...l,
          realizado,
          realizadoMes: mensal,
          somaDias,
          origemMensal: mensal != null,
          pctAtingido: l.novaMeta > 0 ? realizado / l.novaMeta : 0,
          novaMetaDiaria: (l.novaMeta - realizado) / diasFaltam,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linhas, vendas, dias, diasFaltam, realizadoMensal],
  );

  const totalColunaDia = (d) => linhas.reduce((acc, l) => acc + (Number(vendas[l.id]?.[d]) || 0), 0);
  const totalRealizado = linhasCalc.reduce((acc, l) => acc + l.realizado, 0);
  const totalRealizadoMes = linhasCalc.reduce((acc, l) => acc + (l.realizadoMes || 0), 0);
  const totalSomaDias = linhasCalc.reduce((acc, l) => acc + l.somaDias, 0);
  const totalMeta = linhasCalc.reduce((acc, l) => acc + l.novaMeta, 0);

  const flush = async () => {
    const itens = [...pendentes.current.entries()];
    pendentes.current.clear();
    if (!itens.length) return;
    setSalvando(true);
    try {
      await Promise.all(
        itens.map(([chave, valor]) => {
          const [id, data] = chave.split('|');
          return putVenda(id, data, Number(valor) || 0);
        }),
      );
      await recalcularSilencioso();
      setErro('');
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const editar = (id, data, texto) => {
    const valor = texto === '' ? 0 : lerValorBR(texto);
    if (Number.isNaN(valor)) return;
    setVendas((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [data]: texto === '' ? undefined : valor },
    }));
    pendentes.current.set(`${id}|${data}`, valor);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };

  if (carregando) return <div className="skeleton">Carregando lancamentos...</div>;
  if (!resultado) return <div className="skeleton">Sem dados.</div>;

  const totalColSpan = 6 + dias.length;

  const ranking = [...linhasCalc].sort((a, b) => b.pctAtingido - a.pctAtingido);
  const chartData = [...linhasCalc]
    .sort((a, b) => b.realizado - a.realizado)
    .map((l) => ({
      nome: primeiroNome(l.nome),
      Realizado: Math.round(l.realizado),
      'Nova meta diaria': Math.round(l.novaMetaDiaria),
    }));

  return (
    <div className="pagina">
      <div className="pagina-head">
        <h2>Lancamentos Diarios &mdash; {periodo.rotulo}</h2>
        <p>
          Todas as equipes. <strong>Realizado no mes</strong> vem do PDF acumulado;{' '}
          <strong>Soma dos dias</strong> e a soma das celulas de cada dia (PDF diario ou
          digitado). Valores em R$. Quando ha total do mes importado, ele prevalece no
          calculo de %/meta diaria.{' '}
          {salvando && <strong>salvando...</strong>}
        </p>
        {erro && <div className="erro" style={{ maxWidth: 400 }}>{erro}</div>}
      </div>

      <div className="kpi-grid" style={{ maxWidth: 560 }}>
        <div className="stat">
          <div className="rotulo">Dias uteis</div>
          <div className="valor">{periodo.diasUteisTotais}</div>
        </div>
        <div className="stat">
          <div className="rotulo">Dias trabalhados</div>
          <div className="valor">{periodo.diasDecorridos}</div>
        </div>
        <div className="stat destaque">
          <div className="rotulo">Dias que faltam</div>
          <div className="valor">{diasFaltam}</div>
        </div>
      </div>

      <div className="card">
        <div className="lanc-wrap">
          <table className="tabela lanc">
            <thead>
              <tr>
                <th className="lanc-col-nome" rowSpan={2}>
                  Vendedor
                </th>
                <th className="num" rowSpan={2}>
                  Meta do mes
                </th>
                <th className="num" rowSpan={2}>
                  Realizado no mes
                  <span className="lanc-th-sub">PDF acumulado</span>
                </th>
                <th className="num" rowSpan={2}>
                  Soma dos dias
                  <span className="lanc-th-sub">celulas abaixo</span>
                </th>
                <th className="num" rowSpan={2}>
                  Nova meta diaria
                </th>
                <th className="num lanc-sep" rowSpan={2}>
                  %
                </th>
                {semanas.map((s) => (
                  <th key={s.semana} className="num lanc-semana" colSpan={s.dias.length}>
                    Semana {s.semana}
                  </th>
                ))}
              </tr>
              <tr>
                {dias.map((d) => (
                  <th
                    key={d}
                    className={`num lanc-col-dia${d === hoje ? ' hoje' : ''}${d > hoje ? ' futuro' : ''}`}
                  >
                    {rotuloDia(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agruparEquipes(linhasCalc).map((grupo) => (
                <FragmentoEquipe
                  key={grupo.equipe}
                  grupo={grupo}
                  dias={dias}
                  hoje={hoje}
                  totalColSpan={totalColSpan}
                  vendas={vendas}
                  editar={editar}
                />
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="lanc-col-nome forte">Total</td>
                <td className="num mono forte">{brl(totalMeta)}</td>
                <td className="num mono forte">{totalRealizadoMes ? brl(totalRealizadoMes) : '-'}</td>
                <td className="num mono forte">{brl(totalSomaDias)}</td>
                <td className="num mono forte">
                  {brl((totalMeta - totalRealizado) / diasFaltam)}
                </td>
                <td className="num mono forte lanc-sep">
                  {pct(totalMeta ? totalRealizado / totalMeta : 0)}
                </td>
                {dias.map((d) => (
                  <td key={d} className={`num mono${d === hoje ? ' hoje' : ''}`}>
                    {totalColunaDia(d) ? brl(totalColunaDia(d)) : '-'}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="chart-grid" style={{ marginTop: 18 }}>
        <ChartCard
          titulo="Nova meta diaria x Realizado"
          subtitulo="por vendedor - barra negativa = ja passou da meta"
          altura={360}
          className="chart-largo"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 8, right: 12, top: 24, bottom: 48 }}>
              <CartesianGrid vertical={false} stroke={COR_TRILHA} />
              <XAxis dataKey="nome" angle={-30} textAnchor="end" interval={0} height={50} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={eixoBRL} tick={{ fontSize: 11 }} width={72} />
              <ReferenceLine y={0} stroke="#9aa7b0" />
              <Tooltip content={<TooltipBRL />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Realizado" fill={COR_PRIMARIA} radius={[3, 3, 0, 0]}>
                <LabelList
                  dataKey="Realizado"
                  position="top"
                  formatter={(v) => brlCompacto(v)}
                  style={{ fontSize: 10, fill: '#2f3640', fontWeight: 600 }}
                />
              </Bar>
              <Bar dataKey="Nova meta diaria" fill={COR_ALERTA} radius={[3, 3, 0, 0]}>
                <LabelList
                  dataKey="Nova meta diaria"
                  position="top"
                  formatter={(v) => brlCompacto(v)}
                  style={{ fontSize: 10, fill: '#8a5a00', fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-titulo">Ranking &mdash; % da meta atingida</div>
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th className="col-rank">#</th>
                <th>Vendedor</th>
                <th>Equipe</th>
                <th className="num">Nova meta diaria</th>
                <th className="num">Realizado</th>
                <th className="num">% da meta atingida</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((l, i) => (
                <tr key={l.id}>
                  <td className="col-rank">{i + 1}</td>
                  <td className="forte">{l.nome}</td>
                  <td>{l.equipe}</td>
                  <td className={`num mono ${l.novaMetaDiaria < 0 ? 'pos' : ''}`}>
                    {brl(l.novaMetaDiaria)}
                  </td>
                  <td className="num mono">{brl(l.realizado)}</td>
                  <td className="num mono forte">{pct(l.pctAtingido)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function agruparEquipes(linhasCalc) {
  const mapa = new Map();
  for (const l of linhasCalc) {
    if (!mapa.has(l.equipe)) mapa.set(l.equipe, []);
    mapa.get(l.equipe).push(l);
  }
  return [...mapa.entries()].map(([equipe, linhas]) => ({ equipe, linhas }));
}

function FragmentoEquipe({ grupo, dias, hoje, totalColSpan, vendas, editar }) {
  return (
    <>
      <tr className="lanc-equipe">
        <td colSpan={totalColSpan}>{grupo.equipe}</td>
      </tr>
      {grupo.linhas.map((l) => (
        <tr key={l.id}>
          <td className="lanc-col-nome forte">{l.nome}</td>
          <td className="num mono">{brl(l.novaMeta)}</td>
          <td className={`num mono ${l.origemMensal ? 'forte' : 'lanc-vazio'}`}>
            {l.realizadoMes != null ? brl(l.realizadoMes) : '-'}
          </td>
          <td className="num mono">{l.somaDias ? brl(l.somaDias) : '-'}</td>
          <td className={`num mono ${l.novaMetaDiaria < 0 ? 'pos' : ''}`}>
            {brl(l.novaMetaDiaria)}
          </td>
          <td className="num mono lanc-sep">{pct(l.pctAtingido)}</td>
          {dias.map((d) => (
            <td key={d} className={`lanc-cel${d === hoje ? ' hoje' : ''}${d > hoje ? ' futuro' : ''}`}>
              <CelulaValor
                valor={vendas[l.id]?.[d]}
                onChange={(txt) => editar(l.id, d, txt)}
                titulo={`${l.nome} - ${d}`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
