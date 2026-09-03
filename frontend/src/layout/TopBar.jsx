import { useMetas } from '../context/MetasContext.jsx';
import { brlCompacto } from '../utils/format.js';

export default function TopBar({ onAbrirMenu }) {
  const {
    metaGlobalInput,
    setMetaGlobalInput,
    recalcular,
    carregando,
    periodo,
    erro,
  } = useMetas();

  return (
    <header className="topbar">
      <button className="menu-toggle" onClick={onAbrirMenu} aria-label="Abrir menu" type="button">
        <span />
        <span />
        <span />
      </button>

      <form
        className="topbar-meta"
        onSubmit={(e) => {
          e.preventDefault();
          recalcular();
        }}
      >
        <label htmlFor="meta-global">Meta Global (R$)</label>
        <input
          id="meta-global"
          type="text"
          inputMode="numeric"
          placeholder="19.500.000"
          value={metaGlobalInput}
          onChange={(e) => setMetaGlobalInput(e.target.value)}
        />
        <button className="botao" type="submit" disabled={carregando}>
          {carregando ? 'Recalculando...' : 'Redistribuir'}
        </button>
      </form>

      {periodo && (
        <div className="topbar-periodo">
          <strong>{periodo.rotulo}</strong>
          <span>
            {periodo.diasDecorridos}/{periodo.diasUteisTotais} dias uteis
          </span>
        </div>
      )}

      {erro && <div className="topbar-erro">{erro}</div>}
    </header>
  );
}
