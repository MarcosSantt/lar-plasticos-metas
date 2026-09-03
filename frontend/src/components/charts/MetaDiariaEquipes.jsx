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
import { COR_PRIMARIA, COR_ALERTA, COR_TRILHA, eixoBRL } from './paleta.js';
import TooltipBRL from './TooltipBRL.jsx';
import { brlCompacto } from '../../utils/format.js';

/**
 * Quanto cada equipe precisa vender POR DIA para bater a meta no prazo:
 *   (nova meta - realizado) / dias que faltam.
 * Barra negativa = equipe ja passou da meta.
 */
export default function MetaDiariaEquipes({ equipes }) {
  const dados = equipes
    .map((e) => ({
      nome: e.nome,
      valor: e.execucao?.metaDiariaNecessaria ?? 0,
    }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} layout="vertical" margin={{ left: 12, right: 64, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={COR_TRILHA} />
        <XAxis type="number" tickFormatter={eixoBRL} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 12 }} tickLine={false} />
        <Tooltip content={<TooltipBRL />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Bar dataKey="valor" name="Meta diaria p/ bater a meta" radius={[0, 4, 4, 0]}>
          {dados.map((d) => (
            <Cell key={d.nome} fill={d.valor < 0 ? COR_PRIMARIA : COR_ALERTA} />
          ))}
          <LabelList
            dataKey="valor"
            position="right"
            formatter={(v) => brlCompacto(v) + '/dia'}
            style={{ fontSize: 10, fill: '#2f3640' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
