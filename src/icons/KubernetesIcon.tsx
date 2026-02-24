interface Props { size?: number; className?: string; }

export function KubernetesIcon({ size = 24, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2 20,7 20,17 12,22 4,17 4,7" />
      <circle cx="12" cy="12" r="2.5" />
      <line x1="12" y1="4.5" x2="12" y2="9.5" />
      <line x1="12" y1="14.5" x2="12" y2="19.5" />
      <line x1="7" y1="7" x2="10.5" y2="10.5" />
      <line x1="13.5" y1="13.5" x2="17" y2="17" />
      <line x1="17" y1="7" x2="13.5" y2="10.5" />
      <line x1="10.5" y1="13.5" x2="7" y2="17" />
    </svg>
  );
}
