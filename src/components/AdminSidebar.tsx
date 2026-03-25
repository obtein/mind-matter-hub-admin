import { NavLink, useNavigate } from 'react-router-dom';
import { Monitor, ScrollText, Terminal, Users, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const navItems = [
  { to: '/devices', label: 'Cihazlar', icon: Monitor },
  { to: '/logs', label: 'Loglar', icon: ScrollText },
  { to: '/commands', label: 'Komutlar', icon: Terminal },
  { to: '/users', label: 'Kullanıcılar', icon: Users },
];

export default function AdminSidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info('Çıkış yapıldı');
    navigate('/login');
  };

  return (
    <aside className="w-56 bg-slate-800 min-h-screen flex flex-col border-r border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white">PsiTrak Admin</h2>
        <p className="text-xs text-slate-400">Kontrol Paneli</p>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded text-sm mb-1 transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-2 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded text-sm text-slate-300 hover:bg-slate-700 w-full transition-colors"
        >
          <LogOut size={18} />
          Çıkış
        </button>
      </div>
    </aside>
  );
}
