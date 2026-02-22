interface Props { size?: number; className?: string; }

export function KafkaIcon({ size = 24, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="5" cy="7" r="2" />
      <circle cx="19" cy="7" r="2" />
      <circle cx="5" cy="17" r="2" />
      <circle cx="19" cy="17" r="2" />
      <line x1="9.5" y1="10.5" x2="7" y2="8.5" />
      <line x1="14.5" y1="10.5" x2="17" y2="8.5" />
      <line x1="9.5" y1="13.5" x2="7" y2="15.5" />
      <line x1="14.5" y1="13.5" x2="17" y2="15.5" />
    </svg>
  );
}
