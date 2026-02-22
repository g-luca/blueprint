interface Props { size?: number; className?: string; }

export function RedisIcon({ size = 24, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="8" rx="9" ry="3.5" />
      <path d="M3 8v3.5c0 1.933 4.029 3.5 9 3.5s9-1.567 9-3.5V8" />
      <path d="M3 11.5V16c0 1.933 4.029 3.5 9 3.5S21 17.933 21 16v-4.5" />
      <line x1="3" y1="8" x2="3" y2="16" />
      <line x1="21" y1="8" x2="21" y2="16" />
    </svg>
  );
}
