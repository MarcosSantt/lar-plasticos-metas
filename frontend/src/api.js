const BASE = '/api/metas';

export async function getConfig() {
  const resp = await fetch(`${BASE}/config`);
  if (!resp.ok) throw new Error('Falha ao carregar a configuracao inicial.');
  return resp.json();
}

export async function redistribuir(metaGlobal, montanteBaseAntigo, periodo, persistirMeta = false) {
  const resp = await fetch(`${BASE}/redistribuir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metaGlobal, montanteBaseAntigo, periodo, persistirMeta }),
  });
  const dados = await resp.json();
  if (!resp.ok) throw new Error(dados?.erro || 'Falha ao redistribuir as metas.');
  return dados;
}

export async function getVendas() {
  const resp = await fetch(`${BASE}/vendas`);
  if (!resp.ok) throw new Error('Falha ao carregar os lancamentos diarios.');
  return resp.json();
}

export async function putVenda(id, data, valor) {
  const resp = await fetch(`${BASE}/vendas`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, data, valor }),
  });
  const dados = await resp.json();
  if (!resp.ok) throw new Error(dados?.erro || 'Falha ao salvar o lancamento.');
  return dados;
}

export async function importarPdf(pdfBase64) {
  const resp = await fetch(`${BASE}/importar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfBase64 }),
  });
  const dados = await resp.json();
  if (!resp.ok) throw new Error(dados?.erro || 'Falha ao ler o PDF.');
  return dados;
}

export async function confirmarImportacao(payload) {
  const resp = await fetch(`${BASE}/importar/confirmar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const dados = await resp.json();
  if (!resp.ok) throw new Error(dados?.erro || 'Falha ao aplicar a importacao.');
  return dados;
}

export async function salvarProporcoes(equipeId, proporcoes) {
  const resp = await fetch(`${BASE}/equipes/${equipeId}/proporcoes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proporcoes }),
  });
  const dados = await resp.json();
  if (!resp.ok) throw new Error(dados?.erro || 'Falha ao salvar as fatias.');
  return dados;
}

export async function resetarProporcoes(equipeId) {
  const resp = await fetch(`${BASE}/equipes/${equipeId}/proporcoes`, { method: 'DELETE' });
  const dados = await resp.json();
  if (!resp.ok) throw new Error(dados?.erro || 'Falha ao restaurar as fatias.');
  return dados;
}

export async function getPeriodo() {
  const resp = await fetch(`${BASE}/periodo`);
  if (!resp.ok) throw new Error('Falha ao carregar o periodo.');
  return (await resp.json()).periodo;
}

export async function getPeriodoCompleto() {
  const resp = await fetch(`${BASE}/periodo`);
  if (!resp.ok) throw new Error('Falha ao carregar o periodo.');
  return resp.json(); // { periodo, dias: [{ data, diaSemana, fimDeSemana, util, ajustado }] }
}

export async function salvarPeriodo(patch) {
  const resp = await fetch(`${BASE}/periodo`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const dados = await resp.json();
  if (!resp.ok) throw new Error(dados?.erro || 'Falha ao salvar o periodo.');
  return dados.periodo;
}
