import { Logger } from '@nestjs/common';

const logger = new Logger('AiClient');

/**
 * Calls Gemini (Google AI Studio) API to generate text.
 */
async function generateWithGemini(
  prompt: string,
  apiKey: string,
): Promise<string> {
  logger.log('Attempting text generation with Google AI Studio (Gemini)...');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Gemini API error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Invalid Gemini API response structure');
  }

  logger.log('Google AI Studio (Gemini) generated text successfully.');
  return text;
}

/**
 * Calls Groq API to generate text.
 */
async function generateWithGroq(
  prompt: string,
  apiKey: string,
): Promise<string> {
  logger.log('Attempting text generation with Groq...');
  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-specdec',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Groq API error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Invalid Groq API response structure');
  }

  logger.log('Groq generated text successfully.');
  return text;
}

/**
 * Calls OpenRouter API to generate text.
 */
async function generateWithOpenRouter(
  prompt: string,
  apiKey: string,
): Promise<string> {
  logger.log('Attempting text generation with OpenRouter...');
  const response = await fetch(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Taisen Platform',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Invalid OpenRouter API response structure');
  }

  logger.log('OpenRouter generated text successfully.');
  return text;
}

/**
 * Generates text with a fallback mechanism across Google AI Studio, Groq, and OpenRouter.
 */
export async function generateTextWithFallback(
  prompt: string,
): Promise<string | null> {
  // Try Google AI Studio (Gemini)
  if (process.env.GEMINI_API_KEY) {
    try {
      const text = await generateWithGemini(prompt, process.env.GEMINI_API_KEY);
      if (text) return text;
    } catch (e: any) {
      logger.warn(
        `Google AI Studio (Gemini) failed: ${e?.message || e}. Trying next provider...`,
      );
    }
  }

  // Try Groq
  if (process.env.GROQ_API_KEY) {
    try {
      const text = await generateWithGroq(prompt, process.env.GROQ_API_KEY);
      if (text) return text;
    } catch (e: any) {
      logger.warn(`Groq failed: ${e?.message || e}. Trying next provider...`);
    }
  }

  // Try OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const text = await generateWithOpenRouter(
        prompt,
        process.env.OPENROUTER_API_KEY,
      );
      if (text) return text;
    } catch (e: any) {
      logger.warn(`OpenRouter failed: ${e?.message || e}.`);
    }
  }

  logger.warn('All AI generation providers failed or are unconfigured.');
  return null;
}
