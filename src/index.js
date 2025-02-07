// src/index.js
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import puppeteer from 'puppeteer';
import { config } from 'dotenv';
import { Octokit } from '@octokit/rest';

// Initialize environment configuration
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') });

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapePage(url, retries = 3) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-gpu',
            '--disable-dev-shm-usage'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        });

        console.log(`Scraping: ${url}`);
        
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        await delay(Math.random() * 2000 + 1000);
        await page.waitForSelector('body', { timeout: 10000 });
        await autoScroll(page);

        const content = await page.evaluate(() => {
            function isVisible(element) {
                const style = window.getComputedStyle(element);
                return style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       style.opacity !== '0';
            }

            function getStructuredText(element) {
                if (!isVisible(element)) {
                    return '';
                }

                switch (element.tagName.toLowerCase()) {
                    case 'br':
                        return '\n';
                    case 'p':
                    case 'div':
                    case 'h1':
                    case 'h2':
                    case 'h3':
                    case 'h4':
                    case 'h5':
                    case 'h6':
                    case 'li':
                        let text = '';
                        for (const child of element.childNodes) {
                            text += getNodeText(child);
                        }
                        return text.trim() + '\n';
                    case 'td':
                    case 'th':
                        return getNodeText(element) + '\t';
                    case 'tr':
                        let rowText = '';
                        for (const child of element.childNodes) {
                            rowText += getNodeText(child);
                        }
                        return rowText.trim() + '\n';
                }

                let text = '';
                for (const child of element.childNodes) {
                    text += getNodeText(child);
                }
                return text;
            }

            function getNodeText(node) {
                if (node.nodeType === 3) {
                    return node.textContent.replace(/\s+/g, ' ');
                }
                if (node.nodeType === 1) {
                    return getStructuredText(node);
                }
                return '';
            }

            function extractContent() {
                const selectors = [
                    'main',
                    'article',
                    '.terms',
                    '#terms',
                    '.terms-content',
                    '.legal-content',
                    '.tos-content',
                    '[role="main"]'
                ];

                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element && isVisible(element)) {
                        return {
                            text: getStructuredText(element),
                            selector: selector
                        };
                    }
                }

                const body = document.body;
                const excludeSelectors = ['nav', 'header', 'footer', '.navigation', '.footer', '.header'];
                const clone = body.cloneNode(true);
                
                excludeSelectors.forEach(selector => {
                    const elements = clone.querySelectorAll(selector);
                    elements.forEach(el => el.remove());
                });

                clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());

                return {
                    text: getStructuredText(clone),
                    selector: 'body'
                };
            }

            return extractContent();
        });

        if (!content.text) {
            throw new Error('No content found');
        }

        content.text = content.text
            .replace(/\n\s+\n/g, '\n\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        function sanitizeUrl(url) {
            // Remove protocol and sanitize for filename
            return url
                .replace(/^https?:\/\//, '')  // Remove protocol
                .replace(/[\\/?*:|"<>]/g, '_')  // Replace invalid filename chars
                .replace(/[.]/g, '-');  // Replace dots with dashes except last one
        }
        
        const baseFileName = sanitizeUrl(url);
        const fileName = `./data/${baseFileName}.txt`;
        
        await mkdir('./data', { recursive: true });
        
        const metadata = {
            url,
            lastChecked: new Date().toISOString(),
            selector: content.selector,
            contentLength: content.text.length
        };

        await writeFile(fileName, content.text);
        await writeFile(
            `${fileName}.metadata.json`,
            JSON.stringify(metadata, null, 2)
        );

        console.log(`Saved to: ${fileName}`);
        return content;

    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        if (retries > 0) {
            console.log(`Retrying... (${retries} attempts remaining)`);
            await delay(5000);
            return scrapePage(url, retries - 1);
        }
        throw error;
    } finally {
        await browser.close();
    }
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 500; // Increased scroll distance
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 20); // Decreased interval time
        });
    });

    // Add a small delay after scrolling to ensure content loads
    await page.waitForTimeout(500);
}

async function fetchUrlsFromGithub() {
    if (!process.env.GITHUB_TOKEN) {
        throw new Error('GITHUB_TOKEN environment variable is required');
    }

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    try {
        const { data } = await octokit.repos.getContent({
            owner: 'cat-wiki',
            repo: 'DocWatcher',
            path: 'urls/doc-urls.txt'
        });

        const content = Buffer.from(data.content, 'base64').toString();
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .filter(line => {
                try {
                    new URL(line);
                    return true;
                } catch {
                    console.warn(`Skipping invalid URL: ${line}`);
                    return false;
                }
            });
    } catch (error) {
        console.error('Failed to fetch URLs from GitHub:', error);
        throw error;
    }
}

async function main() {
    try {
        console.log('Fetching URLs from GitHub...');
        const urls = await fetchUrlsFromGithub();
        console.log(`Found ${urls.length} valid URLs to scrape`);

        for (const url of urls) {
            try {
                await scrapePage(url);
                const delayTime = Math.random() * 5000 + 2000;
                console.log(`Waiting ${Math.round(delayTime/1000)}s before next URL...`);
                await delay(delayTime);
            } catch (error) {
                console.error(`Failed to scrape ${url} after all retries:`, error);
            }
        }
    } catch (error) {
        console.error('Failed to fetch URL list from GitHub:', error);
    }
}

// Run main if this is the entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}

export { scrapePage, autoScroll, fetchUrlsFromGithub };