interface Props { size?: number; className?: string; }

export function CloudflareIcon({ size = 24, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.5 15.5c.28-.97.17-1.87-.33-2.53-.46-.6-1.17-.95-2.02-.98l-.13-.01c-.07-.01-.12-.07-.12-.14l-.03-.22c-.13-.97-.65-1.85-1.46-2.45-.81-.6-1.82-.84-2.82-.67-1.78.3-3.05 1.93-2.98 3.8v.06H6.6a2.4 2.4 0 0 0 0 4.8h9.54c.85 0 1.6-.58 1.83-1.41l.53-.25z" />
      <path d="M18.8 12.7c-.1-.02-.2-.02-.3-.02-.07 0-.14.04-.17.1l-.08.27c-.1.37-.42.62-.8.62h-5.93c-.44 0-.8.36-.8.8s.36.8.8.8h6.65c.72 0 1.35-.49 1.52-1.2l.03-.13a1.3 1.3 0 0 0-.92-1.24z" opacity="0.7" />
    </svg>
  );
}
