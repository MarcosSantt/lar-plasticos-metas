import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { corPorIndice } from './paleta.js';
import TooltipBRL from './TooltipBRL.jsx';

/** Participacao de cada equipe na soma das novas metas. */
export default function ParticipacaoEquipes({ equipes }) {
  const dados = equipes
    .map((e) => ({ nome: e.nome, valor: e.novaMeta }))
    .sort((a, b) => b.valor - a.valor);
  const total = dados.reduce((acc, d) => acc + d.valor, 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={dados}
          dataKey="valor"
          nameKey="nome"
          cx="50%"
          cy="50%"
          outerRadius="80%"
          label={(d) => `${((d.value / total) * 100).toFixed(0)}%`}
          labelLine={false}
          stroke="#fff"
          strokeWidth={1}
        >
          {dados.map((d, i) => (
            <Cell key={d.nome} fill={corPorIndice(i)} />
          ))}
        </Pie>
        <Tooltip content={<TooltipBRL total={total} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
