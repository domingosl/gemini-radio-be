# Gemini Radio Backend Server
This repository contains the source code for the backend server of the Gemini Radio project
## How to run it locally
In order to run it locally you'll several credentials in you .env file:
```
API_URL=
API_PORT=3000
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-pro

#THIS IS ONLY NEEDED TO GENERATE THE PODCASTS THUMBNAILS WHILE WE WAIT FOR GEMINI TO MAKE IMAGE GENERATION AVAILABLE AGAIN
OPENAI_API_KEY=
OPENAI_ORGANIZATION=

JAMANDO_CLIENT_ID=

JUDGE_CODE=
```

- The Google Application Credentials is the json file generated in your Google console required for all the TTS functionalities.
- The Gemini API Key can be obtained in your Google AI Studio dashboard
- The OpenAI credentials are not necessary if you are not interested on generating AI images for the podcast thumbnails, and they are used temporary until the Gemini model adds back image generation.
- The Jamando client id can be obtained in your Jamando dashboard, it's used for intro music find and download
- The Judge code it's a code to protect the public app from being access by non judge traffic