export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-lime/12 ring-1 ring-lime/30">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-lime)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20V4l8 9 8-9v16" />
        </svg>
      </div>
      <div className="font-display text-lg font-bold leading-none tracking-tight">
        <span className="text-ftext">MAZARI</span> <span className="text-lime">Fi</span>
      </div>
    </div>
  );
}
