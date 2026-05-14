// D1 Database helpers
export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  NANO_BANANA_API_KEY?: string;
  NANO_BANANA_BASE_URL?: string;
}

export interface User {
  id: number;
  username: string;
  display_name: string | null;
  email: string | null;
  role: 'super_admin' | 'admin' | 'designer' | 'operator';
  daily_image_quota: number;
  monthly_image_quota: number;
  daily_video_quota: number;
  monthly_video_quota: number;
  daily_text_quota: number;
  monthly_text_quota: number;
  max_batch_size: number;
  allowed_models: string | null;
  allowed_agents: string | null;
  is_active: number;
}

export interface ModelConfig {
  id: number;
  model_id: string;
  provider: string;
  display_name: string;
  api_base_url: string | null;
  api_key_env_name: string;
  model_name: string;
  capability: string;
  default_size: string | null;
  cost_estimation: string | null;
  is_active: number;
  sort_order: number;
}

export interface Agent {
  id: number;
  agent_key: string;
  name: string;
  category: string;
  type: 'agent' | 'gpt' | 'gem';
  visible_description: string | null;
  hidden_system_prompt: string | null;
  hidden_sop: string | null;
  knowledge_bindings: string | null;
  default_model_id: string | null;
  fallback_model_id: string | null;
  output_type: string;
  max_batch_count: number;
  allowed_roles: string | null;
  is_enabled: number;
}

export async function getUserByUsername(db: D1Database, username: string): Promise<User | null> {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1');
  const result = await stmt.bind(username).first<User>();
  return result || null;
}

export async function getUserById(db: D1Database, id: number): Promise<User | null> {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1');
  const result = await stmt.bind(id).first<User>();
  return result || null;
}

export async function getActiveModels(db: D1Database): Promise<ModelConfig[]> {
  const stmt = db.prepare('SELECT * FROM models WHERE is_active = 1 ORDER BY sort_order');
  const { results } = await stmt.all<ModelConfig>();
  return results || [];
}

export async function getModelById(db: D1Database, modelId: string): Promise<ModelConfig | null> {
  const stmt = db.prepare('SELECT * FROM models WHERE model_id = ? AND is_active = 1');
  const result = await stmt.bind(modelId).first<ModelConfig>();
  return result || null;
}

export async function getAgentByKey(db: D1Database, key: string): Promise<Agent | null> {
  const stmt = db.prepare('SELECT * FROM agents WHERE agent_key = ? AND is_enabled = 1');
  const result = await stmt.bind(key).first<Agent>();
  return result || null;
}

export async function getAgents(db: D1Database, type?: string): Promise<Agent[]> {
  let stmt;
  if (type) {
    stmt = db.prepare('SELECT * FROM agents WHERE type = ? AND is_enabled = 1 ORDER BY name');
    const { results } = await stmt.bind(type).all<Agent>();
    return results || [];
  }
  stmt = db.prepare('SELECT * FROM agents WHERE is_enabled = 1 ORDER BY name');
  const { results } = await stmt.all<Agent>();
  return results || [];
}

export async function logUsage(
  db: D1Database,
  data: {
    user_id: number;
    task_type: string;
    model_id?: string;
    agent_id?: string;
    provider?: string;
    input_tokens?: number;
    output_tokens?: number;
    image_count?: number;
    video_count?: number;
    estimated_cost?: number;
    status?: string;
  }
): Promise<void> {
  await db.prepare(
    `INSERT INTO usage_logs (user_id, task_type, model_id, agent_id, provider, input_tokens, output_tokens, image_count, video_count, estimated_cost, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.user_id,
    data.task_type,
    data.model_id || null,
    data.agent_id || null,
    data.provider || null,
    data.input_tokens || 0,
    data.output_tokens || 0,
    data.image_count || 0,
    data.video_count || 0,
    data.estimated_cost || 0,
    data.status || 'success'
  ).run();

  // Update daily usage
  const today = new Date().toISOString().split('T')[0];
  const countField = data.task_type.includes('image') ? 'image_count' :
                     data.task_type.includes('video') ? 'video_count' : 'text_count';

  await db.prepare(
    `INSERT INTO daily_usage (user_id, date, ${countField}, estimated_cost)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET
     ${countField} = ${countField} + excluded.${countField},
     estimated_cost = estimated_cost + excluded.estimated_cost`
  ).bind(data.user_id, today, data.image_count || data.video_count || 1, data.estimated_cost || 0).run();
}

export async function checkQuota(db: D1Database, userId: number, taskType: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const user = await getUserById(db, userId);
  if (!user) return { allowed: false, used: 0, limit: 0 };

  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7) + '-01';

  let dailyLimit = 0;
  let monthlyLimit = 0;

  if (taskType.includes('image')) {
    dailyLimit = user.daily_image_quota;
    monthlyLimit = user.monthly_image_quota;
  } else if (taskType.includes('video')) {
    dailyLimit = user.daily_video_quota;
    monthlyLimit = user.monthly_video_quota;
  } else {
    dailyLimit = user.daily_text_quota;
    monthlyLimit = user.monthly_text_quota;
  }

  const dailyStmt = db.prepare('SELECT COALESCE(SUM(image_count + video_count + text_count), 0) as total FROM daily_usage WHERE user_id = ? AND date = ?');
  const dailyResult = await dailyStmt.bind(userId, today).first<{ total: number }>();
  const dailyUsed = dailyResult?.total || 0;

  const monthStmt = db.prepare('SELECT COALESCE(SUM(image_count + video_count + text_count), 0) as total FROM daily_usage WHERE user_id = ? AND date >= ?');
  const monthResult = await monthStmt.bind(userId, month).first<{ total: number }>();
  const monthlyUsed = monthResult?.total || 0;

  const allowed = dailyUsed < dailyLimit && monthlyUsed < monthlyLimit;
  return { allowed, used: dailyUsed, limit: dailyLimit };
}

export async function createTask(
  db: D1Database,
  data: {
    user_id: number;
    task_type: string;
    agent_id?: string;
    model_id?: string;
    provider?: string;
    input_summary?: string;
  }
): Promise<number> {
  const result = await db.prepare(
    `INSERT INTO tasks (user_id, task_type, agent_id, model_id, provider, input_summary, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`
  ).bind(
    data.user_id,
    data.task_type,
    data.agent_id || null,
    data.model_id || null,
    data.provider || null,
    data.input_summary || null
  ).run();
  return result.meta.last_row_id || 0;
}

export async function updateTask(
  db: D1Database,
  taskId: number,
  updates: {
    status?: string;
    output_urls?: string;
    image_count?: number;
    video_count?: number;
    token_usage?: number;
    estimated_cost?: number;
    error_message?: string;
  }
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.status) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.output_urls) { fields.push('output_urls = ?'); values.push(updates.output_urls); }
  if (updates.image_count !== undefined) { fields.push('image_count = ?'); values.push(updates.image_count); }
  if (updates.video_count !== undefined) { fields.push('video_count = ?'); values.push(updates.video_count); }
  if (updates.token_usage !== undefined) { fields.push('token_usage = ?'); values.push(updates.token_usage); }
  if (updates.estimated_cost !== undefined) { fields.push('estimated_cost = ?'); values.push(updates.estimated_cost); }
  if (updates.error_message !== undefined) { fields.push('error_message = ?'); values.push(updates.error_message); }

  if (updates.status === 'completed' || updates.status === 'failed') {
    fields.push('completed_at = CURRENT_TIMESTAMP');
  }

  if (fields.length === 0) return;

  values.push(taskId);
  await db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
}
