import fs from 'node:fs'
import textToSpeech from '@google-cloud/text-to-speech'
import { ElevenLabsClient } from 'elevenlabs'
import { fal } from "@fal-ai/client"
import axios from 'axios'

const googleClient = new textToSpeech.TextToSpeechClient()
const elevenLabsClient = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })

const elevenlabsMaleVoiceId = 'UgBBYS2sOqTuMpoF3BR0'
const elevenlabsFemaleVoiceId = 'OYTbf65OHHFELVut7v2H'


export const listVoices = async (languageCode = 'en') => {
    const [result] = await googleClient.listVoices({languageCode})
    const voices = result.voices

    voices.forEach((voice) => {
        console.log(`${voice.name} (${voice.ssmlGender}): ${voice.languageCodes}`)
    })
}

export const say = (text, gender, fileName, provider = 'google') => new Promise(async (resolve, reject) => {
    if (provider === 'google') {
        const request = {
            input: {text: text},
            voice: {
                name: 'en-US-Journey-' + (gender === 'male' ? 'D' : 'F'),
                languageCode: 'en-US'
            },
            audioConfig: {audioEncoding: 'LINEAR16'},
        }

        const [response] = await googleClient.synthesizeSpeech(request)

        await fs.writeFileSync(fileName, response.audioContent, 'binary')
        resolve()
    }
    else if (provider === 'elevenlabs') {

        const audioContent = await elevenLabsClient.generate({
            text,
            voice: gender === 'male' ? elevenlabsMaleVoiceId : elevenlabsFemaleVoiceId,
            model_id: "eleven_multilingual_v2"
        });

        const writableStream = fs.createWriteStream(fileName)

        writableStream.on('finish', () => {
            resolve()
        })

        audioContent.pipe(writableStream)
    }
    else if (provider === 'fal') {
        await fal.subscribe('fal-ai/playai/tts/dialog', {
            input: {
                input: text,
                voices: [
                    {
                        voice: 'Jennifer (English (US)/American)',
                        turn_prefix: 'her: '
                    },
                    {
                        voice: 'Furio (English (IT)/Italian)',
                        turn_prefix: 'him: '
                    }
                ]
            },
            onQueueUpdate: async (update) => {
                console.log('FAL TTS', update.request_id, update.status)
                if (update.status === 'COMPLETED') {
                    const result = await fal.queue.result("fal-ai/playai/tts/dialog", {
                        requestId: update.request_id
                    })

                    const response = await axios.get(result.data.audio.url, { responseType: "arraybuffer" })
                    fs.writeFileSync(fileName, response.data)
                    resolve()
                }
            },
        })
    }
})