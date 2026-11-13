import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/api/live' });

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI client (server-side only)
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// 1. Image Generation & Editing using gemini-nano-banana-2.1
app.post('/api/gemini/image', async (req, res) => {
  try {
    const { prompt, imageBase64, mimeType, aspectRatio } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    let inputData: any;
    if (imageBase64) {
      // Image editing mode
      inputData = [
        {
          type: 'image',
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          mime_type: mimeType || 'image/png',
        },
        {
          type: 'text',
          text: prompt,
        },
      ];
    } else {
      // New image generation
      inputData = prompt;
    }

    const interaction = await ai.interactions.create({
      model: 'gemini-nano-banana-2.1',
      input: inputData,
      response_modalities: ['image', 'text'],
      generation_config: {
        image_config: {
          aspect_ratio: aspectRatio || '1:1',
          image_size: '1K',
        },
      },
    });

    let imageUrl: string | null = null;
    let textResponse = '';

    for (const step of (interaction.steps || []) as any[]) {
      if (step.type === 'model_output' && Array.isArray(step.content)) {
        const img = step.content.find((c: any) => c.type === 'image') as any;
        if (img && img.data) {
          imageUrl = `data:${img.mime_type || 'image/png'};base64,${img.data}`;
        }
        const txt = step.content.find((c: any) => c.type === 'text') as any;
        if (txt && txt.text) {
          textResponse += txt.text;
        }
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'No image generated', text: textResponse });
    }

    res.json({ imageUrl, text: textResponse });
  } catch (error: any) {
    console.error('Error in /api/gemini/image:', error);
    res.status(500).json({ error: error.message || 'Image generation failed' });
  }
});

// 2. Animate Photo to Video using gemini-omni-1.2-flash via Interactions API
app.post('/api/gemini/animate-video', async (req, res) => {
  try {
    const { imageBase64, mimeType, prompt, aspectRatio } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Starting image (imageBase64) is required' });
    }

    const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const cleanAspect = aspectRatio === '9:16' ? '9:16' : '16:9';
    const motionPrompt = prompt || 'Cinematic industrial slow motion rotation of electric motor rotor winding with glowing spark and air cooling breeze.';

    const interaction = await ai.interactions.create({
      model: 'gemini-omni-1.2-flash',
      input: [
        {
          type: 'image',
          mime_type: mimeType || 'image/jpeg',
          data: rawBase64,
        },
        {
          type: 'text',
          text: motionPrompt,
        },
      ],
      background: false,
      store: false,
      stream: false,
      response_format: {
        type: 'video',
        aspect_ratio: cleanAspect,
        duration: '5s',
        resolution: '720p',
      },
    }, { timeout: 300000 });

    const videoPart = interaction.output_video;
    if (videoPart && videoPart.data) {
      const mime = videoPart.mime_type || 'video/mp4';
      const videoUrl = `data:${mime};base64,${videoPart.data}`;
      return res.json({ videoUrl, mimeType: mime });
    }

    res.status(500).json({ error: 'Video generation completed without video data' });
  } catch (error: any) {
    console.error('Error in /api/gemini/animate-video:', error);
    res.status(500).json({ error: error.message || 'Video animation failed' });
  }
});

// 3. Search Grounding using gemini-3.8-flash (google_search tool)
app.post('/api/gemini/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const interaction = await ai.interactions.create({
      model: 'gemini-3.8-flash',
      input: `Anda adalah pakar teknik motor listrik industri CV. Mustofa Jaya Teknik. Jawab pertanyaan berikut dengan data terkini dan referensi akurat: ${query}`,
      tools: [{ type: 'google_search' }],
    });

    let answer = interaction.output_text || '';
    let sources: any[] = [];

    for (const step of interaction.steps || []) {
      if (step.type === 'google_search_result' && (step as any).search_result) {
        sources.push((step as any).search_result);
      }
    }

    res.json({ answer, sources });
  } catch (error: any) {
    console.error('Error in /api/gemini/search:', error);
    res.status(500).json({ error: error.message || 'Search grounding failed' });
  }
});

// 4. Maps Grounding using gemini-3.8-flash (google_maps tool)
app.post('/api/gemini/maps-grounding', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Location / place query is required' });
    }

    const interaction = await ai.interactions.create({
      model: 'gemini-3.8-flash',
      input: `Temukan data lokasi, toko material isolasi kawat tembaga, supplier bearing SKF, atau bengkel industri di sekitar area Jawa Timur / Surabaya / Gresik / Sidoarjo terkait pencarian: ${query}`,
      tools: [{ type: 'google_maps' }],
    });

    const answer = interaction.output_text || '';
    res.json({ answer });
  } catch (error: any) {
    console.error('Error in /api/gemini/maps-grounding:', error);
    res.status(500).json({ error: error.message || 'Maps grounding failed' });
  }
});

// 5. Live API WebSocket connection using gemini-3.8-live
wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Live Voice API WebSocket');
  let session: any = null;

  try {
    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'audio', audio }));
          }
          if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }
          const textPart = message.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text;
          if (textPart && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'text', text: textPart }));
          }
        },
        onclose: () => {
          console.log('Gemini Live session closed');
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'closed' }));
          }
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: 'Anda adalah Asisten Suara Interaktif Bengkel CV. Mustofa Jaya Teknik. Anda mendengarkan teknisi bengkel dan menjawab secara lisan seputar rewinding motor listrik, perhitungan kawat tembaga Class H, bearing SKF, dan pemecahan masalah motor.',
      },
    });

    clientWs.on('message', (data: Buffer | string) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio && session) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
      } catch (err) {
        console.error('Failed to parse client message:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('Client disconnected from Live WebSocket');
    });
  } catch (err: any) {
    console.error('Failed to connect to Gemini Live session:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'error', error: err.message || 'Live session error' }));
    }
  }
});

// Vite middleware in dev mode
const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}`);
});
