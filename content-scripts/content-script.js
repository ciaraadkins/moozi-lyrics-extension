// Content script for Moozi Lyrics extension
// This script runs on webpages and captures highlighted text

// Function to detect if we're on a lyrics site
function isLyricsSite() {
  const lyricsPatterns = [
    /genius\.com/i,
    /azlyrics\.com/i,
    /lyrics\.com/i,
    /musixmatch\.com/i,
    /metrolyrics\.com/i,
    /songlyrics\.com/i
  ];
  
  return lyricsPatterns.some(pattern => pattern.test(window.location.hostname));
}

// Enhanced song info extraction with improved site-specific extractors
function extractSongInfo() {
  const hostname = window.location.hostname.toLowerCase();
  let result = {};
  
  // Try site-specific extractors first
  if (hostname.includes('genius.com')) {
    result = extractSongInfoGenius();
  } else if (hostname.includes('azlyrics.com')) {
    result = extractSongInfoAZLyrics();
  } else if (hostname.includes('musixmatch.com')) {
    result = extractSongInfoMusixmatch();
  } else if (hostname.includes('lyrics.com')) {
    result = extractSongInfoLyricsCom();
  } else if (hostname.includes('metrolyrics.com')) {
    result = extractSongInfoMetroLyrics();
  } else if (hostname.includes('songlyrics.com')) {
    result = extractSongInfoSongLyrics();
  } else {
    // Fall back to generic extractor for other sites
    result = extractSongInfoGeneric();
  }
  
  // Post-processing to clean up data
  if (result.songTitle) {
    // Remove common unnecessary text
    result.songTitle = result.songTitle
      .replace(/ lyrics$/i, '')
      .replace(/\(Official Lyrics\)/i, '')
      .replace(/\[.*?\]/g, '') // Remove text in brackets
      .trim();
  }
  
  if (result.artistName) {
    // Remove common unnecessary text
    result.artistName = result.artistName
      .replace(/ lyrics$/i, '')
      .replace(/^lyrics by /i, '')
      .trim();
  }
  
  // Add URL as reference
  result.url = window.location.href;
  
  return result;
}

// Genius.com extractor
function extractSongInfoGenius() {
  let songTitle = '';
  let artistName = '';
  let album = '';
  let releaseYear = '';
  
  try {
    // First, try to extract from the page title which has a consistent format
    const pageTitle = document.title;
    const titlePattern = /(.*) – (.*) Lyrics \| Genius Lyrics/i;
    const titleMatch = pageTitle.match(titlePattern);
    
    if (titleMatch && titleMatch.length >= 3) {
      artistName = titleMatch[1].trim();
      songTitle = titleMatch[2].trim();
      console.log(`Extracted from page title: "${artistName}" - "${songTitle}"`);
    }
    
    // As a backup, try the DOM selectors
    if (!songTitle || !artistName) {
      // Title - multiple possible selectors
      const titleSelectors = [
        'h1[class*="SongHeader__Title"]', 
        '[data-lyrics-container] h1', 
        '.header_with_cover_art-primary_info-title'
      ];
      
      for (const selector of titleSelectors) {
        const titleElement = document.querySelector(selector);
        if (titleElement) {
          songTitle = titleElement.textContent.trim();
          break;
        }
      }
      
      // Artist - multiple possible selectors
      const artistSelectors = [
        'a[class*="SongHeader__Artist"]',
        '.header_with_cover_art-primary_info-primary_artist'
      ];
      
      for (const selector of artistSelectors) {
        const artistElement = document.querySelector(selector);
        if (artistElement) {
          artistName = artistElement.textContent.trim();
          break;
        }
      }
    }
    
    // Try to get album information (still useful even if we got the title/artist)
    const albumElement = document.querySelector('div[class*="SongAlbum__"] a');
    if (albumElement) {
      album = albumElement.textContent.trim();
    }
    
    // Get release date if available
    const releaseDateElement = document.querySelector('div[class*="HeaderMetadata__"] span:nth-child(1)');
    if (releaseDateElement) {
      const releaseText = releaseDateElement.textContent.trim();
      // Extract year from date format
      const yearMatch = releaseText.match(/\b\d{4}\b/);
      if (yearMatch) {
        releaseYear = yearMatch[0];
      }
    }
    
    // If we're missing critical data, see if there's structured data
    if (!songTitle || !artistName) {
      const structuredData = document.querySelectorAll('script[type="application/ld+json"]');
      for (const data of structuredData) {
        try {
          const json = JSON.parse(data.textContent);
          if (json['@type'] === 'MusicRecording' || json['@type'] === 'BreadcrumbList') {
            if (json.name && !songTitle) songTitle = json.name;
            if (json.byArtist && json.byArtist.name && !artistName) {
              artistName = json.byArtist.name;
            }
          }
        } catch (e) {
          // JSON parsing error, continue
        }
      }
    }
    
  } catch (error) {
    console.error('Error extracting Genius song info:', error);
  }
  
  return {
    songTitle,
    artistName,
    album,
    releaseYear,
    source: 'genius.com',
    url: window.location.href
  };
}

// AZLyrics.com extractor (placeholder to be filled in)
function extractSongInfoAZLyrics() {
  let songTitle = '';
  let artistName = '';
  let album = '';
  let releaseYear = '';
  
  try {
    // AZLyrics has a specific structure
    // Best to look at page title first, which typically has format "ArtistName - SongName Lyrics | AZLyrics.com"
    const pageTitle = document.title;
    const titlePattern = /(.*) - (.*) Lyrics \| AZLyrics\.com/i;
    const titleMatch = pageTitle.match(titlePattern);
    
    if (titleMatch && titleMatch.length >= 3) {
      artistName = titleMatch[1].trim();
      songTitle = titleMatch[2].trim();
    } else {
      // Fall back to DOM selectors
      // Artist is usually in the div.lyricsh h2
      const artistElement = document.querySelector('div.lyricsh h2');
      if (artistElement) {
        artistName = artistElement.textContent
          .replace('Lyrics', '')
          .trim();
      }
      
      // Song title is in the div.ringtone ~ b
      const titleElement = document.querySelector('.ringtone ~ b');
      if (titleElement) {
        songTitle = titleElement.textContent
          .replace('"', '')
          .replace('"', '')
          .trim();
      }
    }
    
    // Try to get album info
    const albumDiv = document.querySelector('div.panel.album-panel');
    if (albumDiv) {
      const albumLink = albumDiv.querySelector('a');
      if (albumLink) {
        album = albumLink.textContent.trim();
      }
      
      // Try to find year in the album info text
      const albumText = albumDiv.textContent;
      const yearMatch = albumText.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        releaseYear = yearMatch[0];
      }
    }
    
  } catch (error) {
    console.error('Error extracting AZLyrics song info:', error);
  }
  
  return {
    songTitle,
    artistName,
    album,
    releaseYear,
    source: 'azlyrics.com',
    url: window.location.href
  };
}

// Musixmatch.com extractor (placeholder to be filled in)
function extractSongInfoMusixmatch() {
  let songTitle = '';
  let artistName = '';
  let album = '';
  let releaseYear = '';
  
  try {
    // TODO: Implement Musixmatch.com specific extraction
    // Check page title first, then fall back to DOM selectors
    const pageTitle = document.title;
    // Placeholder for you to implement after visiting the site
    
  } catch (error) {
    console.error('Error extracting Musixmatch song info:', error);
  }
  
  return {
    songTitle,
    artistName,
    album,
    releaseYear,
    source: 'musixmatch.com',
    url: window.location.href
  };
}

// Lyrics.com extractor (placeholder to be filled in)
function extractSongInfoLyricsCom() {
  let songTitle = '';
  let artistName = '';
  let album = '';
  let releaseYear = '';
  
  try {
    // TODO: Implement Lyrics.com specific extraction
    // Check page title first, then fall back to DOM selectors
    const pageTitle = document.title;
    // Placeholder for you to implement after visiting the site
    
  } catch (error) {
    console.error('Error extracting Lyrics.com song info:', error);
  }
  
  return {
    songTitle,
    artistName,
    album,
    releaseYear,
    source: 'lyrics.com',
    url: window.location.href
  };
}

// MetroLyrics.com extractor (placeholder to be filled in)
function extractSongInfoMetroLyrics() {
  let songTitle = '';
  let artistName = '';
  let album = '';
  let releaseYear = '';
  
  try {
    // TODO: Implement MetroLyrics.com specific extraction
    // Note: MetroLyrics might have been merged with AZLyrics
    const pageTitle = document.title;
    // Placeholder for you to implement after visiting the site
    
  } catch (error) {
    console.error('Error extracting MetroLyrics song info:', error);
  }
  
  return {
    songTitle,
    artistName,
    album,
    releaseYear,
    source: 'metrolyrics.com',
    url: window.location.href
  };
}

// SongLyrics.com extractor (placeholder to be filled in)
function extractSongInfoSongLyrics() {
  let songTitle = '';
  let artistName = '';
  let album = '';
  let releaseYear = '';
  
  try {
    // TODO: Implement SongLyrics.com specific extraction
    // Check page title first, then fall back to DOM selectors
    const pageTitle = document.title;
    // Placeholder for you to implement after visiting the site
    
  } catch (error) {
    console.error('Error extracting SongLyrics song info:', error);
  }
  
  return {
    songTitle,
    artistName,
    album,
    releaseYear,
    source: 'songlyrics.com',
    url: window.location.href
  };
}

// Generic fallback extractor for any site
function extractSongInfoGeneric() {
  let songTitle = '';
  let artistName = '';
  let hints = [];
  
  try {
    // Method 1: Check meta tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      const title = ogTitle.getAttribute('content');
      hints.push(`OG Title: ${title}`);
      
      // Try to extract artist - song pattern from title
      const titleParts = title.split(' - ');
      if (titleParts.length >= 2) {
        // Could be either "Artist - Song" or "Song - Artist"
        hints.push(`Title parts: ${JSON.stringify(titleParts)}`);
      }
    }
    
    // Method 2: Check the page title
    const pageTitle = document.title;
    hints.push(`Page title: ${pageTitle}`);
    
    // Look for typical patterns in the page title
    // Pattern: "Artist - Song Lyrics"
    const pattern1 = pageTitle.match(/(.*) - (.*) Lyrics/i);
    if (pattern1 && pattern1.length >= 3) {
      artistName = pattern1[1].trim();
      songTitle = pattern1[2].trim();
      hints.push('Pattern matched: "Artist - Song Lyrics"');
    } 
    // Pattern: "Song Lyrics by Artist"
    else if (pageTitle.match(/(.*) Lyrics by (.*)/i)) {
      const pattern2 = pageTitle.match(/(.*) Lyrics by (.*)/i);
      songTitle = pattern2[1].trim();
      artistName = pattern2[2].trim();
      hints.push('Pattern matched: "Song Lyrics by Artist"');
    }
    // Pattern: "Lyrics to Song by Artist"
    else if (pageTitle.match(/Lyrics to (.*) by (.*)/i)) {
      const pattern3 = pageTitle.match(/Lyrics to (.*) by (.*)/i);
      songTitle = pattern3[1].trim();
      artistName = pattern3[2].trim();
      hints.push('Pattern matched: "Lyrics to Song by Artist"');
    }
    
    // Method 3: Look for structured data
    const structuredData = document.querySelectorAll('script[type="application/ld+json"]');
    for (const data of structuredData) {
      try {
        const json = JSON.parse(data.textContent);
        
        // Look for MusicRecording schema
        if (json['@type'] === 'MusicRecording') {
          if (json.name) songTitle = json.name;
          if (json.byArtist && json.byArtist.name) artistName = json.byArtist.name;
          hints.push('Found MusicRecording structured data');
        }
      } catch (e) {
        // JSON parsing error, continue
      }
    }
    
    // Method 4: Look for common class names and IDs
    const songTitleSelectors = [
      'h1.song-title', '.song-title', '#song-title', 
      '.track-title', '.title', 'h1.title',
      '[class*="title" i]', '[id*="title" i]'
    ];
    
    const artistSelectors = [
      '.artist-name', '.artist', '#artist-name', '#artist',
      '[class*="artist" i]', '[id*="artist" i]'
    ];
    
    for (const selector of songTitleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        const possibleTitle = element.textContent.trim();
        hints.push(`Possible title from ${selector}: ${possibleTitle}`);
        if (!songTitle) songTitle = possibleTitle;
      }
    }
    
    for (const selector of artistSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        const possibleArtist = element.textContent.trim();
        hints.push(`Possible artist from ${selector}: ${possibleArtist}`);
        if (!artistName) artistName = possibleArtist;
      }
    }
    
  } catch (error) {
    console.error('Error extracting generic song info:', error);
  }
  
  return {
    songTitle,
    artistName,
    source: 'generic',
    url: window.location.href,
    confidence: (songTitle && artistName) ? 'medium' : 'low',
    hints: hints // These can help debug and improve the extractor
  };
}

// Function to handle text selection (only when manually triggered)
function processSelectedText() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText.length > 10) { // Ignore very short selections
    // Extract song metadata if possible
    const songInfo = extractSongInfo();
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'processHighlightedText',
      text: selectedText,
      metadata: songInfo
    });
  } else {
    console.log('No text selected or selection too short');
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'processSelectedText') {
    processSelectedText();
  }
});

// Note: Automatic text selection processing is disabled
// Text will only be processed when the extension is manually activated

// Optional: Create a floating button for lyrics sites
if (isLyricsSite()) {
  // Create a button for easy access to Moozi Lyrics
  const mooziBadge = document.createElement('div');
  mooziBadge.classList.add('moozi-lyrics-badge');
  mooziBadge.innerHTML = 'Moozi';
  mooziBadge.title = 'Click to open Moozi Lyrics translator';
  
  // Style the button (see styles/content.css for more styling)
  mooziBadge.style.position = 'fixed';
  mooziBadge.style.bottom = '20px';
  mooziBadge.style.right = '20px';
  mooziBadge.style.zIndex = '9999';
  
  // Handle click to open side panel and process selected text
  mooziBadge.addEventListener('click', () => {
    // Open side panel first
    chrome.runtime.sendMessage({ action: 'openSidePanel' });
    
    // Then process any selected text
    setTimeout(() => {
      processSelectedText();
    }, 100); // Small delay to ensure side panel opens first
  });
  
  // Append to body
  document.body.appendChild(mooziBadge);
}