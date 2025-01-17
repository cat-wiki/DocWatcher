// index.js
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const GitHubIntegration = require('./githubIntegration');
const config = require('./config');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapePage(url, retries = config.scraping.retryAttempts) {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
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
            // Helper function to check if element is visible
            function isVisible(element) {
                const style = window.getComputedStyle(element);
                return style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       style.opacity !== '0';
            }

            // Helper function to get text content with preserved structure
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

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${config.outputDir}/${new URL(url).hostname}-${timestamp}.txt`;
        
        await fs.mkdir(config.outputDir, { recursive: true });
        
        const metadata = {
            url,
            timestamp,
            selector: content.selector,
            contentLength: content.text.length
        };

        await fs.writeFile(fileName, content.text);
        await fs.writeFile(
            fileName.replace('.txt', '-metadata.json'),
            JSON.stringify(metadata, null, 2)
        );

        console.log(`Saved to: ${fileName}`);
        return content;

    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        if (retries > 0) {
            console.log(`Retrying... (${retries} attempts remaining)`);
            await delay(config.scraping.retryDelay);
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
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

async function main() {
    // Initialize GitHub integration
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
        throw new Error('GITHUB_TOKEN environment variable is required');
    }

    const github = new GitHubIntegration(githubToken);
    
    try {
        // Fetch URLs from GitHub
        const urls = await github.fetchUrlList({
            owner: config.github.owner,
            repo: config.github.repo,
            path: config.github.urlListPath,
            branch: config.github.branch
        });

        console.log(`Found ${urls.length} URLs to scrape`);

        // Process each URL
        for (const url of urls) {
            try {
                await scrapePage(url);
                // Random delay between requests
                await delay(
                    Math.random() * 
                    (config.scraping.maxWaitBetweenRequests - config.scraping.minWaitBetweenRequests) + 
                    config.scraping.minWaitBetweenRequests
                );
            } catch (error) {
                console.error(`Failed to scrape ${url} after all retries:`, error);
            }
        }
    } catch (error) {
        console.error('Failed to fetch URL list from GitHub:', error);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    scrapePage,
    autoScroll
};