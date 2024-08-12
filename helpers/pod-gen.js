import { v4 as uuidv4 } from 'uuid'
import fs from 'node:fs'
import pLimit from 'p-limit'
import { process as ffProcess } from './ffmpeg.js'
import { say } from "./tts.js";
import {generateAndStoreImage, generateImageBase64} from "./image-gen.js";
import musicIndex from '../assets/music/index.js'

import {GoogleGenerativeAI} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL, generationConfig: { responseMimeType: 'application/json' } })

const limit = pLimit(3)
const tasks = []

const defaultPromptTpl = fs.readFileSync('./defaults/pod-gen-prompt.txt', 'utf8')

export default (letters, config) => new Promise(async (resolve, reject) => {

    const prompt = defaultPromptTpl
        .replace('{{letters}', letters)
        .replace('{{lettersAddress}}', config.lettersAddress ? 'By the end of the podcast the presenters invite the audience to send their letters to ' + config.lettersAddress : '')
        .replace('{{hostOneName}}', config.hostOneName)
        .replace('{{hostTwoName}}', config.hostTwoName)
        .replace('{{podcastName}}', config.podcastName)
        .replace('{{weatherInfo}}', config.weatherInfo ? 'Include real weather conditions of Zambia for ' + config.weatherInfo + ", causally mentioned it at the beginning of the episode" : '')

    const res = await model.generateContent(prompt)

    const backgroundMusicFilePath = 'assets/music/' + musicIndex.find(music => music.id === parseInt(config.backgroundMusic)).file

    console.log(config, prompt, backgroundMusicFilePath)

    const podcast = JSON.parse(res.response.candidates[0].content.parts[0].text)

    const id = uuidv4()

    const podcastData = {
        id,
        title: podcast.title,
        imageURL: await generateAndStoreImage(podcast.imagePrompt, id),
        synopsis: podcast.synopsis,
        script: podcast.script.reduce((prev, cur) => { prev += (cur.gender === 'male' ? 'him: ' : 'her: ') + cur.text + '\n'; return prev }, ''),
        status: 'generating',
        date: new Date().toISOString()
    }

    resolve({
        podcast: podcastData
    })

    let i = -1
    let fileListFfmpeg = ''
    for (let intervention of podcast.script) {
        i++
        const filename = 'voice-chunk-' + id + '-' + i + '.mp3'
        fileListFfmpeg += 'file \'' + filename + '\'\n'
        const task = limit(() => say(intervention.text, intervention.gender, './tmp/' + filename))
        tasks.push(task);
    }

    await Promise.all(tasks)

    fs.writeFileSync('./tmp/file-list-' + id + '.txt', fileListFfmpeg)
    ffProcess(id, backgroundMusicFilePath).then(()=>{
        fs.writeFileSync('./public/podcasts/p-' + id + '.json', JSON.stringify({
            ...podcastData,
            status: 'done',
            audioURL: process.env.APP_URL + '/podcasts/p-' + id + '.mp3'
        }))
    }).catch(error => {
        console.log(error)
        fs.writeFileSync('./public/podcasts/p-' + id + '.json', JSON.stringify({...podcastData, status: 'error', error}))
    })


})
