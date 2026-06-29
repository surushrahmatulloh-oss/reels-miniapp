import { NavLink } from 'react-router-dom';
import {
  IconHome,
  IconSearch,
  IconAdd,
  IconReels,
} from '@/components/icons/InstagramIcons';
import { useAuthStore } from '@/store';

const links = [
  { to: '/feed', label: 'Лента', Icon: IconHome, isAvatar: false },
  { to: '/search', label: 'Ҷустуҷӯ', Icon: IconSearch, isAvatar: false },
  { to: '/create', label: 'Илова', Icon: IconAdd, isAvatar: false },
  { to: '/reels', label: 'Reels', Icon: IconReels, isAvatar: false },
  { to: '/profile', label: 'Профил', Icon: null, isAvatar: true },
] as const;

export function BottomNav() {
  const user = useAuthStore((s) => s.user);
  const avatar = user?.avatarUrl || `https://i.pravatar.cc/80?u=${user?.username ?? 'me'}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-ig-border bg-black pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1.5">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1">
        {links.map(({ to, label, Icon, isAvatar }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) =>
              `flex min-w-[48px] flex-col items-center justify-center px-2 py-1.5 transition-opacity ${
                isActive ? 'opacity-100' : 'opacity-50'
              }`
            }
          >
            {({ isActive }) =>
              isAvatar ? (
                <div
                  className={`rounded-full p-[1.5px] ${
                    isActive ? 'ig-gradient-ring' : 'bg-transparent'
                  }`}
                >
                  <img
                    src={avatar}
                    alt=""
                    className="h-[26px] w-[26px] rounded-full border border-ig-border object-cover bg-black"
                  />
                </div>
              ) : (
                <Icon
                  className="h-7 w-7 text-white"
                  filled={isActive && (to === '/feed' || to === '/reels')}
                />
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
