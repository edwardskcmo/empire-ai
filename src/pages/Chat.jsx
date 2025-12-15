import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Sparkles, FileText } from 'lucide-react';

export default function Chat({
  activeDepartment,
  conversations,
  setConversations,
  systemInstructions,
  intelligenceIndex,
  queryIntelligence,
  logActivity,
  addToIntelligence,
  knowledge,
  connectedDocs,
  issues
}) {
  const [message, setMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);

  const deptId = activeDepartment?.id || 'general';
  const deptMessages = conversations[deptId] || [];

  // Check for pending message from Dashboard quick chat
  useEffect(() => {
    const pendingMessage = sessionStorage.getItem('pendingChatMessage');
    if (pendingMessage) {
      sessionStorage.removeItem('pendingChatMessage');
      setMessage(pendingMessage);
      // Auto-send after a brief delay
      setTimeout(() => {
        sendMessage(pendingMessage);
      }, 100);
    }
  }, [activeDepartment]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [deptMessages, isThinking]);

  const buildKnowledgeContext = (query) => {
    let context = '';
    
    // Get relevant items from intelligence
    if (queryIntelligence && intelligenceIndex) {
      const relevant = queryIntelligence(intelligenceIndex, query, deptId);
      if (relevant && relevant.length > 0) {
        context += '\n\nRelevant company knowledge:\n';
        relevant.slice(0, 5).forEach((item, i) => {
          const label = item.sourceType === 'knowledge' ? 'Knowledge' : 
                       item.sourceType === 'resolved_issue' ? 'Resolved Issue' :
                       item.sourceType === 'google_doc' ? 'Connected Doc' : 'Info';
          context += `${i + 1}. [${label}] ${item.title}: ${item.content?.substring(0, 300)}...\n`;
        });
      }
    }

    // Include connected docs/sheets content
    if (connectedDocs && connectedDocs.length > 0) {
      const syncedDocs = connectedDocs.filter(d => d.status === 'synced' && d.content);
      if (syncedDocs.length > 0) {
        context += '\n\nConnected Google Docs/Sheets data:\n';
        syncedDocs.forEach((doc) => {
          context += `\n--- ${doc.name} (${doc.department || 'General'}) ---\n`;
          context += doc.content?.substring(0, 50000) + (doc.content?.length > 50000 ? '...' : '') + '\n';
        });
      }
    }

    // Include issues board data
    if (issues && issues.length > 0) {
      const activeIssues = issues.filter(i => !i.archived);
      const resolvedIssues = issues.filter(i => i.archived || i.status === 'Resolved');
      
      if (activeIssues.length > 0) {
        context += '\n\n=== ISSUES BOARD (Active Issues) ===\n';
        activeIssues.forEach((issue, i) => {
          context += `${i + 1}. [${issue.status}] [${issue.priority}] ${issue.title}`;
          if (issue.department) context += ` (Dept: ${issue.department})`;
          if (issue.assignee) context += ` - Assigned to: ${issue.assignee}`;
          if (issue.description) context += `\n   Description: ${issue.description}`;
          context += `\n   Created: ${new Date(issue.createdAt).toLocaleDateString()}\n`;
        });
      }
      
      if (resolvedIssues.length > 0) {
        context += '\n=== RESOLVED/ARCHIVED ISSUES ===\n';
        resolvedIssues.slice(0, 10).forEach((issue, i) => {
          context += `${i + 1}. ${issue.title} - ${issue.status}`;
          if (issue.resolutionNotes) context += `\n   Resolution: ${issue.resolutionNotes}`;
          context += '\n';
        });
      }
    }

    // Include relevant knowledge items
    if (knowledge && knowledge.length > 0) {
      const deptKnowledge = activeDepartment 
        ? knowledge.filter(k => k.department === deptId || k.department === 'company-wide')
        : knowledge;
      
      if (deptKnowledge.length > 0 && !context.includes('Knowledge base items')) {
        context += '\n\nKnowledge base items:\n';
        deptKnowledge.slice(0, 3).forEach((item, i) => {
          context += `${i + 1}. ${item.title}: ${item.content?.substring(0, 200)}...\n`;
        });
      }
    }

    return context;
  };

  const sendMessage = async (overrideMessage) => {
    const textToSend = overrideMessage || message;
    if (!textToSend.trim() || isThinking) return;

    const userMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toISOString()
    };

    // Add user message to conversation
    setConversations(prev => ({
      ...prev,
      [deptId]: [...(prev[deptId] || []), userMessage]
    }));

    setMessage('');
    setIsThinking(true);

    // Build context
    const knowledgeContext = buildKnowledgeContext(textToSend);

    // Build system prompt
    let systemPrompt = `You are Empire AI, the operational intelligence assistant for Empire Remodeling. You help with questions, tasks, and decisions across all departments. Be helpful, concise, and reference company data when relevant.`;

    if (activeDepartment) {
      systemPrompt += `\n\nCurrent Department: ${activeDepartment.name}`;
      if (activeDepartment.description) {
        systemPrompt += `\nDepartment Focus: ${activeDepartment.description}`;
      }
      if (activeDepartment.instructions) {
        systemPrompt += `\n\n=== ${activeDepartment.name} DEPARTMENT INSTRUCTIONS ===\n${activeDepartment.instructions}`;
      }
    }

    if (systemInstructions) {
      systemPrompt += `\n\n=== SYSTEM-WIDE INSTRUCTIONS ===\n${systemInstructions}`;
    }

    if (knowledgeContext) {
      systemPrompt += knowledgeContext;
    }

    // Get conversation history for context
    const historyForAPI = deptMessages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim(),
          systemPrompt,
          conversationHistory: historyForAPI
        })
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      const aiResponse = data.response || "I'm sorry, I couldn't process that request.";

      const assistantMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };

      setConversations(prev => ({
        ...prev,
        [deptId]: [...(prev[deptId] || []), assistantMessage]
      }));

      // Log to intelligence
      if (addToIntelligence && textToSend.length > 10) {
        addToIntelligence({
          sourceType: 'chat_query',
          sourceId: `chat_${Date.now()}`,
          title: `Chat: ${textToSend.substring(0, 50)}...`,
          content: `Q: ${textToSend}\nA: ${aiResponse.substring(0, 500)}`,
          department: deptId,
          tags: ['chat', 'query'],
          metadata: { type: 'chat' },
          relevanceBoost: 1
        });
      }

      // Log activity
      if (logActivity) {
        logActivity(`Chat in ${activeDepartment?.name || 'General'}`, 'chat');
      }

    } catch (err) {
      console.error('Chat API error:', err);
      
      // Fallback response
      const fallbackMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please check your connection and try again.",
        timestamp: new Date().toISOString()
      };

      setConversations(prev => ({
        ...prev,
        [deptId]: [...(prev[deptId] || []), fallbackMessage]
      }));
    }

    setIsThinking(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const hasCustomInstructions = systemInstructions?.trim() || activeDepartment?.instructions?.trim();

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '16px',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          background: activeDepartment?.color || '#3B82F6',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          {activeDepartment?.icon || '💬'}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: '#E2E8F0', fontSize: '18px', fontWeight: '600', margin: 0 }}>
            {activeDepartment?.name || 'General Chat'}
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '13px', margin: '2px 0 0 0' }}>
            {activeDepartment?.description || 'Chat with Empire AI'}
          </p>
        </div>
        
        {/* Custom Instructions Badge */}
        {hasCustomInstructions && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(249, 115, 22, 0.15)',
            border: '1px solid rgba(249, 115, 22, 0.3)',
            borderRadius: '20px',
            padding: '6px 12px'
          }}>
            <FileText size={14} style={{ color: '#F97316' }} />
            <span style={{ color: '#FB923C', fontSize: '12px', fontWeight: '500' }}>
              Custom Instructions Active
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        background: 'rgba(30, 41, 59, 0.6)',
        borderRadius: '12px',
        padding: '20px',
        overflowY: 'auto',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '16px'
      }}>
        {deptMessages.length === 0 && !isThinking && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <MessageSquare size={48} style={{ color: '#64748B', marginBottom: '16px' }} />
            <p style={{ color: '#94A3B8', fontSize: '16px', marginBottom: '8px' }}>
              Start a conversation
            </p>
            <p style={{ color: '#64748B', fontSize: '14px' }}>
              Ask Empire AI anything about {activeDepartment?.name || 'your business'}
            </p>
          </div>
        )}

        {deptMessages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '16px'
            }}
          >
            <div style={{
              maxWidth: '70%',
              background: msg.role === 'user' 
                ? 'linear-gradient(135deg, #3B82F6, #2563EB)' 
                : 'rgba(15, 23, 42, 0.8)',
              borderRadius: msg.role === 'user' 
                ? '16px 16px 4px 16px' 
                : '16px 16px 16px 4px',
              padding: '12px 16px',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)'
            }}>
              <p style={{ 
                color: '#E2E8F0', 
                fontSize: '14px', 
                margin: 0,
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </p>
              <p style={{ 
                color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : '#64748B', 
                fontSize: '11px', 
                margin: '8px 0 0 0',
                textAlign: 'right'
              }}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <div style={{ display: 'flex', marginBottom: '16px' }}>
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              borderRadius: '16px 16px 16px 4px',
              padding: '16px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} style={{ color: '#8B5CF6' }} />
                <span style={{ color: '#94A3B8', fontSize: '14px' }}>Empire AI is thinking</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    background: '#8B5CF6', 
                    borderRadius: '50%',
                    animation: 'thinking 1.4s infinite ease-in-out both',
                    animationDelay: '0s'
                  }} />
                  <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    background: '#8B5CF6', 
                    borderRadius: '50%',
                    animation: 'thinking 1.4s infinite ease-in-out both',
                    animationDelay: '0.2s'
                  }} />
                  <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    background: '#8B5CF6', 
                    borderRadius: '50%',
                    animation: 'thinking 1.4s infinite ease-in-out both',
                    animationDelay: '0.4s'
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex',
        gap: '12px',
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '12px',
        padding: '12px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isThinking}
          placeholder={isThinking ? 'Waiting for response...' : `Message ${activeDepartment?.name || 'Empire AI'}...`}
          style={{
            flex: 1,
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '14px 16px',
            color: '#E2E8F0',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!message.trim() || isThinking}
          style={{
            background: message.trim() && !isThinking ? '#3B82F6' : 'rgba(59, 130, 246, 0.3)',
            border: 'none',
            borderRadius: '8px',
            padding: '14px 20px',
            color: 'white',
            cursor: message.trim() && !isThinking ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Send size={18} />
        </button>
      </div>

      {/* CSS for thinking animation */}
      <style>{`
        @keyframes thinking {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
