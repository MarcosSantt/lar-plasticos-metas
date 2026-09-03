import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

/**
 * Faixa + chuva de confetes quando `ativo` fica true (meta batida).
 * Dispara uma vez por "virada"; rearma quando `ativo` volta a false.
 */
export default function Comemoracao({ ativo, texto = 'Meta batida! Parabens, time! 🎉' }) {
  const jaComemorou = useRef(false);

  useEffect(() => {
    if (ativo && !jaComemorou.current) {
      jaComemorou.current = true;
      dispararConfetes();
    }
    if (!ativo) jaComemorou.current = false;
  }, [ativo]);

  if (!ativo) return null;
  return (
    <div className="comemoracao-faixa" role="status">
      <span>🎉</span> {texto} <span>🎉</span>
    </div>
  );
}

function dispararConfetes() {
  const duracao = 1800;
  const fim = Date.now() + duracao;

  confetti({ particleCount: 140, spread: 100, startVelocity: 45, origin: { y: 0.6 } });

  (function jatoLateral() {
    confetti({ particleCount: 7, angle: 60, spread: 60, origin: { x: 0 } });
    confetti({ particleCount: 7, angle: 120, spread: 60, origin: { x: 1 } });
    if (Date.now() < fim) requestAnimationFrame(jatoLateral);
  })();
}
