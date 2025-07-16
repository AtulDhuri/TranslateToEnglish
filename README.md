# Marathi/Hindi to English Translator

A speech translation app using OpenAI for students to learn English.

## Setup

1. Get OpenAI API key from https://platform.openai.com/api-keys

2. Create `.env` file:
```
OPENAI_API_KEY=your-openai-api-key
```

3. Install dependencies:
```bash
npm install
cd angular-app/translate-app
npm install
```

## Run

1. Start Node.js server:
```bash
npm start
```

2. Start Angular app:
```bash
cd angular-app/translate-app
ng serve
```

3. Open http://localhost:4200

## Usage

1. Click "Start Recording"
2. Speak in Marathi or Hindi
3. Click "Stop Recording"
4. View translation and play English audio

## Features

- OpenAI Whisper for speech recognition
- GPT-3.5 for translation
- OpenAI TTS for English audio generation