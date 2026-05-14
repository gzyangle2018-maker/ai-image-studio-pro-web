import { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { Send, Trash2, Bot, User, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const agents = [
  { key: 'creative', name: '创意大师' },
  { key: 'prompt-engineer', name: '提示词工程师' },
  { key: 'art-critic', name: '艺术评论家' },
  { key: 'commercial', name: '商业设计师' },
  { key: 'photographer', name: '摄影师' },
  { key: 'educator', name: 'AI 绘画导师' },
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好！我是你的 AI 创作助手。我可以帮你构思提示词、分析图像、优化创意等。有什么我可以帮你的吗？' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agent, setAgent] = useState('creative');
  const [model, setModel] = useState('gpt-4o');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const data = await api.chat.send({
        messages: [...messages, { role: 'user', content: userMsg }].filter(m => m.role !== 'system'),
        agent_key: agent,
        model_id: model,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.content || '无回复' }]);
    } catch (err: unknown) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `错误: ${err instanceof Error ? err.message : '未知错误'}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto">
      {/* Agent / Model selector */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={agent} onChange={(e) => setAgent(e.target.value)} className="px-3 py-1.5 bg-bg-card border border-border rounded-lg text-xs text-white focus:outline-none focus:border-accent">
          {agents.map(a => <option key={a.key} value={a.key}>{a.name}</option>)}
        </select>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="px-3 py-1.5 bg-bg-card border border-border rounded-lg text-xs text-white focus:outline-none focus:border-accent">
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4">GPT-4</option>
          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
          <option value="claude-3">Claude 3</option>
        </select>
        <button
          onClick={() => setMessages([{ role: 'assistant', content: '对话已清空。有什么我可以帮你的吗？' }])}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border text-xs text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <Trash2 size={14} />
          清空
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              m.role === 'assistant' ? 'bg-gradient-to-br from-accent to-accent-secondary text-white' : 'bg-bg-tertiary text-text-secondary'
            }`}>
              {m.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`max-w-[80%] px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-accent/15 border border-accent/30 text-white'
                : 'bg-bg-card border border-border text-text-secondary'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-accent to-accent-secondary text-white">
              <Bot size={16} />
            </div>
            <div className="px-4 py-3 rounded-xl bg-bg-card border border-border">
              <Loader2 size={16} className="animate-spin text-accent" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-end gap-2 bg-bg-card border border-border rounded-2xl px-4 py-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="输入消息... (Shift+Enter 换行, Enter 发送)"
            rows={1}
            className="flex-1 bg-transparent border-none text-sm text-white placeholder-text-muted focus:outline-none resize-none max-h-32 min-h-[24px]"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-gradient-to-r from-accent to-accent-secondary text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
