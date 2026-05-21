import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL = 'http://localhost:3000/brochure.html';
const OUT = path.join(__dirname, 'Rancho-Exeter-Brochure.pdf');

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle0' });

await page.pdf({
  path: OUT,
  width: '11in',
  height: '8.5in',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});

await browser.close();
console.log('wrote', OUT);
