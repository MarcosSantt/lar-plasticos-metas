import { useEffect, useMemo, useRef, useState } from 'react';
import { useMetas } from '../context/MetasContext.jsx';
import { getVendas, importarPdf, confirmarImportacao } from '../api.js';
import { brl, brlComSinal } from '../utils/format.js';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotuloDia = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${MESES[m - 1]}/${a}`;
};

function lerArquivoBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Nao consegui ler o arquivo.'));
    r.readAsDataURL(file);
  });
}

export default function ImportarPage() {
  const { resultado, sincronizarPeriodo } = useMetas();
  const [modo, setModo] = useState('mensal'); // 'mensal' | 'diario'
  const [dias, setDias] = useState([]);
  const [hoje, setHoje] = useState(null);
  const [data, setData] = useState('');

  const [lendo, setLendo] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [preview, setPreview] = useState(null);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await getVendas();
        setDias(d.dias || []);
        setHoje(d.hoje || null);
        const uteisAteHoje = (d.dias || []).filter((x) => !d.hoje || x <= d.hoje);
        setData(uteisAteHoje.at(-1) || (d.dias || []).at(0) || '');
      } catch (e) {
        setErro(e.message);
      }
    })();
  }, []);

  const realizadoAtualPorId = useMemo(() => {
    const mapa = {};
    for (const eq of resultado?.equipes ?? []) {
      if (eq.semMembros) mapa[eq.id] = eq.realizado ?? 0;
      for (const m of eq.membros ?? []) mapa[m.id] = m.realizado ?? 0;
    }
    return mapa;
  }, [resultado]);

  const diasSelecionaveis = dias.filter((d) => !hoje || d <= hoje);

  async function aoEscolherArquivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro('');
    setOk('');
    setPreview(null);
    setNomeArquivo(file.name);
    setLendo(true);
    try {
      const base64 = await lerArquivoBase64(file);
      const resumo = await importarPdf(base64);
      setPreview(resumo);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLendo(false);
    }
  }

  async function aplicar() {
    if (!preview?.mapeados?.length) return;
    if (modo === 'diario' && !data) {
      setErro('Escolha o dia a que este PDF se refere.');
      return;
    }
    setAplicando(true);
    setErro('');
    setOk('');
    try {
      const itens = preview.mapeados.map((m) => ({ id: m.id, valor: m.valor }));
      const resp = await confirmarImportacao({
        modo,
        data: modo === 'diario' ? data : undefined,
        referencia: preview.referencia ?? undefined,
        itens,
      });
      await sincronizarPeriodo();
      const per = resp?.periodo?.rotulo ? ` Periodo do sistema: ${resp.periodo.rotulo}.` : '';
      setOk(
        (modo === 'mensal'
          ? `Total do mes atualizado para ${itens.length} vendedores.`
          : `Vendas de ${rotuloDia(data)} lancadas para ${itens.length} vendedores.`) + per,
      );
      setPreview(null);
      setNomeArquivo('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setErro(err.message);
    } finally {
      setAplicando(false);
    }
  }

  const totalMapeado = preview?.totalMapeado ?? 0;
  const grupos = useMemo(() => {
    if (!preview) return [];
    const mapa = new Map();
    for (const m of preview.mapeados) {
      if (!mapa.has(m.equipeNome)) mapa.set(m.equipeNome, []);
      mapa.get(m.equipeNome).push(m);
    }
    return [...mapa.entries()];
  }, [preview]);

  return (
    <div className="pagina">
      <div className="pagina-head">
        <h2>Importar PDF de vendas</h2>
        <p>
          Suba o relatorio <strong>RANKING</strong> do sistema. Escolha se o arquivo e o
          acumulado do mes (1o dia ate hoje) ou as vendas de um unico dia. Os totais por
          vendedor e equipe, o ranking e os graficos sao atualizados. O periodo do sistema
          passa a ser o <strong>mes civil do relatorio</strong> (so os dias uteis daquele mes).
        </p>
      </div>

      <div className="card">
        <div className="import-modos">
          <label className={`import-modo${modo === 'mensal' ? ' ativo' : ''}`}>
            <input
              type="radio"
              name="modo"
              checked={modo === 'mensal'}
              onChange={() => {
                setModo('mensal');
                setPreview(null);
                setErro('');
                setOk('');
              }}
            />
            <div>
              <strong>Total do mes (acumulado)</strong>
              <span>Define quanto cada vendedor/equipe vendeu no mes ate agora.</span>
            </div>
          </label>
          <label className={`import-modo${modo === 'diario' ? ' ativo' : ''}`}>
            <input
              type="radio"
              name="modo"
              checked={modo === 'diario'}
              onChange={() => {
                setModo('diario');
                setPreview(null);
                setErro('');
                setOk('');
              }}
            />
            <div>
              <strong>Vendas de um dia</strong>
              <span>Preenche a coluna daquele dia na grade de lancamentos.</span>
            </div>
          </label>
        </div>

        {modo === 'diario' && (
          <div className="import-data">
            <label>
              Dia do arquivo:{' '}
              <select value={data} onChange={(e) => setData(e.target.value)}>
                {diasSelecionaveis.map((d) => (
                  <option key={d} value={d}>
                    {rotuloDia(d)}
                    {d === hoje ? ' (hoje)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="import-drop">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={aoEscolherArquivo}
            disabled={lendo || aplicando}
          />
          {lendo && <span className="import-hint">lendo PDF...</span>}
          {!lendo && nomeArquivo && <span className="import-hint">{nomeArquivo}</span>}
        </div>

        {erro && <div className="erro" style={{ marginTop: 12 }}>{erro}</div>}
        {ok && <div className="import-ok">{ok}</div>}
      </div>

      {preview && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-titulo">
            Conferencia &mdash; referencia {preview.referencia || '-'}
          </div>

          <div className="kpi-grid" style={{ maxWidth: 720, marginBottom: 8 }}>
            <div className="stat">
              <div className="rotulo">Vendedores reconhecidos</div>
              <div className="valor">{preview.mapeados.length}</div>
            </div>
            <div className="stat destaque">
              <div className="rotulo">Total a lancar</div>
              <div className="valor">{brl(totalMapeado)}</div>
            </div>
            <div className="stat">
              <div className="rotulo">Total do PDF</div>
              <div className="valor">{brl(preview.totalPdf)}</div>
            </div>
          </div>

          {preview.rodape && !preview.somaConfere && (
            <div className="erro" style={{ marginBottom: 10 }}>
              A soma das linhas ({brl(preview.totalPdf)}) nao bate com o total do rodape do
              PDF ({brl(preview.rodape.totalValor)}). Confira o arquivo antes de aplicar.
            </div>
          )}

          {preview.naoMapeados.length > 0 && (
            <div className="import-aviso">
              <strong>{preview.naoMapeados.length} linha(s) sem vendedor correspondente no cadastro</strong>{' '}
              &mdash; nao serao lancadas:
              <ul>
                {preview.naoMapeados.map((n, i) => (
                  <li key={i}>
                    {n.vendedorTexto} <em>({n.equipeTexto})</em> &mdash; {brl(n.valor)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Equipe</th>
                  <th className="num">{modo === 'mensal' ? 'Total do mes (PDF)' : 'Vendas no dia (PDF)'}</th>
                  {modo === 'mensal' && <th className="num">Realizado atual</th>}
                  {modo === 'mensal' && <th className="num">Diferenca</th>}
                </tr>
              </thead>
              <tbody>
                {grupos.map(([equipe, linhas]) => (
                  <FragmentoEquipe
                    key={equipe}
                    equipe={equipe}
                    linhas={linhas}
                    modo={modo}
                    atual={realizadoAtualPorId}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="import-acoes">
            <button className="botao" onClick={aplicar} disabled={aplicando}>
              {aplicando
                ? 'Aplicando...'
                : modo === 'mensal'
                  ? 'Aplicar total do mes'
                  : `Lancar vendas de ${data ? rotuloDia(data) : 'o dia'}`}
            </button>
            <button
              className="link-btn"
              onClick={() => {
                setPreview(null);
                setNomeArquivo('');
                if (inputRef.current) inputRef.current.value = '';
              }}
              disabled={aplicando}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FragmentoEquipe({ equipe, linhas, modo, atual }) {
  const totalGrupo = linhas.reduce((s, l) => s + l.valor, 0);
  return (
    <>
      <tr className="lanc-equipe">
        <td colSpan={modo === 'mensal' ? 5 : 3}>
          {equipe} &mdash; {brl(totalGrupo)}
        </td>
      </tr>
      {linhas.map((l) => {
        const dif = (l.valor || 0) - (atual[l.id] || 0);
        return (
          <tr key={l.id}>
            <td className="forte">
              {l.nome}
              {l.vendedorTexto.toUpperCase() !== l.nome.toUpperCase() && (
                <span className="import-origem"> ({l.vendedorTexto})</span>
              )}
            </td>
            <td>{l.equipeNome}</td>
            <td className="num mono">{brl(l.valor)}</td>
            {modo === 'mensal' && <td className="num mono">{brl(atual[l.id] || 0)}</td>}
            {modo === 'mensal' && (
              <td className={`num mono ${dif >= 0 ? 'pos' : 'neg'}`}>{brlComSinal(dif)}</td>
            )}
          </tr>
        );
      })}
    </>
  );
}
