import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  Sparkles, Pencil, MessageSquare, Eye, FolderOpen,
  TrendingUp, Image, Video, ListChecks, DollarSign
} from 'lucide-react';

interface UsageSummary {
  today: { images: number; videos: number; texts: number; cost: number } | null;
  month: { images: number; videos: number; texts: number; cost: number } | null;
  tasks: { total: number; completed: number; failed: number } | null;
}

const shortcuts = [
  { to: '/generate', icon: Sparkles, label: '图像生成', desc: '文生图 / 图生图', color: 'from-violet-500 to-purple-600' },
  { to: '/edit', icon: Pencil, label: '图像编辑', desc: '重绘 / 扩图 / 抠图', color: 'from-blue-500 to-cyan-600' },
  { to: '/chat', icon: MessageSquare, label: 'AI 对话', desc: 'GPTs / Agent 对话', color: 'from-emerald-500 to-teal-600' },
  { to: '/multimodal', icon: Eye, label: '多模态分析', desc: '图像理解 / 分析', color: 'from-orange-500 to-amber-600' },
];

export default function Hub() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.admin.usageSummary().catch(() => null),
      api.tasks.list().catch(() => []),
    ]).then(([sum, t]) => {
      setSummary(sum);
      setTasks(t.slice(0, 5));
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Image}
          label="今日图片"
          value={summary?.today?.images?.toString() || '0'}
          trend={`月: ${summary?.month?.images || 0}`}
        />
        <StatCard
          icon={Video}
          label="今日视频"
          value={summary?.today?.videos?.toString() || '0'}
          trend={`月: ${summary?.month?.videos || 0}`}
        />
        <StatCard
          icon={ListChecks}
          label="今日任务"
          value={summary?.tasks?.total?.toString() || '0'}
          trend={`完成: ${summary?.tasks?.completed || 0}`}
        />
        <StatCard
          icon={DollarSign}
          label="今日消耗"
          value={`$${(summary?.today?.cost || 0).toFixed(4)}`}
          trend={`月: $${(summary?.month?.cost || 0).toFixed(2)}`}
        />
      </div>

      {/* Shortcuts */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-3">快捷入口</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {shortcuts.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group p-5 rounded-xl bg-bg-card border border-border hover:border-accent/50 transition-all hover:-translate-y-0.5"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                <s.icon size={20} className="text-white" />
              </div>
              <h4 className="font-medium text-sm">{s.label}</h4>
              <p className="text-xs text-text-muted mt-0.5">{s.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Tasks */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-3">最近任务</h3>
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-text-muted text-sm">加载中...</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">暂无任务</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="text-left px-4 py-3 font-medium">类型</th>
                  <th className="text-left px-4 py-3 font-medium">模型</th>
                  <th className="text-left px-4 py-3 font-medium">状态</th>
                  <th className="text-left px-4 py-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-bg-hover">
                    <td className="px-4 py-3">{t.task_type}</td>
                    <td className="px-4 py-3 text-text-secondary">{t.model_id}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">{new Date(t.created_at).toLocaleString('zh-CN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend }: { icon: any; label: string; value: string; trend: string }) {
  return (
    <div className="p-4 rounded-xl bg-bg-card border border-border">
      <div className="flex items-center gap-2 text-text-muted mb-2">
        <Icon size={16} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-text-muted mt-1 flex items-center gap-1">
        <TrendingUp size={12} />
        {trend}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    running: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    completed: 'bg-green-500/10 text-green-400 border-green-500/30',
    failed: 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  const labels: Record<string, string> = {
    pending: '排队中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}
