import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { COR_PRIMARIA, COR_ALERTA, COR_TRILHA, eixoBRL } from './paleta.js';
import TooltipBRL from './TooltipBRL.jsx';

/**
 * Quanto cada vendedor precisa vender por dia:
 *  - metaDiaria: ritmo linear ideal (novaMeta / dias uteis totais)
 *  - ritmoNecessario: quanto falta / dias uteis restantes (ritmo para fechar no prazo)
 */
export default function MetaDiariaVendedores({ vendedores }) {
  const dados = vendedores
    .map((v) => ({
      nome: v.nome.split(' ')[0] + ' ' + (v.nome.split(' ')[1]?.[0] ?? '') + '.',
      nomeCompleto: v.nome,
      metaDiaria: v.execucao?.metaDiaria ?? 0,
      ritmoNecessario: v.execucao?.ritmoDiarioNecessario ?? 0,
    }))
    .sort((a, b) => b.ritmoNecessario - a.ritmoNecessario);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} margin={{ left: 4, right: 8, top: 8, bottom: 60 }} barGap={2}>
        <CartesianGrid vertical={false} stroke={COR_TRILHA} />
        <XAxis
          dataKey="nome"
          angle={-40}
          textAnchor="end"
          interval={0}
          height={60}
          tick={{ fontSize: 10 }}
        />
        <YAxis tickFormatter={eixoBRL} tick={{ fontSize: 11 }} width={70} />
        <Tooltip content={<TooltipBRL />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="metaDiaria" name="Meta diaria (ideal)" fill={COR_PRIMARIA} radius={[3, 3, 0, 0]} />
        <Bar
          dataKey="ritmoNecessario"
          name="Ritmo p/ fechar no prazo"
          fill={COR_ALERTA}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
