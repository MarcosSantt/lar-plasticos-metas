import { useMetas } from '../context/MetasContext.jsx';
import ResumoCards from '../components/ResumoCards.jsx';
import TreeView from '../components/TreeView.jsx';

export default function RedistribuicaoPage() {
  const { resultado, carregando, config } = useMetas();

  return (
    <div className="pagina">
      <div className="pagina-head">
        <h2>Redistribuicao de Metas</h2>
        <p>
          Recalculo proporcional por equipe e por membro a partir da Meta Global.
          {config && (
            <>
              {' '}
              Base antiga <strong>{config.montanteBaseAntigo.toLocaleString('pt-BR')}</strong>;
              soma das equipes exibidas{' '}
              <strong>{config.totalEquipesExibidas.toLocaleString('pt-BR')}</strong>.
            </>
          )}
        </p>
      </div>

      <ResumoCards resultado={resultado} />
      <TreeView
        regioes={resultado?.regioes ?? []}
        equipes={resultado?.equipes ?? []}
        carregando={carregando && !resultado}
      />
    </div>
  );
}
