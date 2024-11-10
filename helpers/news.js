import Parser from 'rss-parser'

const parser = new Parser()
const feedUrl = 'https://www.lusakatimes.com/headlines/feed/'

async function getNews() {
    const newsArray = []

    try {
        const feed = await parser.parseURL(feedUrl)
        feed.items.forEach((item) => {
            newsArray.push({
                title: item.title,
                description: item.contentSnippet || item.description || 'No description available'
            })
        })
    } catch (error) {
        console.error('Error fetching news:', error)
    }

    return newsArray
}

export default getNews