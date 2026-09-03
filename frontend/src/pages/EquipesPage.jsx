import { Link } from 'react-router-dom';
import { useMetas } from '../context/MetasContext.jsx';
import { brlCompacto, pct } from '../utils/format.js';

function EquipeCard({ e }) {
  const p = e.execucao?.pctAtingido ?? 0;
  return (
    <Link to={`/equipes/${e.id}`} className="card equipe-card">
      <div className="equipe-card-nome">{e.nome}</div>
      <div className="equipe-card-meta">{brlCompacto(e.novaMeta)}</div>
      <div className="barra-trilha">
        <div className="barra-preenchida" style={{ width: `${Math.min(p * 100, 100)}%` }} />
      </div>
      <div className="equipe-card-sub">
        {pct(p)} atingido &middot;{' '}
        {e.semMembros ? 'sem membros' : `${e.membros.length} membros`}
      </div>
    </Link>
  );
}

export default function EquipesPage() {
  const { resultado } = useMetas();
  if (!resultado) return <div className="skeleton">Sem dados.</div>;

  const regioes = resultado.regioes ?? [];

  return (
    <div className="pagina">
      <div className="pagina-head">
        <h2>Equipes</h2>
        <p>Selecione uma equipe para ver o detalhamento.</p>
      </div>

      {regioes.length ? (
        regioes.map((reg) => (
          <div key={reg.id} style={{ marginBottom: 24 }}>
            <div className="regiao-titulo">
              {reg.nome}
              <span>
                {brlCompacto(reg.novaMeta)} &middot; {pct(reg.execucao?.pctAtingido ?? 0)} atingido
              </span>
            </div>
            <div className="equipe-cards">
              {resultado.equipes
                .filter((e) => (e.regiao || 'Sem regiao') === reg.nome)
                .map((e) => (
                  <EquipeCard key={e.id} e={e} />
                ))}
            </div>
          </div>
        ))
      ) : (
        <div className="equipe-cards">
          {resultado.equipes.map((e) => (
            <EquipeCard key={e.id} e={e} />
          ))}
        </div>
      )}
    </div>
  );
}
