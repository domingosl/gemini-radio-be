import { exec as execSync }  from 'node:child_process'
import { promisify } from "node:util"
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import fs from 'node:fs'
import path from 'node:path'

const exec = promisify(execSync)


const musicIntroDuration = 5
const fadeDuration = 2
const lowVolumeLevel = 0.05
export const process = async (id, backgroundMusicFilePath, songBeforeURL) => {

    //Voice chunks concat
    let cmd = "-f concat -safe 0 -i tmp/file-list-{{id}}.txt -c copy tmp/voice-{{id}}.wav".replaceAll("{{id}}", id)

    await exec(ffmpegStatic + " " + cmd)

    //Final voices length
    cmd = "-i tmp/voice-{{id}}.wav -show_entries format=duration -v quiet -of csv=\"p=0\"".replaceAll("{{id}}", id)

    const response = await exec(ffprobeStatic.path + " " + cmd)

    const voiceDuration = Math.ceil(parseFloat(response.stdout.replace('\n', '')))
    const voiceEndAt = voiceDuration + musicIntroDuration + Math.ceil(fadeDuration / 2)

    //Volume fading in background music
    cmd = "-stream_loop -1 -i \"" + backgroundMusicFilePath + "\" -filter_complex \"" +
      "[0:a]volume=1:enable='between(t,0," + musicIntroDuration + ")'," +
      "volume='if(between(t," + musicIntroDuration + "," + (musicIntroDuration + fadeDuration) + "), 1 - ((1 - " + lowVolumeLevel + ") * (t - " + musicIntroDuration + ") / " + fadeDuration + ")," + lowVolumeLevel + ")':eval=frame:enable='between(t," + musicIntroDuration + "," + voiceEndAt + ")'," +
      "volume='if(between(t," + voiceEndAt + "," + (voiceEndAt + fadeDuration) + "), " + lowVolumeLevel + " + ((1 - " + lowVolumeLevel + ") * (t - " + voiceEndAt + ") / " + fadeDuration + "),1)':eval=frame:enable='between(t," + voiceEndAt + "," + (voiceEndAt + musicIntroDuration) + ")'" +
      "\" -t " + (voiceEndAt + musicIntroDuration) + " tmp/bg-music-" + id + ".mp3";

    await exec(ffmpegStatic + " " + cmd)

    //Merge voices with background music
    const delayMs = (musicIntroDuration * 1000) + 1000;

    const songInput = songBeforeURL ? "-i \"" + songBeforeURL + "\"" : "-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100";

    cmd = songInput + " -i tmp/bg-music-" + id + ".mp3 -i tmp/voice-" + id + ".wav " +
      "-filter_complex \"" +
      "[2]adelay=" + delayMs + "|" + delayMs + ",asetpts=PTS-STARTPTS[a]; " +
      "[1][a]amix=inputs=2:duration=first:dropout_transition=3, " +
      "aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo[mixed]; " +
      "[0]asetpts=PTS-STARTPTS[intro]; " +
      "[mixed]asetpts=PTS-STARTPTS[content]; " +
      "[intro][content]concat=n=2:v=0:a=1[out]" +
      "\" " +
      "-map \"[out]\" -c:a libmp3lame -q:a 2 public/podcasts/p-" + id + ".mp3";

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