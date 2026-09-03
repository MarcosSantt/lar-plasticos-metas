import { Router } from 'express';
import { equipes, MONTANTE_BASE_ANTIGO, META_GLOBAL_PADRAO } from '../data/mock.js';
import {
  resolverPeriodo,
  atualizarPeriodo,
  listarDiasUteis,
  listarDiasDoPeriodo,
  periodoDaReferencia,
} from '../data/periodo.js';
import { redistribuirMetas } from '../services/redistribuicao.js';
import {
  semear,
  vendasDiarias,
  definirVenda,
  realizadoMensal,
  definirRealizadoMensal,
} from '../data/vendas.js';
import { parseRankingTexto, lerRankingPdf, resumirPorVendedor } from '../services/importacaoPdf.js';
import { definirProporcoes, limparProporcoes } from '../data/proporcoes.js';
import { getMetaGlobal, setMetaGlobal } from '../data/config.js';

const router = Router();

/**
 * GET /api/metas/config
 * Parametros padrao para a tela (meta global sugerida, base antiga e periodo).
 */
router.get('/config', (_req, res) => {
  const totalEquipesExibidas = equipes.reduce((acc, e) => acc + e.metaAntiga, 0);
  res.json({
    montanteBaseAntigo: MONTANTE_BASE_ANTIGO,
    metaGlobalPadrao: getMetaGlobal(),
    metaGlobalDefault: META_GLOBAL_PADRAO,
    totalEquipesExibidas,
    qtdEquipes: equipes.length,
    periodo: resolverPeriodo(),
  });
});

/**
 * GET /api/metas/equipes
 * Estrutura bruta (metas antigas + realizado) sem nenhum recalculo.
 */
router.get('/equipes', (_req, res) => {
  res.json({ equipes });
});

/**
 * PUT    /api/metas/equipes/:id/proporcoes  body: { proporcoes: { membroId: fracao 0..1 } }
 * DELETE /api/metas/equipes/:id/proporcoes  -> volta a proporcao pela meta antiga
 */
router.put('/equipes/:id/proporcoes', (req, res) => {
  try {
    const equipe = equipes.find((e) => e.id === req.params.id);
    if (!equipe) return res.status(404).json({ erro: 'Equipe nao encontrada.' });
    const mapa = req.body?.proporcoes;
    if (!mapa || typeof mapa !== 'object') {
      return res.status(400).json({ erro: 'Envie "proporcoes" ({ membroId: fracao }).' });
    }
    const idsValidos = new Set((equipe.membros || []).map((m) => m.id));
    for (const id of Object.keys(mapa)) {
      if (!idsValidos.has(id)) {
        return res.status(400).json({ erro: `Membro "${id}" nao pertence a esta equipe.` });
      }
    }
    const aplicado = definirProporcoes(equipe.id, mapa);
    res.json({ ok: true, equipeId: equipe.id, proporcoes: aplicado });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

router.delete('/equipes/:id/proporcoes', (req, res) => {
  limparProporcoes(req.params.id);
  res.json({ ok: true, equipeId: req.params.id });
});

/**
 * GET /api/metas/periodo   -> periodo corrente
 * PUT /api/metas/periodo   -> atualiza { diasUteisTotais, diasDecorridos, rotulo, dataInicio, dataFim }
 */
router.get('/periodo', (_req, res) => {
  res.json({ periodo: resolverPeriodo(), dias: listarDiasDoPeriodo() });
});

router.put('/periodo', (req, res) => {
  try {
    const periodo = atualizarPeriodo(req.body ?? {});
    res.json({ periodo: { ...periodo }, dias: listarDiasDoPeriodo() });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

/**
 * GET /api/metas/vendas
 * Retorna os lancamentos diarios + a lista de dias uteis do periodo.
 * PUT /api/metas/vendas  body: { id, data: 'YYYY-MM-DD', valor }
 */
router.get('/vendas', (_req, res) => {
  semear();
  const periodo = resolverPeriodo();
  res.json({
    dias: listarDiasUteis(periodo.dataInicio, periodo.dataFim),
    hoje: periodo.hoje,
    vendasDiarias,
    realizadoMensal,
  });
});

/**
 * POST /api/metas/importar
 * body: { pdfBase64 } ou { texto } (texto facilita testes)
 * Faz o parse do PDF de RANKING e devolve o resumo por vendedor (SEM aplicar).
 */
router.post('/importar', async (req, res) => {
  try {
    const { pdfBase64, texto } = req.body ?? {};
    let parsed;
    if (texto) {
      parsed = parseRankingTexto(String(texto));
    } else if (pdfBase64) {
      const limpo = String(pdfBase64).replace(/^data:.*;base64,/, '');
      parsed = await lerRankingPdf(Buffer.from(limpo, 'base64'));
    } else {
      return res.status(400).json({ erro: 'Envie "pdfBase64" (ou "texto").' });
    }
    if (!parsed.linhas.length) {
      return res
        .status(422)
        .json({ erro: 'Nao reconheci nenhuma linha de ranking neste PDF.' });
    }
    res.json(resumirPorVendedor(parsed));
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

/**
 * POST /api/metas/importar/confirmar
 * body: { modo: 'mensal' | 'diario', data?: 'YYYY-MM-DD', referencia?, itens: [{ id, valor }] }
 *  - mensal: grava o total do mes por id (override do realizado);
 *  - diario: grava vendasDiarias[id][data].
 */
router.post('/importar/confirmar', (req, res) => {
  try {
    const { modo, data, referencia, itens } = req.body ?? {};
    if (!Array.isArray(itens) || !itens.length) {
      return res.status(400).json({ erro: 'Envie "itens" (lista de { id, valor }).' });
    }
    if (modo === 'mensal') {
      for (const it of itens) definirRealizadoMensal(it.id, Number(it.valor), referencia || null);
    } else if (modo === 'diario') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data))) {
        return res.status(400).json({ erro: 'Para o modo "diario" informe "data" (YYYY-MM-DD).' });
      }
      for (const it of itens) definirVenda(it.id, data, Number(it.valor));
    } else {
      return res.status(400).json({ erro: 'modo deve ser "mensal" ou "diario".' });
    }

    // O periodo do sistema passa a ser o mes civil do relatorio importado.
    const novoPeriodo = periodoDaReferencia(referencia) || periodoDaReferencia(data);
    if (novoPeriodo) atualizarPeriodo(novoPeriodo);

    res.json({
      ok: true,
      modo,
      data: modo === 'diario' ? data : null,
      aplicados: itens.length,
      periodo: resolverPeriodo(),
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

router.put('/vendas', (req, res) => {
  try {
    const { id, data, valor } = req.body ?? {};
    const registro = definirVenda(id, data, valor);
    res.json({ ok: true, id, registro });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

/**
 * POST /api/metas/redistribuir
 * body: { metaGlobal: number, montanteBaseAntigo?: number, periodo?: {...} }
 * Retorna a arvore recalculada (equipes + membros) com indicadores de execucao.
 */
router.post('/redistribuir', (req, res) => {
  try {
    const metaGlobal = Number(req.body?.metaGlobal);
    const baseAntiga =
      req.body?.montanteBaseAntigo != null && req.body.montanteBaseAntigo !== ''
        ? Number(req.body.montanteBaseAntigo)
        : MONTANTE_BASE_ANTIGO;

    const periodo = req.body?.periodo
      ? { ...resolverPeriodo(), ...req.body.periodo }
      : resolverPeriodo();

    const resultado = redistribuirMetas(metaGlobal, equipes, baseAntiga, periodo);
    // guarda a ultima Meta Global "de verdade" (nao a do simulador)
    if (req.body?.persistirMeta) setMetaGlobal(metaGlobal);
    res.json(resultado);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

export default router;
