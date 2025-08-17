// Translation utilities for Moozi Lyrics extension
// Adapted from the main Moozi Lyrics app

// Map language names to their ISO 639-1 codes for Google Translate API
const swappedLanguageCodes = {
  Amharic: "am",
  Arabic: "ar",
  Basque: "eu",
  Bengali: "bn",
  Portuguese: "pt",
  Bulgarian: "bg",
  Catalan: "ca",
  Cherokee: "chr",
  Croatian: "hr",
  Czech: "cs",
  Danish: "da",
  Dutch: "nl",
  English: "en",
  Estonian: "et",
  Filipino: "fil",
  Finnish: "fi",
  French: "fr",
  German: "de",
  Greek: "el",
  Gujarati: "gu",
  Hebrew: "iw",
  Hindi: "hi",
  Hungarian: "hu",
  Icelandic: "is",
  Indonesian: "id",
  Italian: "it",
  Japanese: "ja",
  Kannada: "kn",
  Korean: "ko",
  Latvian: "lv",
  Lithuanian: "lt",
  Malay: "ms",
  Malayalam: "ml",
  Marathi: "mr",
  Norwegian: "no",
  Polish: "pl",
  Romanian: "ro",
  Russian: "ru",
  Serbian: "sr",
  Slovak: "sk",
  Slovenian: "sl",
  Spanish: "es",
  Swahili: "sw",
  Swedish: "sv",
  Tamil: "ta",
  Telugu: "te",
  Thai: "th",
  Chinese: "zh",
  Turkish: "tr",
  Urdu: "ur",
  Ukrainian: "uk",
  Vietnamese: "vi",
  Welsh: "cy",
  
  // Add lowercase versions to make it case-insensitive
  english: "en",
  spanish: "es",
  french: "fr",
  german: "de",
  italian: "it",
  portuguese: "pt",
  russian: "ru",
  japanese: "ja",
  korean: "ko",
  chinese: "zh"
};

// Functions to handle translation display

/**
 * Creates a line-by-line representation of the original and translated text
 * @param {object} translatedLyrics - Object containing original lines as keys and translations as values
 * @returns {string} HTML string with formatted text
 */
function formatTranslation(translatedLyrics) {
  if (!translatedLyrics || typeof translatedLyrics !== 'object') {
    return 'Translation not available';
  }
  
  let formattedHtml = '';
  
  Object.entries(translatedLyrics).forEach(([original, translation]) => {
    formattedHtml += `<div class="translation-pair">
      <div class="original-line">${original}</div>
      <div class="translated-line">${translation}</div>
    </div>`;
  });
  
  return formattedHtml;
}

/**
 * Parses the translation response JSON safely
 * @param {string} jsonString - JSON string from the API
 * @returns {object} Parsed JSON object or default values if parsing fails
 */
function safeParseJson(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return {
      "title": { 
        "translation": "[Translation Failed]"
      },
      "lyrics": {
        "explanation": "Error processing lyrics explanation"
      },
      "detected_language(s)": ["unknown"]
    };
  }
}

/**
 * Generates a prompt for OpenAI that's compatible with your backend API
 * @param {object} songInfo - Song metadata (title, artist)
 * @param {string} translateTo - Target language
 * @returns {object} Prompt object
 */
function generatePromptData(songInfo, translateTo) {
  return {
    song_title: songInfo.songTitle || "Unknown Song",
    artist_name: songInfo.artistName || "Unknown Artist",
    translate_title_to: translateTo,
    translate_explanation_to: translateTo
  };
}

/**
 * Creates a simplified song object for the API
 * @param {object} songInfo - Song metadata
 * @returns {object} Simplified song object
 */
function createSimplifiedSongObject(songInfo) {
  return {
    song_title: songInfo.songTitle || "Unknown Song",
    artist_name: songInfo.artistName || "Unknown Artist",
    song_art: null,
    isrc: null
  };
}

/**
 * Handles line breaks in lyrics to create a better display
 * @param {string} lyrics - Raw lyrics text
 * @returns {string} Formatted lyrics with proper HTML line breaks
 */
function formatLyricsDisplay(lyrics) {
  if (!lyrics) return '';
  
  // Replace newlines with <br> tags
  return lyrics.replace(/\n/g, '<br>');
}

/**
 * Cleans up the lyrics explanation for display
 * @param {string} explanation - Raw explanation text
 * @returns {string} Formatted explanation
 */
function formatExplanation(explanation) {
  if (!explanation) return 'No explanation available';
  
  // Replace newlines with <br> tags and add paragraph tags
  const formatted = explanation
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  return `<p>${formatted}</p>`;
}

// These functions can be used by the side panel script
// to format and display the translation results