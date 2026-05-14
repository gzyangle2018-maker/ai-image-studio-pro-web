import { useState } from 'react';
import { api } from '../api';
import { Upload, Eraser, Maximize, ZoomIn, Square, Download, Loader2 } from 'lucide-react';

const tools = [
  { id: 'upload', icon: Upload, label: '上传' },
  { id: 'inpaint', icon: Eraser, label: '局部重绘' },
  { id: 'outpaint', icon: Maximize, label: '智能扩图' },
  { id: 'upscale', icon: ZoomIn, label: '高清放大' },
  { id: 'remove-bg', icon: Square, label: '抠图' },
];

export default function Edit() {
  const [activeTool, setActiveTool] = useState('upload');
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target?.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = async () => {
    if (!image || !prompt.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.generate.image({
        model_id: 'dall-e-3',
        prompt: `Edit this image: ${prompt}. Based on: ${prompt}`,
      });
      if (data.url || data.b64_json) {
        setResult(data.url || `data:image/png;base64,${data.b64_json}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '编辑失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-140px)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-bg-card border border-border flex-wrap">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-colors ${
              activeTool === t.id
                ? 'bg-accent/15 text-accent border border-accent/50'
                : 'text-text-secondary hover:bg-bg-hover border border-transparent'
            }`}
          >
            <t.icon size={20} />
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        {result && (
          <a href={result} download="edited.png" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-xs text-text-secondary hover:bg-bg-hover">
            <Download size={14} />
            下载
          </a>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 rounded-xl bg-bg-secondary border border-dashed border-border flex items-center justify-center relative overflow-hidden">
        {!image && (
          <label className="text-center text-text-muted cursor-pointer hover:text-text-primary transition-colors">
            <Upload size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">点击上传图像</p>
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
        )}
        {image && !result && (
          <img src={image} alt="Original" className="max-w-full max-h-full object-contain rounded-lg" />
        )}
        {result && (
          <img src={result} alt="Result" className="max-w-full max-h-full object-contain rounded-lg" />
        )}
        {loading && (
          <div className="absolute inset-0 bg-bg-primary/80 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-accent" />
            <p className="text-sm text-text-muted">正在处理...</p>
          </div>
        )}
      </div>

      {/* Edit options */}
      {image && (
        <div className="p-4 rounded-xl bg-bg-card border border-border space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">编辑描述</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述你想对图像进行的修改..."
              className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white placeholder-text-muted focus:outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={handleEdit}
            disabled={loading || !prompt.trim()}
            className="px-5 py-2 bg-gradient-to-r from-accent to-accent-secondary rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            应用编辑
          </button>
        </div>
      )}
      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
    </div>
  );
}
