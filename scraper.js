const axios = require('axios');
const cheerio = require('cheerio');
const { UserAgent } = require('user-agents');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function scrape() {
  try {
    const configData = await fs.readFile('config.json', 'utf-8');
    const config = JSON.parse(configData);
    const results = [];

    for (const target of config.targets) {
      const { url, selectors, minDelay, maxDelay, headers, usePuppeteer, interactions } = target;

      const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
      await (async () => {
        const { default: delay } = await import('delay');
        await delay(randomDelay);
      })();

      const userAgent = new UserAgent().toString();
      const requestHeaders = { ...headers, 'User-Agent': userAgent };

      let pageContent;
      if (usePuppeteer) {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded' });

          if (interactions && Array.isArray(interactions)) {
            for (const interaction of interactions) {
              if (interaction.type === 'click') {
                await page.click(interaction.selector);
              } else if (interaction.type === 'type') {
                await page.type(interaction.selector, interaction.text);
              } else if (interaction.type === 'wait') {
                await page.waitForTimeout(interaction.duration);
              }
            }
          }

          pageContent = await page.content();
        } catch (puppeteerError) {
          console.error(`Puppeteer error for ${url}:`, puppeteerError);
          pageContent = null;
        } finally {
          await browser.close();
        }
      } else {
        try {
          const response = await axios.get(url, { headers: requestHeaders });
          pageContent = response.data;
        } catch (axiosError) {
          console.error(`Axios error for ${url}:`, axiosError);
          pageContent = null;
        }
      }

      if (pageContent) {
        const $ = usePuppeteer ? cheerio.load(pageContent) : cheerio.load(pageContent);
        const extractedData = {};
        for (const [key, selector] of Object.entries(selectors)) {
          try {
            extractedData[key] = $(selector).text().trim();
          } catch (selectorError) {
            console.error(`Error extracting data for selector ${selector} on ${url}:`, selectorError);
            extractedData[key] = null;
          }
        }
        results.push({ url, data: extractedData });
      }
    }
    return JSON.stringify(results, null, 2);
  } catch (error) {
    console.error('Error during scraping:', error);
    return JSON.stringify({ error: 'Scraping failed' }, null, 2);
  }
}

module.exports = { scrape };
