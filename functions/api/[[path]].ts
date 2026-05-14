import { Env, getUserByUsername, getUserById, getActiveModels, getModelById, getAgentByKey, getAgents, checkQuota, logUsage, createTask, updateTask } from './lib/db';
import { createToken, getAuthUser, requireAuth, requireRole, verifyPassword, hashPassword } from './lib/auth';
import { generateImage, chatCompletion, visionAnalysis } from './lib/models';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...extraHeaders },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequest = async (context: { request: Request; env: Env; params: { path: string } }): Promise<Response> => {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = params.path || '';
  const method = request.method;

  try {
    // ======== AUTH ========
    if (path === 'auth/login' && method === 'POST') {
      const body = await request.json() as { username?: string; password?: string };
      const { username, password } = body;
      if (!username || !password) return errorResponse('Username and password required', 400);

      const user = await getUserByUsername(env.DB, username);
      if (!user) return errorResponse('Invalid credentials', 401);

      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) return errorResponse('Invalid credentials', 401);

      const token = await createToken(user, env.JWT_SECRET, 24);
      return jsonResponse({
        token,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          role: user.role,
        },
      });
    }

    if (path === 'auth/me' && method === 'GET') {
      const { user, payload } = await getAuthUser(request, env);
      if (!user) return errorResponse('Unauthorized', 401);
      return jsonResponse({
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
      });
    }

    if (path === 'auth/register' && method === 'POST') {
      const body = await request.json() as { username?: string; password?: string; display_name?: string; email?: string };
      const { username, password, display_name, email } = body;
      if (!username || !password) return errorResponse('Username and password required', 400);

      const existing = await getUserByUsername(env.DB, username);
      if (existing) return errorResponse('Username already exists', 409);

      const passwordHash = await hashPassword(password);
      await env.DB.prepare(
        'INSERT INTO users (username, password_hash, display_name, email, role) VALUES (?, ?, ?, ?, ?)'
      ).bind(username, passwordHash, display_name || username, email || null, 'operator').run();

      return jsonResponse({ message: 'User registered successfully' });
    }

    // ======== MODELS ========
    if (path === 'models' && method === 'GET') {
      const { user } = await getAuthUser(request, env);
      if (!user) return errorResponse('Unauthorized', 401);

      const models = await getActiveModels(env.DB);
      const allowed = user.allowed_models ? JSON.parse(user.allowed_models) : null;

      const filtered = models.filter(m => {
        if (user.role === 'super_admin') return true;
        if (!allowed) return true;
        return allowed.includes(m.model_id);
      });

      return jsonResponse(filtered.map(m => ({
        model_id: m.model_id,
        display_name: m.display_name,
        provider: m.provider,
        capability: m.capability,
        default_size: m.default_size,
        cost_estimation: m.cost_estimation,
      })));
    }

    // ======== AGENTS / GPTs / Gems ========
    if (path === 'agents' && method === 'GET') {
      const { user } = await getAuthUser(request, env);
      if (!user) return errorResponse('Unauthorized', 401);

      const urlParams = new URL(request.url).searchParams;
      const type = urlParams.get('type');
      const agents = await getAgents(env.DB, type || undefined);

      const allowed = user.allowed_agents ? JSON.parse(user.allowed_agents) : null;
      const filtered = agents.filter(a => {
        if (user.role === 'super_admin') return true;
        const roles = a.allowed_roles ? JSON.parse(a.allowed_roles) : ['admin', 'designer', 'operator'];
        if (!roles.includes(user.role)) return false;
        if (!allowed) return true;
        return allowed.includes(a.agent_key);
      });

      return jsonResponse(filtered.map(a => ({
        agent_key: a.agent_key,
        name: a.name,
        category: a.category,
        type: a.type,
        visible_description: a.visible_description,
        default_model_id: a.default_model_id,
      })));
    }

    if (path.startsWith('agents/') && method === 'GET') {
      const { user } = await getAuthUser(request, env);
      if (!user) return errorResponse('Unauthorized', 401);

      const key = path.replace('agents/', '');
      const agent = await getAgentByKey(env.DB, key);
      if (!agent) return errorResponse('Agent not found', 404);

      // Only return visible info to non-admins
      const roles = agent.allowed_roles ? JSON.parse(agent.allowed_roles) : ['admin', 'designer', 'operator'];
      if (!roles.includes(user.role) && user.role !== 'super_admin') {
        return errorResponse('Forbidden', 403);
      }

      const safe = {
        agent_key: agent.agent_key,
        name: agent.name,
        category: agent.category,
        type: agent.type,
        visible_description: agent.visible_description,
        default_model_id: agent.default_model_id,
        fallback_model_id: agent.fallback_model_id,
        output_type: agent.output_type,
        max_batch_count: agent.max_batch_count,
      };

      if (user.role === 'super_admin' || user.role === 'admin') {
        return jsonResponse({ ...safe, hidden_system_prompt: agent.hidden_system_prompt, hidden_sop: agent.hidden_sop });
      }
      return jsonResponse(safe);
    }

    // ======== GENERATE IMAGE ========
    if (path === 'generate-image' && method === 'POST') {
      const { user, payload } = await getAuthUser(request, env);
      if (!user || !payload) return errorResponse('Unauthorized', 401);

      const quota = await checkQuota(env.DB, user.id, 'generate_image');
      if (!quota.allowed) return errorResponse(`Daily quota exceeded (${quota.used}/${quota.limit})`, 429);

      const body = await request.json() as {
        model_id?: string;
        prompt?: string;
        negative_prompt?: string;
        size?: string;
        n?: number;
        quality?: string;
        style?: string;
      };
      if (!body.prompt) return errorResponse('Prompt is required', 400);

      const modelId = body.model_id || 'dall-e-3';
      const model = await getModelById(env.DB, modelId);
      if (!model) return errorResponse('Model not found', 404);

      const taskId = await createTask(env.DB, {
        user_id: user.id,
        task_type: 'generate_image',
        model_id: model.model_id,
        provider: model.provider,
        input_summary: body.prompt.substring(0, 200),
      });

      const result = await generateImage(env, model, {
        prompt: body.prompt,
        negative_prompt: body.negative_prompt,
        size: body.size,
        n: body.n || 1,
        quality: body.quality,
        style: body.style,
      });

      if (result.error) {
        await updateTask(env.DB, taskId, { status: 'failed', error_message: result.error });
        await logUsage(env.DB, { user_id: user.id, task_type: 'generate_image', model_id: model.model_id, provider: model.provider, status: 'failed' });
        return errorResponse(result.error, 500);
      }

      await updateTask(env.DB, taskId, {
        status: 'completed',
        output_urls: JSON.stringify(result.url ? [result.url] : []),
        image_count: body.n || 1,
        estimated_cost: 0.02 * (body.n || 1),
      });

      await logUsage(env.DB, {
        user_id: user.id,
        task_type: 'generate_image',
        model_id: model.model_id,
        provider: model.provider,
        image_count: body.n || 1,
        estimated_cost: 0.02 * (body.n || 1),
      });

      return jsonResponse({
        task_id: taskId,
        url: result.url,
        b64_json: result.b64_json,
        model: model.display_name,
      });
    }

    // ======== CHAT ========
    if (path === 'chat' && method === 'POST') {
      const { user, payload } = await getAuthUser(request, env);
      if (!user || !payload) return errorResponse('Unauthorized', 401);

      const quota = await checkQuota(env.DB, user.id, 'chat');
      if (!quota.allowed) return errorResponse(`Daily quota exceeded (${quota.used}/${quota.limit})`, 429);

      const body = await request.json() as {
        messages?: Array<{ role: string; content: string }>;
        model_id?: string;
        agent_key?: string;
        temperature?: number;
        max_tokens?: number;
      };
      if (!body.messages || body.messages.length === 0) return errorResponse('Messages required', 400);

      let systemPrompt = '你是 AI 创作助手';
      let agentModelId: string | null = null;
      if (body.agent_key) {
        const agent = await getAgentByKey(env.DB, body.agent_key);
        if (agent) {
          systemPrompt = agent.hidden_system_prompt || agent.visible_description || systemPrompt;
          agentModelId = agent.default_model_id;
        }
      }

      const modelId = body.model_id || agentModelId || 'gpt-4o';
      const model = await getModelById(env.DB, modelId);
      if (!model) return errorResponse('Model not found', 404);

      const messages = [
        { role: 'system', content: systemPrompt },
        ...body.messages.filter(m => m.role !== 'system'),
      ];

      const taskId = await createTask(env.DB, {
        user_id: user.id,
        task_type: 'chat',
        agent_id: body.agent_key,
        model_id: model.model_id,
        provider: model.provider,
        input_summary: body.messages[body.messages.length - 1].content.substring(0, 200),
      });

      const result = await chatCompletion(env, model, {
        messages,
        model: model.model_name,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
      });

      if (result.error) {
        await updateTask(env.DB, taskId, { status: 'failed', error_message: result.error });
        await logUsage(env.DB, { user_id: user.id, task_type: 'chat', model_id: model.model_id, provider: model.provider, status: 'failed' });
        return errorResponse(result.error, 500);
      }

      const tokens = (result.usage?.prompt_tokens || 0) + (result.usage?.completion_tokens || 0);
      await updateTask(env.DB, taskId, {
        status: 'completed',
        token_usage: tokens,
        estimated_cost: tokens * 0.00001,
      });

      await logUsage(env.DB, {
        user_id: user.id,
        task_type: 'chat',
        model_id: model.model_id,
        provider: model.provider,
        input_tokens: result.usage?.prompt_tokens,
        output_tokens: result.usage?.completion_tokens,
        estimated_cost: tokens * 0.00001,
      });

      return jsonResponse({
        task_id: taskId,
        content: result.content,
        model: model.display_name,
      });
    }

    // ======== VISION / MULTIMODAL ========
    if (path === 'analyze-vision' && method === 'POST') {
      const { user, payload } = await getAuthUser(request, env);
      if (!user || !payload) return errorResponse('Unauthorized', 401);

      const quota = await checkQuota(env.DB, user.id, 'vision');
      if (!quota.allowed) return errorResponse(`Daily quota exceeded (${quota.used}/${quota.limit})`, 429);

      const body = await request.json() as {
        prompt?: string;
        image_data?: string;
        model_id?: string;
      };
      if (!body.prompt || !body.image_data) return errorResponse('Prompt and image_data required', 400);

      const modelId = body.model_id || 'gemini-pro-vision';
      const model = await getModelById(env.DB, modelId);
      if (!model) return errorResponse('Model not found', 404);

      const taskId = await createTask(env.DB, {
        user_id: user.id,
        task_type: 'vision',
        model_id: model.model_id,
        provider: model.provider,
        input_summary: body.prompt.substring(0, 200),
      });

      const result = await visionAnalysis(env, model, {
        prompt: body.prompt,
        image_data: body.image_data,
        model: model.model_name,
      });

      if (result.error) {
        await updateTask(env.DB, taskId, { status: 'failed', error_message: result.error });
        await logUsage(env.DB, { user_id: user.id, task_type: 'vision', model_id: model.model_id, provider: model.provider, status: 'failed' });
        return errorResponse(result.error, 500);
      }

      await updateTask(env.DB, taskId, {
        status: 'completed',
        estimated_cost: 0.005,
      });

      await logUsage(env.DB, {
        user_id: user.id,
        task_type: 'vision',
        model_id: model.model_id,
        provider: model.provider,
        estimated_cost: 0.005,
      });

      return jsonResponse({
        task_id: taskId,
        content: result.content,
        model: model.display_name,
      });
    }

    // ======== TASKS ========
    if (path === 'tasks' && method === 'GET') {
      const { user, payload } = await getAuthUser(request, env);
      if (!user || !payload) return errorResponse('Unauthorized', 401);

      const urlParams = new URL(request.url).searchParams;
      const limit = Math.min(parseInt(urlParams.get('limit') || '50'), 100);
      const offset = parseInt(urlParams.get('offset') || '0');

      let stmt;
      if (user.role === 'super_admin' || user.role === 'admin') {
        stmt = env.DB.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT ? OFFSET ?');
      } else {
        stmt = env.DB.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?');
      }

      const { results } = user.role === 'super_admin' || user.role === 'admin'
        ? await stmt.bind(limit, offset).all()
        : await stmt.bind(user.id, limit, offset).all();

      return jsonResponse(results || []);
    }

    // ======== GALLERY ========
    if (path === 'gallery' && method === 'GET') {
      const { user, payload } = await getAuthUser(request, env);
      if (!user || !payload) return errorResponse('Unauthorized', 401);

      const urlParams = new URL(request.url).searchParams;
      const type = urlParams.get('type');
      const limit = Math.min(parseInt(urlParams.get('limit') || '50'), 100);
      const offset = parseInt(urlParams.get('offset') || '0');

      let query = 'SELECT * FROM gallery WHERE user_id = ?';
      if (type) query += ' AND type = ?';
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

      const stmt = env.DB.prepare(query);
      const { results } = type
        ? await stmt.bind(user.id, type, limit, offset).all()
        : await stmt.bind(user.id, limit, offset).all();

      return jsonResponse(results || []);
    }

    // ======== USAGE ========
    if (path === 'usage' && method === 'GET') {
      const { user, payload } = await getAuthUser(request, env);
      if (!user || !payload) return errorResponse('Unauthorized', 401);

      const urlParams = new URL(request.url).searchParams;
      const days = parseInt(urlParams.get('days') || '30');
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      const fromStr = dateFrom.toISOString().split('T')[0];

      let stmt;
      if (user.role === 'super_admin' || user.role === 'admin') {
        stmt = env.DB.prepare(
          `SELECT date, SUM(image_count) as image_count, SUM(video_count) as video_count, SUM(text_count) as text_count, SUM(estimated_cost) as cost
           FROM daily_usage WHERE date >= ? GROUP BY date ORDER BY date DESC`
        );
      } else {
        stmt = env.DB.prepare(
          `SELECT date, SUM(image_count) as image_count, SUM(video_count) as video_count, SUM(text_count) as text_count, SUM(estimated_cost) as cost
           FROM daily_usage WHERE user_id = ? AND date >= ? GROUP BY date ORDER BY date DESC`
        );
      }

      const { results } = user.role === 'super_admin' || user.role === 'admin'
        ? await stmt.bind(fromStr).all()
        : await stmt.bind(user.id, fromStr).all();

      return jsonResponse(results || []);
    }

    // ======== ADMIN ========
    if (path === 'admin/users' && method === 'GET') {
      const { user } = await getAuthUser(request, env);
      if (!user) return errorResponse('Unauthorized', 401);
      requireRole(user, 'super_admin', 'admin');

      const { results } = await env.DB.prepare('SELECT id, username, display_name, email, role, is_active, created_at, daily_image_quota, monthly_image_quota, daily_text_quota, monthly_text_quota FROM users ORDER BY id').all();
      return jsonResponse(results || []);
    }

    if (path === 'admin/users' && method === 'POST') {
      const { user } = await getAuthUser(request, env);
      if (!user) return errorResponse('Unauthorized', 401);
      requireRole(user, 'super_admin');

      const body = await request.json() as { username?: string; password?: string; display_name?: string; role?: string; daily_image_quota?: number };
      if (!body.username || !body.password) return errorResponse('Username and password required', 400);

      const passwordHash = await hashPassword(body.password);
      await env.DB.prepare(
        'INSERT INTO users (username, password_hash, display_name, role, daily_image_quota) VALUES (?, ?, ?, ?, ?)'
      ).bind(body.username, passwordHash, body.display_name || body.username, body.role || 'operator', body.daily_image_quota || 50).run();

      return jsonResponse({ message: 'User created' });
    }

    if (path === 'admin/models' && method === 'GET') {
      const { user } = await getAuthUser(request, env);
      if (!user) return errorResponse('Unauthorized', 401);
      requireRole(user, 'super_admin', 'admin');

      const { results } = await env.DB.prepare('SELECT * FROM models ORDER BY sort_order').all();
      return jsonResponse(results || []);
    }

    if (path === 'admin/models' && method === 'POST') {
      const { user } = await getAuthUser(request, env);
      if (!user) return errorResponse('Unauthorized', 401);
      requireRole(user, 'super_admin');

      const body = await request.json() as Record<string, unknown>;
      await env.DB.prepare(
        `INSERT INTO models (model_id, provider, display_name, api_base_url, api_key_env_name, model_name, capability, default_size, cost_estimation, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        body.model_id, body.provider, body.display_name,
        body.api_base_url || null, body.api_key_env_name, body.model_name,
        body.capability, body.default_size || null, body.cost_estimation || null,
        body.sort_order || 0
      ).run();

      return jsonResponse({ message: 'Model added' });
    }

    if (path === 'admin/agents' && method === 'GET') {
      const { user } = await getAuthUser(request, env);
      if (!user) return errorResponse('Unauthorized', 401);
      requireRole(user, 'super_admin', 'admin');

      const { results } = await env.DB.prepare('SELECT * FROM agents ORDER BY name').all();
      return jsonResponse(results || []);
    }

    if (path === 'admin/agents' && method === 'POST') {
      const { user } = await getAuthUser(request, env);
      if (!user) return errorResponse('Unauthorized', 401);
      requireRole(user, 'super_admin', 'admin');

      const body = await request.json() as Record<string, unknown>;
      await env.DB.prepare(
        `INSERT INTO agents (agent_key, name, type, category, visible_description, hidden_system_prompt, hidden_sop, default_model_id, allowed_roles)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        body.agent_key, body.name, body.type || 'agent', body.category || 'general',
        body.visible_description || null, body.hidden_system_prompt || null,
        body.hidden_sop || null, body.default_model_id || null,
        JSON.stringify(body.allowed_roles || ['admin', 'designer', 'operator'])
      ).run();

      return jsonResponse({ message: 'Agent created' });
    }

    if (path === 'admin/usage-summary' && method === 'GET') {
      const { user } = await getAuthUser(request, env);
      if (!user) return errorResponse('Unauthorized', 401);
      requireRole(user, 'super_admin', 'admin');

      const today = new Date().toISOString().split('T')[0];
      const month = today.substring(0, 7) + '-01';

      const todayResult = await env.DB.prepare(
        `SELECT COALESCE(SUM(image_count), 0) as images, COALESCE(SUM(video_count), 0) as videos, COALESCE(SUM(text_count), 0) as texts, COALESCE(SUM(estimated_cost), 0) as cost FROM daily_usage WHERE date = ?`
      ).bind(today).first();

      const monthResult = await env.DB.prepare(
        `SELECT COALESCE(SUM(image_count), 0) as images, COALESCE(SUM(video_count), 0) as videos, COALESCE(SUM(text_count), 0) as texts, COALESCE(SUM(estimated_cost), 0) as cost FROM daily_usage WHERE date >= ?`
      ).bind(month).first();

      const tasksResult = await env.DB.prepare(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed FROM tasks`
      ).first();

      return jsonResponse({
        today: todayResult,
        month: monthResult,
        tasks: tasksResult,
      });
    }

    if (path === 'admin/settings' && method === 'GET') {
      const { user } = await getAuthUser(request, env);
      if (!user) return errorResponse('Unauthorized', 401);
      requireRole(user, 'super_admin');

      const { results } = await env.DB.prepare('SELECT * FROM settings').all();
      return jsonResponse(results || []);
    }

    if (path === 'admin/settings' && method === 'POST') {
      const { user } = await getAuthUser(request, env);
      if (!user) return errorResponse('Unauthorized', 401);
      requireRole(user, 'super_admin');

      const body = await request.json() as { key: string; value: string };
      await env.DB.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP'
      ).bind(body.key, body.value).run();

      return jsonResponse({ message: 'Setting updated' });
    }

    // ======== 404 ========
    return errorResponse('Not found', 404);

  } catch (err) {
    if (err instanceof Response) return err;
    console.error('API Error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
};
