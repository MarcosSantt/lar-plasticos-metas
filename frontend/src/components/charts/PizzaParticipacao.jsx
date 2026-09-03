import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { corPorIndice } from './paleta.js';
import TooltipBRL from './TooltipBRL.jsx';
import { listarVendedores } from '../../context/MetasContext.jsx';

/**
 * Pizza de participacao com drill-down:
 *   geral (todos os vendedores)  -> clique -> equipes
 *   equipes                      -> clique numa fatia -> membros da equipe
 *   membros                      -> volta para equipes
 */
export default function PizzaParticipacao({ resultado }) {
  const [nivel, setNivel] = useState('geral'); // 'geral' | 'equipes' | 'membros'
  const [equipeId, setEquipeId] = useState(null);

  const equipeSel = resultado.equipes.find((e) => e.id === equipeId) || null;

  let dados = [];
  let titulo = '';
  let subtitulo = '';
  let onClickFatia = null;

  if (nivel === 'geral') {
    dados = listarVendedores(resultado)
      .map((v) => ({ chave: v.id, nome: v.nome, valor: v.novaMeta }))
      .filter((d) => d.valor > 0)
      .sort((a, b) => b.valor - a.valor);
    titulo = 'Participacao por vendedor';
    subtitulo = 'clique no grafico para ver por equipe';
  } else if (nivel === 'equipes') {
    dados = resultado.equipes
      .map((e) => ({ chave: e.id, nome: e.nome, valor: e.novaMeta, semMembros: e.semMembros }))
      .sort((a, b) => b.valor - a.valor);
    titulo = 'Participacao por equipe';
    subtitulo = 'clique numa equipe para ver os membros';
    onClickFatia = (d) => {
      if (d?.semMembros) return;
      setEquipeId(d.chave);
      setNivel('membros');
    };
  } else {
    dados = (equipeSel?.membros ?? [])
      .map((m) => ({ chave: m.id, nome: m.nome, valor: m.novaMeta }))
      .sort((a, b) => b.valor - a.valor);
    titulo = `Membros: ${equipeSel?.nome ?? ''}`;
    subtitulo = 'participacao de cada membro na meta da equipe';
  }

  const total = dados.reduce((acc, d) => acc + d.valor, 0);
  const muitasFatias = dados.length > 8;

  const voltar = () => {
    if (nivel === 'membros') {
      setNivel('equipes');
      setEquipeId(null);
    } else if (nivel === 'equipes') {
      setNivel('geral');
    }
  };

  return (
    <div className="card chart-card">
      <div className="card-titulo chart-card-titulo">
        <div>
          <span>{titulo}</span>
          <p className="chart-card-sub">{subtitulo}</p>
        </div>
        {nivel !== 'geral' && (
          <button type="button" className="link-btn" onClick={voltar}>
            &lsaquo; Voltar
          </button>
        )}
      </div>

      <div
        className="chart-card-corpo"
        style={{ height: 340, cursor: nivel === 'geral' ? 'pointer' : 'default' }}
        onClick={nivel === 'geral' ? () => setNivel('equipes') : undefined}
      >
        {dados.length === 0 ? (
          <div className="skeleton">Esta equipe nao tem membros.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dados}
                dataKey="valor"
                nameKey="nome"
                cx="50%"
                cy="50%"
                outerRadius="80%"
                innerRadius={nivel === 'geral' ? '45%' : 0}
                paddingAngle={muitasFatias ? 1 : 0}
                stroke="#fff"
                strokeWidth={1}
                label={muitasFatias ? false : (d) => `${((d.value / total) * 100).toFixed(0)}%`}
                labelLine={false}
                onClick={onClickFatia}
                style={onClickFatia ? { cursor: 'pointer' } : undefined}
              >
                {dados.map((d, i) => (
                  <Cell key={d.chave} fill={corPorIndice(i)} />
                ))}
              </Pie>
              <Tooltip content={<TooltipBRL total={total} />} />
              <Legend
                layout={muitasFatias ? 'vertical' : 'horizontal'}
                align={muitasFatias ? 'right' : 'center'}
                verticalAlign={muitasFatias ? 'middle' : 'bottom'}
                wrapperStyle={{ fontSize: muitasFatias ? 11 : 12, maxWidth: 160, overflow: 'hidden' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
