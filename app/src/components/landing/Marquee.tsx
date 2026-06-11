/** Carrossel infinito das redes + protocolos que a Mazari usa. Grayscale → cor no hover, pausa no hover. */
const LOGOS: { name: string; src: string }[] = [
  // redes
  { name: 'Ethereum', src: '/logos/chains/ethereum.svg' },
  { name: 'Base', src: '/logos/chains/base.svg' },
  { name: 'Arbitrum', src: '/logos/chains/arbitrum.svg' },
  { name: 'BNB Chain', src: '/logos/chains/bsc.svg' },
  { name: 'Polygon', src: '/logos/chains/polygon.svg' },
  { name: 'Optimism', src: '/logos/chains/optimism.svg' },
  { name: 'Avalanche', src: '/logos/chains/avalanche.svg' },
  // protocolos
  { name: 'Aave', src: '/logos/protocols/aave.png' },
  { name: 'Morpho', src: '/logos/protocols/morpho.png' },
  { name: 'Compound', src: '/logos/protocols/compound.png' },
  { name: 'Fluid', src: '/logos/protocols/fluid.png' },
  { name: 'Beefy', src: '/logos/protocols/beefy.png' },
  { name: 'Pendle', src: '/logos/protocols/pendle.jpg' },
  { name: 'Spark', src: '/logos/protocols/spark.jpg' },
  { name: 'Moonwell', src: '/logos/protocols/moonwell.jpg' },
];

export function Marquee() {
  return (
    <div className="marquee">
      <div className="marquee-track">
        {[...LOGOS, ...LOGOS].map((l, i) => (
          <div key={i} className="marquee-item" title={l.name} aria-hidden={i >= LOGOS.length}>
            <img src={l.src} alt={l.name} loading="lazy" draggable={false} className="h-7 w-7 rounded-md object-contain" />
            <span className="font-mono whitespace-nowrap text-sm text-ftext">{l.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
