import { BookOpen, Construction } from 'lucide-react';

export default function Knowledge() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <Construction size={32} className="text-accent" />
      </div>
      <h2 className="text-lg font-semibold mb-2">知识库中心</h2>
      <p className="text-sm text-text-muted max-w-md">
        知识库功能正在开发中（P1 阶段）。<br />
        届时将支持 Prompt 知识库、SOP 知识库、商品类目知识库、视觉风格知识库等。<br />
        管理员可上传/编辑/删除，普通用户可通过 Agent 自动调用。
      </p>
    </div>
  );
}
