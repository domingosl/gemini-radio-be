import puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'
import fs from 'node:fs'

const DEV_TO_URL = 'https://dev.to/top/week'
const ARTICLES_MAX = 3

const relax = (time) => { return new Promise(resolve => setTimeout(resolve, time)) }

const getArticleContent = async (browser, articleUrl) => {

  const articlePage = await browser.newPage()

  console.log("Accessing URL: ", articleUrl)
  await articlePage.goto(articleUrl, { waitUntil: 'networkidle2' })
  console.log("Page loaded")

  const articleHtmlContent = await articlePage.content()
  const $$ = cheerio.load(articleHtmlContent)

  const contentSections = $$('#main-content p, #main-content h1, #main-content h2, #main-content h3')
  .map((_, el) => $$(el).text().trim())
  .get()

  const content = contentSections.join('\n\n').replace(/\n{2,}/g, '\n').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').trim()

  await articlePage.close()

  return content
}

const process = async () => {

  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  console.log("Accessing URL: ", DEV_TO_URL)
  await page.goto(DEV_TO_URL, { waitUntil: 'networkidle2' })
  console.log("Page loaded")

  // Get the page content
  const htmlContent = await page.content()

  fs.writeFileSync('tmp/devto.html', htmlContent)

  // Parse the HTML content with Cheerio
  const $ = cheerio.load(htmlContent)

  const articles = []

  // Loop through each article element (update selector based on the file structure)
  for (const element of $('.crayons-story').toArray()) {

    if (!element || articles.length >= ARTICLES_MAX) continue

    const title = $(element).find('.crayons-story__title a').text().trim()
    const link = $(element).find('.crayons-story__title a').attr('href')
    const author = $(element).find('.crayons-story__meta .crayons-story__meta-content a').text().trim()
    const authorProfile = $(element).find('.crayons-story__meta .crayons-story__meta-content a').attr('href')
    const date = $(element).find('time').attr('datetime')
    const tags = $(element)
    .find('.crayons-story__tags a')
    .map((i, el) => $(el).text().trim())
    .get()

    if (!title || !link) continue

    articles.push({
      title,
      link,
      content: await getArticleContent(browser, link),
      author,
      authorProfile: authorProfile || "",
      date,
      tags,
    })

    await relax(500 + Math.random() * 1000)
  }


  fs.writeFileSync('./tmp/articles_metadata.json', JSON.stringify(articles, null, 2))

  // Close the browser
  await browser.close()

  return articles
}

export default process