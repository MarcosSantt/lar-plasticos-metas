import { NavLink } from 'react-router-dom';
import {
  IconeDashboard,
  IconeArvore,
  IconeEquipe,
  IconeSimulador,
  IconeLancamentos,
  IconeImportar,
  IconeEngrenagem,
} from '../components/Icones.jsx';
import { useMetas } from '../context/MetasContext.jsx';

const LINKS = [
  { to: '/', fim: true, rotulo: 'Dashboard', Icone: IconeDashboard },
  { to: '/redistribuicao', rotulo: 'Redistribuicao', Icone: IconeArvore },
  { to: '/lancamentos', rotulo: 'Lancamentos', Icone: IconeLancamentos },
  { to: '/importar', rotulo: 'Importar PDF', Icone: IconeImportar },
  { to: '/simulador', rotulo: 'Simulador', Icone: IconeSimulador },
  { to: '/equipes', rotulo: 'Equipes', Icone: IconeEquipe },
  { to: '/configuracoes', rotulo: 'Configuracoes', Icone: IconeEngrenagem },
];

export default function Sidebar({ aberta, onFechar }) {
  const { resultado } = useMetas();
  const equipes = resultado?.equipes ?? [];
  const regioes = resultado?.regioes ?? [];

  return (
    <>
      <div
        className={`sidebar-overlay${aberta ? ' visivel' : ''}`}
        onClick={onFechar}
        aria-hidden="true"
      />
      <aside className={`sidebar${aberta ? ' aberta' : ''}`}>
        <div className="sidebar-marca">
          <div className="sidebar-logo">
            <img src="/logo-lar.png" alt="Lar Plasticos" />
          </div>
          <span className="sidebar-subtitulo">Gestao de Metas</span>
        </div>

        <nav className="sidebar-nav">
          {LINKS.map(({ to, fim, rotulo, Icone }) => (
            <NavLink
              key={to}
              to={to}
              end={fim}
              className={({ isActive }) => `nav-item${isActive ? ' ativo' : ''}`}
              onClick={onFechar}
            >
              <Icone />
              <span>{rotulo}</span>
            </NavLink>
          ))}
        </nav>

        {equipes.length > 0 &&
          (regioes.length ? regioes : [{ id: 'all', nome: 'Equipes' }]).map((reg) => {
            const doGrupo = regioes.length
              ? equipes.filter((e) => (e.regiao || 'Sem regiao') === reg.nome)
              : equipes;
            return (
              <div className="sidebar-grupo" key={reg.id}>
                <div className="sidebar-grupo-titulo">{reg.nome}</div>
                {doGrupo.map((eq) => (
                  <NavLink
                    key={eq.id}
                    to={`/equipes/${eq.id}`}
                    className={({ isActive }) => `nav-sub${isActive ? ' ativo' : ''}`}
                    onClick={onFechar}
                  >
                    {eq.nome}
                  </NavLink>
                ))}
              </div>
            );
          })}

        <div className="sidebar-rodape">v2 &middot; dados mock</div>
      </aside>
    </>
  );
}
