import { exec as execSync }  from 'node:child_process'
import { promisify } from "node:util"
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import fs from 'node:fs'
import path from 'node:path'

const exec = promisify(execSync)


const musicIntroDuration = 5
const fadeDuration = 2
export const process = async (id, backgroundMusicFilePath) => {

    //Voice chunks concat
    let cmd = "-f concat -safe 0 -i tmp/file-list-{{id}}.txt -c copy tmp/voice-{{id}}.wav".replaceAll("{{id}}", id)

    await exec(ffmpegStatic + " " + cmd)

    //Final voices length
    cmd = "-i tmp/voice-{{id}}.wav -show_entries format=duration -v quiet -of csv=\"p=0\"".replaceAll("{{id}}", id)

    const response = await exec(ffprobeStatic.path + " " + cmd)

    const voiceDuration = Math.ceil(parseFloat(response.stdout.replace('\n', '')))
    const voiceEndAt = voiceDuration + musicIntroDuration + Math.ceil(fadeDuration / 2)

    //Volume fading in background music
    cmd = "-stream_loop -1 -i " + backgroundMusicFilePath + " -filter_complex \"" +
      "[0]volume=1:enable='between(t,0," + musicIntroDuration + ")'," +
      "volume='if(between(t," + musicIntroDuration + "," + (musicIntroDuration + fadeDuration) + "),1-(0.45*(t-" + musicIntroDuration + ")),0.05)':eval=frame:enable='between(t," + musicIntroDuration + "," + voiceEndAt + ")'," +
      "volume='if(between(t," + voiceEndAt + "," + (voiceEndAt + fadeDuration) + "),0.1+(0.45*(t-" + voiceEndAt + ")),1)':eval=frame:enable='between(t," + voiceEndAt + "," + (voiceEndAt + musicIntroDuration) + ")'\" " +
      "-t " + (voiceEndAt + musicIntroDuration) + " tmp/bg-music-" + id + ".mp3"

    await exec(ffmpegStatic + " " + cmd)

    //Merge voices with background music
    cmd = "-i tmp/bg-music-{{id}}.mp3 -i tmp/voice-{{id}}.wav -filter_complex \"[1]adelay=6000|6000[a];[0][a]amix=inputs=2:duration=first:dropout_transition=3\" -c:a libmp3lame -q:a 2 public/podcasts/p-{{id}}.mp3".replaceAll("{{id}}", id)

    await exec(ffmpegStatic + " " + cmd)

    fs.readdir('./tmp', (err, files) => {
        if (err) throw err;

        files.forEach(file => {
            if (file.includes(id)) {
                const filePath = path.join('./tmp', file);
                fs.unlink(filePath, err => {
                    if (err) throw err;
                    console.log(`Deleted: ${file}`);
                });
            }
        });
    });

    return 'DONE'

}