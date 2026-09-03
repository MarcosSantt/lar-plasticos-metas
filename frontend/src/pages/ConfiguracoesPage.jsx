import { useEffect, useMemo, useState } from 'react';
import { useMetas } from '../context/MetasContext.jsx';
import { getPeriodoCompleto } from '../api.js';

const MESES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const DOW = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const capitaliza = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const abrev = (m) => capitaliza(MESES[m].slice(0, 3));

/** Deriva um rotulo legivel a partir das datas de inicio/fim. */
function rotuloDoPeriodo(inicioIso, fimIso) {
  const [ai, mi] = String(inicioIso).split('-').map(Number);
  const [af, mf] = String(fimIso).split('-').map(Number);
  if (!ai || !mi || !af || !mf) return '';
  if (ai === af && mi === mf) return `${capitaliza(MESES[mi - 1])}/${ai}`;
  if (ai === af) return `${abrev(mi - 1)}-${abrev(mf - 1)}/${ai}`;
  return `${abrev(mi - 1)}/${ai}-${abrev(mf - 1)}/${af}`;
}

const ddmm = (iso) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
};

export default function ConfiguracoesPage() {
  const { periodo, atualizarPeriodo } = useMetas();
  const [form, setForm] = useState(null);
  const [dias, setDias] = useState([]);
  const [override, setOverride] = useState({}); // { 'YYYY-MM-DD': true|false }
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (periodo) setForm({ ...periodo });
  }, [periodo]);

  useEffect(() => {
    (async () => {
      try {
        const { dias: d } = await getPeriodoCompleto();
        setDias(d || []);
      } catch (e) {
        setErro(e.message);
      }
    })();
  }, [periodo?.dataInicio, periodo?.dataFim, periodo?.diasUteisTotais]);

  useEffect(() => {
    setOverride({ ...(periodo?.diasOverride || {}) });
  }, [periodo?.diasOverride]);

  const hojeIso = periodo?.hoje;

  const ehUtil = (dia) => {
    if (override[dia.data] === true) return true;
    if (override[dia.data] === false) return false;
    return !dia.fimDeSemana;
  };

  const previsao = useMemo(() => {
    const uteis = dias.filter(ehUtil);
    const decorridos = hojeIso ? uteis.filter((d) => d.data <= hojeIso).length : 0;
    return {
      total: uteis.length,
      decorridos,
      restantes: Math.max(uteis.length - decorridos, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias, override, hojeIso]);

  if (!form) return <div className="skeleton">Carregando...</div>;

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const setData = (campo) => (e) =>
    setForm((f) => {
      const proximo = { ...f, [campo]: e.target.value };
      proximo.rotulo = rotuloDoPeriodo(proximo.dataInicio, proximo.dataFim) || f.rotulo;
      return proximo;
    });

  const alternarDia = (dia) => {
    setMsg('');
    const novoUtil = !ehUtil(dia);
    const padrao = !dia.fimDeSemana;
    setOverride((o) => {
      const prox = { ...o };
      if (novoUtil === padrao) delete prox[dia.data];
      else prox[dia.data] = novoUtil;
      return prox;
    });
  };

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setMsg('');
    setErro('');
    try {
      await atualizarPeriodo({
        rotulo: form.rotulo,
        dataInicio: form.dataInicio,
        dataFim: form.dataFim,
        diasOverride: override,
      });
      setMsg('Periodo salvo. Dias uteis e indicadores recalculados.');
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const qtdAjustes = Object.keys(override).length;

  return (
    <div className="pagina">
      <div className="pagina-head">
        <h2>Configuracoes de Periodo</h2>
        <p>
          Informe o rotulo e as datas. Os dias uteis sao seg&ndash;sex por padrao; abaixo
          voce marca os <strong>feriados</strong> &mdash; clique num dia para alternar entre{' '}
          <strong>trabalha</strong> e <strong>folga</strong> (vale para sabado/domingo tambem).
        </p>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <form className="painel-meta" onSubmit={salvar}>
          <label className="campo">
            <span>Rotulo do periodo (preenchido pelas datas; pode editar)</span>
            <input type="text" value={form.rotulo ?? ''} onChange={set('rotulo')} />
          </label>
          <div className="campo-linha">
            <label className="campo">
              <span>Data inicio</span>
              <input type="date" value={form.dataInicio ?? ''} onChange={setData('dataInicio')} />
            </label>
            <label className="campo">
              <span>Data fim</span>
              <input type="date" value={form.dataFim ?? ''} onChange={setData('dataFim')} />
            </label>
          </div>

          <div className="periodo-derivado">
            <div>
              <span className="rotulo">Dias uteis no periodo</span>
              <strong>{previsao.total}</strong>
            </div>
            <div>
              <span className="rotulo">Ja decorridos (ate hoje)</span>
              <strong>{previsao.decorridos}</strong>
            </div>
            <div>
              <span className="rotulo">Restantes</span>
              <strong>{previsao.restantes}</strong>
            </div>
          </div>

          <div className="dias-ajuste">
            <div className="dias-ajuste-head">
              Dias do periodo {qtdAjustes > 0 && <span className="tag-manual">{qtdAjustes} ajuste(s)</span>}
            </div>
            <div className="dias-grid">
              {dias.map((d) => {
                const util = ehUtil(d);
                return (
                  <button
                    type="button"
                    key={d.data}
                    className={`dia-chip${util ? ' util' : ' folga'}${override[d.data] !== undefined ? ' ajustado' : ''}${d.data === hojeIso ? ' hoje' : ''}`}
                    onClick={() => alternarDia(d)}
                    title={util ? 'trabalha (clique para folga)' : 'folga (clique para trabalhar)'}
                  >
                    <span className="dia-dow">{DOW[d.diaSemana]}</span>
                    <span className="dia-num">{ddmm(d.data)}</span>
                    <span className="dia-tag">{util ? 'trabalha' : 'folga'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button className="botao" type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar periodo'}
          </button>

          {msg && <div className="import-ok" style={{ marginTop: 12 }}>{msg}</div>}
          {erro && <div className="erro">{erro}</div>}
        </form>
      </div>
    </div>
  );
}
