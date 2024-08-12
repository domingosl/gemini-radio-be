
const { GoogleGenerativeAI } = require("@google/generative-ai")

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL, generationConfig: { responseMimeType: 'application/json' }})

module.exports = { model }