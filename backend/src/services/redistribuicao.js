/**
 * Servico de Redistribuicao de Metas - Lar Plasticos
 * --------------------------------------------------
 * Regras de negocio:
 *
 *  1) Fator global = Meta Global / Montante Base Antigo (18.948.000)
 *
 *  2) Nova Meta da Equipe  = (Meta Antiga da Equipe / Montante Base Antigo) * Meta Global
 *                          = Meta Antiga da Equipe * Fator Global
 *
 *  3) Nova Meta do Membro  = (Meta Antiga do Membro / Meta Antiga da Equipe) * Nova Meta da Equipe
 *
 * O somatorio das novas metas dos membros de uma equipe sempre fecha com a
 * Nova Meta da Equipe (a proporcao interna e preservada).
 *
 * Alem do recalculo, o servico enriquece cada no com indicadores de execucao
 * do periodo corrente (realizado, % atingido, meta diaria, ritmo necessario e
 * projecao no ritmo atual).
 */

import { MONTANTE_BASE_ANTIGO } from '../data/mock.js';
import { resolverPeriodo, listarDiasUteis } from '../data/periodo.js';
import { semear, vendasDiarias, realizadoMensal, totalRealizado } from '../data/vendas.js';
import { proporcoesOverride } from '../data/proporcoes.js';

/**
 * Realizado de um id, por ordem de prioridade:
 *  1) total do mes vindo do PDF acumulado (realizadoMensal) - fonte da verdade;
 *  2) soma dos lancamentos diarios (PDF do dia / edicao manual);
 *  3) valor `realizado` do mock (fallback).
 */
function realizadoDe(id, fallback, datas) {
  const mensal = realizadoMensal[id];
  if (mensal && Number.isFinite(mensal.valor)) return mensal.valor;
  if (vendasDiarias[id]) return totalRealizado(id, datas);
  return Number(fallback) || 0;
}

const arred2 = (n) => Math.round(n * 100) / 100;

/**
 * Indicadores de execucao para um valor de meta + realizado, dado o periodo.
 */
function indicadoresExecucao(novaMeta, realizado, periodo) {
  const diasTotais = Math.max(periodo.diasUteisTotais, 1);
  const diasDecorridos = Math.min(Math.max(periodo.diasDecorridos, 0), diasTotais);
  const diasRestantes = Math.max(diasTotais - diasDecorridos, 0);

  const restante = Math.max(novaMeta - realizado, 0);
  const pctAtingido = novaMeta > 0 ? realizado / novaMeta : 0;

  // Ritmo linear ideal (independe do realizado)
  const metaDiaria = novaMeta / diasTotais;

  // Ritmo que ainda falta manter para fechar a meta no prazo
  const ritmoDiarioNecessario = diasRestantes > 0 ? restante / diasRestantes : restante;

  // "Nova meta diaria" no modelo da planilha: (meta - realizado) / dias que faltam,
  // SEM travar em zero (fica negativa quando o vendedor ja passou da meta).
  // Usa no minimo 1 dia (evita divisao por zero no fim do periodo).
  const diasFaltam = Math.max(diasRestantes, 1);
  const metaDiariaNecessaria = (novaMeta - realizado) / diasFaltam;

  // Projecao: mantendo a media diaria realizada ate aqui
  const mediaDiariaRealizada = diasDecorridos > 0 ? realizado / diasDecorridos : 0;
  const projecaoFimPeriodo = mediaDiariaRealizada * diasTotais;
  const gapProjetado = projecaoFimPeriodo - novaMeta;

  // Ritmo esperado ate hoje x realizado (adiantado/atrasado)
  const esperadoAteHoje = metaDiaria * diasDecorridos;
  const desvioRitmo = realizado - esperadoAteHoje;

  return {
    realizado: arred2(realizado),
    restante: arred2(restante),
    pctAtingido,
    metaDiaria: arred2(metaDiaria),
    ritmoDiarioNecessario: arred2(ritmoDiarioNecessario),
    metaDiariaNecessaria: arred2(metaDiariaNecessaria),
    mediaDiariaRealizada: arred2(mediaDiariaRealizada),
    projecaoFimPeriodo: arred2(projecaoFimPeriodo),
    gapProjetado: arred2(gapProjetado),
    atingeMetaNoRitmo: projecaoFimPeriodo >= novaMeta,
    desvioRitmo: arred2(desvioRitmo),
    status: desvioRitmo >= 0 ? 'no-ritmo' : pctAtingido >= 0.85 ? 'atencao' : 'critico',
  };
}

/**
 * @param {number} metaGlobal        Meta global informada (ex.: 19500000)
 * @param {Array}  equipes           Lista de equipes com metaAntiga, realizado e membros[]
 * @param {number} [baseAntiga]      Montante base antigo (divisor). Default: 18.948.000
 * @param {object} [periodo]         { diasUteisTotais, diasDecorridos, ... }. Default: periodoAtual
 * @returns {object} Resultado detalhado da redistribuicao + indicadores de execucao
 */
export function redistribuirMetas(
  metaGlobal,
  equipes,
  baseAntiga = MONTANTE_BASE_ANTIGO,
  periodo = resolverPeriodo(),
) {
  if (!Number.isFinite(metaGlobal) || metaGlobal <= 0) {
    throw new Error('O campo "metaGlobal" deve ser um numero positivo.');
  }
  if (!Number.isFinite(baseAntiga) || baseAntiga <= 0) {
    throw new Error('O campo "montanteBaseAntigo" deve ser um numero positivo.');
  }

  // (1) Fator global
  const fatorGlobal = metaGlobal / baseAntiga;

  semear();
  const datasPeriodo = listarDiasUteis(periodo.dataInicio, periodo.dataFim);

  const equipesCalculadas = equipes.map((equipe) => {
    // (2) Nova meta da equipe
    const novaMeta = equipe.metaAntiga * fatorGlobal;
    const listaMembros = Array.isArray(equipe.membros) ? equipe.membros : [];
    const overrideEquipe = proporcoesOverride[equipe.id] || null;

    const membros = listaMembros.map((membro) => {
      // Proporcao do membro dentro da equipe: override manual (%) OU base antiga.
      const proporcao =
        overrideEquipe && overrideEquipe[membro.id] != null
          ? overrideEquipe[membro.id]
          : equipe.metaAntiga > 0
            ? membro.metaAntiga / equipe.metaAntiga
            : 0;

      // (3) Nova meta do membro
      const novaMetaMembro = proporcao * novaMeta;
      const realizado = realizadoDe(membro.id, membro.realizado, datasPeriodo);

      return {
        ...membro,
        realizado,
        proporcao,
        proporcaoManual: !!(overrideEquipe && overrideEquipe[membro.id] != null),
        novaMeta: novaMetaMembro,
        variacao: novaMetaMembro - membro.metaAntiga,
        execucao: indicadoresExecucao(novaMetaMembro, realizado, periodo),
      };
    });

    const semMembros = membros.length === 0;
    const somaMembrosNova = membros.reduce((acc, m) => acc + m.novaMeta, 0);
    // Equipe sem membros usa o realizado proprio; senao, soma o dos membros.
    const realizadoEquipe = semMembros
      ? realizadoDe(equipe.id, equipe.realizado, datasPeriodo)
      : membros.reduce((acc, m) => acc + m.realizado, 0);

    return {
      ...equipe,
      semMembros,
      fatorGlobal,
      proporcoesManuais: !!overrideEquipe,
      novaMeta,
      variacao: novaMeta - equipe.metaAntiga,
      somaMembrosNova: semMembros ? novaMeta : somaMembrosNova,
      // diferenca de arredondamento entre a soma dos membros e a meta da equipe
      residuoArredondamento: semMembros ? 0 : novaMeta - somaMembrosNova,
      realizado: realizadoEquipe,
      execucao: indicadoresExecucao(novaMeta, realizadoEquipe, periodo),
      membros,
    };
  });

  // Agrupamento por regiao (subtotais)
  const mapaRegioes = new Map();
  for (const eq of equipesCalculadas) {
    const nome = eq.regiao || 'Sem regiao';
    if (!mapaRegioes.has(nome)) mapaRegioes.set(nome, []);
    mapaRegioes.get(nome).push(eq);
  }
  const regioes = [...mapaRegioes.entries()].map(([nome, eqs]) => {
    const metaAntiga = eqs.reduce((acc, e) => acc + e.metaAntiga, 0);
    const novaMeta = eqs.reduce((acc, e) => acc + e.novaMeta, 0);
    const realizado = eqs.reduce((acc, e) => acc + e.realizado, 0);
    return {
      id: 'regiao-' + nome.toLowerCase().replace(/\s+/g, '-'),
      nome,
      metaAntiga,
      novaMeta,
      variacao: novaMeta - metaAntiga,
      realizado,
      qtdEquipes: eqs.length,
      equipeIds: eqs.map((e) => e.id),
      execucao: indicadoresExecucao(novaMeta, realizado, periodo),
    };
  });

  const totalAntigoEquipes = equipes.reduce((acc, e) => acc + e.metaAntiga, 0);
  const totalNovoEquipes = equipesCalculadas.reduce((acc, e) => acc + e.novaMeta, 0);
  const totalReal = equipesCalculadas.reduce((acc, e) => acc + e.realizado, 0);

  // Serie diaria (soma dos lancamentos por data) -> burn-up real
  const idsDe = (filtro) => {
    const s = new Set();
    for (const eq of equipesCalculadas) {
      if (filtro && !eq.lancamentoDiario) continue;
      if (eq.semMembros) s.add(eq.id);
      for (const m of eq.membros) s.add(m.id);
    }
    return s;
  };
  const construirSerie = (ids) => {
    let acum = 0;
    return datasPeriodo.map((data, i) => {
      let valorDia = 0;
      for (const id of ids) valorDia += Number(vendasDiarias[id]?.[data]) || 0;
      valorDia = arred2(valorDia);
      acum = arred2(acum + valorDia);
      return { data, dia: i + 1, valorDia, acum, futuro: data > periodo.hoje };
    });
  };
  const serieRealizado = construirSerie(idsDe(false));
  const serieRealizadoLancamento = construirSerie(idsDe(true));

  // Consolidado apenas das equipes com lancamento diario
  const eqsLanc = equipesCalculadas.filter((e) => e.lancamentoDiario);
  const metaLanc = eqsLanc.reduce((acc, e) => acc + e.novaMeta, 0);
  const realLanc = eqsLanc.reduce((acc, e) => acc + e.realizado, 0);

  return {
    parametros: {
      metaGlobal,
      montanteBaseAntigo: baseAntiga,
      fatorGlobal,
      periodo: {
        rotulo: periodo.rotulo ?? null,
        dataInicio: periodo.dataInicio ?? null,
        dataFim: periodo.dataFim ?? null,
        diasUteisTotais: periodo.diasUteisTotais,
        diasDecorridos: periodo.diasDecorridos,
        diasRestantes: Math.max(periodo.diasUteisTotais - periodo.diasDecorridos, 0),
        hoje: periodo.hoje ?? null,
      },
    },
    totais: {
      totalAntigoEquipes,
      totalNovoEquipes,
      totalRealizado: totalReal,
      // Diferenca entre a meta global e o total redistribuido nas equipes exibidas.
      diferencaParaMetaGlobal: metaGlobal - totalNovoEquipes,
      // Execucao consolidada das equipes exibidas (alvo = soma das novas metas)
      execucao: indicadoresExecucao(totalNovoEquipes, totalReal, periodo),
      // Consolidado apenas das equipes com lancamento diario
      metaLancamento: metaLanc,
      realizadoLancamento: realLanc,
      execucaoLancamento: indicadoresExecucao(metaLanc, realLanc, periodo),
    },
    serieRealizado,
    serieRealizadoLancamento,
    regioes,
    equipes: equipesCalculadas,
  };
}
