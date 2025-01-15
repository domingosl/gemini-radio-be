import dotenv from 'dotenv/config'
import fs from 'node:fs'

import podGen from './helpers/pod-gen.js'

podGen(fs.readFileSync('./tests/letter.txt'), {
    hostOneName: 'John',
    hostTwoName: 'Jane',
    podcastName: 'The John and Jane Show',
    lettersAddress: 'Via le mani dal cul.',
    backgroundMusic: '-1'
}).then(r => console.log(r)).catch(e => console.error(e))