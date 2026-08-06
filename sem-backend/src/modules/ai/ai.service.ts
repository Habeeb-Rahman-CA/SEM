import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly logger = new Logger('AiService');

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generates text using the configured AI provider, falling back to other providers if needed.
   */
  async generateText(
    prompt: string,
    options?: { provider?: string; model?: string },
  ): Promise<string> {
    const provider =
      options?.provider ||
      this.configService.get<string>('AI_PROVIDER') ||
      'fallback';
    const model = options?.model;

    this.logger.log(`Generating text using provider: ${provider}`);

    if (provider === 'gemini') {
      const apiKey = this.configService.get<string>('GEMINI_API_KEY');
      if (!apiKey) {
        throw new Error('Gemini API key is not configured');
      }
      return this.generateWithGemini(prompt, apiKey, model);
    }

    if (provider === 'groq') {
      const apiKey = this.configService.get<string>('GROQ_API_KEY');
      if (!apiKey) {
        throw new Error('Groq API key is not configured');
      }
      return this.generateWithGroq(prompt, apiKey, model);
    }

    if (provider === 'openrouter') {
      const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
      if (!apiKey) {
        throw new Error('OpenRouter API key is not configured');
      }
      return this.generateWithOpenRouter(prompt, apiKey, model);
    }

    // Default or 'fallback' behavior: cascade through configured keys
    return this.generateTextWithFallback(prompt);
  }

  private async generateWithGemini(
    prompt: string,
    apiKey: string,
    modelOverride?: string,
  ): Promise<string> {
    const model = modelOverride || 'gemini-1.5-flash';
    this.logger.log(
      `Attempting text generation with Google AI Studio (Gemini - ${model})...`,
    );
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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

    return text;
  }

  private async generateWithGroq(
    prompt: string,
    apiKey: string,
    modelOverride?: string,
  ): Promise<string> {
    const model = modelOverride || 'llama-3.3-70b-specdec';
    this.logger.log(`Attempting text generation with Groq (${model})...`);
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
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

    return text;
  }

  private async generateWithOpenRouter(
    prompt: string,
    apiKey: string,
    modelOverride?: string,
  ): Promise<string> {
    const model = modelOverride || 'google/gemini-2.5-flash:free';
    this.logger.log(`Attempting text generation with OpenRouter (${model})...`);
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
          model,
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

    return text;
  }

  private async generateTextWithFallback(prompt: string): Promise<string> {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      try {
        return await this.generateWithGemini(prompt, geminiKey);
      } catch (e: any) {
        this.logger.warn(
          `Google AI Studio (Gemini) failed: ${e?.message || e}. Trying next provider...`,
        );
      }
    }

    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    if (groqKey) {
      try {
        return await this.generateWithGroq(prompt, groqKey);
      } catch (e: any) {
        this.logger.warn(
          `Groq failed: ${e?.message || e}. Trying next provider...`,
        );
      }
    }

    const openrouterKey = this.configService.get<string>('OPENROUTER_API_KEY');
    if (openrouterKey) {
      try {
        return await this.generateWithOpenRouter(prompt, openrouterKey);
      } catch (e: any) {
        this.logger.warn(`OpenRouter failed: ${e?.message || e}.`);
      }
    }

    throw new Error('All AI generation providers failed or are unconfigured.');
  }
}
