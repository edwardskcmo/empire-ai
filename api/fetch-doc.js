// Vercel Serverless Function - Fetch Google Doc Content
// This fetches published Google Docs and returns the text content

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
    // Extract document ID from various Google Docs URL formats
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
        fetchedAt: new Date().toISOString()
      });
    }

    if (!docId) {
      return res.status(400).json({ error: 'Invalid Google Docs URL. Please use a valid Google Docs link.' });
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
        fetchedAt: new Date().toISOString()
      });
    }

    const text = await response.text();
    
    return res.status(200).json({ 
      content: text,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch document' 
    });
  }
}

// Extract text from HTML (simple version)
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
