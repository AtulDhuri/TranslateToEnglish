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
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // 2 minutes
  maxRetries: 2
});

// Set global timeout for all requests
require('http').globalAgent.timeout = 120000;
require('https').globalAgent.timeout = 120000;

app.post('/translate-audio', upload.single('audio'), async (req, res) => {
  console.log('🎤 Audio upload received');
  console.log('📁 File info:', req.file ? { name: req.file.filename, size: req.file.size } : 'No file');
  
  try {
    if (!req.file) {
      console.log('❌ No audio file received');
      return res.status(400).json({ error: 'No audio file received' });
    }
    
    console.log('🔄 Starting speech-to-text with Whisper...');
    // Check file size first
    const stats = fs.statSync(req.file.path);
    console.log('📊 Audio file size:', stats.size, 'bytes');
    
    if (stats.size > 10 * 1024 * 1024) { // 10MB limit for faster processing
      console.log('❌ File too large for Whisper API:', stats.size, 'bytes');
      return res.status(400).json({ error: 'Audio file too large. Record shorter clips.' });
    }
    
    if (stats.size < 1000) { // Too small
      console.log('❌ File too small:', stats.size, 'bytes');
      return res.status(400).json({ error: 'Audio file too small. Record longer.' });
    }
    
    // Speech to text using OpenAI Whisper with timeout and retry
    let transcription;
for (let attempt = 1; attempt <= 2; attempt++) {
  try {
    console.log(`📡 Whisper attempt ${attempt}/2`);

    // Whisper transcription with timeout (120s)
    transcription = await Promise.race([
      openai.audio.transcriptions.create({
        file: fs.createReadStream(req.file.path),
        model: 'whisper-1',
        language: 'hi' // use 'mr' for Marathi if needed, or omit to auto-detect
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout after 120s')), 120000)
      )
    ]);

    console.log('✅ Whisper API call successful');
    break; // exit loop if success
  } catch (whisperError) {
    console.log(`❌ Whisper attempt ${attempt} failed:`, whisperError.message);

    if (whisperError.message.includes('ECONNRESET')) {
      console.log('🔌 Connection reset by OpenAI server');
    } else if (whisperError.message.includes('timeout')) {
      console.log('⏱️ Whisper request timed out.');
    }

    if (attempt === 2) {
      throw new Error(`❌ All attempts failed: ${whisperError.message}`);
    }

    console.log('⏳ Waiting 3 seconds before retry...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

    
    console.log('📝 Transcription result:', transcription.text);
    
    if (!transcription.text) {
      console.log('❌ No speech detected in audio');
      return res.status(400).json({ error: 'No speech detected' });
    }
    
    console.log('🔄 Starting translation with GPT...');
    // Translate to English using GPT
    const translation = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Translate this Hindi/Marathi text to English: "${transcription.text}"`
      }]
    });
    
    const translatedText = translation.choices[0].message.content;
    console.log('🌍 Translation result:', translatedText);
    
    console.log('🔄 Starting text-to-speech...');
    // Text to speech using OpenAI TTS
    const speech = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: translatedText
    });
    
    const buffer = Buffer.from(await speech.arrayBuffer());
    console.log('🔊 Audio generated, size:', buffer.length, 'bytes');
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    console.log('🗑️ Temp file cleaned up');
    
    console.log('✅ Translation completed successfully');
    res.json({
      originalText: transcription.text,
      translatedText: translatedText,
      audioBase64: buffer.toString('base64')
    });
    
  } catch (error) {
    console.error('❌ Translation error:', error.message);
    console.error('🔍 Full error:', error);
    
    if (error.code === 'insufficient_quota') {
      console.log('💳 OpenAI quota exceeded');
      res.status(500).json({ error: 'OpenAI quota exceeded' });
    } else if (error.code === 'invalid_api_key') {
      console.log('🔑 Invalid OpenAI API key');
      res.status(500).json({ error: 'Invalid API key' });
    } else {
      res.status(500).json({ error: 'Translation failed: ' + error.message });
    }
  }
});

// HTTP server for development
const path = require('path');

// Serve Angular build files
const distPath = path.join(__dirname, 'angular-app/translate-app/dist/translate-app/browser');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // Catch all handler for Angular routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/translate-audio')) {
      return; // Let API routes handle themselves
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Angular app not built. Run: npm run build');
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('📱 Serving Angular app and API from same server');
  console.log('🔑 OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Set ✅' : 'Missing ❌');
  console.log('📂 Dist path exists:', fs.existsSync(path.join(__dirname, 'angular-app/translate-app/dist/translate-app/browser')) ? 'Yes ✅' : 'No ❌');
});