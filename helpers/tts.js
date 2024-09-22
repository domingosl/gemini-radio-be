import fs from 'node:fs'
import textToSpeech from '@google-cloud/text-to-speech'

const client = new textToSpeech.TextToSpeechClient();

export const listVoices = async (languageCode = 'en') => {
    const [result] = await client.listVoices({languageCode});
    const voices = result.voices;

    voices.forEach((voice) => {
        console.log(`${voice.name} (${voice.ssmlGender}): ${voice.languageCodes}`);
    });
}

export const say = async (text, gender, fileName) => {

    const request = {
        input: {text: text},
        voice: {name: 'en-US-Journey-' + (gender === 'male' ? 'D' : 'F'), languageCode: 'en-US'},
        audioConfig: {audioEncoding: 'LINEAR16'},
    }

    const [response] = await client.synthesizeSpeech(request);

    await fs.writeFileSync(fileName, response.audioContent, 'binary');
}