const { scrape } = require('./scraper');

async function main() {
  try {
    const results = await scrape();
    console.log(results);
  } catch (error) {
    console.error('Error during scraping:', error);
  }
}

main();
