/**
 * Importacao de PDF de RANKING - Lar Plasticos
 * -------------------------------------------
 * Le o relatorio "RANKING" (mesmo layout para o acumulado do mes e para um
 * unico dia) e devolve, por vendedor, quanto foi vendido no periodo do arquivo.
 *
 * Layout do relatorio (uma linha por REFERENCIA/EQUIPE/VENDEDOR/EMPRESA):
 *
 *   08-2026    Equipe Final 2
 *   ARIANE PIRES
 *   101
 *   948.034,08          <- VALOR PEDIDOS (sempre)
 *   48,71               <- PRAZO MEDIO   (opcional)
 *   575.000,00          <- META VALOR    (opcional)
 *
 * O mesmo vendedor aparece em varias linhas (empresas 101..105); os VALOR
 * PEDIDOS sao somados. O rodape do relatorio traz os totais gerais - e
 * removido antes do parse e usado so como conferencia.
 */
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { equipes } from '../data/mock.js';

const RE_HEADER = /^(\d{2})-(\d{4})\s{2,}(.+?)\s*$/;
const RE_EMPRESA = /^\d{2,4}$/;
const RE_MOEDA = /^-?\d{1,3}(?:\.\d{3})*,\d{2}$/;

/** Converte "1.234.567,89" (ou "-17.310,06") em Number. */
export function moedaBRParaNumero(txt) {
  if (typeof txt === 'number') return txt;
  const limpo = String(txt).trim().replace(/\./g, '').replace(',', '.');
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

/** Slug estavel: sem acento, minusculo, separadores viram "-". */
export function slug(txt) {
  return String(txt)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extrai o texto do PDF (Buffer) e faz o parse das linhas do ranking.
 * @returns {Promise<{referencia:string|null, linhas:Array, rodape:object|null, textoBruto:string}>}
 */
export async function lerRankingPdf(buffer) {
  const { text } = await pdfParse(buffer);
  return parseRankingTexto(text);
}

/** Parse puro a partir do texto ja extraido (facilita testes). */
export function parseRankingTexto(textoBruto) {
  const linhasTxt = String(textoBruto)
    .split('\n')
    .map((l) => l.trim());

  // 1) Rodape: as 3 ultimas linhas nao-vazias sao os totais gerais
  //    (VALOR PEDIDOS, PRAZO MEDIO, META VALOR). Sao removidas do corpo.
  const naoVazias = linhasTxt.filter((l) => l !== '');
  let rodape = null;
  const ultimas3 = naoVazias.slice(-3);
  if (ultimas3.length === 3 && ultimas3.every((l) => RE_MOEDA.test(l))) {
    rodape = {
      totalValor: moedaBRParaNumero(ultimas3[0]),
      totalPrazo: moedaBRParaNumero(ultimas3[1]),
      totalMeta: moedaBRParaNumero(ultimas3[2]),
    };
  }
  const corte = rodape
    ? (() => {
        // indice, no array original, da 1a das 3 linhas de rodape
        let achados = 0;
        for (let i = linhasTxt.length - 1; i >= 0; i--) {
          if (linhasTxt[i] === '') continue;
          achados++;
          if (achados === 3) return i;
        }
        return linhasTxt.length;
      })()
    : linhasTxt.length;
  const corpo = linhasTxt.slice(0, corte);

  // 2) Localiza os cabecalhos de registro (08-2026  Equipe ...)
  const marcos = [];
  for (let i = 0; i < corpo.length; i++) {
    const m = corpo[i].match(RE_HEADER);
    if (m) marcos.push({ i, mes: m[1], ano: m[2], equipeTexto: m[3].trim() });
  }

  const linhas = [];
  let referencia = null;
  for (let k = 0; k < marcos.length; k++) {
    const atual = marcos[k];
    const fim = k + 1 < marcos.length ? marcos[k + 1].i : corpo.length;
    if (!referencia) referencia = `${atual.mes}-${atual.ano}`;

    const bloco = corpo.slice(atual.i + 1, fim).filter((l) => l !== '');
    if (bloco.length < 2) continue;

    const vendedorTexto = bloco[0];
    let idx = 1;
    let empresa = null;
    if (RE_EMPRESA.test(bloco[idx] || '')) {
      empresa = bloco[idx];
      idx++;
    }

    // numeros na ordem: valor [, prazo] [, meta]
    const nums = [];
    while (idx < bloco.length && RE_MOEDA.test(bloco[idx]) && nums.length < 3) {
      nums.push(moedaBRParaNumero(bloco[idx]));
      idx++;
    }
    if (!nums.length) continue;

    const valor = nums[0];
    const prazoMedio = nums.length >= 2 ? nums[1] : null;
    // meta plausivel: descarta lixo de rodape que porventura sobre
    const meta = nums.length >= 3 && nums[2] <= 5_000_000 ? nums[2] : null;

    linhas.push({
      referencia: `${atual.mes}-${atual.ano}`,
      equipeTexto: atual.equipeTexto,
      vendedorTexto,
      empresa,
      valor,
      prazoMedio,
      meta,
    });
  }

  return { referencia, linhas, rodape, textoBruto };
}

// ------- Mapeamento para a estrutura do mock (equipes / membros) -------

function indiceMock() {
  const porEquipe = new Map(); // slug(nome equipe) -> equipe
  const porMembro = new Map(); // slug(nome membro) -> { membro, equipe }
  for (const eq of equipes) {
    porEquipe.set(slug(eq.nome), eq);
    for (const m of eq.membros || []) {
      porMembro.set(slug(m.nome), { membro: m, equipe: eq });
    }
  }
  return { porEquipe, porMembro };
}

/**
 * Agrega as linhas por vendedor e casa com o mock.
 * @returns {{ referencia, rodape, mapeados:Array, naoMapeados:Array, totalPdf:number, totalMapeado:number, somaConfere:boolean }}
 */
export function resumirPorVendedor({ referencia, linhas, rodape }) {
  const { porEquipe, porMembro } = indiceMock();

  // chave = slug(vendedor) + "@" + slug(equipe) para nao fundir homonimos entre equipes
  const acc = new Map();
  for (const l of linhas) {
    const chave = `${slug(l.vendedorTexto)}@${slug(l.equipeTexto)}`;
    const reg =
      acc.get(chave) ||
      {
        vendedorTexto: l.vendedorTexto,
        equipeTexto: l.equipeTexto,
        valor: 0,
        meta: null,
        empresas: new Set(),
      };
    reg.valor = Math.round((reg.valor + l.valor) * 100) / 100;
    if (l.meta != null) reg.meta = l.meta;
    if (l.empresa) reg.empresas.add(l.empresa);
    acc.set(chave, reg);
  }

  const mapeados = [];
  const naoMapeados = [];
  for (const reg of acc.values()) {
    const sVend = slug(reg.vendedorTexto);
    const sEq = slug(reg.equipeTexto);
    const eqMock = porEquipe.get(sEq) || null;

    let alvo = null;
    if (eqMock) {
      const m = (eqMock.membros || []).find((x) => slug(x.nome) === sVend);
      if (m) alvo = { id: m.id, nome: m.nome, equipeId: eqMock.id, equipeNome: eqMock.nome };
      else if ((eqMock.membros || []).length === 0)
        alvo = { id: eqMock.id, nome: eqMock.nome, equipeId: eqMock.id, equipeNome: eqMock.nome };
    }
    if (!alvo && porMembro.has(sVend)) {
      const { membro, equipe } = porMembro.get(sVend);
      alvo = { id: membro.id, nome: membro.nome, equipeId: equipe.id, equipeNome: equipe.nome };
    }

    const saida = {
      vendedorTexto: reg.vendedorTexto,
      equipeTexto: reg.equipeTexto,
      empresas: [...reg.empresas].sort(),
      valor: reg.valor,
      metaPdf: reg.meta,
    };
    if (alvo) mapeados.push({ ...saida, ...alvo });
    else naoMapeados.push(saida);
  }

  const arred = (n) => Math.round(n * 100) / 100;
  const totalPdf = arred([...acc.values()].reduce((s, r) => s + r.valor, 0));
  const totalMapeado = arred(mapeados.reduce((s, r) => s + r.valor, 0));
  const somaConfere = rodape ? Math.abs(totalPdf - rodape.totalValor) <= 1 : true;

  mapeados.sort((a, b) => a.equipeNome.localeCompare(b.equipeNome) || b.valor - a.valor);
  naoMapeados.sort((a, b) => b.valor - a.valor);

  return { referencia, rodape, mapeados, naoMapeados, totalPdf, totalMapeado, somaConfere };
}

/** Pipeline completo: Buffer do PDF -> resumo pronto para a tela. */
export async function importarRankingPdf(buffer) {
  const parsed = await lerRankingPdf(buffer);
  return resumirPorVendedor(parsed);
}
