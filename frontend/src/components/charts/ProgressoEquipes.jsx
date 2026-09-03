import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';
import { COR_PRIMARIA, COR_ALERTA, COR_CRITICO, COR_TRILHA, eixoBRL } from './paleta.js';
import TooltipBRL from './TooltipBRL.jsx';

const corStatus = (pct) => (pct >= 1 ? COR_PRIMARIA : pct >= 0.6 ? COR_ALERTA : COR_CRITICO);

/**
 * Quanto cada equipe ja percorreu ate a nova meta (realizado x restante),
 * barras horizontais empilhadas com rotulo de % atingido.
 */
export default function ProgressoEquipes({ equipes }) {
  const dados = equipes
    .map((e) => ({
      nome: e.nome,
      realizado: e.realizado,
      restante: Math.max(e.novaMeta - e.realizado, 0),
      meta: e.novaMeta,
      pct: e.execucao?.pctAtingido ?? 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} layout="vertical" margin={{ left: 12, right: 48, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={COR_TRILHA} />
        <XAxis type="number" tickFormatter={eixoBRL} tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="nome"
          width={110}
          tick={{ fontSize: 12 }}
          tickLine={false}
        />
        <Tooltip content={<TooltipBRL />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Bar dataKey="realizado" name="Realizado" stackId="a" radius={[4, 0, 0, 4]}>
          {dados.map((d) => (
            <Cell key={d.nome} fill={corStatus(d.pct)} />
          ))}
        </Bar>
        <Bar dataKey="restante" name="Falta" stackId="a" fill={COR_TRILHA} radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="pct"
            position="right"
            formatter={(v) => `${(v * 100).toFixed(0)}%`}
            style={{ fontSize: 11, fill: '#2f3640', fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
