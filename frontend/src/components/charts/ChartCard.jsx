export default function ChartCard({ titulo, subtitulo, children, altura = 300, acao, className = '' }) {
  return (
    <div className={`card chart-card ${className}`.trim()}>
      <div className="card-titulo chart-card-titulo">
        <div>
          <span>{titulo}</span>
          {subtitulo && <p className="chart-card-sub">{subtitulo}</p>}
        </div>
        {acao}
      </div>
      <div className="chart-card-corpo" style={{ height: altura }}>
        {children}
      </div>
    </div>
  );
}
