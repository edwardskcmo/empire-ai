// Vercel Serverless Function - Generate Embeddings via OpenAI
// This creates "meaning fingerprints" for semantic search

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OPENAI_API_KEY not configured');
    return res.status(401).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text content is required' });
    }

    // Truncate to ~8000 tokens worth (~32000 chars) to stay within limits
    const truncatedText = text.substring(0, 32000);

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: truncatedText,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI error:', response.status, errorData);
      return res.status(response.status).json({ 
        error: `OpenAI API error: ${response.status}`,
        details: errorData
      });
    }

    const data = await response.json();
    
    // Return the embedding vector
    return res.status(200).json({
      embedding: data.data[0].embedding,
      model: 'text-embedding-3-small',
      dimensions: data.data[0].embedding.length,
      usage: data.usage
    });

  } catch (error) {
    console.error('Embedding generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate embedding',
      details: error.message 
    });
  }
}
