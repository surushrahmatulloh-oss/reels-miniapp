type IconProps = { className?: string; filled?: boolean };

export function IconHome({ className, filled }: IconProps) {
  return filled ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.4l9.6 7.2v11.2a1.2 1.2 0 01-1.2 1.2H14.4V14.4H9.6v7.6H3.6A1.2 1.2 0 012.4 20.8V9.6L12 2.4z" />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10.5V20a1 1 0 001 1h5v-7h6v7h5a1 1 0 001-1V10.5L12 3 3 10.5z" />
    </svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" strokeLinecap="round" />
    </svg>
  );
}

export function IconAdd({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

export function IconHeart({ className, filled }: IconProps) {
  return filled ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21s-8-4.7-8-11.2C4 6.5 6.5 4 9.5 4c1.7 0 3.3.8 4.5 2.1C15.2 4.8 16.8 4 18.5 4 21.5 4 24 6.5 24 9.8 24 16.3 16 21 12 21z" transform="scale(0.85) translate(2 1)" />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
    </svg>
  );
}

export function IconUser({ className, filled }: IconProps) {
  return filled ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7H4z" />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function IconComment({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 11.5a8.4 8.4 0 01-8.4 8.4H7l-4 3v-6.2A8.4 8.4 0 0112.6 3 8.4 8.4 0 0121 11.5z" />
    </svg>
  );
}

export function IconShare({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 3L11 14M22 3l-7 18-4-7-7-4 18-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBookmark({ className, filled }: IconProps) {
  return filled ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 2h12a1 1 0 011 1v19l-7-4-7 4V3a1 1 0 011-1z" />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 2h12a1 1 0 011 1v19l-7-4-7 4V3a1 1 0 011-1z" />
    </svg>
  );
}

export function IconMusic({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3v10.5a3.5 3.5 0 11-2-3.2V7l8-2v8.5a3.5 3.5 0 11-2-3.2V3h-4z" />
    </svg>
  );
}

export function IconReels({ className, filled }: IconProps) {
  return filled ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm6.5 4.5v5l5-2.5-5-2.5z" />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M10 8.5v7l6-3.5-6-3.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}
