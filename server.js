import dotenv from 'dotenv/config'

import express from 'express'
import cors from 'cors'
import bodyParser from "body-parser"
import handWritingExtractor from "./helpers/hand-writing-extractor.js"
import podGen from "./helpers/pod-gen.js"
import { resolve as resolvePath, extname, join as joinPath } from 'node:path'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import musicIndex from './public/music/index.js'
import { v4 as uuidv4 } from 'uuid'
import { say } from './helpers/tts.js'
import image2text from './helpers/image2text.js'

const api = express()


api.use(cors())
api.use(bodyParser.json({limit: '50mb'}))
api.use(express.static('public'));

const enforceProtection = (req, res) => {
    if(req.headers['x-code'] === process.env.JUDGE_CODE)
        return true
    res.status(403).json({message: 'You dont have permission to run this command, please read the Judges instructions on how to use your Judge code'})
    return false
}

api.get('/status', (req, res) => {
    res.json({ status: 'ok'})
})

api.post('/scan', async (req, res) => {
    if(!enforceProtection(req, res))
        return

    const response = await handWritingExtractor(req.body.image)
    return res.json(response)

})


api.post('/podcast/generate', async (req, res) => {
    if(!enforceProtection(req, res))
        return
    podGen(req.body.letters, req.body.config)
    .then(r => res.json(r))
    .catch(()=>res.status(403).json({ message: "Podcast generation failed" }))


})

api.get('/podcast', async (req, res) => {

    const folderPath = resolvePath('./public/podcasts');
    const files = readdirSync(folderPath);
    const jsonData = files
        .filter(file => extname(file) === '.json')
        .map(file => JSON.parse(readFileSync(resolvePath(folderPath, file), 'utf8')));

    res.json(jsonData);

})

api.get('/podcast/:id', (req, res) => {
    const filePath = resolvePath(`./public/podcasts/p-${req.params.id}.json`);

    if (existsSync(filePath)) {
        const fileContents = readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContents)
        if(data.status === 'done')
            return res.json(data);
        else if(data.status === 'error')
            return res.status(403).json({ message: 'The podcast fail during generation, please try again' })

        res.status(404).send()

    } else {
        res.status(404).send({ error: 'Podcast not found' });
    }
});

api.get('/music', (req, res) => {
    res.json(musicIndex)
})

api.post('/tools/tts', async (req, res) => {
    const filename = `${uuidv4()}.mp3`
    const filepath = joinPath('public', 'tts', filename)
    console.log(req.body)
    await say(req.body.text, 'male', filepath, 'google')

    res.json({
        audioUrl: `${req.protocol}://${req.get('host')}/tts/${filename}`
    })
})

api.post('/tools/image2text', async (req, res) => {

    const payload = JSON.parse(req.body.data.replaceAll("'", '"'))
    let response = ""
    let pictureIndex = 1
    for (const image of payload) {
        if(pictureIndex > 4)
            continue
        response += "Picture" + pictureIndex + ": " + await image2text(image.s3_url_full) + ". "
        pictureIndex++
    }

    res.send(response)

})

api.listen(process.env.API_PORT, () => console.log('pod-gen-api now running on port', process.env.API_PORT))