# JARVIS Android starter

An installable-style PWA starter with a futuristic human neural-implant HUD, microphone input, Groq chat, and ElevenLabs speech output.

## Requirements
- Node.js 18 or newer
- A Groq API key
- An ElevenLabs API key and voice ID

## Run locally
1. Extract the ZIP and open the folder in a terminal.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Add your keys and ElevenLabs voice ID to `.env`.
5. Run `npm start`.
6. Open `http://localhost:3000` on your computer to test.

## Put it on your Android phone
Deploy this Node app to a host that supports Node.js and HTTPS. Do not expose `.env` or put API keys in frontend files. Open the HTTPS address in Chrome on Android, then use Chrome's menu > Add to Home screen / Install app. Grant microphone permission when prompted.

## Notes
- Voice recognition uses the browser SpeechRecognition API and may vary by browser/device. Text input remains available as a fallback.
- Microphone access and PWA installation require a secure context such as HTTPS (localhost is allowed for development).
- This is a starter: it does not yet have an always-on wake word, background listening, native Android permissions, phone-call access, or device automation.
- Keep `.env` private and never commit it to source control.
- Change `GROQ_MODEL` if the model you choose is not enabled on your Groq account.


## Custom HUD image
The supplied dashboard image is included as `public/jarvis-hud.jpg` and displayed in the main interface. The working microphone and chat controls remain below the image so they are accessible on a phone.
