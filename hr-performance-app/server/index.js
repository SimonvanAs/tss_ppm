import express from 'express';
import cors from 'cors';
import multer from 'multer';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Speech-to-text endpoint
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  const tempFilePath = req.file.path;
  const language = req.body.language || 'en'; // Default to English

  try {
    // Map language codes to Whisper language codes
    const languageMap = {
      'en': 'en',
      'en-US': 'en',
      'en-GB': 'en',
      'nl': 'nl',
      'nl-NL': 'nl',
      'es': 'es',
      'es-ES': 'es'
    };

    const whisperLanguage = languageMap[language] || 'en';

    // Rename file with proper extension for OpenAI
    const audioFilePath = tempFilePath + '.webm';
    fs.renameSync(tempFilePath, audioFilePath);

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: 'whisper-1',
      language: whisperLanguage,
      response_format: 'text'
    });

    // Clean up uploaded file
    fs.unlinkSync(audioFilePath);

    res.json({ text: transcription.trim() });
  } catch (error) {
    console.error('Transcription error:', error);

    // Clean up temp file on error
    try {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      if (fs.existsSync(tempFilePath + '.webm')) fs.unlinkSync(tempFilePath + '.webm');
    } catch (e) {
      // Ignore cleanup errors
    }

    res.status(500).json({
      error: 'Transcription failed',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Speech-to-text server running on http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn('WARNING: OPENAI_API_KEY environment variable is not set!');
    console.warn('Set it with: set OPENAI_API_KEY=your-api-key');
  }
});
