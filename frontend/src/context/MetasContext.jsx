import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { getConfig, redistribuir, salvarPeriodo, getPeriodo } from '../api.js';
import { parseValorBR } from '../utils/format.js';

const MetasContext = createContext(null);

export function MetasProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [metaGlobalInput, setMetaGlobalInput] = useState('');
  const [periodo, setPeriodo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const calcular = useCallback(async (metaGlobal, periodoOverride) => {
    setCarregando(true);
    setErro('');
    try {
      const dados = await redistribuir(metaGlobal, undefined, periodoOverride, true);
      setResultado(dados);
      return dados;
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await getConfig();
        setConfig(cfg);
        setPeriodo(cfg.periodo);
        setMetaGlobalInput(String(cfg.metaGlobalPadrao));
        await calcular(cfg.metaGlobalPadrao);
      } catch (e) {
        setErro(e.message);
      }
    })();
  }, [calcular]);

  const recalcular = useCallback(() => {
    const meta = parseValorBR(metaGlobalInput);
    if (!Number.isFinite(meta) || meta <= 0) {
      setErro('Informe uma Meta Global valida (ex.: 19.500.000).');
      return;
    }
    return calcular(meta);
  }, [metaGlobalInput, calcular]);

  // Recalcula silenciosamente (sem spinner) - usado apos salvar lancamentos de venda.
  const recalcularSilencioso = useCallback(async () => {
    const meta = parseValorBR(metaGlobalInput);
    if (!Number.isFinite(meta) || meta <= 0) return;
    try {
      const dados = await redistribuir(meta, undefined, undefined, true);
      setResultado(dados);
    } catch (e) {
      /* mantem o resultado anterior */
    }
  }, [metaGlobalInput]);

  // Re-le o periodo do backend (ele muda sozinho ao importar um PDF) e recalcula.
  const sincronizarPeriodo = useCallback(async () => {
    try {
      const novo = await getPeriodo();
      setPeriodo(novo);
      const meta = parseValorBR(metaGlobalInput);
      if (Number.isFinite(meta) && meta > 0) await calcular(meta);
      return novo;
    } catch (e) {
      /* mantem o periodo anterior */
    }
  }, [metaGlobalInput, calcular]);

  const atualizarPeriodo = useCallback(
    async (patch) => {
      const novo = await salvarPeriodo(patch);
      setPeriodo(novo);
      const meta = parseValorBR(metaGlobalInput);
      if (Number.isFinite(meta) && meta > 0) await calcular(meta);
      return novo;
    },
    [metaGlobalInput, calcular],
  );

  const value = useMemo(
    () => ({
      config,
      periodo,
      metaGlobalInput,
      setMetaGlobalInput,
      resultado,
      carregando,
      erro,
      setErro,
      recalcular,
      recalcularSilencioso,
      atualizarPeriodo,
      sincronizarPeriodo,
    }),
    [
      config,
      periodo,
      metaGlobalInput,
      resultado,
      carregando,
      erro,
      recalcular,
      recalcularSilencioso,
      atualizarPeriodo,
      sincronizarPeriodo,
    ],
  );

  return <MetasContext.Provider value={value}>{children}</MetasContext.Provider>;
}

export function useMetas() {
  const ctx = useContext(MetasContext);
  if (!ctx) throw new Error('useMetas deve ser usado dentro de <MetasProvider>.');
  return ctx;
}

/** Lista achatada de vendedores (com nome da equipe). Exclui linhas do tipo "saldo". */
export function listarVendedores(resultado, { incluirSaldo = false } = {}) {
  if (!resultado?.equipes) return [];
  const out = [];
  for (const eq of resultado.equipes) {
    for (const m of eq.membros) {
      if (!incluirSaldo && m.tipo === 'saldo') continue;
      out.push({ ...m, equipeId: eq.id, equipeNome: eq.nome });
    }
  }
  return out;
}
