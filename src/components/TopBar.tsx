import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../App';
import { LogOut, Zap } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'AI Hub',
  '/generate': '图像生成',
  '/edit': '图像编辑',
  '/chat': 'AI 对话助手',
  '/multimodal': '多模态分析',
  '/gallery': '作品画廊',
  '/knowledge': '知识库',
  '/admin': '管理后台',
  '/admin/users': '用户管理',
  '/admin/models': '模型管理',
  '/admin/agents': 'Agent 管理',
};

export default function TopBar() {
  const { user, logout } = useContext(AppContext);
  const location = useLocation();

  const title = pageTitles[location.pathname] || 'AI Image Studio Pro';

  return (
    <header className="h-14 bg-bg-secondary border-b border-border flex items-center justify-between px-6 flex-shrink-0">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-bg-tertiary border border-border">
          <Zap size={14} className="text-accent" />
          <span className="text-text-muted">额度:</span>
          <span className="text-text-secondary">{user?.daily_image_quota || 50}/日</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-bg-hover"
        >
          <LogOut size={14} />
          退出
        </button>
      </div>
    </header>
  );
}
