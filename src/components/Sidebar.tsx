import { useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AppContext } from '../App';
import {
  Sparkles, Pencil, MessageSquare, Eye, Image, Users, Settings,
  LayoutDashboard, FolderOpen, BookOpen, Shield
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'AI Hub' },
  { to: '/generate', icon: Sparkles, label: '图像生成' },
  { to: '/edit', icon: Pencil, label: '图像编辑' },
  { to: '/chat', icon: MessageSquare, label: 'AI 对话' },
  { to: '/multimodal', icon: Eye, label: '多模态分析' },
  { to: '/gallery', icon: FolderOpen, label: '作品画廊' },
  { to: '/knowledge', icon: BookOpen, label: '知识库' },
];

export default function Sidebar() {
  const { user } = useContext(AppContext);
  const location = useLocation();
  const isAdmin = user && ['super_admin', 'admin'].includes(user.role);

  return (
    <aside className="w-64 bg-bg-secondary border-r border-border flex flex-col flex-shrink-0">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-secondary flex items-center justify-center text-white text-sm font-bold">
            AI
          </div>
          <div>
            <h1 className="text-sm font-bold bg-gradient-to-r from-accent to-accent-secondary bg-clip-text text-transparent">
              Image Studio Pro
            </h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider px-3 pt-3 pb-1">创作</div>
        {navItems.slice(0, 6).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}

        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider px-3 pt-4 pb-1">管理</div>
        {navItems.slice(6).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-2 ${
                isActive || location.pathname.startsWith('/admin')
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`
            }
          >
            <Shield size={18} />
            管理后台
          </NavLink>
        )}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary">
          <Users size={18} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary truncate">{user?.display_name || user?.username}</p>
            <p className="text-xs text-text-muted">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
