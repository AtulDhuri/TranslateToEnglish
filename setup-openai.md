# OpenAI Setup

## 1. Get OpenAI API Key
- Go to https://platform.openai.com/api-keys
- Create new API key
- Copy the key

## 2. Set Environment Variable
Update `.env` file:
```
OPENAI_API_KEY=your-actual-openai-api-key
```

## 3. Run Application
```bash
npm install
npm start
```

Then in another terminal:
```bash
cd angular-app/translate-app
npm install
ng serve
```

Open http://localhost:4200