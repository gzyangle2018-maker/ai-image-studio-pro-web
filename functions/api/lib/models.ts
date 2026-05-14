import { Env, ModelConfig } from './db';

export interface GenerateImageRequest {
  prompt: string;
  negative_prompt?: string;
  size?: string;
  n?: number;
  quality?: string;
  style?: string;
}

export interface ChatRequest {
  messages: { role: string; content: string }[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface VisionRequest {
  prompt: string;
  image_data: string; // base64 data URL
  model?: string;
}

export async function generateImage(env: Env, model: ModelConfig, req: GenerateImageRequest): Promise<{ url?: string; b64_json?: string; error?: string }> {
  try {
    const apiKey = env[model.api_key_env_name as keyof Env] as string | undefined;
    if (!apiKey) return { error: `API Key not configured for ${model.provider}` };

    if (model.provider === 'openai') {
      const baseUrl = model.api_base_url || 'https://api.openai.com/v1';
      const body: Record<string, unknown> = {
        model: model.model_name,
        prompt: req.prompt,
        n: req.n || 1,
        size: req.size || '1024x1024',
      };
      if (req.quality) body.quality = req.quality;
      if (req.style) body.style = req.style;

      const res = await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        return { error: `OpenAI ${res.status}: ${err}` };
      }

      const data = await res.json() as { data?: Array<{ url?: string; b64_json?: string }> };
      return {
        url: data.data?.[0]?.url,
        b64_json: data.data?.[0]?.b64_json,
      };
    }

    if (model.provider === 'nano-banana') {
      const baseUrl = (model.api_base_url || env.NANO_BANANA_BASE_URL || 'https://api.nano-banana.com/v1').replace(/\/$/, '');
      const [w, h] = (req.size || '1024x1024').split('x').map(Number);
      const res = await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          prompt: req.prompt,
          negative_prompt: req.negative_prompt || '',
          width: w || 1024,
          height: h || 1024,
          n: req.n || 1,
          style: req.style || 'vivid',
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return { error: `Nano Banana ${res.status}: ${err}` };
      }

      const data = await res.json() as { data?: Array<{ url?: string; b64_json?: string }>; image_url?: string; images?: string[] };
      return {
        url: data.data?.[0]?.url || data.image_url || data.images?.[0],
        b64_json: data.data?.[0]?.b64_json,
      };
    }

    return { error: `Unsupported provider: ${model.provider}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function chatCompletion(env: Env, model: ModelConfig, req: ChatRequest): Promise<{ content?: string; error?: string; usage?: { prompt_tokens: number; completion_tokens: number } }> {
  try {
    const apiKey = env[model.api_key_env_name as keyof Env] as string | undefined;
    if (!apiKey) return { error: `API Key not configured for ${model.provider}` };

    if (model.provider === 'openai' || model.provider === 'openai-compatible') {
      const baseUrl = model.api_base_url || 'https://api.openai.com/v1';
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model.model_name,
          messages: req.messages,
          temperature: req.temperature ?? 0.7,
          max_tokens: req.max_tokens ?? 4096,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return { error: `${model.provider} ${res.status}: ${err}` };
      }

      const data = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number };
      };
      return {
        content: data.choices?.[0]?.message?.content,
        usage: data.usage,
      };
    }

    if (model.provider === 'gemini') {
      const gemModel = model.model_name;
      const contents = req.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: [{ text: m.content }],
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${gemModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        return { error: `Gemini ${res.status}: ${err}` };
      }

      const data = await res.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };
      return {
        content: data.candidates?.[0]?.content?.parts?.[0]?.text,
        usage: {
          prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
          completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        },
      };
    }

    return { error: `Unsupported provider: ${model.provider}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function visionAnalysis(env: Env, model: ModelConfig, req: VisionRequest): Promise<{ content?: string; error?: string }> {
  try {
    const apiKey = env[model.api_key_env_name as keyof Env] as string | undefined;
    if (!apiKey) return { error: `API Key not configured for ${model.provider}` };

    if (model.provider === 'gemini') {
      const gemModel = model.model_name;
      const base64 = req.image_data.split(',')[1];
      const mimeType = req.image_data.match(/data:([^;]+)/)?.[1] || 'image/png';

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${gemModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { text: req.prompt },
                { inline_data: { mime_type: mimeType, data: base64 } },
              ],
            }],
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        return { error: `Gemini ${res.status}: ${err}` };
      }

      const data = await res.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return { content: data.candidates?.[0]?.content?.parts?.[0]?.text };
    }

    if (model.provider === 'openai' || model.provider === 'openai-compatible') {
      const baseUrl = model.api_base_url || 'https://api.openai.com/v1';
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model.model_name,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: req.prompt },
              { type: 'image_url', image_url: { url: req.image_data } },
            ],
          }],
          max_tokens: 4096,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return { error: `OpenAI ${res.status}: ${err}` };
      }

      const data = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return { content: data.choices?.[0]?.message?.content };
    }

    return { error: `Unsupported provider: ${model.provider}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
