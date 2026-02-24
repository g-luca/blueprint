interface Props { size?: number; className?: string; }

export function StorageIcon({ size = 24, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16v12H4z" rx="1" />
      <path d="M4 6l8-3 8 3" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
