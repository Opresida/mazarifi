/** Logo oficial (lateral: ícone + texto). Em fundo escuro. */
export function Logo({ className = 'h-7 w-auto' }: { className?: string }) {
  return <img src="/logo.png" alt="Mazari Fi" className={className} draggable={false} />;
}
