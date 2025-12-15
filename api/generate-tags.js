import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(401).json({ error: 'API key not configured' });
  }

  const { content, title, sourceType } = req.body;

  if (!content && !title) {
    return res.status(400).json({ error: 'Content or title required' });
  }

  const textToAnalyze = `${title || ''} ${content || ''}`.trim();

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `You are a tagging assistant for a construction/remodeling company's knowledge management system.

Analyze this content and return 3-7 relevant tags. Tags should be:
- Single words or short hyphenated phrases (e.g., "kitchen", "permit-delay", "budget-issue")
- Lowercase
- Relevant to construction, remodeling, or business operations
- Specific enough to be useful for searching later

Content type: ${sourceType || 'general'}
Content to analyze:
"""
${textToAnalyze.substring(0, 1500)}
"""

Return ONLY a JSON array of tags, nothing else. Example: ["kitchen", "permit-delay", "scheduling"]`
        }
      ]
    });

    // Extract the response text
    const responseText = response.content[0].text.trim();
    
    // Parse the JSON array
    let tags;
    try {
      tags = JSON.parse(responseText);
      
      // Validate it's an array of strings
      if (!Array.isArray(tags)) {
        throw new Error('Not an array');
      }
      
      // Clean and validate tags
      tags = tags
        .filter(t => typeof t === 'string')
        .map(t => t.toLowerCase().trim().replace(/[^a-z0-9-]/g, ''))
        .filter(t => t.length > 1 && t.length < 30)
        .slice(0, 7);
        
    } catch (parseError) {
      // If parsing fails, extract words that look like tags
      const matches = responseText.match(/["']([a-z0-9-]+)["']/g) || [];
      tags = matches
        .map(m => m.replace(/["']/g, ''))
        .filter(t => t.length > 1)
        .slice(0, 7);
    }

    return res.status(200).json({ tags });

  } catch (error) {
    console.error('Tag generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate tags',
      fallback: true 
    });
  }
}
