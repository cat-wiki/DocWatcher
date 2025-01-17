# DocWatcher

Document and Terms of Service change monitoring system. Currently WIP Windows build.

## Current Status

This is an early development build with the following characteristics:

* Windows-focused development
* Uses non-headless browser due to widespread anti-bot protections
* Experimental monitoring of TOS/EULA changes

## Technical Details

* Requires Chrome browser installation
* Uses Puppeteer for browser automation
* Designed to handle complex anti-bot mechanisms found on major service provider sites

## Setup

1. Clone the repository
2. Run `npm install`
3. Create `.env` with your GitHub token:
```
GITHUB_TOKEN=your_token_here
```
4. Run with `npm start`

## Notes

This is a work in progress. Many sites employ sophisticated detection methods that make headless operation impractical. The current implementation uses a visible Chrome instance to work around these limitations.