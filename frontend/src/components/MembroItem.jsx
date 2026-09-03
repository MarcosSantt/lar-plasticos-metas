import { brl, brlComSinal, pct } from '../utils/format.js';
import { IconeArquivo } from './Icones.jsx';

export default function MembroItem({ membro }) {
  const subiu = membro.variacao >= 0;
  return (
    <div className="tree-row membro-row" style={{ cursor: 'default' }}>
      <IconeArquivo />
      <span className="nome">{membro.nome}</span>
      <span className="prop">{pct(membro.proporcao)}</span>
      <span className="spacer" />
      <span className="valores">
        <span className="antigo">{brl(membro.metaAntiga)}</span>
        <span className="novo">{brl(membro.novaMeta)}</span>
        <span className={`badge ${subiu ? 'up' : 'down'}`}>
          {brlComSinal(membro.variacao)}
        </span>
      </span>
    </div>
  );
}
