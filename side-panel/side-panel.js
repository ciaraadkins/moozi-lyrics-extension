// Side panel script for Moozi Lyrics extension

// DOM elements
const languageSelect = document.getElementById('language-select');
const instructionsPanel = document.getElementById('instructions-panel');
const noSelectionPanel = document.getElementById('no-selection-panel');
const loadingPanel = document.getElementById('loading-panel');
const translationPanel = document.getElementById('translation-panel');
const errorPanel = document.getElementById('error-panel');
const songInfoElement = document.getElementById('song-info');
const lyricsContainer = document.getElementById('lyrics-container');
const lyricsExplanationElement = document.getElementById('lyrics-explanation');
const errorMessageElement = document.getElementById('error-message');
const retryButton = document.getElementById('retry-button');

// State
let currentState = {
  highlightedText: '',
  songMetadata: {},
  selectedLanguage: '',
  translationData: null
};

// Initialize
function initialize() {
  // Populate language dropdown from imported languages.js
  populateLanguageDropdown();
  
  // Set initial UI state
  showPanel('no-selection');
  
  // Check for any stored language preference
  chrome.storage.local.get(['preferredLanguage'], (result) => {
    if (result.preferredLanguage) {
      languageSelect.value = result.preferredLanguage;
      currentState.selectedLanguage = result.preferredLanguage;
    }
  });
  
  // Check if we already have highlighted text (if side panel opened after highlighting)
  chrome.storage.local.get(['highlightedText', 'selectionMetadata'], (result) => {
    if (result.highlightedText) {
      currentState.highlightedText = result.highlightedText;
      currentState.songMetadata = result.selectionMetadata || {};
      
      updateOriginalLyrics(result.highlightedText);
      updateSongInfo(result.selectionMetadata);
      
      if (currentState.selectedLanguage) {
        // If we already have a language selected, translate automatically
        requestTranslation();
      } else {
        // Otherwise, just show the original lyrics
        showPanel('translation');
        
        // Create a simple table with just the original text
        const simpleLyrics = {};
        simpleLyrics[result.highlightedText] = 'Select a language to see translation';
        updateTranslatedLyrics(simpleLyrics);
      }
    }
  });
  
  // Set up event listeners
  setupEventListeners();
}

// Populate the language dropdown using the imported availableLanguages
function populateLanguageDropdown() {
  // Clear existing options (except the placeholder)
  while (languageSelect.options.length > 1) {
    languageSelect.remove(1);
  }
  
  // Add options from availableLanguages
  availableLanguages.forEach(lang => {
    if (lang.value && !lang.isDisabled) {
      const option = document.createElement('option');
      option.value = lang.value;
      option.textContent = lang.label;
      languageSelect.appendChild(option);
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  // Language selection change
  languageSelect.addEventListener('change', () => {
    const selectedLanguage = languageSelect.value;
    currentState.selectedLanguage = selectedLanguage;
    
    // Save the preferred language
    chrome.storage.local.set({ preferredLanguage: selectedLanguage });
    
    // If we have highlighted text, request translation
    if (currentState.highlightedText) {
      requestTranslation();
    }
  });
  
  // Retry button
  retryButton.addEventListener('click', () => {
    requestTranslation();
  });
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'displayHighlightedText') {
      // Update our state with the highlighted text
      currentState.highlightedText = message.text;
      currentState.songMetadata = message.metadata || {};
      
      // Update UI
      updateOriginalLyrics(message.text);
      updateSongInfo(message.metadata);
      
      // If we have a language selected, request translation
      if (currentState.selectedLanguage) {
        requestTranslation();
      } else {
        // Just show the original lyrics
        showPanel('translation');
        
        // Create a simple table with just the original text
        const simpleLyrics = {};
        simpleLyrics[message.text] = 'Select a language to see translation';
        updateTranslatedLyrics(simpleLyrics);
      }
    }
    else if (message.action === 'translationResult') {
      // Handle the translation result
      handleTranslationResult(message.translationData);
    }
    else if (message.action === 'translationError') {
      // Handle translation error
      handleTranslationError(message.error);
    }
    else if (message.action === 'metadataEnhanced') {
      // Handle the case where metadata was enhanced by the LLM
      handleEnhancedMetadata(message.metadata);
    }
  });
}

// Handle when metadata has been enhanced/validated by LLM
function handleEnhancedMetadata(enhancedMetadata) {
  // Update our state
  currentState.songMetadata = enhancedMetadata;
  
  // Update the UI with the enhanced metadata
  updateSongInfo(enhancedMetadata);
  
  // If we're currently displaying a translation, we might want to re-translate
  // with the enhanced metadata for better results
  if (currentState.translationData && currentState.selectedLanguage) {
    // Only retranslate if we have significant metadata changes
    if (hasSignificantMetadataChanges(enhancedMetadata)) {
      requestTranslation();
    }
  }
}

// Check if metadata changes are significant enough to warrant a retranslation
function hasSignificantMetadataChanges(newMetadata) {
  const oldMetadata = currentState.songMetadata || {};
  
  // Check if important fields have changed
  if (newMetadata.songTitle && newMetadata.songTitle !== oldMetadata.songTitle) {
    return true;
  }
  
  if (newMetadata.artistName && newMetadata.artistName !== oldMetadata.artistName) {
    return true;
  }
  
  // If we have new album information that was missing before
  if (newMetadata.album && !oldMetadata.album) {
    return true;
  }
  
  return false;
}

// Request translation from the background script
function requestTranslation() {
  // Show loading panel
  showPanel('loading');
  
  // Request translation from background script
  chrome.runtime.sendMessage({
    action: 'requestTranslation',
    text: currentState.highlightedText,
    language: currentState.selectedLanguage,
    metadata: currentState.songMetadata
  });
}

// Handle translation result
function handleTranslationResult(translationData) {
  currentState.translationData = translationData;
  
  // Parse the translated lyrics
  let translatedLyrics;
  try {
    translatedLyrics = typeof translationData.translated_lyrics === 'string' 
      ? JSON.parse(translationData.translated_lyrics) 
      : translationData.translated_lyrics;
  } catch (error) {
    console.error('Error parsing translated lyrics:', error);
    translatedLyrics = { "Error": "Failed to parse translation" };
  }
  
  // Update the UI
  updateTranslatedLyrics(translatedLyrics);
  updateExplanation(translationData.song_explanation);
  
  // Show translation panel
  showPanel('translation');
}

// Handle translation error
function handleTranslationError(errorMessage) {
  errorMessageElement.textContent = errorMessage || 'Failed to translate lyrics. Please try again.';
  showPanel('error');
}

// Update the original lyrics in the UI
function updateOriginalLyrics(text) {
  // We don't need to do anything here anymore since
  // we'll update both original and translated at once in updateTranslatedLyrics
  currentState.highlightedText = text;
}

// Update the translated lyrics in the UI
function updateTranslatedLyrics(translatedLyrics) {
  // Get the container element
  const container = document.getElementById('lyrics-container');
  container.innerHTML = '';
  
  // Create table structure
  const table = document.createElement('table');
  table.className = 'lyrics-table';
  
  // Create table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  const originalHeader = document.createElement('th');
  originalHeader.textContent = 'Original';
  headerRow.appendChild(originalHeader);
  
  const translationHeader = document.createElement('th');
  translationHeader.textContent = 'Translation';
  headerRow.appendChild(translationHeader);
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement('tbody');
  
  // If it's an object (line by line translation)
  if (typeof translatedLyrics === 'object') {
    Object.entries(translatedLyrics).forEach(([original, translation], index) => {
      if (original.trim()) {
        // Create row
        const row = document.createElement('tr');
        row.className = 'lyrics-row';
        
        // Check if content might overflow and needs special handling
        if (original.length > 100 || translation.length > 100) {
          row.classList.add('has-overflow');
        }
        
        // Create original cell
        const originalCell = document.createElement('td');
        originalCell.className = 'original-cell';
        originalCell.textContent = original;
        
        // Create translation cell
        const translationCell = document.createElement('td');
        translationCell.className = 'translation-cell';
        translationCell.textContent = translation;
        
        // Append cells to row
        row.appendChild(originalCell);
        row.appendChild(translationCell);
        
        // Append row to table body
        tbody.appendChild(row);
      }
    });
  } else {
    // Fallback for non-object translation data
    const row = document.createElement('tr');
    row.className = 'lyrics-row';
    
    const originalCell = document.createElement('td');
    originalCell.className = 'original-cell';
    originalCell.textContent = currentState.highlightedText || 'No lyrics selected';
    
    const translationCell = document.createElement('td');
    translationCell.className = 'translation-cell';
    translationCell.textContent = translatedLyrics || 'Translation not available';
    
    row.appendChild(originalCell);
    row.appendChild(translationCell);
    tbody.appendChild(row);
  }
  
  table.appendChild(tbody);
  container.appendChild(table);
}

// Update the song explanation in the UI
function updateExplanation(explanation) {
  if (explanation && explanation.trim()) {
    // Format the explanation for better readability
    const formattedExplanation = explanation
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    lyricsExplanationElement.innerHTML = `<p>${formattedExplanation}</p>`;
  } else {
    lyricsExplanationElement.innerHTML = '<p>No explanation available.</p>';
  }
}

// Update song information if available
function updateSongInfo(metadata) {
  if (metadata && (metadata.songTitle || metadata.artistName)) {
    // Create HTML for song info with conditional elements
    let songInfoHTML = '';
    
    // First add the title and artist (always shown if available)
    if (metadata.songTitle) {
      songInfoHTML += `<h2>${metadata.songTitle}</h2>`;
    } else {
      songInfoHTML += `<h2>Unknown Song</h2>`;
    }
    
    if (metadata.artistName) {
      songInfoHTML += `<p>by ${metadata.artistName}</p>`;
    } else {
      songInfoHTML += `<p>by Unknown Artist</p>`;
    }
    
    // Add album and year if available
    if (metadata.album || metadata.releaseYear) {
      let albumInfo = '<p class="album-info">';
      
      if (metadata.album) {
        albumInfo += `Album: ${metadata.album}`;
      }
      
      if (metadata.releaseYear) {
        if (metadata.album) {
          albumInfo += ` (${metadata.releaseYear})`;
        } else {
          albumInfo += `Year: ${metadata.releaseYear}`;
        }
      }
      
      albumInfo += '</p>';
      songInfoHTML += albumInfo;
    }
    
    // If we have genre information, add it
    if (metadata.genres && metadata.genres.length > 0) {
      const genreList = Array.isArray(metadata.genres) 
        ? metadata.genres.join(', ') 
        : metadata.genres;
      
      songInfoHTML += `<p class="genre-info">Genre: ${genreList}</p>`;
    }
    
    // Add an LLM validation badge if applicable
    if (metadata.validatedByLLM) {
      songInfoHTML += `<span class="validation-badge" title="This metadata has been verified">✓ Verified</span>`;
    }
    
    // Update the element and show it
    songInfoElement.innerHTML = songInfoHTML;
    songInfoElement.style.display = 'block';
  } else {
    songInfoElement.style.display = 'none';
  }
}

// Show the appropriate panel based on state
function showPanel(panelName) {
  // Hide all panels
  instructionsPanel.style.display = 'none';
  noSelectionPanel.style.display = 'none';
  loadingPanel.style.display = 'none';
  translationPanel.style.display = 'none';
  errorPanel.style.display = 'none';
  
  // Show the requested panel
  switch (panelName) {
    case 'instructions':
      instructionsPanel.style.display = 'block';
      break;
    case 'no-selection':
      noSelectionPanel.style.display = 'block';
      break;
    case 'loading':
      loadingPanel.style.display = 'flex';
      break;
    case 'translation':
      translationPanel.style.display = 'block';
      break;
    case 'error':
      errorPanel.style.display = 'flex';
      break;
    default:
      noSelectionPanel.style.display = 'block';
  }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initialize);