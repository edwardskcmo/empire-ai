// ==========================================
// EMPIRE AI - CHAT API ENDPOINT
// Vercel Serverless Function for Anthropic Claude
// ==========================================

import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not configured');
    return res.status(401).json({ error: 'API key not configured' });
  }

  try {
    const { message, systemPrompt, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey });

    // Build messages array
    const messages = [
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt || 'You are Empire AI, an operational intelligence assistant for Empire Remodeling.',
      messages: messages
    });

    // Extract response text
    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    return res.status(200).json({
      response: responseText,
      usage: response.usage
    });

  } catch (error) {
    console.error('Anthropic API error:', error);
    
    // Handle specific error types
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again in a moment.' });
    }
    
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    return res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message 
    });
  }
}
