import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Plus, Loader2, Shield, User, UserCog, Paintbrush } from 'lucide-react';

interface UserItem {
  id: number;
  username: string;
  display_name: string;
  email: string;
  role: string;
  is_active: number;
  created_at: string;
  daily_image_quota: number;
  daily_text_quota: number;
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  designer: 'Designer',
  operator: 'Operator',
};

const roleIcons: Record<string, any> = {
  super_admin: Shield,
  admin: UserCog,
  designer: Paintbrush,
  operator: User,
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', display_name: '', role: 'operator', daily_image_quota: 50 });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.admin.users.list();
      setUsers(data);
    } finally { setLoading(false); }
  };

  const create = async () => {
    try {
      await api.admin.users.create(form);
      setShowForm(false);
      setForm({ username: '', password: '', display_name: '', role: 'operator', daily_image_quota: 50 });
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '创建失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">用户管理</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-accent to-accent-secondary rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          新增用户
        </button>
      </div>

      {showForm && (
        <div className="p-5 rounded-xl bg-bg-card border border-border space-y-3 max-w-lg">
          <h3 className="text-sm font-semibold">新增用户</h3>
          <input placeholder="用户名" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent" />
          <input type="password" placeholder="密码" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent" />
          <input placeholder="显示名称" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent" />
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent">
            <option value="operator">Operator</option>
            <option value="designer">Designer</option>
            <option value="admin">Admin</option>
          </select>
          <div className="flex gap-2">
            <button onClick={create} className="px-4 py-2 bg-accent rounded-lg text-white text-sm font-medium hover:opacity-90">创建</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-secondary hover:bg-bg-hover">取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20"><Loader2 size={32} className="animate-spin text-accent mx-auto" /></div>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="text-left px-4 py-3 font-medium">用户</th>
                <th className="text-left px-4 py-3 font-medium">角色</th>
                <th className="text-left px-4 py-3 font-medium">图片额度</th>
                <th className="text-left px-4 py-3 font-medium">文本额度</th>
                <th className="text-left px-4 py-3 font-medium">状态</th>
                <th className="text-left px-4 py-3 font-medium">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const RoleIcon = roleIcons[u.role] || User;
                return (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-bg-hover">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{u.display_name || u.username}</p>
                        <p className="text-xs text-text-muted">{u.username}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs">
                        <RoleIcon size={14} className="text-accent" />
                        {roleLabels[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{u.daily_image_quota}/日</td>
                    <td className="px-4 py-3 text-text-secondary">{u.daily_text_quota}/日</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${u.is_active ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                        {u.is_active ? '活跃' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
