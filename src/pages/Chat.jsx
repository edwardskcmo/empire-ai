// Empire AI - Chat Interface
// Version 3.0 - With Conversation Memory, Knowledge Gaps, Analytics

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Loader2, Sparkles, Building, Globe, Trash2, 
  RotateCcw, MessageSquare, Clock, FileText, Database
} from 'lucide-react';
import { 
  formatTimestamp, 
  createIntelligenceItem,
  getCachedEmbedding,
  setCachedEmbedding,
  trimConversationHistory,
  getConversationSummary,
  CONVERSATION_MEMORY_CONFIG,
  KNOWLEDGE_GAPS_CONFIG,
} from '../utils';

export default function Chat({
  activeDepartment,
  conversations,
  setConversations,
  knowledge,
  connectedDocs,
  intelligenceIndex,
  systemInstructions,
  addToIntelligence,
  generateSmartTags,
  queryIntelligence,
  issues,
  setIssues,
  departments,
  logActivity,
  pendingMessage,
  setPendingMessage,
  clearConversationHistory,
  recordKnowledgeGap,
  trackChatMessage,
  trackSearch,
  trackIssueCreated,
}) {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [searchAllDepts, setSearchAllDepts] = useState(false);
  const [ragStatus, setRagStatus] = useState(null); // 'cached', 'fresh', null
  const [topScore, setTopScore] = useState(0);
  const [showMemoryIndicator, setShowMemoryIndicator] = useState(false);
  const [notification, setNotification] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const deptId = activeDepartment?.id || 'general';
  const messages = conversations[deptId] || [];
  const deptInstructions = activeDepartment?.instructions || '';

  // Check if this is a returning session (Item 7)
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const lastMessageTime = new Date(lastMessage.timestamp);
      const hoursSince = (Date.now() - lastMessageTime.getTime()) / (1000 * 60 * 60);
      
      // Show indicator if last message was more than 1 hour ago
      if (hoursSince > 1) {
        setShowMemoryIndicator(true);
        setTimeout(() => setShowMemoryIndicator(false), 5000);
      }
    }
  }, [deptId]);

  // Handle pending message from dashboard
  useEffect(() => {
    if (pendingMessage) {
      setInput(pendingMessage);
      setPendingMessage(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [pendingMessage, setPendingMessage]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Build knowledge context with full data access
  const buildKnowledgeContext = async (query) => {
    let context = '';
    let cacheHit = false;
    let maxScore = 0;
    
    // Semantic search with embeddings
    try {
      let queryEmbedding = getCachedEmbedding(query);
      
      if (queryEmbedding) {
        cacheHit = true;
        setRagStatus('cached');
      } else {
        const embResponse = await fetch('/api/generate-embedding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: query }),
        });
        
        if (embResponse.ok) {
          const embData = await embResponse.json();
          queryEmbedding = embData.embedding;
          setCachedEmbedding(query, queryEmbedding);
          setRagStatus('fresh');
        }
      }
      
      // Track the search
      trackSearch(cacheHit);
      
    } catch (e) {
      console.log('Embedding unavailable, using keyword search');
      setRagStatus(null);
    }
    
    // Query intelligence (keyword fallback if no embeddings)
    const searchDept = searchAllDepts ? null : activeDepartment?.name;
    const relevantItems = queryIntelligence(intelligenceIndex, query, searchDept, 10);
    
    if (relevantItems.length > 0) {
      maxScore = relevantItems[0].score;
      context += '\n\n=== RELEVANT COMPANY KNOWLEDGE ===\n';
      relevantItems.forEach((item, i) => {
        const label = item.sourceType === 'knowledge' ? 'Knowledge Base' :
                     item.sourceType === 'resolved_issue' ? 'Resolved Issue' :
                     item.sourceType === 'chat_query' ? 'Previous Discussion' :
                     item.sourceType === 'activity_log' ? 'Activity' :
                     item.sourceType;
        context += `${i + 1}. [${label}] ${item.title}: ${item.content?.substring(0, 300)}...\n`;
      });
    }
    
    // Add connected Google Sheets/Docs (full content)
    const syncedDocs = connectedDocs.filter(d => d.status === 'synced' && d.content);
    if (syncedDocs.length > 0) {
      context += '\n\n=== CONNECTED SPREADSHEETS & DOCUMENTS ===\n';
      syncedDocs.forEach(doc => {
        context += `\n--- ${doc.name} (${doc.department}) ---\n`;
        context += doc.content?.substring(0, 50000) + '\n';
      });
    }

    // Add active issues context
    const activeIssues = issues.filter(i => !i.archived && i.status !== 'Resolved');
    if (activeIssues.length > 0) {
      context += '\n\n=== ISSUES BOARD (Active Issues) ===\n';
      activeIssues.slice(0, 15).forEach((issue, i) => {
        context += `${i + 1}. [${issue.status}] [${issue.priority}] ${issue.title} (Dept: ${issue.department})`;
        if (issue.assignee) context += ` - Assigned to: ${issue.assignee}`;
        context += `\n   Description: ${issue.description || 'No description'}\n`;
      });
    }
    
    // Add resolved issues for reference
    const resolvedIssues = issues.filter(i => i.status === 'Resolved' || i.archived).slice(0, 10);
    if (resolvedIssues.length > 0) {
      context += '\n\n=== RESOLVED/ARCHIVED ISSUES ===\n';
      resolvedIssues.forEach((issue, i) => {
        context += `${i + 1}. ${issue.title} - ${issue.status}`;
        if (issue.resolutionNotes) context += `\n   Resolution: ${issue.resolutionNotes}`;
        context += '\n';
      });
    }
    
    setTopScore(maxScore);
    return { context, cacheHit, maxScore };
  };

  // Parse issue creation from AI response
  const parseIssueFromResponse = (response) => {
    const regex = /\[ISSUE_CREATED\]\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\[\/ISSUE_CREATED\]/i;
    const match = response.match(regex);
    
    if (match) {
      return {
        title: match[1].trim(),
        priority: match[2].trim(),
        department: match[3].trim(),
        description: match[4].trim(),
      };
    }
    return null;
  };

  // Create issue from parsed data
  const createIssue = async (issueData) => {
    const matchingDept = departments.find(d => 
      d.name.toLowerCase().includes(issueData.department.toLowerCase()) ||
      issueData.department.toLowerCase().includes(d.name.toLowerCase().split(' ')[0])
    );
    
    const newIssue = {
      id: `issue_${Date.now()}`,
      title: issueData.title,
      description: issueData.description,
      department: matchingDept?.name || activeDepartment?.name || 'General',
      priority: ['High', 'Medium', 'Low'].includes(issueData.priority) ? issueData.priority : 'Medium',
      status: 'Open',
      assignee: '',
      createdAt: new Date().toISOString(),
      archived: false,
    };
    
    setIssues(prev => [newIssue, ...prev]);
    logActivity(`Created issue: ${newIssue.title}`, 'issue', newIssue.department);
    trackIssueCreated(newIssue.priority, newIssue.department);
    
    // Add to intelligence
    const tags = await generateSmartTags(newIssue.description, newIssue.title, 'issue_created');
    addToIntelligence(createIntelligenceItem(
      'issue_created',
      newIssue.id,
      newIssue.title,
      newIssue.description,
      newIssue.department,
      [...tags, 'issue', 'open', newIssue.priority.toLowerCase()],
      { priority: newIssue.priority },
      newIssue.priority === 'High' ? 3 : newIssue.priority === 'Medium' ? 2 : 1
    ));
    
    setNotification(`Issue created: "${newIssue.title}"`);
    setTimeout(() => setNotification(null), 4000);
    
    return newIssue;
  };

  // Clean response for display (remove markers)
  const cleanResponseForDisplay = (response) => {
    return response.replace(/\[ISSUE_CREATED\][\s\S]*?\[\/ISSUE_CREATED\]/gi, '').trim();
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    const newMessages = [...messages, { 
      role: 'user', 
      content: userMessage, 
      timestamp: new Date().toISOString() 
    }];
    setConversations(prev => ({ ...prev, [deptId]: newMessages }));
    
    setIsThinking(true);
    setRagStatus(null);
    
    try {
      // Build context
      const { context, maxScore } = await buildKnowledgeContext(userMessage);
      
      // Build system prompt with conversation summary for context (Item 7)
      const conversationSummary = getConversationSummary(messages);
      
      let systemPrompt = `You are Empire AI, the operational intelligence assistant for Empire Remodeling.
Current Department: ${activeDepartment?.name || 'General'}
Department Focus: ${activeDepartment?.description || 'Cross-functional operations'}
${conversationSummary ? `\nPrevious conversation context: ${conversationSummary}` : ''}
${systemInstructions ? `\n\n=== SYSTEM-WIDE INSTRUCTIONS ===\n${systemInstructions}` : ''}
${deptInstructions ? `\n\n=== ${activeDepartment?.name} DEPARTMENT INSTRUCTIONS ===\n${deptInstructions}` : ''}
${context}

ISSUE CREATION CAPABILITY:
If the user asks to create, log, add, or report an issue, include this marker in your response:
[ISSUE_CREATED] Title | Priority | Department | Description [/ISSUE_CREATED]
Example: [ISSUE_CREATED] Permit delay | High | Production | Waiting on city approval [/ISSUE_CREATED]
Then confirm the issue was created.

Be helpful, specific, and reference the company knowledge when relevant.`;

      // Get recent messages for context (trimmed for API limits)
      const recentMessages = trimConversationHistory(newMessages).slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          systemPrompt,
          conversationHistory: recentMessages.slice(0, -1),
        }),
      });

      let aiContent;
      if (response.ok) {
        const data = await response.json();
        aiContent = data.response;
      } else {
        aiContent = "I'm having trouble connecting to my brain right now. Please try again in a moment.";
      }
      
      // Check for issue creation
      const issueData = parseIssueFromResponse(aiContent);
      if (issueData) {
        await createIssue(issueData);
        aiContent = cleanResponseForDisplay(aiContent);
      }
      
      // Track knowledge gap if low relevance (Item 8)
      if (maxScore < KNOWLEDGE_GAPS_CONFIG.LOW_RELEVANCE_THRESHOLD && userMessage.length >= KNOWLEDGE_GAPS_CONFIG.MIN_QUERY_LENGTH) {
        recordKnowledgeGap(userMessage, maxScore, activeDepartment?.name || 'General');
      }

      // Add AI response
      const finalMessages = [...newMessages, { 
        role: 'assistant', 
        content: aiContent, 
        timestamp: new Date().toISOString(),
        ragStatus: ragStatus,
        topScore: maxScore,
      }];
      
      // Trim to memory limit and save (Item 7)
      const trimmedMessages = trimConversationHistory(finalMessages);
      setConversations(prev => ({ ...prev, [deptId]: trimmedMessages }));
      
      // Track analytics
      trackChatMessage(activeDepartment?.name || 'General');
      
      // Log to intelligence
      const tags = await generateSmartTags(userMessage, 'Chat Query', 'chat_query');
      addToIntelligence(createIntelligenceItem(
        'chat_query',
        `chat_${Date.now()}`,
        `Q: ${userMessage.substring(0, 50)}...`,
        `User asked: ${userMessage}\n\nAI responded: ${aiContent.substring(0, 500)}`,
        activeDepartment?.name || 'General',
        tags,
        {},
        1
      ));

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessages = [...newMessages, { 
        role: 'assistant', 
        content: "I encountered an error. Please try again.", 
        timestamp: new Date().toISOString() 
      }];
      setConversations(prev => ({ ...prev, [deptId]: errorMessages }));
    }
    
    setIsThinking(false);
  };

  return (
    <div style={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRadius: 16,
        padding: '16px 24px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44, height: 44,
            background: `${activeDepartment?.color || '#3B82F6'}20`,
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: activeDepartment?.color || '#3B82F6',
            fontSize: 20,
          }}>
            <MessageSquare size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#E2E8F0', margin: 0 }}>
              {activeDepartment?.name || 'General Chat'}
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
              {activeDepartment?.description || 'Cross-functional conversation'}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* RAG Status Badge */}
          {ragStatus && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: ragStatus === 'cached' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
              border: `1px solid ${ragStatus === 'cached' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
              borderRadius: 20,
              fontSize: 12,
              color: ragStatus === 'cached' ? '#10B981' : '#8B5CF6',
            }}>
              <Database size={14} />
              RAG {ragStatus === 'cached' ? '(Cached)' : 'Enhanced'}
            </span>
          )}
          
          {/* Custom Instructions Badge */}
          {(systemInstructions || deptInstructions) && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'rgba(249, 115, 22, 0.1)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              borderRadius: 20,
              fontSize: 12,
              color: '#F97316',
            }}>
              <FileText size={14} />
              Custom Instructions
            </span>
          )}
          
          {/* Department Toggle (Item 5) */}
          <button
            onClick={() => setSearchAllDepts(!searchAllDepts)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: searchAllDepts ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${searchAllDepts ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 20,
              color: searchAllDepts ? '#3B82F6' : '#94A3B8',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {searchAllDepts ? <Globe size={14} /> : <Building size={14} />}
            {searchAllDepts ? 'All Depts' : 'This Dept'}
          </button>
          
          {/* Clear History Button (Item 7) */}
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear conversation history for this department?')) {
                  clearConversationHistory(deptId);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 20,
                color: '#EF4444',
                cursor: 'pointer',
                fontSize: 12,
              }}
              title="Clear conversation history"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      
      {/* Conversation Memory Indicator (Item 7) */}
      {showMemoryIndicator && messages.length > 0 && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <Clock size={18} style={{ color: '#3B82F6' }} />
          <div>
            <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>
              Continuing from previous session
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              Your last {Math.min(messages.length, CONVERSATION_MEMORY_CONFIG.MAX_MESSAGES_PER_DEPT)} messages are remembered
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 8px',
      }}>
        {messages.length === 0 ? (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B',
          }}>
            <Sparkles size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            <h3 style={{ fontSize: 18, fontWeight: 500, color: '#94A3B8', marginBottom: 8 }}>
              Start a conversation
            </h3>
            <p style={{ fontSize: 14, textAlign: 'center', maxWidth: 400 }}>
              Ask me anything about {activeDepartment?.name || 'Empire Remodeling'}. 
              I have access to your knowledge base, issues, and connected documents.
            </p>
            {searchAllDepts && (
              <p style={{ fontSize: 12, color: '#8B5CF6', marginTop: 12 }}>
                <Globe size={14} style={{ display: 'inline', marginRight: 6 }} />
                Cross-department search enabled
              </p>
            )}
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 16,
              }}
            >
              <div style={{
                maxWidth: '75%',
                padding: '14px 18px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.role === 'user' 
                  ? 'linear-gradient(135deg, #3B82F6, #2563EB)' 
                  : 'rgba(30, 41, 59, 0.8)',
                color: '#E2E8F0',
                border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
                <div style={{ 
                  fontSize: 11, 
                  color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : '#64748B',
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  {formatTimestamp(msg.timestamp)}
                  {msg.ragStatus && (
                    <span style={{ 
                      padding: '2px 6px', 
                      background: 'rgba(139, 92, 246, 0.2)', 
                      borderRadius: 4,
                      fontSize: 10,
                    }}>
                      RAG
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Thinking Indicator */}
        {isThinking && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: 16,
          }}>
            <div style={{
              padding: '14px 18px',
              borderRadius: '18px 18px 18px 4px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <Loader2 size={18} className="spin" style={{ color: '#3B82F6' }} />
              <span style={{ color: '#94A3B8', fontSize: 14 }}>Empire AI is thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '16px 0',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          display: 'flex',
          gap: 12,
          background: 'rgba(30, 41, 59, 0.6)',
          borderRadius: 16,
          padding: 8,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={`Ask about ${activeDepartment?.name || 'anything'}...`}
            disabled={isThinking}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#E2E8F0',
              fontSize: 15,
              padding: '8px 12px',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isThinking}
            style={{
              width: 44,
              height: 44,
              background: input.trim() && !isThinking 
                ? 'linear-gradient(135deg, #3B82F6, #2563EB)' 
                : 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: 12,
              color: input.trim() && !isThinking ? 'white' : '#64748B',
              cursor: input.trim() && !isThinking ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isThinking ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
          </button>
        </div>
        
        {/* Message Count Indicator (Item 7) */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: 8, 
          padding: '0 8px',
        }}>
          <span style={{ fontSize: 11, color: '#64748B' }}>
            {messages.length} / {CONVERSATION_MEMORY_CONFIG.MAX_MESSAGES_PER_DEPT} messages in memory
          </span>
          {topScore > 0 && (
            <span style={{ fontSize: 11, color: topScore >= 20 ? '#10B981' : '#F59E0B' }}>
              Relevance: {Math.round(topScore)}
            </span>
          )}
        </div>
      </div>
      
      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 500,
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <Sparkles size={18} />
          {notification}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
