import { brl } from '../utils/format.js';

export default function PainelMeta({
  valor,
  onChange,
  onSubmit,
  carregando,
  erro,
  config,
}) {
  return (
    <div className="card">
      <div className="card-titulo">Parametros da redistribuicao</div>
      <form
        className="painel-meta"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <label className="campo">
          <span>Meta Global (R$)</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="19.500.000"
            value={valor}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>

        <button className="botao" type="submit" disabled={carregando}>
          {carregando ? 'Recalculando...' : 'Redistribuir metas'}
        </button>

        {erro && <div className="erro">{erro}</div>}

        {config && (
          <div className="nota">
            <strong>Montante base antigo:</strong> {brl(config.montanteBaseAntigo)}
            <br />
            <strong>Soma das equipes exibidas:</strong> {brl(config.totalEquipesExibidas)} (
            {config.qtdEquipes} equipes)
            <br />
            O fator de redistribuicao usa sempre o montante base antigo, conforme a
            regra de negocio.
          </div>
        )}
      </form>
    </div>
  );
}
