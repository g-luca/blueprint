interface Props { size?: number; className?: string; }

export function RabbitMQIcon({ size = 24, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="18" height="11" rx="2" />
      <rect x="7" y="12" width="3" height="5" rx="0.5" />
      <rect x="14" y="12" width="3" height="5" rx="0.5" />
      <path d="M8 9V6a4 4 0 0 1 4-4v0a4 4 0 0 1 4 4v3" />
      <circle cx="16" cy="6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
