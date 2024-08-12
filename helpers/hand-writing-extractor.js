import { model } from "./gemini.cjs";

const prompt = "Your task is to determine whether the image resembles a handwritten or typewritten letter. If it does, transcribe the content of the letter. Use context to fill in any areas that may be difficult to read due to picture quality or poor handwriting. You may also improve the writing if necessary for clarity. Your response should be a valid JSON object with two keys: text and error. Use the text key to provide the transcribed content in plain English, without any emojis or special characters. Set the error key to null if there are no issues. If the image does not resemble a letter or the text is impossible to read, use the error field to explain why the transcription was not possible."

function getMimeType(base64String) {
    const result = /^data:([^;]+);base64,/.exec(base64String);
    return result ? result[1] : null;
}

export default async (imageBase64) => {

    const image = {
        inlineData: {
            data: imageBase64.replace(/^data:[^;]+;base64,/, ''),
            mimeType: getMimeType(imageBase64),
        }
    }

    const result = await model.generateContent([prompt, image]);
    return JSON.parse(result.response.text())

}