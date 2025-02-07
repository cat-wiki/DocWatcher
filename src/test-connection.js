// src/test-connection.js
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';
import { Octokit } from '@octokit/rest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
config({ path: resolve(__dirname, '../.env') });

async function testConnection() {
    // First check if token exists
    if (!process.env.GITHUB_TOKEN) {
        console.error('No GITHUB_TOKEN found in environment variables');
        return;
    }

    console.log('Token found:', process.env.GITHUB_TOKEN.slice(0, 4) + '...');

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    try {
        // Test basic public repo access
        console.log('\nTrying to access public repository...');
        const { data: repo } = await octokit.repos.get({
            owner: 'cat-wiki',
            repo: 'DocWatcher'
        });
        console.log('Success! Repository details:', {
            name: repo.name,
            id: repo.id,
            visibility: repo.visibility,
            defaultBranch: repo.default_branch
        });

        // Try to get contents of doc-urls.txt
        console.log('\nTrying to access doc-urls.txt...');
        const { data: content } = await octokit.repos.getContent({
            owner: 'cat-wiki',
            repo: 'DocWatcher',
            path: 'urls/doc-urls.txt'
        });
        
        if (content.encoding === 'base64') {
            const decodedContent = Buffer.from(content.content, 'base64').toString();
            console.log('\nFirst few lines of doc-urls.txt:');
            console.log(decodedContent.split('\n').slice(0, 5).join('\n'));
        }

    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            status: error.status,
            response: error.response?.data
        });
    }
}

testConnection().catch(console.error);