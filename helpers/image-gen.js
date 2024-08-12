import OpenAI from 'openai';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
});

export async function generateImageBase64(prompt) {
    try {
        const response = await openai.images.generate({
            prompt: prompt,
            n: 1,
            size: "512x512",
            response_format: "b64_json",
        });

        const imageData = response.data[0].b64_json;
        const dataUri = `data:image/png;base64,${imageData}`;
        return dataUri;
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
}

export async function generateAndStoreImage(prompt, id) {
    try {
        const response = await openai.images.generate({
            prompt: prompt,
            n: 1,
            size: "512x512",
            response_format: "b64_json",
        });

        const imageData = response.data[0].b64_json;
        const imageBuffer = Buffer.from(imageData, 'base64');
        const filePath = resolve(`./public/podcasts/i-${id}.png`);

        writeFileSync(filePath, imageBuffer);

        const imageUrl = `${process.env.API_URL}/podcasts/i-${id}.png`;
        return imageUrl;
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
}