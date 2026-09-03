import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { corPorIndice } from './paleta.js';
import TooltipBRL from './TooltipBRL.jsx';

/**
 * Participacao de cada vendedor no valor total das novas metas.
 * `campo` permite trocar entre 'novaMeta' e 'realizado'.
 */
export default function PizzaVendedores({ vendedores, campo = 'novaMeta' }) {
  const dados = vendedores
    .map((v) => ({ nome: v.nome, equipe: v.equipeNome, valor: v[campo] }))
    .filter((d) => d.valor > 0)
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
          outerRadius="78%"
          innerRadius="45%"
          paddingAngle={1}
          stroke="#fff"
          strokeWidth={1}
        >
          {dados.map((d, i) => (
            <Cell key={d.nome} fill={corPorIndice(i)} />
          ))}
        </Pie>
        <Tooltip content={<TooltipBRL total={total} />} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          wrapperStyle={{ fontSize: 11, maxWidth: 150, overflow: 'hidden' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
