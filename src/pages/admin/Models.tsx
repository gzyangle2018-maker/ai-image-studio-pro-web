import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Plus, Loader2, Cpu, CheckCircle2, XCircle } from 'lucide-react';

interface ModelItem {
  id: number;
  model_id: string;
  display_name: string;
  provider: string;
  capability: string;
  api_key_env_name: string;
  is_active: number;
  sort_order: number;
}

export default function AdminModels() {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    model_id: '', provider: 'openai', display_name: '', api_base_url: '',
    api_key_env_name: 'OPENAI_API_KEY', model_name: '', capability: 'image',
    default_size: '1024x1024', sort_order: 0,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const data = await api.admin.models.list(); setModels(data); }
    finally { setLoading(false); }
  };

  const create = async () => {
    try {
      await api.admin.models.create(form);
      setShowForm(false);
      setForm({ model_id: '', provider: 'openai', display_name: '', api_base_url: '', api_key_env_name: 'OPENAI_API_KEY', model_name: '', capability: 'image', default_size: '1024x1024', sort_order: 0 });
      load();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : '创建失败'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">模型管理</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-accent to-accent-secondary rounded-lg text-white text-sm font-medium hover:opacity-90">
          <Plus size={16} /> 新增模型
        </button>
      </div>

      {showForm && (
        <div className="p-5 rounded-xl bg-bg-card border border-border space-y-3 max-w-2xl">
          <h3 className="text-sm font-semibold">新增模型</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="model_id (如 gpt-image-2)" value={form.model_id} onChange={e => setForm({ ...form, model_id: e.target.value })} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent" />
            <input placeholder="显示名称" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent" />
            <select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent">
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="nano-banana">Nano Banana</option>
              <option value="openai-compatible">OpenAI Compatible</option>
            </select>
            <select value={form.capability} onChange={e => setForm({ ...form, capability: e.target.value })} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent">
              <option value="image">image</option>
              <option value="text">text</option>
              <option value="vision">vision</option>
              <option value="video">video</option>
              <option value="edit">edit</option>
            </select>
            <input placeholder="model_name (调用名)" value={form.model_name} onChange={e => setForm({ ...form, model_name: e.target.value })} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent" />
            <input placeholder="API Key 环境变量名" value={form.api_key_env_name} onChange={e => setForm({ ...form, api_key_env_name: e.target.value })} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent" />
            <input placeholder="Base URL (可选)" value={form.api_base_url} onChange={e => setForm({ ...form, api_base_url: e.target.value })} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent" />
            <input placeholder="默认尺寸" value={form.default_size} onChange={e => setForm({ ...form, default_size: e.target.value })} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent" />
          </div>
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
                <th className="text-left px-4 py-3 font-medium">模型</th>
                <th className="text-left px-4 py-3 font-medium">供应商</th>
                <th className="text-left px-4 py-3 font-medium">能力</th>
                <th className="text-left px-4 py-3 font-medium">环境变量</th>
                <th className="text-left px-4 py-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <tr key={m.id} className="border-b border-border/50 hover:bg-bg-hover">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Cpu size={16} className="text-accent" />
                      <div>
                        <p className="font-medium">{m.display_name}</p>
                        <p className="text-xs text-text-muted">{m.model_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{m.provider}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-bg-tertiary border border-border text-text-secondary">{m.capability}</span></td>
                  <td className="px-4 py-3 text-xs text-text-muted font-mono">{m.api_key_env_name}</td>
                  <td className="px-4 py-3">
                    {m.is_active ? <CheckCircle2 size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
