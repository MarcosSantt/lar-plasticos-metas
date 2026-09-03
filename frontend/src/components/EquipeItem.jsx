import { brl, brlComSinal, pct } from '../utils/format.js';
import { Chevron, IconePasta, IconeArquivo } from './Icones.jsx';
import MembroItem from './MembroItem.jsx';

export default function EquipeItem({ equipe, aberto, onToggle }) {
  const subiu = equipe.variacao >= 0;
  const semMembros = equipe.semMembros || (equipe.membros?.length ?? 0) === 0;

  if (semMembros) {
    // Equipe sem membros: linha unica, sem expandir.
    return (
      <div className="tree-row equipe-sem-membros" style={{ cursor: 'default' }}>
        <span style={{ width: 12, flexShrink: 0 }} />
        <IconeArquivo />
        <span className="nome">{equipe.nome}</span>
        <span className="prop">{pct(equipe.execucao?.pctAtingido ?? 0)} atingido</span>
        <span className="spacer" />
        <span className="valores">
          <span className="antigo">{brl(equipe.metaAntiga)}</span>
          <span className="novo">{brl(equipe.novaMeta)}</span>
          <span className={`badge ${subiu ? 'up' : 'down'}`}>{brlComSinal(equipe.variacao)}</span>
        </span>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={`tree-row${aberto ? ' aberta' : ''}`}
        onClick={onToggle}
        aria-expanded={aberto}
      >
        <Chevron />
        <IconePasta />
        <span className="nome">{equipe.nome}</span>
        <span className="spacer" />
        <span className="valores">
          <span className="antigo">{brl(equipe.metaAntiga)}</span>
          <span className="novo">{brl(equipe.novaMeta)}</span>
          <span className={`badge ${subiu ? 'up' : 'down'}`}>
            {brlComSinal(equipe.variacao)}
          </span>
        </span>
      </button>

      {aberto && (
        <div className="membros">
          <div className="membros-wrap">
            {equipe.membros.map((m) => (
              <MembroItem key={m.id} membro={m} />
            ))}
          </div>
          <div className="rodape-equipe">
            {equipe.membros.length} membros | soma das novas metas:{' '}
            {brl(equipe.somaMembrosNova)}
          </div>
        </div>
      )}
    </div>
  );
}
