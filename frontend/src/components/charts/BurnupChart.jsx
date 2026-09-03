import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { brl } from '../../utils/format.js';
import { COR_PRIMARIA, COR_ALERTA, COR_TRILHA, eixoBRL } from './paleta.js';

/**
 * Burn-up: realizado acumulado x meta acumulada (linha ideal), com projecao
 * pontilhada ate o fim do periodo e marcador do dia previsto de atingimento.
 */
export default function BurnupChart({ burnup }) {
  const { serie, meta, diasUteisTotais, diaPrevisto, atingeNoPrazo } = burnup;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={serie} margin={{ left: 6, right: 12, top: 8, bottom: 24 }}>
        <defs>
          <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COR_PRIMARIA} stopOpacity={0.28} />
            <stop offset="100%" stopColor={COR_PRIMARIA} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={COR_TRILHA} />
        <XAxis
          dataKey="dia"
          tick={{ fontSize: 11 }}
          label={{ value: 'dia util', position: 'insideBottom', offset: -12, fontSize: 11 }}
        />
        <YAxis tickFormatter={eixoBRL} tick={{ fontSize: 11 }} width={74} />
        <Tooltip
          formatter={(v, nome) => [brl(v), nome]}
          labelFormatter={(d) => `Dia util ${d}`}
          contentStyle={{ fontSize: 12, borderRadius: 10 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />

        <ReferenceLine
          y={meta}
          stroke={COR_ALERTA}
          strokeDasharray="4 4"
          label={{ value: 'meta', position: 'right', fontSize: 11, fill: COR_ALERTA }}
        />
        <ReferenceLine
          x={diasUteisTotais}
          stroke="#9aa7b0"
          strokeDasharray="2 4"
          label={{ value: 'fim', position: 'top', fontSize: 11, fill: '#7c8a99' }}
        />
        {Number.isFinite(diaPrevisto) && (
          <ReferenceLine
            x={Math.round(diaPrevisto)}
            stroke={atingeNoPrazo ? COR_PRIMARIA : '#e74c3c'}
            label={{
              value: `previsto: dia ${Math.round(diaPrevisto)}`,
              position: 'insideTopRight',
              fontSize: 11,
              fill: atingeNoPrazo ? COR_PRIMARIA : '#e74c3c',
            }}
          />
        )}

        <Area
          type="monotone"
          dataKey="realizado"
          name="Realizado (acum.)"
          stroke={COR_PRIMARIA}
          strokeWidth={2}
          fill="url(#gradReal)"
          connectNulls
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="ideal"
          name="Meta acumulada (ideal)"
          stroke="#9aa7b0"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="projecao"
          name="Projecao no ritmo atual"
          stroke={COR_PRIMARIA}
          strokeWidth={2}
          strokeDasharray="5 5"
          connectNulls
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
