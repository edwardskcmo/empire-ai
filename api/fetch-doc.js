// Vercel Serverless Function - Fetch Google Docs AND Sheets Content
// Supports both Google Docs and Google Sheets

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Detect if it's a Sheet or Doc
    const isSheet = url.includes('/spreadsheets/');
    const isDoc = url.includes('/document/');

    if (!isSheet && !isDoc) {
      return res.status(400).json({ 
        error: 'Invalid URL. Please use a Google Docs or Google Sheets link.' 
      });
    }

    if (isSheet) {
      return await handleSheet(url, res);
    } else {
      return await handleDoc(url, res);
    }

  } catch (error) {
    console.error('Fetch error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch document' 
    });
  }
}

// Handle Google Sheets
async function handleSheet(url, res) {
  let sheetId = null;
  let gid = '0'; // Default to first sheet
  
  // Extract sheet ID from various URL formats
  // Format: https://docs.google.com/spreadsheets/d/SHEET_ID/...
  const standardMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (standardMatch) {
    sheetId = standardMatch[1];
  }
  
  // Check for specific sheet (gid parameter)
  const gidMatch = url.match(/gid=(\d+)/);
  if (gidMatch) {
    gid = gidMatch[1];
  }
  
  // Format: https://docs.google.com/spreadsheets/d/e/2PACX-.../pub (published)
  const publishedMatch = url.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (publishedMatch && !sheetId) {
    // For published URLs, try to fetch directly as CSV
    const csvUrl = url.includes('output=') ? url : `${url.split('?')[0]}?output=csv`;
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error('Could not fetch published sheet. Make sure it is published to web.');
    }
    const csvText = await response.text();
    const content = csvToReadableText(csvText);
    return res.status(200).json({ 
      content,
      type: 'sheet',
      fetchedAt: new Date().toISOString()
    });
  }

  if (!sheetId) {
    return res.status(400).json({ 
      error: 'Invalid Google Sheets URL. Please use a valid Google Sheets link.' 
    });
  }

  // Try to export as CSV (works for sheets shared with "Anyone with link")
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  
  const response = await fetch(exportUrl);
  
  if (!response.ok) {
    // If export fails, try the published version
    const pubUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv&gid=${gid}`;
    const pubResponse = await fetch(pubUrl);
    
    if (!pubResponse.ok) {
      throw new Error('Sheet not accessible. Make sure it is published to web OR shared with "Anyone with link".');
    }
    
    const csvText = await pubResponse.text();
    const content = csvToReadableText(csvText);
    return res.status(200).json({ 
      content,
      type: 'sheet',
      fetchedAt: new Date().toISOString()
    });
  }

  const csvText = await response.text();
  const content = csvToReadableText(csvText);
  
  return res.status(200).json({ 
    content,
    type: 'sheet',
    fetchedAt: new Date().toISOString()
  });
}

// Handle Google Docs
async function handleDoc(url, res) {
  let docId = null;
  
  // Format: https://docs.google.com/document/d/DOCUMENT_ID/...
  const standardMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (standardMatch) {
    docId = standardMatch[1];
  }
  
  // Format: https://docs.google.com/document/d/e/2PACX-.../pub (published URL)
  const publishedMatch = url.match(/\/document\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (publishedMatch && !docId) {
    // For published URLs, fetch directly
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    const html = await response.text();
    const text = extractTextFromHtml(html);
    return res.status(200).json({ 
      content: text,
      type: 'doc',
      fetchedAt: new Date().toISOString()
    });
  }

  if (!docId) {
    return res.status(400).json({ 
      error: 'Invalid Google Docs URL. Please use a valid Google Docs link.' 
    });
  }

  // Try to fetch as plain text export (works for docs shared with "Anyone with link")
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
  
  const response = await fetch(exportUrl);
  
  if (!response.ok) {
    // If export fails, try the published HTML version
    const pubUrl = `https://docs.google.com/document/d/${docId}/pub`;
    const pubResponse = await fetch(pubUrl);
    
    if (!pubResponse.ok) {
      throw new Error('Document not accessible. Make sure it is published to web or shared with "Anyone with link".');
    }
    
    const html = await pubResponse.text();
    const text = extractTextFromHtml(html);
    return res.status(200).json({ 
      content: text,
      type: 'doc',
      fetchedAt: new Date().toISOString()
    });
  }

  const text = await response.text();
  
  return res.status(200).json({ 
    content: text,
    type: 'doc',
    fetchedAt: new Date().toISOString()
  });
}

// Convert CSV to readable text format
function csvToReadableText(csv) {
  const lines = parseCSV(csv);
  if (lines.length === 0) return '';
  
  const headers = lines[0];
  const rows = lines.slice(1);
  
  // Format as readable text
  let output = '';
  
  // Add headers as first line
  output += '=== COLUMNS: ' + headers.join(' | ') + ' ===\n\n';
  
  // Add each row
  rows.forEach((row, index) => {
    if (row.some(cell => cell.trim())) { // Skip empty rows
      output += `--- Row ${index + 1} ---\n`;
      headers.forEach((header, i) => {
        if (row[i] && row[i].trim()) {
          output += `${header}: ${row[i]}\n`;
        }
      });
      output += '\n';
    }
  });
  
  return output.trim();
}

// Simple CSV parser that handles quoted fields
function parseCSV(text) {
  const lines = [];
  const rows = text.split('\n');
  
  for (const row of rows) {
    const cells = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    lines.push(cells);
  }
  
  return lines;
}

// Extract text from HTML (for Google Docs)
function extractTextFromHtml(html) {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML tags but preserve line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<li[^>]*>/gi, '• ');
  text = text.replace(/<\/li>/gi, '\n');
  
  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();
  
  return text;
}
