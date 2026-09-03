import test from 'node:test';
import assert from 'node:assert/strict';
import { redistribuirMetas } from '../src/services/redistribuicao.js';

// Fixture pequena com numeros redondos (independente do mock real).
const equipesFixture = [
  {
    id: 'a',
    nome: 'Equipe A',
    metaAntiga: 1_000_000,
    membros: [
      { id: 'a1', nome: 'A1', metaAntiga: 600_000, realizado: 300_000 },
      { id: 'a2', nome: 'A2', metaAntiga: 400_000, realizado: 100_000 },
    ],
  },
  {
    id: 'b',
    nome: 'Equipe B',
    metaAntiga: 500_000,
    membros: [{ id: 'b1', nome: 'B1', metaAntiga: 500_000, realizado: 500_000 }],
  },
];

const base = 2_000_000; // montante base antigo
const periodo = { diasUteisTotais: 20, diasDecorridos: 10 };

const perto = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test('fator global = metaGlobal / montanteBaseAntigo', () => {
  const r = redistribuirMetas(3_000_000, equipesFixture, base, periodo);
  assert.equal(r.parametros.fatorGlobal, 1.5);
});

test('nova meta da equipe = metaAntiga * fatorGlobal', () => {
  const r = redistribuirMetas(3_000_000, equipesFixture, base, periodo);
  const a = r.equipes.find((e) => e.id === 'a');
  assert.equal(a.novaMeta, 1_500_000);
  assert.equal(a.variacao, 500_000);
});

test('a soma das novas metas dos membros fecha com a meta da equipe', () => {
  const r = redistribuirMetas(2_750_000, equipesFixture, base, periodo);
  for (const eq of r.equipes) {
    const soma = eq.membros.reduce((acc, m) => acc + m.novaMeta, 0);
    assert.ok(perto(soma, eq.novaMeta, 1e-4), `${eq.nome}: ${soma} != ${eq.novaMeta}`);
  }
});

test('as proporcoes dos membros somam 1 e novaMeta = proporcao * novaMetaEquipe', () => {
  const r = redistribuirMetas(3_000_000, equipesFixture, base, periodo);
  const a = r.equipes.find((e) => e.id === 'a');
  const somaProp = a.membros.reduce((acc, m) => acc + m.proporcao, 0);
  assert.ok(perto(somaProp, 1));
  for (const m of a.membros) {
    assert.ok(perto(m.novaMeta, m.proporcao * a.novaMeta, 1e-6));
  }
});

test('indicadores de execucao: pctAtingido, restante e metaDiaria', () => {
  const r = redistribuirMetas(2_000_000, equipesFixture, base, periodo); // fator 1.0
  const a = r.equipes.find((e) => e.id === 'a'); // novaMeta 1.000.000, realizado 400.000
  assert.ok(perto(a.execucao.pctAtingido, 0.4));
  assert.equal(a.execucao.restante, 600_000);
  assert.equal(a.execucao.metaDiaria, 1_000_000 / 20); // 50.000
  // faltam 10 dias uteis -> ritmo necessario = 600.000 / 10
  assert.equal(a.execucao.ritmoDiarioNecessario, 60_000);
});

test('equipe que ja bateu a meta tem restante 0 e status no-ritmo', () => {
  const r = redistribuirMetas(2_000_000, equipesFixture, base, periodo);
  const b = r.equipes.find((e) => e.id === 'b'); // novaMeta 500.000, realizado 500.000
  assert.equal(b.execucao.restante, 0);
  assert.ok(b.execucao.pctAtingido >= 1);
  assert.equal(b.execucao.status, 'no-ritmo');
});

test('totais consolidados somam equipes e realizado', () => {
  const r = redistribuirMetas(2_000_000, equipesFixture, base, periodo);
  assert.equal(r.totais.totalNovoEquipes, 1_500_000);
  assert.equal(r.totais.totalRealizado, 900_000);
});

test('periodo no retorno inclui diasRestantes', () => {
  const r = redistribuirMetas(2_000_000, equipesFixture, base, periodo);
  assert.equal(r.parametros.periodo.diasRestantes, 10);
});

test('rejeita metaGlobal <= 0', () => {
  assert.throws(() => redistribuirMetas(0, equipesFixture, base, periodo), /metaGlobal/);
  assert.throws(() => redistribuirMetas(-5, equipesFixture, base, periodo), /metaGlobal/);
});

test('rejeita montanteBaseAntigo <= 0', () => {
  assert.throws(() => redistribuirMetas(1_000_000, equipesFixture, 0, periodo), /montanteBaseAntigo/);
});

test('equipe sem membros: usa realizado proprio e nao gera residuo', () => {
  const comMkt = [
    ...equipesFixture,
    { id: 'mkt', nome: 'Marketplace', regiao: 'Sao Paulo', metaAntiga: 500_000, realizado: 120_000, membros: [] },
  ];
  const r = redistribuirMetas(2_000_000, comMkt, base, periodo); // fator 1.0
  const mkt = r.equipes.find((e) => e.id === 'mkt');
  assert.equal(mkt.semMembros, true);
  assert.equal(mkt.membros.length, 0);
  assert.equal(mkt.novaMeta, 500_000);
  assert.equal(mkt.realizado, 120_000);
  assert.equal(mkt.residuoArredondamento, 0);
  assert.equal(mkt.somaMembrosNova, 500_000);
  assert.ok(perto(mkt.execucao.pctAtingido, 0.24));
});

test('agrupamento por regiao soma as equipes', () => {
  const comRegiao = equipesFixture.map((e, i) => ({ ...e, regiao: i === 0 ? 'Sul' : 'Norte' }));
  const r = redistribuirMetas(2_000_000, comRegiao, base, periodo);
  assert.equal(r.regioes.length, 2);
  const sul = r.regioes.find((x) => x.nome === 'Sul');
  assert.equal(sul.qtdEquipes, 1);
  assert.equal(sul.novaMeta, 1_000_000);
  const total = r.regioes.reduce((acc, x) => acc + x.novaMeta, 0);
  assert.ok(perto(total, r.totais.totalNovoEquipes, 1e-4));
});
