# Moozi Lyrics Browser Extension

A Chrome extension that allows you to translate and explain song lyrics from any webpage. This extension leverages the Moozi Lyrics translation service to provide high-quality translations and cultural context for lyrics.

## Features

- Translate highlighted lyrics on any webpage
- Side panel interface for viewing translations
- Line-by-line translation
- Cultural context and song meaning explanations
- Works especially well with popular lyrics websites like Genius, AZLyrics, etc.
- Support for 45+ languages

## How to Use

1. Install the extension
2. Navigate to a webpage with song lyrics
3. Click the Moozi Lyrics icon to open the side panel
4. Select your desired translation language
5. Highlight the lyrics you want to translate
6. View the translation and explanation in the side panel

## Development

This extension is built using standard web technologies:
- HTML/CSS/JavaScript
- Chrome Extension Manifest V3
- Side Panel API

## Setup for Development

1. Clone this repository
2. Update the API endpoint in the `background/service-worker.js` file
3. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the extension directory

## Relationship to Moozi Lyrics Web App

This extension is a companion to the Moozi Lyrics web application. It reuses much of the translation logic and API integration from the web app to provide a seamless extension experience.

## License

[Add your license information here]