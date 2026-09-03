import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRankingTexto,
  resumirPorVendedor,
  moedaBRParaNumero,
  slug,
} from '../src/services/importacaoPdf.js';

// Amostra fiel ao texto extraido do PDF de RANKING (com rodape de totais).
const TEXTO = [
  'Página 1 de ',
  '01/09/26 18:03',
  'REFERENCI  EQUIPE',
  'VENDEDOR',
  'EMPRESA',
  'VALOR PEDIDOS',
  '08-2026    Equipe 1 - SP',
  'DAVID BRAGA',
  '101',
  '698.843,53',
  '21,83',
  '916.933,34',
  '08-2026    Equipe - RJ',
  'RICHARD FRANÇA',
  '101',
  '8.189,20',
  '08-2026    Equipe - RJ',
  'RICHARD FRANÇA',
  '102',
  '649.459,19',
  '42,82',
  '351.900,00',
  '08-2026    Equipe - NE',
  'PALOMA SANTOS',
  '104',
  '264.256,88',
  '56,44',
  '118.459,20',
  '08-2026    Equipe - NE',
  'PALOMA SANTOS',
  '105',
  '-17.310,06',
  '08-2026    Equipe Final',
  'ASSISTENTE FINAL',
  '101',
  '346.208,40',
  '105,00',
  '500.000,00',
  '1.949.647,14',
  '1.507,84',
  '2.005.292,54',
].join('\n');

test('moedaBRParaNumero converte formato brasileiro (inclusive negativo)', () => {
  assert.equal(moedaBRParaNumero('1.430.360,25'), 1430360.25);
  assert.equal(moedaBRParaNumero('-17.310,06'), -17310.06);
  assert.equal(moedaBRParaNumero('0,00'), 0);
});

test('slug remove acento e normaliza separadores', () => {
  assert.equal(slug('RICHARD FRANÇA'), 'richard-franca');
  assert.equal(slug('ISABELLY.QUEIROZ'), 'isabelly-queiroz');
  assert.equal(slug('Equipe - RJ'), 'equipe-rj');
});

test('parseRankingTexto extrai referencia, linhas e rodape', () => {
  const r = parseRankingTexto(TEXTO);
  assert.equal(r.referencia, '08-2026');
  assert.equal(r.linhas.length, 6);
  assert.deepEqual(r.rodape, {
    totalValor: 1949647.14,
    totalPrazo: 1507.84,
    totalMeta: 2005292.54,
  });
  const dav = r.linhas[0];
  assert.equal(dav.equipeTexto, 'Equipe 1 - SP');
  assert.equal(dav.vendedorTexto, 'DAVID BRAGA');
  assert.equal(dav.valor, 698843.53);
  assert.equal(dav.meta, 916933.34);
  // linha so com valor (sem prazo/meta)
  const rf1 = r.linhas.find((l) => l.vendedorTexto === 'RICHARD FRANÇA' && l.empresa === '101');
  assert.equal(rf1.valor, 8189.2);
  assert.equal(rf1.prazoMedio, null);
  assert.equal(rf1.meta, null);
});

test('resumirPorVendedor soma empresas e casa com o mock', () => {
  const resumo = resumirPorVendedor(parseRankingTexto(TEXTO));

  const richard = resumo.mapeados.find((m) => m.id === 'richard-franca');
  assert.ok(richard, 'richard-franca deveria ter sido mapeado');
  assert.equal(richard.valor, 657648.39); // 8.189,20 + 649.459,19
  assert.equal(richard.equipeId, 'equipe-rj');

  const paloma = resumo.mapeados.find((m) => m.id === 'paloma-santos');
  assert.equal(paloma.valor, 246946.82); // 264.256,88 - 17.310,06

  // "Equipe Final" / "ASSISTENTE FINAL" existe no mock -> mapeado
  const assist = resumo.mapeados.find((m) => m.id === 'assistente-final');
  assert.ok(assist, 'assistente-final deveria ter sido mapeado');
  assert.equal(assist.equipeId, 'equipe-final');
  assert.equal(assist.valor, 346208.4);
  assert.equal(resumo.naoMapeados.length, 0);
});

test('vendedor fora do cadastro cai em naoMapeados', () => {
  const texto = [
    '08-2026    Equipe Fantasma',
    'PESSOA DESCONHECIDA',
    '101',
    '10.000,00',
    '30,00',
    '10.000,00',
    '10.000,00', // rodape: total valor
    '30,00', //     total prazo
    '10.000,00', // total meta
  ].join('\n');
  const resumo = resumirPorVendedor(parseRankingTexto(texto));
  assert.equal(resumo.mapeados.length, 0);
  assert.equal(resumo.naoMapeados.length, 1);
  assert.equal(resumo.naoMapeados[0].vendedorTexto, 'PESSOA DESCONHECIDA');
});

test('resumirPorVendedor confere a soma com o total do rodape', () => {
  const resumo = resumirPorVendedor(parseRankingTexto(TEXTO));
  assert.equal(resumo.somaConfere, true);
  assert.equal(resumo.totalPdf, 1949647.14);
  assert.equal(resumo.totalMapeado, 1949647.14); // tudo casou com o mock
});
