import { v4 as uuidv4 } from 'uuid'
import fs from 'node:fs'
import pLimit from 'p-limit'
import { process as ffProcess } from './ffmpeg.js'
import { say } from "./tts.js"
import {generateAndStoreImage, generateImageBase64} from "./image-gen.js"
import { getSongs } from './jamendo.js'
import ejs from 'ejs'
import musicIndex from '../public/music/index.js'

import {GoogleGenerativeAI} from "@google/generative-ai"
import OpenAI from 'openai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const geminiModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL, generationConfig: { responseMimeType: 'application/json' } })

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

const limit = pLimit(2)
const tasks = []

const defaultPromptTpl = fs.readFileSync('./defaults/news-prompt.ejs', 'utf8')
const musicSelectionPromptTpl = fs.readFileSync('./defaults/music-selection-prompt.ejs', 'utf8')

const ttsProvider = process.env.TTS_PROVIDER
const scriptGenerationProvider = process.env.SCRIPT_GENERATION_PROVIDER || 'gemini'

export default (news, config) => new Promise(async (resolve, reject) => {

    try {
        let songBefore
        if(config.includeIntroMusic) {
            const songs = await getSongs()
            songBefore = songs[Math.floor(Math.random() * songs.length)]
        }

        config = { v: 1, ...config }

        const prompt = ejs.render(defaultPromptTpl, {
            news: JSON.stringify(news),
            hostOneName: config.hostOneName,
            hostTwoName: config.hostTwoName,
            weatherInfo: config.weatherInfo,
            songBefore
        })

        let podcast
        if (scriptGenerationProvider === 'openai') {
            const response = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o',
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: 'You are a podcast script generator. Return a JSON object with podcast details.' },
                    { role: 'user', content: prompt }
                ]
            })
            podcast = JSON.parse(response.choices[0].message.content)
        } else {
            const res = await geminiModel.generateContent(prompt)
            podcast = JSON.parse(
              res.response.candidates[0].content.parts[0].text)
        }

        const id = uuidv4()

        const podcastData = {
            id,
            title: podcast.title,
            imageURL: process.env.GEN_POD_IMAGE === 'true' ? await generateAndStoreImage(podcast.imagePrompt, id) : null,
            synopsis: podcast.synopsis,
            script: podcast.script.reduce((prev, cur) => {
                prev += (cur.gender === 'male' ? 'him: ' : 'her: ') + cur.text + '\n'
                return prev
            }, ''),
            status: 'generating',
            date: new Date().toISOString()
        }

        resolve({
            podcast: podcastData
        })

        let fileListFfmpeg = ''
        if(ttsProvider !== 'fal') {
            let i = -1
            for (let intervention of podcast.script) {
                i++
                const filename = 'voice-chunk-' + id + '-' + i +
                  (ttsProvider === 'elevenlabs' ? '.mp3' : '.wav')
                fileListFfmpeg += 'file \'' + filename + '\'\n'
                const task = limit(
                  () => say(intervention.text, intervention.gender,
                    './tmp/' + filename, ttsProvider))
                tasks.push(task)
            }
        } else {
            const filename = 'voice-chunk-' + id + '-1-fal.mp3'
            fileListFfmpeg += 'file \'' + filename + '\'\n'
            tasks.push(say(podcastData.script, null, './tmp/' + filename, ttsProvider))
        }

        await Promise.all(tasks)

        let backgroundMusicFilePath

        if(config.backgroundMusic === "-1") {
            const musicSelPrompt = ejs.render(musicSelectionPromptTpl, {
                podcastSynopsis: podcastData.synopsis,
                musicList: musicIndex.map(music => (JSON.stringify({ id: music.id, tags: music.tags })))
            })

            let musicSelection
            if (scriptGenerationProvider === 'openai') {
                const response = await openai.chat.completions.create({
                    model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
                    response_format: { type: 'json_object' },
                    messages: [
                        { role: 'system', content: 'You are a music selection assistant. Return a JSON object with the selected music ID.' },
                        { role: 'user', content: musicSelPrompt }
                    ]
                })
                musicSelection = JSON.parse(response.choices[0].message.content)
                config.backgroundMusic = musicSelection.id
            } else {
                const res = await geminiModel.generateContent(musicSelPrompt)
                config.backgroundMusic = JSON.parse(res.response.candidates[0].content.parts[0].text).id
            }
        }

        backgroundMusicFilePath = 'public/music/' + musicIndex.find(
          music => music.id === parseInt(config.backgroundMusic)).file


        fs.writeFileSync('./tmp/file-list-' + id + '.txt', fileListFfmpeg)
        ffProcess(id, backgroundMusicFilePath, songBefore?.audiodownload).then(() => {
            fs.writeFileSync('./public/podcasts/p-' + id + '.json',
              JSON.stringify({
                  ...podcastData,
                  status: 'done',
                  audioURL: process.env.API_URL + '/podcasts/p-' + id + '.mp3'
              }))
        }).catch(error => {
            console.log(error)
            fs.writeFileSync('./public/podcasts/p-' + id + '.json',
              JSON.stringify({...podcastData, status: 'error', error}))
        })
    } catch (error) {
        console.log("Failed to generate the podcast", { error })
        reject(error)
    }

})