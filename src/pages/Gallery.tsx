import { useEffect, useState } from 'react';
import { api } from '../api';
import { FolderOpen, Trash2, Heart, Download } from 'lucide-react';

interface GalleryItem {
  id: number;
  title: string;
  type: string;
  url: string;
  prompt: string;
  created_at: string;
}

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.gallery.list(filter || undefined)
      .then((data) => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">我的作品</h3>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-1.5 bg-bg-card border border-border rounded-lg text-xs text-white focus:outline-none focus:border-accent">
            <option value="">全部</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="text">文本</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-text-muted">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <FolderOpen size={48} className="mx-auto mb-3 opacity-20" />
          <p>暂无作品，去创作你的第一幅作品吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="group rounded-xl bg-bg-card border border-border overflow-hidden hover:border-accent/50 transition-all hover:-translate-y-0.5">
              <div className="aspect-square bg-bg-secondary overflow-hidden relative">
                {item.url ? (
                  <img src={item.url} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted">
                    <FolderOpen size={32} className="opacity-30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                    <Heart size={16} />
                  </button>
                  <a href={item.url} download className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                    <Download size={16} />
                  </a>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium truncate">{item.title || '未命名'}</p>
                <p className="text-[11px] text-text-muted mt-0.5">{new Date(item.created_at).toLocaleDateString('zh-CN')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
