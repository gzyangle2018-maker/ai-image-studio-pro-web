import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Image, Video, ListChecks, DollarSign, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [usage, setUsage] = useState<any[]>([]);

  useEffect(() => {
    api.admin.usageSummary().then(setSummary).catch(() => {});
    api.usage.get(30).then(setUsage).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">管理仪表盘</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Image} label="今日图片" value={summary?.today?.images || 0} sub={`月: ${summary?.month?.images || 0}`} />
        <StatCard icon={Video} label="今日视频" value={summary?.today?.videos || 0} sub={`月: ${summary?.month?.videos || 0}`} />
        <StatCard icon={ListChecks} label="今日任务" value={summary?.tasks?.total || 0} sub={`完成: ${summary?.tasks?.completed || 0} 失败: ${summary?.tasks?.failed || 0}`} />
        <StatCard icon={DollarSign} label="今日消耗" value={`$${(summary?.today?.cost || 0).toFixed(4)}`} sub={`月: $${(summary?.month?.cost || 0).toFixed(2)}`} />
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">最近 30 天用量</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="text-left px-3 py-2 font-medium">日期</th>
                <th className="text-right px-3 py-2 font-medium">图片</th>
                <th className="text-right px-3 py-2 font-medium">视频</th>
                <th className="text-right px-3 py-2 font-medium">文本</th>
                <th className="text-right px-3 py-2 font-medium">成本</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u.date} className="border-b border-border/50 hover:bg-bg-hover">
                  <td className="px-3 py-2">{u.date}</td>
                  <td className="px-3 py-2 text-right">{u.image_count}</td>
                  <td className="px-3 py-2 text-right">{u.video_count}</td>
                  <td className="px-3 py-2 text-right">{u.text_count}</td>
                  <td className="px-3 py-2 text-right">${Number(u.cost || 0).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub: string }) {
  return (
    <div className="p-4 rounded-xl bg-bg-card border border-border">
      <div className="flex items-center gap-2 text-text-muted mb-2">
        <Icon size={16} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-text-muted mt-1 flex items-center gap-1">
        <TrendingUp size={12} />
        {sub}
      </div>
    </div>
  );
}
