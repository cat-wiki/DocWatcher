// src/env-test.js
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
config({ path: resolve(__dirname, '../.env') });

console.log('Environment check:');
console.log('Current directory:', __dirname);
console.log('Looking for .env in:', resolve(__dirname, '../.env'));
console.log('Environment variables loaded:', {
    tokenExists: !!process.env.GITHUB_TOKEN,
    tokenPrefix: process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.substring(0, 4) : 'none',
    tokenLength: process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.length : 0
});