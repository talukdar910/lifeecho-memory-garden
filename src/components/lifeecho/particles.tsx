// Decorative rising light motes. Deterministic positions so SSR and client match.
const MOTES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 2 + ((i * 7) % 4),
  delay: (i * 1.3) % 14,
  duration: 10 + ((i * 5) % 9),
}));

export function Particles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="absolute bottom-0 animate-rise rounded-full bg-aurora shadow-glow"
          style={{
            left: `${m.left}%`,
            width: m.size,
            height: m.size,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
