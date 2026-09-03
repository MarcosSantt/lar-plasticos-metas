import { brl, brlComSinal } from '../utils/format.js';

export default function ResumoCards({ resultado }) {
  if (!resultado) return null;
  const { parametros, totais } = resultado;

  const cards = [
    {
      rotulo: 'Meta Global',
      valor: brl(parametros.metaGlobal),
      sub: 'valor informado',
      destaque: true,
    },
    {
      rotulo: 'Fator de redistribuicao',
      valor: `${parametros.fatorGlobal.toLocaleString('pt-BR', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      })} x`,
      sub: `base ${brl(parametros.montanteBaseAntigo)}`,
    },
    {
      rotulo: 'Total redistribuido (equipes)',
      valor: brl(totais.totalNovoEquipes),
      sub: `antes: ${brl(totais.totalAntigoEquipes)}`,
    },
    {
      rotulo: 'Variacao total das equipes',
      valor: brlComSinal(totais.totalNovoEquipes - totais.totalAntigoEquipes),
      sub: 'equipes exibidas',
    },
  ];

  return (
    <div className="resumo">
      {cards.map((c) => (
        <div key={c.rotulo} className={`stat${c.destaque ? ' destaque' : ''}`}>
          <div className="rotulo">{c.rotulo}</div>
          <div className="valor">{c.valor}</div>
          <div className="sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
