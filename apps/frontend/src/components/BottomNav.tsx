import { NavLink } from 'react-router-dom';

const links = [
  { to: '/feed', label: 'Лента', icon: '🎬' },
  { to: '/search', label: 'Ҷустуҷӯ', icon: '🔍' },
  { to: '/profile', label: 'Профил', icon: '👤' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/10 bg-black/80 px-4 py-2 backdrop-blur-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-xs transition-colors ${
              isActive ? 'text-white' : 'text-white/50'
            }`
          }
        >
          <span className="text-xl">{link.icon}</span>
          <span>{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
