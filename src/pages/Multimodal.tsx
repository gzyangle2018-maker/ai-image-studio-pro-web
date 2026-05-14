import { useState } from 'react';
import { api } from '../api';
import { Upload, Search, Loader2, ImageIcon } from 'lucide-react';

export default function Multimodal() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('请详细描述这张图片的内容、风格和特点');
  const [model, setModel] = useState('gemini-pro-vision');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageData(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageData(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!imageData) return;
    setLoading(true);
    setError('');
    setResult('');
    try {
      const data = await api.vision.analyze({ prompt, image_data: imageData, model_id: model });
      setResult(data.content || '无分析结果');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 h-[calc(100vh-140px)]">
      <div className="space-y-4 overflow-y-auto pr-1">
        <div className="p-5 rounded-xl bg-bg-card border border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Search size={16} className="text-accent" />
            图像分析
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">分析模型</label>
              <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent">
                <option value="gemini-pro-vision">Gemini Pro Vision</option>
                <option value="gpt-4o-vision">GPT-4o Vision</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">上传图像</label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => document.getElementById('mm-file')?.click()}
                className="min-h-[140px] rounded-lg bg-bg-secondary border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent transition-colors overflow-hidden"
              >
                {imageData ? (
                  <img src={imageData} alt="Preview" className="max-w-full max-h-[140px] object-contain" />
                ) : (
                  <div className="text-center text-text-muted py-6">
                    <ImageIcon size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">点击上传或拖拽图像到此处</p>
                  </div>
                )}
              </div>
              <input id="mm-file" type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">分析指令</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-white placeholder-text-muted focus:outline-none focus:border-accent min-h-[80px] resize-y"
              />
            </div>

            <button
              onClick={analyze}
              disabled={loading || !imageData}
              className="w-full py-2.5 bg-gradient-to-r from-accent to-accent-secondary rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? '分析中...' : '开始分析'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex-1 rounded-xl bg-bg-card border border-border p-5 overflow-y-auto">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-text-secondary">
            <Search size={16} />
            分析结果
          </h3>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {!result && !error && !loading && (
            <div className="text-center text-text-muted mt-16">
              <Search size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">上传图像并点击分析</p>
            </div>
          )}

          {loading && (
            <div className="text-center mt-16">
              <Loader2 size={32} className="animate-spin text-accent mx-auto mb-3" />
              <p className="text-sm text-text-muted">正在分析图像...</p>
            </div>
          )}

          {result && (
            <div className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
              {result}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
