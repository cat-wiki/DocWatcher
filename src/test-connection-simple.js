// test-connection-esm.js
import { config } from 'dotenv';
import { Octokit } from '@octokit/rest';

config(); // Load .env file

const testConnection = async () => {
    if (!process.env.GITHUB_TOKEN) {
        console.error('No GITHUB_TOKEN found in environment variables');
        return;
    }

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    try {
        const { data: repo } = await octokit.repos.get({
            owner: 'cat-wiki',
            repo: 'DocWatcher'
        });
        console.log('Repository accessed successfully:', repo.full_name);
    } catch (error) {
        console.error('Error:', error.message);
    }
};

testConnection();