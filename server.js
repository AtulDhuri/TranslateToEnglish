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

// Try to create HTTPS server
try {
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'ssl', 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl', 'server.crt'))
  };
  
  https.createServer(httpsOptions, app).listen(3000, '0.0.0.0', () => {
    console.log('HTTPS Server running on port 3000');
    console.log('Access from mobile: https://YOUR_IP:3000');
  });
} catch (error) {
  console.log('SSL certificates not found. Run create-ssl.bat first');
  app.listen(3000, '0.0.0.0', () => {
    console.log('HTTP Server running on port 3000 (SSL setup required for mobile)');
  });
}