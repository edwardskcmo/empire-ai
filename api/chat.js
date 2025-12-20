// ==========================================
// EMPIRE AI - CHAT API ENDPOINT
// Version 2.0 - Added context limits + error handling
// Vercel Serverless Function for Anthropic Claude
// ==========================================

import Anthropic from '@anthropic-ai/sdk';

// Approximate token limit (leaving room for response)
// Claude Sonnet has 200k context, but we limit to be safe
const MAX_SYSTEM_PROMPT_CHARS = 80000;  // ~20k tokens
const MAX_MESSAGE_CHARS = 8000;          // ~2k tokens per message
const MAX_HISTORY_MESSAGES = 6;          // Keep last 6 messages

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

    // Truncate system prompt if too long
    let safeSystemPrompt = systemPrompt || 'You are Empire AI, an operational intelligence assistant for Empire Remodeling.';
    if (safeSystemPrompt.length > MAX_SYSTEM_PROMPT_CHARS) {
      console.log(`System prompt truncated: ${safeSystemPrompt.length} -> ${MAX_SYSTEM_PROMPT_CHARS}`);
      safeSystemPrompt = safeSystemPrompt.substring(0, MAX_SYSTEM_PROMPT_CHARS) + '\n\n[Context truncated for length]';
    }

    // Truncate conversation history
    let safeHistory = [];
    if (Array.isArray(conversationHistory)) {
      // Take only last N messages
      const recentHistory = conversationHistory.slice(-MAX_HISTORY_MESSAGES);
      
      // Truncate each message if needed
      safeHistory = recentHistory.map(msg => ({
        role: msg.role || 'user',
        content: typeof msg.content === 'string' 
          ? msg.content.substring(0, MAX_MESSAGE_CHARS)
          : String(msg.content || '').substring(0, MAX_MESSAGE_CHARS)
      }));
    }

    // Truncate current message if needed
    const safeMessage = message.substring(0, MAX_MESSAGE_CHARS);

    // Build messages array
    const messages = [
      ...safeHistory,
      { role: 'user', content: safeMessage }
    ];

    // Log sizes for debugging
    console.log('Chat API request:', {
      systemPromptChars: safeSystemPrompt.length,
      historyMessages: safeHistory.length,
      messageChars: safeMessage.length,
      totalEstimatedTokens: Math.ceil((safeSystemPrompt.length + safeMessage.length) / 4)
    });

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey });

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,  // Increased from 1024 for better responses
      system: safeSystemPrompt,
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
    console.error('Anthropic API error:', {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code
    });

    // Handle specific error types
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again in a moment.',
        details: 'Too many requests to AI service'
      });
    }

    if (error.status === 401) {
      return res.status(401).json({ 
        error: 'Invalid API key',
        details: 'Check ANTHROPIC_API_KEY in Vercel'
      });
    }

    if (error.status === 400) {
      return res.status(400).json({ 
        error: 'Invalid request to AI',
        details: error.message || 'Check message format'
      });
    }

    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({ 
        error: 'Request timeout',
        details: 'AI took too long to respond. Try a simpler question.'
      });
    }

    // Generic error with details
    return res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message || 'Unknown error'
    });
  }
}
