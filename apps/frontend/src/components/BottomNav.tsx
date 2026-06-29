import { NavLink } from 'react-router-dom';
import {
  IconHome,
  IconSearch,
  IconAdd,
  IconHeart,
  IconUser,
} from '@/components/icons/InstagramIcons';

const links = [
  { to: '/feed', label: 'Лента', Icon: IconHome },
  { to: '/search', label: 'Ҷустуҷӯ', Icon: IconSearch },
  { to: '/create', label: 'Илова', Icon: IconAdd },
  { to: '/notifications', label: 'Огоҳӣ', Icon: IconHeart },
  { to: '/profile', label: 'Профил', Icon: IconUser },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-ig-border bg-black pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) =>
              `flex flex-col items-center px-3 py-1 transition-opacity ${
                isActive ? 'text-white opacity-100' : 'text-white opacity-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-6 w-6" filled={isActive && (to === '/feed' || to === '/profile')} />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
