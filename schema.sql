-- AI Image Studio Pro Web - D1 Database Schema
-- 执行: wrangler d1 execute ai-studio-db --file=./schema.sql

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'operator' CHECK(role IN ('super_admin','admin','designer','operator')),
  daily_image_quota INTEGER DEFAULT 50,
  monthly_image_quota INTEGER DEFAULT 1000,
  daily_video_quota INTEGER DEFAULT 10,
  monthly_video_quota INTEGER DEFAULT 200,
  daily_text_quota INTEGER DEFAULT 200,
  monthly_text_quota INTEGER DEFAULT 5000,
  max_batch_size INTEGER DEFAULT 4,
  allowed_models TEXT, -- JSON 数组
  allowed_agents TEXT, -- JSON 数组
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 模型配置表
CREATE TABLE IF NOT EXISTS models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  api_base_url TEXT,
  api_key_env_name TEXT NOT NULL,
  model_name TEXT NOT NULL,
  capability TEXT NOT NULL, -- text/image/video/vision/edit
  default_size TEXT,
  cost_estimation TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent / GPT / Gem 模板表
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  type TEXT NOT NULL DEFAULT 'agent' CHECK(type IN ('agent','gpt','gem')),
  visible_description TEXT,
  hidden_system_prompt TEXT,
  hidden_sop TEXT,
  knowledge_bindings TEXT, -- JSON 数组
  default_model_id TEXT,
  fallback_model_id TEXT,
  output_type TEXT DEFAULT 'text',
  max_batch_count INTEGER DEFAULT 1,
  allowed_roles TEXT, -- JSON 数组，如 ["designer","operator"]
  is_enabled INTEGER DEFAULT 1,
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 知识库表
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kb_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  task_type TEXT NOT NULL, -- generate_image/edit_image/generate_video/chat/vision
  agent_id TEXT,
  model_id TEXT,
  provider TEXT,
  input_summary TEXT,
  output_urls TEXT, -- JSON 数组
  image_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  token_usage INTEGER DEFAULT 0,
  estimated_cost REAL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed','retrying')),
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 作品画廊表
CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  task_id INTEGER,
  title TEXT,
  type TEXT NOT NULL DEFAULT 'image', -- image/video/text/analysis
  url TEXT,
  prompt TEXT,
  model_id TEXT,
  metadata TEXT, -- JSON
  is_favorite INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- 用量日志表
CREATE TABLE IF NOT EXISTS usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  task_type TEXT NOT NULL,
  model_id TEXT,
  agent_id TEXT,
  provider TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  image_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  estimated_cost REAL DEFAULT 0,
  status TEXT DEFAULT 'success',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 每日用量统计表
CREATE TABLE IF NOT EXISTS daily_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  image_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  text_count INTEGER DEFAULT 0,
  estimated_cost REAL DEFAULT 0,
  UNIQUE(user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 会话表
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 系统设置表
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初始化管理员账号 (密码 bcrypt hash of 'leo0417')
-- 使用 wrangler secrets 设置 JWT_SECRET 后运行 seed 脚本
INSERT OR IGNORE INTO users (username, password_hash, display_name, role, daily_image_quota, monthly_image_quota, daily_video_quota, monthly_video_quota, daily_text_quota, monthly_text_quota) 
VALUES ('yangle', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Yangle', 'super_admin', 999999, 999999, 999999, 999999, 999999, 999999);

-- 初始化默认模型
INSERT OR IGNORE INTO models (model_id, provider, display_name, api_key_env_name, model_name, capability, default_size, sort_order) VALUES
('gpt-image-2', 'openai', 'GPT Image 2', 'OPENAI_API_KEY', 'gpt-image-2', 'image', '1024x1024', 1),
('dall-e-3', 'openai', 'DALL-E 3', 'OPENAI_API_KEY', 'dall-e-3', 'image', '1024x1024', 2),
('nano-banana', 'nano-banana', 'Nano Banana', 'NANO_BANANA_API_KEY', 'nano-banana', 'image', '1024x1024', 3),
('gpt-4o', 'openai', 'GPT-4o', 'OPENAI_API_KEY', 'gpt-4o', 'text', NULL, 4),
('gpt-4', 'openai', 'GPT-4', 'OPENAI_API_KEY', 'gpt-4', 'text', NULL, 5),
('gemini-1.5-pro', 'gemini', 'Gemini 1.5 Pro', 'GEMINI_API_KEY', 'gemini-1.5-pro', 'text', NULL, 6),
('gemini-pro-vision', 'gemini', 'Gemini Pro Vision', 'GEMINI_API_KEY', 'gemini-pro-vision', 'vision', NULL, 7),
('claude-3', 'openai-compatible', 'Claude 3', 'CLAUDE_API_KEY', 'claude-3-opus', 'text', NULL, 8);

-- 初始化默认 Agent / GPT 预设
INSERT OR IGNORE INTO agents (agent_key, name, type, category, visible_description, hidden_system_prompt, default_model_id, allowed_roles) VALUES
('creative', '创意大师', 'gpt', 'creative', '擅长头脑风暴和创意构思', '你是一位极具创造力的艺术总监...', 'gpt-4o', '["admin","designer","operator"]'),
('prompt-engineer', '提示词工程师', 'gpt', 'technical', '提示词优化专家', '你是顶级 AI 绘画提示词工程师...', 'gpt-4o', '["admin","designer","operator"]'),
('art-critic', '艺术评论家', 'gpt', 'analysis', '专业图像分析', '你是一位资深艺术评论家...', 'gpt-4o', '["admin","designer","operator"]'),
('commercial', '商业设计师', 'gpt', 'business', '商业设计专家', '你是资深商业视觉设计师...', 'gpt-4o', '["admin","designer","operator"]'),
('photographer', '摄影师', 'gpt', 'technical', '摄影技术专家', '你是专业摄影师...', 'gpt-4o', '["admin","designer","operator"]'),
('educator', 'AI 绘画导师', 'gpt', 'education', 'AI 绘画教学', '你是耐心的 AI 绘画导师...', 'gpt-4o', '["admin","designer","operator"]');

-- 初始化系统设置
INSERT OR IGNORE INTO settings (key, value) VALUES
('site_name', 'AI Image Studio Pro'),
('registration_enabled', 'false'),
('default_model', 'gpt-4o');
