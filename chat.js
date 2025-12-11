import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, systemPrompt, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build messages array for Claude
    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt || 'You are Empire AI, a helpful assistant for Empire Remodeling, a residential remodeling contractor. Be concise, practical, and professional.',
      messages: messages
    });

    // Extract the response text
    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    return res.status(200).json({ 
      response: responseText,
      usage: response.usage
    });

  } catch (error) {
    console.error('Anthropic API Error:', error);
    
    // Handle specific error types
    if (error.status === 401) {
      return res.status(500).json({ 
        error: 'API key configuration error',
        details: 'Please check your ANTHROPIC_API_KEY environment variable'
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        details: 'Please try again in a moment'
      });
    }

    return res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message 
    });
  }
}
