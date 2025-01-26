import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

export default async imageUrl => {

    try {
        // Send image URL directly to GPT-4o
        const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Describe these images in detail but do not exceed 300 characters per image. The pictures belong to a property listing, so your analysis should focus on relevant information for a house/apartment listing. Describe them in the same order they appear." },
                        { type: "image_url", image_url: { url: imageUrl } }
                    ]
                }
            ]
        });

        return openaiResponse.choices[0].message.content;
    } catch (error) {
        console.error('Error describing image:', error);
        throw error;
    }
}