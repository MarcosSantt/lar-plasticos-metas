import { brl, pct } from '../../utils/format.js';

/** Tooltip padrao: lista cada serie com valor em R$ e, opcionalmente, o % do total. */
export default function TooltipBRL({ active, payload, label, total }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label != null && <div className="chart-tooltip-titulo">{label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey ?? p.name} className="chart-tooltip-linha">
          <span className="ponto" style={{ background: p.color || p.payload?.fill }} />
          <span className="nome">{p.name}</span>
          <span className="valor">
            {brl(p.value)}
            {total ? ` (${pct(p.value / total)})` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
