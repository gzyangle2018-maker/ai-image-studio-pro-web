import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, Cpu, Bot, Settings, ChevronLeft
} from 'lucide-react';

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/admin/users', icon: Users, label: '用户管理' },
  { to: '/admin/models', icon: Cpu, label: '模型管理' },
  { to: '/admin/agents', icon: Bot, label: 'Agent 管理' },
];

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-bg-primary text-white overflow-hidden">
      <aside className="w-56 bg-bg-secondary border-r border-border flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-border">
          <NavLink to="/" className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
            <ChevronLeft size={16} />
            返回前台
          </NavLink>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-1">
          {adminNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
