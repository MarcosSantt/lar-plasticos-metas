import { useMemo, useState } from 'react';
import EquipeItem from './EquipeItem.jsx';
import { Chevron } from './Icones.jsx';
import { brl, brlComSinal, pct } from '../utils/format.js';

export default function TreeView({ regioes = [], equipes = [], carregando }) {
  const [abertosEq, setAbertosEq] = useState(() => new Set());
  const [fechadasReg, setFechadasReg] = useState(() => new Set());

  const grupos = useMemo(() => {
    if (regioes.length) {
      return regioes.map((r) => ({
        regiao: r,
        equipes: equipes.filter((e) => (e.regiao || 'Sem regiao') === r.nome),
      }));
    }
    return [{ regiao: null, equipes }];
  }, [regioes, equipes]);

  const toggleEq = (id) =>
    setAbertosEq((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleReg = (nome) =>
    setFechadasReg((prev) => {
      const next = new Set(prev);
      next.has(nome) ? next.delete(nome) : next.add(nome);
      return next;
    });

  const idsExpansiveis = equipes.filter((e) => !e.semMembros && e.membros?.length).map((e) => e.id);
  const expandirTodos = () => setAbertosEq(new Set(idsExpansiveis));
  const recolherTodos = () => setAbertosEq(new Set());

  return (
    <div className="card">
      <div className="card-titulo">Explorador de Metas</div>

      <div className="tree-toolbar">
        <span>
          {regioes.length ? `${regioes.length} regioes | ` : ''}
          {equipes.length} equipes
        </span>
        <div>
          <button className="link-btn" onClick={expandirTodos} type="button">
            Expandir tudo
          </button>
          <button className="link-btn" onClick={recolherTodos} type="button">
            Recolher tudo
          </button>
        </div>
      </div>

      <div className="tree">
        {carregando && <div className="skeleton">Carregando metas...</div>}
        {!carregando &&
          grupos.map(({ regiao, equipes: eqs }) => {
            if (!regiao) {
              return eqs.map((equipe) => (
                <EquipeItem
                  key={equipe.id}
                  equipe={equipe}
                  aberto={abertosEq.has(equipe.id)}
                  onToggle={() => toggleEq(equipe.id)}
                />
              ));
            }
            const fechada = fechadasReg.has(regiao.nome);
            const subiu = regiao.variacao >= 0;
            return (
              <div key={regiao.id} className="regiao-grupo">
                <button
                  type="button"
                  className={`tree-row regiao-row${fechada ? '' : ' aberta'}`}
                  onClick={() => toggleReg(regiao.nome)}
                  aria-expanded={!fechada}
                >
                  <Chevron />
                  <span className="nome">{regiao.nome}</span>
                  <span className="prop">
                    {regiao.qtdEquipes} equipes | {pct(regiao.execucao?.pctAtingido ?? 0)}
                  </span>
                  <span className="spacer" />
                  <span className="valores">
                    <span className="antigo">{brl(regiao.metaAntiga)}</span>
                    <span className="novo">{brl(regiao.novaMeta)}</span>
                    <span className={`badge ${subiu ? 'up' : 'down'}`}>
                      {brlComSinal(regiao.variacao)}
                    </span>
                  </span>
                </button>

                {!fechada && (
                  <div className="regiao-filhos">
                    {eqs.map((equipe) => (
                      <EquipeItem
                        key={equipe.id}
                        equipe={equipe}
                        aberto={abertosEq.has(equipe.id)}
                        onToggle={() => toggleEq(equipe.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
