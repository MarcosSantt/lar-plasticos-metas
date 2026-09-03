# Lar Plásticos · Redistribuição de Metas

Sistema web para **redistribuir e visualizar metas de vendas** por equipe e por membro,
a partir de uma nova **Meta Global**.

```
lar-plasticos-metas/
├── backend/     API Node.js + Express (regras de negócio e recálculo)
└── frontend/    SPA React + Vite (dashboard e Tree View estilo VS Code)
```

## Regra de negócio

| Cálculo | Fórmula |
|---|---|
| Fator global | `Meta Global / 19.500.000` |
| Nova meta da equipe | `Meta Antiga da Equipe / 19.500.000 × Meta Global` |
| Nova meta do membro | `Meta Antiga do Membro / Meta Antiga da Equipe × Nova Meta da Equipe` |

O montante base antigo (`19.500.000`) é o divisor oficial e corresponde à soma das metas
antigas de todas as equipes cadastradas (100%). Com a Meta Global padrão (19.500.000) o
fator é `1,0` e cada nova meta é igual à meta antiga.

---

## Etapa 1 — Backend

```bash
cd backend
npm install
npm run dev      # com --watch (recarrega ao salvar). Ou: npm start
```

Sobe em `http://localhost:3001`.

| Método | Rota | Descrição |
|---|---|---|
| GET  | `/api/health` | Status do serviço |
| GET  | `/api/metas/config` | Meta global sugerida + montante base antigo |
| GET  | `/api/metas/equipes` | Estrutura bruta (metas antigas), sem recálculo |
| POST | `/api/metas/redistribuir` | Recalcula a árvore. Body: `{ "metaGlobal": 19500000 }` (opcional: `montanteBaseAntigo`) |

Exemplo:

```bash
curl -X POST http://localhost:3001/api/metas/redistribuir \
  -H "Content-Type: application/json" \
  -d '{"metaGlobal": 19500000}'
```

Arquivos-chave:
- `src/data/mock.js` — banco mock (equipes, membros, constantes)
- `src/services/redistribuicao.js` — cálculo puro (fator global → equipe → membro)
- `src/routes/metas.js` — rotas
- `src/server.js` — bootstrap do Express

---

## Etapa 2 — Frontend

Deixe o backend rodando e, em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre em `http://localhost:5173`. O Vite faz proxy de `/api` para `localhost:3001`
(configurado em `vite.config.js`).

Build de produção: `npm run build` → `frontend/dist/`.

### UI/UX

- **Design system**: fundo gelo, cards brancos arredondados com sombra leve,
  cor primária verde esmeralda `#2ecc71`, texto cinza chumbo `#2f3640`.
- **Tree View (estilo VS Code)**: cada equipe é uma "pasta" com ícone verde e chevron
  que gira ao abrir; o accordion revela os "arquivos" (membros) indentados, com guia
  vertical da árvore.
- Cada linha mostra **meta antiga → nova meta** e um badge de variação (verde/vermelho).
- Painel lateral com o input da **Meta Global** e cards de resumo (fator, totais, variação).

---

## Fluxo de uso

1. Suba o backend (`backend/ → npm run dev`).
2. Suba o frontend (`frontend/ → npm run dev`).
3. Acesse `http://localhost:5173`, ajuste a **Meta Global** e clique em
   **Redistribuir metas**. A árvore recalcula equipes e membros mantendo a
   proporção interna de cada equipe.
