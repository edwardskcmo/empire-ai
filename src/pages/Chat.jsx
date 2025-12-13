// ==========================================
// EMPIRE AI - CHAT PAGE
// Department-specific AI conversations
// ==========================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, MessageSquare, Bot, User, Sparkles, FileText
} from 'lucide-react';
import { formatTimestamp, generateId, extractTags, getSourceLabel } from '../utils';

export default function Chat({ 
  departments, conversations, setConversations, 
  activeDepartment, systemInstructions,
  logActivity, addToIntelligence, searchIntelligence, iconMap
}) {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);

  // Get current department
  const currentDept = activeDepartment || { id: 'general', name: 'General', description: 'General assistance', icon: 'MessageSquare', color: '#3B82F6' };
  const DeptIcon = iconMap[currentDept.icon] || MessageSquare;

  // Get messages for current department
  const messages = conversations[currentDept.id] || [];

  // Check if custom instructions are active
  const hasCustomInstructions = systemInstructions?.trim() || currentDept.instructions?.trim();

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Build intelligence context
  const buildIntelligenceContext = (query) => {
    const results = searchIntelligence(query, currentDept.id);
    if (results.length === 0) return '';
    
    let context = '\n\nRelevant company knowledge:\n';
    results.forEach((item, i) => {
      const label = getSourceLabel(item.sourceType);
      const preview = item.content.substring(0, 200);
      context += `${i + 1}. [${label}] ${item.title}: ${preview}...\n`;
    });
    return context;
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;

    const userMessage = {
      id: generateId('msg'),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    // Add user message
    setConversations(prev => ({
      ...prev,
      [currentDept.id]: [...(prev[currentDept.id] || []), userMessage]
    }));

    const query = input.trim();
    setInput('');
    setIsThinking(true);

    try {
      // Build context
      const intelligenceContext = buildIntelligenceContext(query);
      
      // Build system prompt
      let systemPrompt = `You are Empire AI, the operational intelligence assistant for Empire Remodeling, a residential remodeling contractor.

Current Department: ${currentDept.name}
Department Focus: ${currentDept.description || 'General assistance'}`;

      // Add system-wide instructions
      if (systemInstructions?.trim()) {
        systemPrompt += `\n\n=== SYSTEM-WIDE INSTRUCTIONS ===\n${systemInstructions}`;
      }

      // Add department-specific instructions
      if (currentDept.instructions?.trim()) {
        systemPrompt += `\n\n=== ${currentDept.name.toUpperCase()} DEPARTMENT INSTRUCTIONS ===\n${currentDept.instructions}`;
      }

      // Add role guidance
      systemPrompt += `\n\nYour role:
- Provide helpful, accurate information relevant to ${currentDept.name}
- Use a professional but friendly tone
- Reference company knowledge when relevant
- Be concise but thorough`;

      // Add intelligence context
      if (intelligenceContext) {
        systemPrompt += intelligenceContext;
      }

      // Get conversation history (last 10 messages)
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      // Call API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          systemPrompt,
          conversationHistory: history
        })
      });

      let aiContent;
      if (response.ok) {
        const data = await response.json();
        aiContent = data.response;
      } else {
        // Fallback to simulated response
        aiContent = getSimulatedResponse(query, currentDept.name);
      }

      const aiMessage = {
        id: generateId('msg'),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date().toISOString()
      };

      setConversations(prev => ({
        ...prev,
        [currentDept.id]: [...(prev[currentDept.id] || []), aiMessage]
      }));

      // Log to intelligence
      if (query.length > 10) {
        addToIntelligence(
          'chat_query',
          userMessage.id,
          `Chat: ${query.substring(0, 50)}...`,
          `Q: ${query}\nA: ${aiContent.substring(0, 500)}`,
          currentDept.id,
          { department: currentDept.name },
          1
        );
      }

      logActivity('Chat message sent', `${currentDept.name}`);
    } catch (error) {
      console.error('Chat error:', error);
      // Add error message
      const errorMessage = {
        id: generateId('msg'),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setConversations(prev => ({
        ...prev,
        [currentDept.id]: [...(prev[currentDept.id] || []), errorMessage]
      }));
    } finally {
      setIsThinking(false);
    }
  };

  // Simulated response fallback
  const getSimulatedResponse = (query, deptName) => {
    const responses = {
      'Marketing & Lead Generation': "I can help with marketing strategies, lead generation tactics, and advertising campaigns for Empire Remodeling. What specific aspect would you like to explore?",
      'Sales & Estimating': "I'm here to assist with sales processes, estimate preparation, and proposal creation. What would you like help with?",
      'Production & Project Management': "Let me help you with project scheduling, resource allocation, or production workflows. What's your question?",
      'Safety & Compliance': "Safety is our priority. I can help with safety protocols, compliance requirements, and incident reporting. How can I assist?",
      default: "I'm Empire AI, ready to help with your operational needs. Could you tell me more about what you're looking for?"
    };
    return responses[deptName] || responses.default;
  };

  // Card style
  const cardStyle = {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)'
  };

  return (
    <div style={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        ...cardStyle, 
        padding: '16px 20px', 
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${currentDept.color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <DeptIcon size={20} style={{ color: currentDept.color }} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>{currentDept.name}</h2>
          <p style={{ fontSize: 13, color: '#94A3B8' }}>{currentDept.description || 'Chat with Empire AI'}</p>
        </div>
        {hasCustomInstructions && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: 'rgba(249, 115, 22, 0.15)',
            borderRadius: 16,
            fontSize: 12,
            color: '#F97316'
          }}>
            <FileText size={14} />
            Custom Instructions Active
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ 
        ...cardStyle, 
        flex: 1, 
        padding: 20, 
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        {messages.length === 0 && !isThinking && (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#64748B'
          }}>
            <Bot size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            <p style={{ fontSize: 16, marginBottom: 8 }}>Start a conversation</p>
            <p style={{ fontSize: 13 }}>Ask me anything about {currentDept.name}</p>
          </div>
        )}

        {messages.map(msg => (
          <div 
            key={msg.id}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: msg.role === 'user' ? '#3B82F6' : 'linear-gradient(135deg, #8B5CF6, #6366F1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                marginBottom: 4 
              }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  {msg.role === 'user' ? 'You' : 'Empire AI'}
                </span>
                <span style={{ fontSize: 11, color: '#64748B' }}>
                  {formatTimestamp(msg.timestamp)}
                </span>
              </div>
              <div style={{ 
                color: '#CBD5E1', 
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Empire AI</div>
              <div style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Thinking</span>
                <span className="thinking-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ 
        ...cardStyle, 
        padding: 16, 
        marginTop: 16,
        display: 'flex',
        gap: 12
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={`Ask about ${currentDept.name}...`}
          disabled={isThinking}
          style={{
            flex: 1,
            padding: '14px 18px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            color: '#E2E8F0',
            fontSize: 14,
            outline: 'none',
            opacity: isThinking ? 0.6 : 1
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isThinking}
          style={{
            padding: '14px 24px',
            background: input.trim() && !isThinking ? '#3B82F6' : 'rgba(59, 130, 246, 0.3)',
            border: 'none',
            borderRadius: 10,
            color: 'white',
            fontWeight: 600,
            cursor: input.trim() && !isThinking ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s'
          }}
        >
          <Send size={18} />
          Send
        </button>
      </div>
    </div>
  );
}
