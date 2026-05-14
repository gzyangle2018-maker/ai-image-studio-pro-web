import { useEffect, useState } from 'react';
import { api } from '../api';
import { Sparkles, Download, Copy, RefreshCw, Wand2, ImageIcon } from 'lucide-react';

interface Model {
  model_id: string;
  display_name: string;
  provider: string;
  capability: string;
  default_size: string;
}

const sizes = ['1024x1024', '1024x1792', '1792x1024', '1536x1024', '1024x1536', '512x512'];
const styles = [
  { value: 'vivid', label: '鲜明' },
  { value: 'natural', label: '自然' },
  { value: 'anime', label: '动漫' },
  { value: 'photographic', label: '摄影' },
  { value: 'digital-art', label: '数字艺术' },
  { value: '3d-model', label: '3D 模型' },
];
const qualities = [
  { value: 'standard', label: '标准' },
  { value: 'hd', label: '高清' },
  { value: 'ultra', label: '超清' },
];
const quickTags = [
  { label: '高质量', tag: ' masterpiece, best quality, highly detailed' },
  { label: '电影光效', tag: ' cinematic lighting, dramatic' },
  { label: '8K超清', tag: ' 8k uhd, ultra sharp' },
  { label: '吉卜力', tag: ' studio ghibli style' },
  { label: '赛博朋克', tag: ' cyberpunk, neon lights' },
  { label: '水彩画', tag: ' watercolor painting' },
  { label: '油画', tag: ' oil painting, classical' },
  { label: '极简', tag: ' minimalist, clean' },
];

export default function Generate() {
  const [models, setModels] = useState<Model[]>([]);
  const [modelId, setModelId] = useState('gpt-image-2');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [n, setN] = useState(1);
  const [style, setStyle] = useState('vivid');
  const [quality, setQuality] = useState('standard');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ url?: string; b64_json?: string; model?: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.models.list().then(setModels).catch(() => {});
  }, []);

  const toggleTag = (tag: string) => {
    const next = new Set(activeTags);
    if (next.has(tag)) {
      next.delete(tag);
      setPrompt((p) => p.replace(tag, '').trim());
    } else {
      next.add(tag);
      setPrompt((p) => (p + tag).trim());
    }
    setActiveTags(next);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await api.generate.image({
        model_id: modelId,
        prompt,
        negative_prompt: negativePrompt,
        size,
        n,
        quality,
        style,
      });
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.url) return;
    try {
      const res = await fetch(result.url);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch {
      const a = document.createElement('a');
      a.href = result.url!;
      a.download = 'generated.png';
      a.click();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 h-[calc(100vh-140px)]">
      {/* Left Panel */}
      <div className="overflow-y-auto pr-1 space-y-4">
        <div className="p-5 rounded-xl bg-bg-card border border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Wand2 size={16} className="text-accent" />
            生成设置
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">选择模型</label>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent"
              >
                {models.filter(m => m.capability === 'image').map(m => (
                  <option key={m.model_id} value={m.model_id}>{m.display_name}</option>
                ))}
                <option value="gpt-image-2">GPT Image 2</option>
                <option value="dall-e-3">DALL-E 3</option>
                <option value="nano-banana">Nano Banana</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">提示词</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述你想要生成的图像..."
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white placeholder-text-muted focus:outline-none focus:border-accent min-h-[80px] resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">负面提示词</label>
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="描述你不希望出现的内容..."
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white placeholder-text-muted focus:outline-none focus:border-accent min-h-[60px] resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">尺寸</label>
                <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent">
                  {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">数量</label>
                <select value={n} onChange={(e) => setN(Number(e.target.value))} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent">
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">风格</label>
                <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent">
                  {styles.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">质量</label>
                <select value={quality} onChange={(e) => setQuality(e.target.value)} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent">
                  {qualities.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">快速标签</label>
              <div className="flex flex-wrap gap-2">
                {quickTags.map(t => (
                  <button
                    key={t.label}
                    onClick={() => toggleTag(t.tag)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      activeTags.has(t.tag)
                        ? 'bg-accent/20 border-accent text-accent'
                        : 'bg-bg-tertiary border-border text-text-secondary hover:border-accent/50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-accent to-accent-secondary rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {loading ? '生成中...' : '开始生成'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 rounded-xl bg-bg-card border border-border flex items-center justify-center min-h-[400px] relative overflow-hidden">
          {!result && !loading && (
            <div className="text-center text-text-muted">
              <ImageIcon size={64} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">点击「开始生成」创作你的作品</p>
            </div>
          )}

          {loading && (
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-text-muted">正在生成图像...</p>
            </div>
          )}

          {result?.url && !loading && (
            <img
              src={result.url}
              alt="Generated"
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            />
          )}
        </div>

        {result?.url && !loading && (
          <div className="flex gap-2">
            <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-xs text-text-secondary hover:bg-bg-hover transition-colors">
              <Copy size={14} />
              复制
            </button>
            <a
              href={result.url}
              download="generated.png"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-xs text-text-secondary hover:bg-bg-hover transition-colors"
            >
              <Download size={14} />
              下载
            </a>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-xs text-text-secondary hover:bg-bg-hover transition-colors"
            >
              <RefreshCw size={14} />
              重新生成
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
