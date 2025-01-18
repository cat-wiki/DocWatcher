// config.js
module.exports = {
    github: {
        owner: 'cat-wiki',    // Organization name instead of username
        repo: 'DocWatcher',          // Repository name
        urlListPath: 'urls/doc-urls.txt',
        branch: 'main'
    },
    scraping: {
        retryAttempts: 3,
        retryDelay: 5000,
        scrollDelay: 100,
        minWaitBetweenRequests: 2000,
        maxWaitBetweenRequests: 5000
    },
    outputDir: './data'
};