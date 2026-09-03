import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './layout/Sidebar.jsx';
import TopBar from './layout/TopBar.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import RedistribuicaoPage from './pages/RedistribuicaoPage.jsx';
import SimuladorPage from './pages/SimuladorPage.jsx';
import LancamentosPage from './pages/LancamentosPage.jsx';
import ImportarPage from './pages/ImportarPage.jsx';
import EquipesPage from './pages/EquipesPage.jsx';
import EquipePage from './pages/EquipePage.jsx';
import ConfiguracoesPage from './pages/ConfiguracoesPage.jsx';

export default function App() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="layout">
      <Sidebar aberta={menuAberto} onFechar={() => setMenuAberto(false)} />

      <div className="conteudo">
        <TopBar onAbrirMenu={() => setMenuAberto(true)} />

        <main className="conteudo-main">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/redistribuicao" element={<RedistribuicaoPage />} />
            <Route path="/simulador" element={<SimuladorPage />} />
            <Route path="/lancamentos" element={<LancamentosPage />} />
            <Route path="/importar" element={<ImportarPage />} />
            <Route path="/equipes" element={<EquipesPage />} />
            <Route path="/equipes/:id" element={<EquipePage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
