import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Plus, Loader2, Bot, Sparkles, Gem } from 'lucide-react';

interface AgentItem {
  id: number;
  agent_key: string;
  name: string;
  type: 'agent' | 'gpt' | 'gem';
  category: string;
  visible_description: string | null;
  default_model_id: string | null;
  is_enabled: number;
}

const typeIcons: Record<string, any> = {
  agent: Bot,
  gpt: Sparkles,
  gem: Gem,
};

const typeLabels: Record<string, string> = {
  agent: 'Agent',
  gpt: 'GPT',
  gem: 'Gem',
};

export default function AdminAgents() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    agent_key: '', name: '', type: 'agent' as const, category: 'general',
    visible_description: '', hidden_system_prompt: '', hidden_sop: '',
    default_model_id: 'gpt-4o', allowed_roles: ['admin', 'designer', 'operator'],
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const data = await api.admin.agents.list(); setAgents(data); }
    finally { setLoading(false); }
  };

  const create = async () => {
    try {
      await api.admin.agents.create(form);
      setShowForm(false);
      setForm({ agent_key: '', name: '', type: 'agent', category: 'general', visible_description: '', hidden_system_prompt: '', hidden_sop: '', default_model_id: 'gpt-4o', allowed_roles: ['admin', 'designer', 'operator'] });
      load();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : '创建失败'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Agent / GPT / Gem 管理</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-accent to-accent-secondary rounded-lg text-white text-sm font-medium hover:opacity-90">
          <Plus size={16} /> 新增
        </button>
      </div>

      {showForm && (
        <div className="p-5 rounded-xl bg-bg-card border border-border space-y-3 max-w-2xl">
          <h3 className="text-sm font-semibold">新增 Agent / GPT / Gem</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="唯一标识 (如 creative)" value={form.agent_key} onChange={e => setForm({ ...form, agent_key: e.target.value })} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent" />
            <input placeholder="名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent" />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent">
              <option value="agent">Agent</option>
              <option value="gpt">GPT</option>
              <option value="gem">Gem</option>
            </select>
            <select value={form.default_model_id} onChange={e => setForm({ ...form, default_model_id: e.target.value })} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent">
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4">gpt-4</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              <option value="claude-3">claude-3</option>
            </select>
            <input placeholder="分类" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent" />
            <input placeholder="可见描述" value={form.visible_description} onChange={e => setForm({ ...form, visible_description: e.target.value })} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent" />
          </div>
          <textarea placeholder="系统提示词 (管理员可见)" value={form.hidden_system_prompt} onChange={e => setForm({ ...form, hidden_system_prompt: e.target.value })} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent min-h-[60px]" />
          <textarea placeholder="隐藏 SOP (管理员可见)" value={form.hidden_sop} onChange={e => setForm({ ...form, hidden_sop: e.target.value })} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent min-h-[60px]" />
          <div className="flex gap-2">
            <button onClick={create} className="px-4 py-2 bg-accent rounded-lg text-white text-sm font-medium hover:opacity-90">创建</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-secondary hover:bg-bg-hover">取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20"><Loader2 size={32} className="animate-spin text-accent mx-auto" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(a => {
            const Icon = typeIcons[a.type] || Bot;
            return (
              <div key={a.id} className={`p-4 rounded-xl bg-bg-card border transition-all hover:-translate-y-0.5 ${a.is_enabled ? 'border-border hover:border-accent/50' : 'border-red-500/30 opacity-60'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.type === 'gpt' ? 'bg-accent/20' : a.type === 'gem' ? 'bg-purple-500/20' : 'bg-bg-tertiary'}`}>
                    <Icon size={16} className={a.type === 'gpt' ? 'text-accent' : a.type === 'gem' ? 'text-purple-400' : 'text-text-secondary'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{a.name}</p>
                    <p className="text-[11px] text-text-muted">{a.agent_key} · {typeLabels[a.type]}</p>
                  </div>
                </div>
                <p className="text-xs text-text-secondary line-clamp-2 mb-2">{a.visible_description || '暂无描述'}</p>
                <div className="flex items-center justify-between text-[11px] text-text-muted">
                  <span>{a.category}</span>
                  <span>{a.default_model_id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
