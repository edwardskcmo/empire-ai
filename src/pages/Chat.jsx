// Empire AI - Chat Interface
// Version 3.4 - Fixed Send Button Click Handler

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Loader2, Sparkles, Building, Globe, Trash2, 
  MessageSquare, Clock, FileText, Database, Plus,
  ChevronDown, ChevronUp, User, Calendar
} from 'lucide-react';
import { 
  formatTimestamp, 
  formatDate,
  createIntelligenceItem,
  getCachedEmbedding,
  setCachedEmbedding,
  trimConversationHistory,
  getConversationSummary,
  CONVERSATION_MEMORY_CONFIG,
  KNOWLEDGE_GAPS_CONFIG,
  CHAT_LOGS_CONFIG,
  generateId
} from '../utils';

export default function Chat({
  activeDepartment,
  conversations,
  setConversations,
  systemInstructions,
  intelligenceIndex,
  queryIntelligence,
  knowledge,
  connectedDocs,
  issues,
  setIssues,
  departments,
  logActivity,
  addToIntelligence,
  trackSearch,
  trackChatMessage,
  recordKnowledgeGap,
  chatLogs,
  setChatLogs,
}) {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [searchAllDepts, setSearchAllDepts] = useState(false);
  const [ragInfo, setRagInfo] = useState({ active: false, cached: false, topScore: 0 });
  const [notification, setNotification] = useState('');
  const [showChatLogs, setShowChatLogs] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pendingMessageProcessed = useRef(false);
  
  const deptId = activeDepartment?.id || 'general';
  const deptName = activeDepartment?.name || 'General';
  const messages = conversations[deptId] || [];
  
  // Filter chat logs for current department
  const deptChatLogs = chatLogs.filter(log => log.departmentId === deptId);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Handle pending message from dashboard (via sessionStorage)
  useEffect(() => {
    // Prevent double-processing
    if (pendingMessageProcessed.current) return;
    
    const pendingFromStorage = sessionStorage.getItem('pendingChatMessage');
    if (pendingFromStorage) {
      pendingMessageProcessed.current = true;
      sessionStorage.removeItem('pendingChatMessage');
      
      // Set input and auto-send
      setInput(pendingFromStorage);
      
      // Small delay to let state settle, then send
      setTimeout(() => {
        sendMessageDirect(pendingFromStorage);
      }, 200);
    }
  }, [deptId]);
  
  // Reset the processed flag when department changes
  useEffect(() => {
    pendingMessageProcessed.current = false;
  }, [deptId]);

  // Check for session continuation
  const lastMessageTime = messages.length > 0 
    ? new Date(messages[messages.length - 1].timestamp || Date.now())
    : null;
  const isReturningSession = lastMessageTime && 
    (Date.now() - lastMessageTime.getTime()) > 60 * 60 * 1000; // 1 hour

  // Build knowledge context for AI
  const buildKnowledgeContext = async (query) => {
    let context = '';
    let topScore = 0;
    let usedCache = false;
    
    // 1. Query Central Intelligence with semantic search
    if (intelligenceIndex.length > 0) {
      try {
        // Check embedding cache first
        const cachedEmbedding = getCachedEmbedding(query);
        
        let queryEmbedding = null;
        if (cachedEmbedding) {
          queryEmbedding = cachedEmbedding;
          usedCache = true;
        } else {
          // Generate new embedding
          try {
            const embResponse = await fetch('/api/generate-embedding', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: query })
            });
            if (embResponse.ok) {
              const embData = await embResponse.json();
              queryEmbedding = embData.embedding;
              setCachedEmbedding(query, queryEmbedding);
            }
          } catch (e) {
            console.log('Embedding generation failed, using keyword search');
          }
        }
        
        // Perform semantic search
        const results = queryIntelligence(
          query, 
          searchAllDepts ? null : deptId,
          queryEmbedding
        );
        
        if (results.length > 0) {
          topScore = results[0].score || 0;
          context += '\n=== RELEVANT COMPANY KNOWLEDGE ===\n';
          results.slice(0, 10).forEach((item, i) => {
            const label = item.sourceType === 'resolved_issue' ? 'Resolved Issue' :
                          item.sourceType === 'knowledge' ? 'Knowledge Base' :
                          item.sourceType === 'activity_log' ? 'Activity' :
                          item.sourceType === 'sop_created' ? 'SOP' :
                          'Intelligence';
            context += `${i + 1}. [${label}] ${item.title}: ${item.content?.substring(0, 300)}...\n`;
          });
        }
      } catch (e) {
        console.log('Intelligence query failed:', e);
      }
    }
    
    // 2. Include connected Google Docs/Sheets
    if (connectedDocs?.length > 0) {
      const syncedDocs = connectedDocs.filter(doc => 
        doc.status === 'synced' && doc.content &&
        (searchAllDepts || doc.department === deptId)
      );
      
      if (syncedDocs.length > 0) {
        context += '\n=== CONNECTED GOOGLE DOCS/SHEETS ===\n';
        syncedDocs.forEach(doc => {
          context += `\n[${doc.name}]:\n${doc.content?.substring(0, 50000)}\n`;
        });
      }
    }
    
    // 3. Include knowledge base items
    if (knowledge?.length > 0) {
      const deptKnowledge = searchAllDepts 
        ? knowledge 
        : knowledge.filter(k => k.department === deptId);
      
      if (deptKnowledge.length > 0) {
        context += '\n=== DEPARTMENT KNOWLEDGE BASE ===\n';
        deptKnowledge.slice(0, 10).forEach(item => {
          context += `- ${item.title}: ${item.content?.substring(0, 500)}...\n`;
        });
      }
    }
    
    // 4. Include active issues
    if (issues?.length > 0) {
      const activeIssues = issues.filter(i => !i.archived);
      const relevantIssues = searchAllDepts 
        ? activeIssues 
        : activeIssues.filter(i => i.department === deptId);
      
      if (relevantIssues.length > 0) {
        context += '\n=== ISSUES BOARD (Active Issues) ===\n';
        relevantIssues.forEach((issue, i) => {
          context += `${i + 1}. [${issue.status}] [${issue.priority}] ${issue.title} (Dept: ${issue.department}) - Assigned to: ${issue.assignee || 'Unassigned'}\n`;
          if (issue.description) {
            context += `   Description: ${issue.description}\n`;
          }
          context += `   Created: ${formatDate(issue.createdAt)}\n`;
        });
      }
      
      // Include resolved issues for reference
      const resolvedIssues = issues.filter(i => i.status === 'Resolved' || i.archived);
      if (resolvedIssues.length > 0) {
        context += '\n=== RESOLVED/ARCHIVED ISSUES ===\n';
        resolvedIssues.slice(0, 5).forEach((issue, i) => {
          context += `${i + 1}. ${issue.title} - Resolved\n`;
          if (issue.resolutionNotes) {
            context += `   Resolution: ${issue.resolutionNotes}\n`;
          }
        });
      }
    }
    
    return { context, topScore, usedCache };
  };

  // Parse AI response for issue creation markers
  const parseIssueFromResponse = (response) => {
    const issueMatch = response.match(/\[ISSUE_CREATED\](.*?)\[\/ISSUE_CREATED\]/s);
    if (issueMatch) {
      const parts = issueMatch[1].split('|').map(p => p.trim());
      if (parts.length >= 3) {
        return {
          title: parts[0],
          priority: parts[1] || 'Medium',
          department: parts[2] || deptId,
          description: parts[3] || ''
        };
      }
    }
    return null;
  };

  // Create issue from parsed data
  const createIssue = (issueData) => {
    // Find matching department
    let matchedDept = deptId;
    if (issueData.department && departments) {
      const found = departments.find(d => 
        d.name.toLowerCase().includes(issueData.department.toLowerCase()) ||
        issueData.department.toLowerCase().includes(d.name.toLowerCase())
      );
      if (found) matchedDept = found.id;
    }

    const newIssue = {
      id: generateId('issue'),
      title: issueData.title,
      description: issueData.description,
      department: matchedDept,
      priority: ['High', 'Medium', 'Low'].includes(issueData.priority) ? issueData.priority : 'Medium',
      status: 'Open',
      assignee: '',
      createdAt: new Date().toISOString(),
      archived: false,
    };

    setIssues(prev => [...prev, newIssue]);
    logActivity(`Created issue via chat: ${newIssue.title}`, 'issue', deptName);
    
    // Add to intelligence
    addToIntelligence({
      sourceType: 'issue_created',
      sourceId: newIssue.id,
      title: newIssue.title,
      content: newIssue.description || newIssue.title,
      department: matchedDept,
      tags: ['issue', 'open', newIssue.priority.toLowerCase()],
      metadata: { priority: newIssue.priority },
      relevanceBoost: newIssue.priority === 'High' ? 3 : newIssue.priority === 'Medium' ? 2 : 1,
    });

    setNotification(`Issue created: ${newIssue.title}`);
    setTimeout(() => setNotification(''), 3000);
  };

  // Clean response for display (remove markers)
  const cleanResponseForDisplay = (response) => {
    return response.replace(/\[ISSUE_CREATED\].*?\[\/ISSUE_CREATED\]/gs, '').trim();
  };

  // Direct send function (used by sessionStorage auto-send and button click)
  const sendMessageDirect = async (messageText) => {
    if (!messageText.trim() || isThinking) return;
    
    const userMessage = {
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
    };
    
    // Add user message to conversation
    setConversations(prev => ({
      ...prev,
      [deptId]: [...(prev[deptId] || []), userMessage]
    }));
    
    setInput('');
    setIsThinking(true);
    
    try {
      // Build knowledge context
      const { context, topScore, usedCache } = await buildKnowledgeContext(messageText);
      setRagInfo({ active: context.length > 0, cached: usedCache, topScore });
      
      // Track search
      if (trackSearch) trackSearch(usedCache);
      
      // Build system prompt
      const deptInstructions = activeDepartment?.instructions || '';
      const conversationSummary = getConversationSummary(messages);
      
      let systemPrompt = `You are Empire AI, the operational intelligence assistant for Empire Remodeling, a residential remodeling contractor.

Current Department: ${deptName}
Department Focus: ${activeDepartment?.description || 'General operations'}
${conversationSummary ? `\nRecent conversation context: ${conversationSummary}` : ''}
${context}

${systemInstructions ? `\n=== SYSTEM-WIDE INSTRUCTIONS ===\n${systemInstructions}` : ''}
${deptInstructions ? `\n=== ${deptName.toUpperCase()} DEPARTMENT INSTRUCTIONS ===\n${deptInstructions}` : ''}

ISSUE CREATION: If the user asks you to create, log, add, or report an issue, include this marker in your response (hidden from user):
[ISSUE_CREATED] Issue Title | Priority (High/Medium/Low) | Department Name | Brief Description [/ISSUE_CREATED]

Keep responses helpful, specific to Empire Remodeling's context, and reference the knowledge provided when relevant.`;

      // Get conversation history for API
      const historyForApi = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText.trim(),
          systemPrompt,
          conversationHistory: historyForApi
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Check for issue creation
      const issueData = parseIssueFromResponse(data.response);
      if (issueData) {
        createIssue(issueData);
      }
      
      // Clean response and add to conversation
      const cleanedResponse = cleanResponseForDisplay(data.response);
      
      const aiMessage = {
        role: 'assistant',
        content: cleanedResponse,
        timestamp: new Date().toISOString(),
      };
      
      setConversations(prev => {
        const updated = {
          ...prev,
          [deptId]: [...(prev[deptId] || []), aiMessage]
        };
        // Trim to max messages
        updated[deptId] = trimConversationHistory(
          { [deptId]: updated[deptId] },
          CONVERSATION_MEMORY_CONFIG.MAX_MESSAGES_PER_DEPT
        )[deptId];
        return updated;
      });
      
      // Track analytics
      if (trackChatMessage) trackChatMessage(deptId);
      
      // Record knowledge gap if low relevance
      if (topScore < KNOWLEDGE_GAPS_CONFIG.LOW_RELEVANCE_THRESHOLD && 
          messageText.length >= KNOWLEDGE_GAPS_CONFIG.MIN_QUERY_LENGTH) {
        if (recordKnowledgeGap) {
          recordKnowledgeGap(messageText, deptId, topScore);
        }
      }
      
      // Log to intelligence
      addToIntelligence({
        sourceType: 'chat_query',
        sourceId: generateId('chat'),
        title: messageText.substring(0, 50),
        content: `Q: ${messageText}\nA: ${cleanedResponse.substring(0, 500)}`,
        department: deptId,
        relevanceBoost: 1,
      });
      
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message
      const errorMessage = {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      };
      
      setConversations(prev => ({
        ...prev,
        [deptId]: [...(prev[deptId] || []), errorMessage]
      }));
    } finally {
      setIsThinking(false);
    }
  };

  // Send message (form submission or button click)
  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isThinking) return;
    await sendMessageDirect(input);
  };

  // Handle button click directly
  const handleSendClick = (e) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    sendMessageDirect(input);
  };

  // Start new chat (save current and clear)
  const startNewChat = () => {
    if (messages.length === 0) return;
    
    // Generate summary from first user message
    const firstUserMsg = messages.find(m => m.role === 'user');
    const summary = firstUserMsg 
      ? firstUserMsg.content.substring(0, 80) + (firstUserMsg.content.length > 80 ? '...' : '')
      : 'Chat conversation';
    
    // Extract tags from conversation
    const conversationText = messages.map(m => m.content).join(' ').toLowerCase();
    const tagKeywords = ['budget', 'schedule', 'permit', 'client', 'material', 'subcontractor', 
                         'safety', 'delay', 'issue', 'payment', 'inspection', 'change order', 
                         'warranty', 'estimate'];
    const tags = tagKeywords.filter(tag => conversationText.includes(tag));
    
    // Create chat log
    const newLog = {
      id: generateId('chatlog'),
      departmentId: deptId,
      departmentName: deptName,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      })),
      summary,
      tags: tags.slice(0, 5),
      messageCount: messages.length,
      savedAt: new Date().toISOString(),
      savedBy: 'You'
    };
    
    // Add to logs (limit per department)
    setChatLogs(prev => {
      const otherDeptLogs = prev.filter(l => l.departmentId !== deptId);
      const thisDeptLogs = prev.filter(l => l.departmentId === deptId);
      const updatedThisDept = [newLog, ...thisDeptLogs].slice(0, CHAT_LOGS_CONFIG.MAX_LOGS_PER_DEPT);
      return [...updatedThisDept, ...otherDeptLogs].slice(0, CHAT_LOGS_CONFIG.MAX_LOGS);
    });
    
    // Clear current conversation
    setConversations(prev => ({
      ...prev,
      [deptId]: []
    }));
    
    logActivity(`Saved chat in ${deptName} (${messages.length} messages)`, 'chat', deptName);
    setNotification('Chat saved to history');
    setTimeout(() => setNotification(''), 2000);
  };

  // Delete chat log
  const deleteChatLog = (logId) => {
    setChatLogs(prev => prev.filter(l => l.id !== logId));
  };

  // Clear current conversation
  const clearConversation = () => {
    if (confirm('Clear this conversation? (It will not be saved to history)')) {
      setConversations(prev => ({
        ...prev,
        [deptId]: []
      }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(30, 41, 59, 0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: activeDepartment?.color || '#3B82F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <MessageSquare size={20} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#E2E8F0' }}>
              {deptName}
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              {activeDepartment?.description || 'General conversation'}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* RAG indicator */}
          {ragInfo.active && (
            <div style={{
              padding: '4px 10px',
              background: ragInfo.cached ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              borderRadius: 12,
              fontSize: 11,
              color: ragInfo.cached ? '#A78BFA' : '#60A5FA',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <Database size={12} />
              RAG {ragInfo.cached ? '(Cached)' : 'Enhanced'}
            </div>
          )}
          
          {/* Custom instructions indicator */}
          {(systemInstructions || activeDepartment?.instructions) && (
            <div style={{
              padding: '4px 10px',
              background: 'rgba(249, 115, 22, 0.2)',
              borderRadius: 12,
              fontSize: 11,
              color: '#FB923C',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <FileText size={12} />
              Custom Instructions
            </div>
          )}
          
          {/* Department toggle */}
          <button
            onClick={() => setSearchAllDepts(!searchAllDepts)}
            style={{
              padding: '6px 12px',
              background: searchAllDepts ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${searchAllDepts ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8,
              color: searchAllDepts ? '#60A5FA' : '#94A3B8',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {searchAllDepts ? <Globe size={14} /> : <Building size={14} />}
            {searchAllDepts ? 'All Depts' : 'This Dept'}
          </button>
          
          {/* Message count */}
          {messages.length > 0 && (
            <div style={{
              fontSize: 11,
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <Clock size={12} />
              {messages.length} / {CONVERSATION_MEMORY_CONFIG.MAX_MESSAGES_PER_DEPT}
            </div>
          )}
          
          {/* New Chat button */}
          {messages.length > 0 && (
            <button
              onClick={startNewChat}
              style={{
                padding: '6px 12px',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 8,
                color: '#60A5FA',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus size={14} />
              New Chat
            </button>
          )}
          
          {/* Clear button */}
          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              style={{
                padding: '6px 12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 8,
                color: '#EF4444',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
        </div>
      </div>
      
      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {/* Session continuation indicator */}
        {isReturningSession && messages.length > 0 && (
          <div style={{
            textAlign: 'center',
            padding: '8px 16px',
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: 8,
            fontSize: 12,
            color: '#A78BFA',
            marginBottom: 8,
          }}>
            Continuing from previous session
          </div>
        )}
        
        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B',
            textAlign: 'center',
            gap: 16,
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sparkles size={40} color="#3B82F6" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#E2E8F0', marginBottom: 8 }}>
                Start a conversation
              </div>
              <div style={{ fontSize: 14, maxWidth: 400 }}>
                Ask about {deptName.toLowerCase()}, company knowledge, issues, or anything else.
                {searchAllDepts && (
                  <span style={{ display: 'block', marginTop: 8, color: '#60A5FA' }}>
                    🌐 Searching across all departments
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '70%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' 
                ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                : 'rgba(30, 41, 59, 0.8)',
              color: '#E2E8F0',
              fontSize: 14,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
              <div style={{
                fontSize: 10,
                color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : '#64748B',
                marginTop: 6,
                textAlign: msg.role === 'user' ? 'right' : 'left',
              }}>
                {msg.timestamp ? formatTimestamp(msg.timestamp) : ''}
              </div>
            </div>
          </div>
        ))}
        
        {/* Thinking indicator */}
        {isThinking && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '16px 16px 16px 4px',
              background: 'rgba(30, 41, 59, 0.8)',
              color: '#94A3B8',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Loader2 size={16} className="spin" />
              Empire AI is thinking...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <form onSubmit={sendMessage} style={{
        padding: '16px 24px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(30, 41, 59, 0.5)',
      }}>
        <div style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${deptName.toLowerCase()}...`}
            disabled={isThinking}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: '#E2E8F0',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={handleSendClick}
            disabled={!input.trim() || isThinking}
            style={{
              padding: '12px 20px',
              background: input.trim() && !isThinking 
                ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                : 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: 12,
              color: input.trim() && !isThinking ? 'white' : '#64748B',
              cursor: input.trim() && !isThinking ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {isThinking ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          </button>
        </div>
      </form>
      
      {/* Chat History Panel */}
      {deptChatLogs.length > 0 && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(15, 23, 42, 0.5)',
        }}>
          {/* Header */}
          <button
            onClick={() => setShowChatLogs(!showChatLogs)}
            style={{
              width: '100%',
              padding: '12px 24px',
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: '#94A3B8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Chat History</span>
              <span style={{
                padding: '2px 8px',
                background: 'rgba(139, 92, 246, 0.2)',
                borderRadius: 10,
                fontSize: 11,
                color: '#A78BFA',
              }}>
                {deptChatLogs.length}
              </span>
            </div>
            {showChatLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {/* Logs list */}
          {showChatLogs && (
            <div style={{
              maxHeight: 300,
              overflowY: 'auto',
              padding: '0 24px 16px',
            }}>
              {deptChatLogs.map(log => (
                <div
                  key={log.id}
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  style={{
                    padding: 12,
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: 8,
                    marginBottom: 8,
                    cursor: 'pointer',
                    border: expandedLog === log.id 
                      ? '1px solid rgba(139, 92, 246, 0.3)'
                      : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {/* Log header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <User size={12} color="#60A5FA" />
                        <span style={{ fontSize: 12, color: '#60A5FA', fontWeight: 500 }}>
                          {log.savedBy}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748B' }}>•</span>
                        <span style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          background: 'rgba(139, 92, 246, 0.2)',
                          borderRadius: 4,
                          color: '#A78BFA',
                        }}>
                          {log.departmentName?.split(' ')[0] || 'General'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#E2E8F0', marginBottom: 6 }}>
                        {log.summary}
                      </div>
                      {log.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {log.tags.map(tag => (
                            <span key={tag} style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              background: 'rgba(59, 130, 246, 0.1)',
                              borderRadius: 4,
                              color: '#60A5FA',
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#64748B' }}>
                        {formatDate(log.savedAt)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this chat from history?')) {
                            deleteChatLog(log.id);
                          }
                        }}
                        style={{
                          padding: 4,
                          background: 'transparent',
                          border: 'none',
                          color: '#64748B',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded view */}
                  {expandedLog === log.id && (
                    <div style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      {log.messages?.map((msg, i) => (
                        <div key={i} style={{
                          padding: '8px 12px',
                          marginBottom: 8,
                          borderRadius: 8,
                          background: msg.role === 'user' 
                            ? 'rgba(59, 130, 246, 0.1)'
                            : 'rgba(255,255,255,0.03)',
                          borderLeft: `3px solid ${msg.role === 'user' ? '#3B82F6' : '#64748B'}`,
                        }}>
                          <div style={{ 
                            fontSize: 10, 
                            color: msg.role === 'user' ? '#60A5FA' : '#94A3B8',
                            marginBottom: 4,
                          }}>
                            {msg.role === 'user' ? 'You' : 'Empire AI'}
                          </div>
                          <div style={{ 
                            fontSize: 12, 
                            color: '#E2E8F0',
                            lineHeight: 1.5,
                          }}>
                            {msg.content.length > 300 
                              ? msg.content.substring(0, 300) + '...' 
                              : msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
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
