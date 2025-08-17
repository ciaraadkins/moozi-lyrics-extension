// Service worker for Moozi Lyrics extension
// This script runs in the background and handles communication between
// the content script and the side panel

// Set up the side panel on install
chrome.runtime.onInstalled.addListener(() => {
  // Register the side panel
  chrome.sidePanel.setOptions({
    enabled: true,
    path: 'side-panel/index.html'
  });
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open the side panel when the extension icon is clicked
  chrome.sidePanel.open({ tabId: tab.id });
  
  // Request the content script to process any selected text
  chrome.tabs.sendMessage(tab.id, { action: 'processSelectedText' });
});

// Listen for messages from content script or side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle highlighted text from content script
  if (message.action === 'processHighlightedText') {
    // Enhance metadata with LLM if needed
    const metadata = message.metadata || {};
    
    // If we have basic metadata but we want to validate it with an LLM
    if (metadata && (metadata.songTitle || metadata.artistName)) {
      // Store the highlighted text (only if side panel is open)
      chrome.storage.local.set({ 
        highlightedText: message.text,
        selectionMetadata: metadata
      });
      
      // Forward the highlighted text to the side panel (if it's open)
      chrome.runtime.sendMessage({
        action: 'displayHighlightedText',
        text: message.text,
        metadata: metadata
      });
      
      // In parallel, try to validate/enhance the metadata with LLM
      validateMetadataWithLLM(metadata)
        .then(enhancedMetadata => {
          // Only update if we got better information
          if (enhancedMetadata && 
              (enhancedMetadata.songTitle !== metadata.songTitle || 
               enhancedMetadata.artistName !== metadata.artistName ||
               enhancedMetadata.album !== metadata.album)) {
            
            // Update storage with enhanced metadata
            chrome.storage.local.set({ 
              selectionMetadata: enhancedMetadata
            });
            
            // Send updated metadata to side panel
            chrome.runtime.sendMessage({
              action: 'metadataEnhanced',
              metadata: enhancedMetadata
            });
          }
        })
        .catch(error => {
          console.error('Metadata validation error:', error);
          // We still have the original metadata, so no need to notify user
        });
    } else {
      // No metadata to enhance, just process normally (only if side panel is open)
      chrome.storage.local.set({ 
        highlightedText: message.text,
        selectionMetadata: metadata
      });
      
      // Forward the highlighted text to the side panel (if it's open)
      chrome.runtime.sendMessage({
        action: 'displayHighlightedText',
        text: message.text,
        metadata: metadata
      });
    }
  }
  
  // Handle translation request from side panel
  if (message.action === 'requestTranslation') {
    // Log the translation request
    console.log('Translation requested:', message);
    
    // Get the current active tab's URL
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentUrl = tabs && tabs[0] ? tabs[0].url : '';
      
      // Call the API function with the URL
      fetchTranslation(message.text, message.language, message.metadata, currentUrl)
        .then(translationData => {
          // Send the translation back to the side panel
          chrome.runtime.sendMessage({
            action: 'translationResult',
            translationData: translationData
          });
        })
        .catch(error => {
          console.error('Translation error:', error);
          chrome.runtime.sendMessage({
            action: 'translationError',
            error: error.message
          });
        });
    });
  }
  
  // Handle open side panel action (usually from the floating button)
  if (message.action === 'openSidePanel') {
    if (sender && sender.tab) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    }
  }
  
  // Return true to indicate that we'll respond asynchronously
  return true;
});

// Function to call the translation API
async function fetchTranslation(text, targetLanguage, metadata = {}, pageUrl = '') {
  try {
    const API_ENDPOINT = 'http://localhost:3001/api/translation/translate';
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        direct_lyrics: text,
        translate_to: targetLanguage,
        song_title: metadata.songTitle || '',
        artist_name: metadata.artistName || '',
        album: metadata.album || '',
        release_year: metadata.releaseYear || '',
        page_url: pageUrl, // Include the page URL for context
        bypass_db: true // We don't need to store this in the database
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error calling translation API:', error);
    throw error;
  }
}

// Function to validate and enhance metadata using an LLM
async function validateMetadataWithLLM(extractedInfo) {
  try {
    // Only call the API if we have some basic information to validate
    if (!extractedInfo || (!extractedInfo.songTitle && !extractedInfo.artistName && !extractedInfo.url)) {
      return extractedInfo; // Not enough info to validate
    }
    
    const API_ENDPOINT = 'http://localhost:3001/api/metadata/validate';
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metadata: {
          songTitle: extractedInfo.songTitle || '',
          artistName: extractedInfo.artistName || '',
          album: extractedInfo.album || '',
          releaseYear: extractedInfo.releaseYear || ''
        },
        source: extractedInfo.source || '',
        url: extractedInfo.url || '',
        confidence: extractedInfo.confidence || 'medium'
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const validatedData = await response.json();
    
    // Combine the data, with LLM validation taking precedence
    return {
      ...extractedInfo,
      songTitle: validatedData.songTitle || extractedInfo.songTitle,
      artistName: validatedData.artistName || extractedInfo.artistName,
      album: validatedData.album || extractedInfo.album,
      releaseYear: validatedData.releaseYear || extractedInfo.releaseYear,
      genres: validatedData.genres || extractedInfo.genres,
      confidence: 'high',
      validatedByLLM: true
    };
    
  } catch (error) {
    console.error('Error validating metadata with LLM:', error);
    return extractedInfo; // Fall back to original data
  }
}