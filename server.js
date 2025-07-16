require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs');
const https = require('https');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/translate-audio', upload.single('audio'), async (req, res) => {
  try {
    // Speech to text using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: 'whisper-1',
      language: 'hi' // Hindi/Marathi
    });
    
    if (!transcription.text) {
      return res.status(400).json({ error: 'No speech detected' });
    }
    
    // Translate to English using GPT
    const translation = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Translate this Hindi/Marathi text to English: "${transcription.text}"`
      }]
    });
    
    const translatedText = translation.choices[0].message.content;
    
    // Text to speech using OpenAI TTS
    const speech = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: translatedText
    });
    
    const buffer = Buffer.from(await speech.arrayBuffer());
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({
      originalText: transcription.text,
      translatedText: translatedText,
      audioBase64: buffer.toString('base64')
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// HTTP server for development
const path = require('path');

// Serve Angular build files
app.use(express.static(path.join(__dirname, 'angular-app/translate-app/dist/translate-app/browser')));

// Catch all handler for Angular routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/translate-audio')) {
    return; // Let API routes handle themselves
  }
  res.sendFile(path.join(__dirname, 'angular-app/translate-app/dist/translate-app/browser/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Serving Angular app and API from same server');
  console.log('Make sure to set OPENAI_API_KEY in .env file');
});