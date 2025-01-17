// githubIntegration.js
const { Octokit } = require('@octokit/rest');
const config = require('./config.js');

class GitHubIntegration {
    constructor(token) {
        this.octokit = new Octokit({
            auth: token,
            userAgent: 'tos-tracker-v1.0'
        });
    }

    async fetchUrlList({
        owner,
        repo,
        path,
        branch = 'main'
    }) {
        try {
            const response = await this.octokit.repos.getContent({
                owner,
                repo,
                path,
                ref: branch
            });

            // Decode content from base64
            const content = Buffer.from(response.data.content, 'base64').toString();
            
            // Parse the content based on file extension
            const fileExtension = path.split('.').pop().toLowerCase();
            
            switch(fileExtension) {
                case 'json':
                    return this.parseJsonContent(content);
                case 'yaml':
                case 'yml':
                    return this.parseYamlContent(content);
                case 'txt':
                    return this.parseTxtContent(content);
                default:
                    throw new Error(`Unsupported file format: ${fileExtension}`);
            }
        } catch (error) {
            console.error('Error fetching URL list from GitHub:', error);
            throw error;
        }
    }

    parseJsonContent(content) {
        try {
            const data = JSON.parse(content);
            return this.validateAndNormalizeUrls(data);
        } catch (error) {
            throw new Error('Invalid JSON format in URL list');
        }
    }

    parseYamlContent(content) {
        try {
            const yaml = require('js-yaml');
            const data = yaml.load(content);
            return this.validateAndNormalizeUrls(data);
        } catch (error) {
            throw new Error('Invalid YAML format in URL list');
        }
    }

    parseTxtContent(content) {
        // Split by newlines and filter out empty lines and comments
        const urls = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        
        return this.validateAndNormalizeUrls(urls);
    }

    validateAndNormalizeUrls(data) {
        // Handle different possible data structures
        let urls = Array.isArray(data) ? data : 
                  typeof data === 'object' ? Object.values(data) : 
                  [data];

        // Flatten nested arrays if necessary
        urls = urls.flat();

        // Filter and validate URLs
        return urls
            .filter(url => {
                try {
                    new URL(url);
                    return true;
                } catch {
                    console.warn(`Invalid URL found and skipped: ${url}`);
                    return false;
                }
            })
            .map(url => url.trim());
    }
}

module.exports = GitHubIntegration;