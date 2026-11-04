import 'dotenv/config';
import express from 'express';
import Groq from 'groq-sdk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const GROQ_VISION_PRIMARY_MODEL = 'qwen/qwen3.8-27b';
const GROQ_VISION_FALLBACK_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

interface RecognizedPayload {
  summary?: string;
  items?: Array<{ name: string; category?: string }>;
}

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GROQ_API_KEY') {
    throw new Error(
      'GROQ_API_KEY is not configured. Please add GROQ_API_KEY in the Settings > Secrets panel to scan ingredients with Groq Vision.'
    );
  }
  return new Groq({ apiKey });
}

async function recognizeWithGroqVision(
  groq: Groq,
  dataUri: string,
  model: string
): Promise<RecognizedPayload> {
  const completion = await groq.chat.completions.create({
    model,
    temperature: 0.2,
    max_completion_tokens: 1024,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are an accurate culinary vision assistant for a grocery list app. ' +
          'Inspect the user photo and identify all visible food ingredients, fresh produce, spices, dairy, grains, packaged groceries, or handwritten/printed grocery items. ' +
          'Respond strictly with a valid JSON object matching this exact schema: ' +
          '{"summary": "Brief 1-sentence summary of detected groceries", "items": [{"name": "Item name with visible quantity e.g. Cherry tomatoes (1 bowl)", "category": "Produce | Dairy | Pantry | Meat | Spices | Bakery | Beverage"}]}. ' +
          'Never invent ingredients that are not visible in the image.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Scan all ingredients in this snapshot and return the JSON grocery list.',
          },
          {
            type: 'image_url',
            image_url: {
              url: dataUri,
            },
          },
        ],
      },
    ],
  });

  const rawContent = completion.choices?.[0]?.message?.content ?? '{}';
  return JSON.parse(rawContent) as RecognizedPayload;
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '15mb' }));

  app.post('/api/groceries/snap-recognize', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'No camera snapshot provided for Groq Vision scanning.' });
        return;
      }

      const cleanedBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
      const validMime =
        mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
      const dataUri = `data:${validMime};base64,${cleanedBase64}`;

      const groq = getGroqClient();

      let parsed: RecognizedPayload;
      try {
        parsed = await recognizeWithGroqVision(groq, dataUri, GROQ_VISION_PRIMARY_MODEL);
      } catch (primaryErr: unknown) {
        const msg = primaryErr instanceof Error ? primaryErr.message : '';
        if (msg.includes('model_not_found') || msg.includes('decommissioned')) {
          parsed = await recognizeWithGroqVision(groq, dataUri, GROQ_VISION_FALLBACK_MODEL);
        } else {
          throw primaryErr;
        }
      }

      const items = Array.isArray(parsed.items)
        ? parsed.items
            .filter((item) => item && typeof item.name === 'string' && item.name.trim().length > 0)
            .map((item) => ({
              name: item.name.trim(),
              category: (item.category || 'Produce').trim(),
            }))
        : [];

      res.json({
        provider: 'groq',
        summary: parsed.summary ?? `Recognized ${items.length} ingredients via Groq Vision.`,
        items,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to scan ingredients with Groq API.';

      const isAuthError =
        message.includes('GROQ_API_KEY') ||
        message.includes('401') ||
        message.toLowerCase().includes('invalid api key') ||
        message.toLowerCase().includes('authentication');

      const isRateLimit = message.includes('429') || message.toLowerCase().includes('rate limit');

      const status = isAuthError ? 403 : isRateLimit ? 429 : 500;
      const friendlyMessage = isAuthError
        ? 'Groq API authentication required. Add a valid GROQ_API_KEY in the Settings > Secrets panel.'
        : isRateLimit
        ? 'Groq API rate limit reached. Please wait a few seconds and scan again.'
        : message;

      res.status(status).json({ error: friendlyMessage });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hamid & Hassan Kitchen server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
