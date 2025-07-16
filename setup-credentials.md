# Google Cloud Setup

## 1. Create Google Cloud Project
- Go to https://console.cloud.google.com/
- Create new project or select existing one

## 2. Enable APIs
Enable these APIs in your project:
- Speech-to-Text API
- Cloud Translation API  
- Text-to-Speech API

## 3. Create Service Account
- Go to IAM & Admin > Service Accounts
- Click "Create Service Account"
- Give it a name (e.g., "translate-app")
- Grant roles: "Cloud Translation API User", "Speech Client", "Cloud Text-to-Speech Client"
- Create and download JSON key file

## 4. Set Environment Variable
Create `.env` file in project root:
```
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/downloaded-key.json
```

## 5. Alternative: Set credentials in code
If you don't want to use environment variables, you can set credentials directly in server.js