// Empire AI - Chat Interface
// Version 3.1 - With Department Chat Logs

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
  chatLogs,
  setChatLogs,
}) {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [searchAllDepts, setSearchAllDepts] = useState(false);
  const [ragStatus, setRagStatus] = useState(null);
  const [topScore, setTopScore] = useState(0);
  const [showMemoryIndicator, setShowMemoryIndicator] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showChatLogs, setShowChatLogs] = useState(true);
  const [expandedLog, setExpandedLog] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const deptId = activeDepartment?.id || 'general';
  const messages = conversations[deptId] || [];
  const deptInstructions = activeDepartment?.instructions || '';
  
  // Get chat logs for current department
  const departmentChatLogs = (chatLogs || []).filter(log => log.departmentId === deptId);

  // Check if this is a returning session
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const lastMessageTime = new Date(lastMessage.timestamp);
      const hoursSince = (Date.now() - lastMessageTime.getTime()) / (1000 * 60 * 60);
      
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

  // Generate chat summary from messages
  const generateChatSummary = (msgs) => {
    if (!msgs || msgs.length === 0) return 'Empty conversation';
    
    // Get first user message as primary topic
    const firstUserMsg = msgs.find(m => m.role === 'user');
    if (!firstUserMsg) return 'Conversation';
    
    // Truncate to reasonable length
    const summary = firstUserMsg.content.substring(0, 80);
    return summary.length < firstUserMsg.content.length ? summary + '...' : summary;
  };

  // Extract tags from conversation
  const extractConversationTags = (msgs) => {
    const tags = [];
    const content = msgs.map(m => m.content).join(' ').toLowerCase();
    
    // Common business tags
    const tagPatterns = [
      'budget', 'schedule', 'permit', 'client', 'project', 'issue',
      'deadline', 'material', 'subcontractor', 'payment', 'safety',
      'estimate', 'proposal', 'contract', 'inspection', 'delay'
    ];
    
    tagPatterns.forEach(tag => {
      if (content.includes(tag)) tags.push(tag);
    });
    
    return tags.slice(0, 3); // Max 3 tags
  };

  // Save current conversation to logs and start new chat
  const startNewChat = () => {
    if (messages.length < 2) {
      // Not enough for a meaningful log, just clear
      clearConversationHistory(deptId);
      return;
    }
    
    // Create chat log entry
    const newLog = {
      id: `chatlog_${Date.now()}`,
      departmentId: deptId,
      departmentName: activeDepartment?.name || 'General',
      departmentColor: activeDepartment?.color || '#3B82F6',
      summary: generateChatSummary(messages),
      tags: extractConversationTags(messages),
      messageCount: messages.length,
      messages: messages, // Store full conversation for expansion
      user: 'You',
      createdAt: messages[0]?.timestamp || new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    
    // Add to chat logs
    setChatLogs(prev => [newLog, ...(prev || [])].slice(0, 50)); // Keep last 50 logs total
    
    // Log activity
    logActivity(`Completed chat: ${newLog.summary.substring(0, 40)}...`, 'chat', activeDepartment?.name);
    
    // Clear current conversation
    clearConversationHistory(deptId);
    
    // Show notification
    setNotification('Chat saved to history');
    setTimeout(() => setNotification(null), 3000);
  };

  // Build knowledge context with full data access
  const buildKnowledgeContext = async (query) => {
    let context = '';
    let cacheHit = false;
    let maxScore = 0;
    
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
      
      trackSearch(cacheHit);
      
    } catch (e) {
      console.log('Embedding unavailable, using keyword search');
      setRagStatus(null);
    }
    
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
    
    const syncedDocs = connectedDocs.filter(d => d.status === 'synced' && d.content);
    if (syncedDocs.length > 0) {
      context += '\n\n=== CONNECTED SPREADSHEETS & DOCUMENTS ===\n';
      syncedDocs.forEach(doc => {
        context += `\n--- ${doc.name} (${doc.department}) ---\n`;
        context += doc.content?.substring(0, 50000) + '\n';
      });
    }

    const activeIssues = issues.filter(i => !i.archived && i.status !== 'Resolved');
    if (activeIssues.length > 0) {
      context += '\n\n=== ISSUES BOARD (Active Issues) ===\n';
      activeIssues.slice(0, 15).forEach((issue, i) => {
        context += `${i + 1}. [${issue.status}] [${issue.priority}] ${issue.title} (Dept: ${issue.department})`;
        if (issue.assignee) context += ` - Assigned to: ${issue.assignee}`;
        context += `\n   Description: ${issue.description || 'No description'}\n`;
      });
    }
    
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

  const cleanResponseForDisplay = (response) => {
    return response.replace(/\[ISSUE_CREATED\][\s\S]*?\[\/ISSUE_CREATED\]/gi, '').trim();
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;
    
    const userMessage = input.trim();
    setInput('');
    
    const newMessages = [...messages, { 
      role: 'user', 
      content: userMessage, 
      timestamp: new Date().toISOString() 
    }];
    setConversations(prev => ({ ...prev, [deptId]: newMessages }));
    
    setIsThinking(true);
    setRagStatus(null);
    
    try {
      const { context, maxScore } = await buildKnowledgeContext(userMessage);
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
      
      const issueData = parseIssueFromResponse(aiContent);
      if (issueData) {
        await createIssue(issueData);
        aiContent = cleanResponseForDisplay(aiContent);
      }
      
      if (maxScore < KNOWLEDGE_GAPS_CONFIG.LOW_RELEVANCE_THRESHOLD && userMessage.length >= KNOWLEDGE_GAPS_CONFIG.MIN_QUERY_LENGTH) {
        recordKnowledgeGap(userMessage, maxScore, activeDepartment?.name || 'General');
      }

      const finalMessages = [...newMessages, { 
        role: 'assistant', 
        content: aiContent, 
        timestamp: new Date().toISOString(),
        ragStatus: ragStatus,
        topScore: maxScore,
      }];
      
      const trimmedMessages = trimConversationHistory(finalMessages);
      setConversations(prev => ({ ...prev, [deptId]: trimmedMessages }));
      
      trackChatMessage(activeDepartment?.name || 'General');
      
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

  // Delete a chat log
  const deleteChatLog = (logId) => {
    setChatLogs(prev => (prev || []).filter(log => log.id !== logId));
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
          
          {/* Department Toggle */}
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
          
          {/* New Chat Button */}
          {messages.length > 0 && (
            <button
              onClick={startNewChat}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 20,
                color: '#10B981',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
              }}
              title="Save current chat and start new"
            >
              <Plus size={14} />
              New Chat
            </button>
          )}
          
          {/* Clear History Button */}
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear conversation without saving?')) {
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
              title="Clear without saving"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      
      {/* Conversation Memory Indicator */}
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
        minHeight: 200,
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
        
        {/* Message Count Indicator */}
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
      
      {/* Chat History Section */}
      {departmentChatLogs.length > 0 && (
        <div style={{
          marginTop: 16,
          background: 'rgba(30, 41, 59, 0.5)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <button
            onClick={() => setShowChatLogs(!showChatLogs)}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: 'none',
              borderBottom: showChatLogs ? '1px solid rgba(255,255,255,0.06)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={18} style={{ color: '#8B5CF6' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0' }}>
                Recent Chats
              </span>
              <span style={{
                padding: '2px 8px',
                background: 'rgba(139, 92, 246, 0.2)',
                borderRadius: 10,
                fontSize: 12,
                color: '#8B5CF6',
              }}>
                {departmentChatLogs.length}
              </span>
            </div>
            {showChatLogs ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
          </button>
          
          {/* Chat Logs List */}
          {showChatLogs && (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {departmentChatLogs.map((log) => (
                <div key={log.id}>
                  {/* Log Entry */}
                  <div
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Top Row: User, Department, Time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 4,
                        color: '#3B82F6', 
                        fontSize: 13, 
                        fontWeight: 500 
                      }}>
                        <User size={14} />
                        {log.user}
                      </span>
                      <span style={{ color: '#64748B', fontSize: 12 }}>•</span>
                      <span style={{
                        padding: '2px 8px',
                        background: `${log.departmentColor}20`,
                        border: `1px solid ${log.departmentColor}40`,
                        borderRadius: 6,
                        fontSize: 11,
                        color: log.departmentColor,
                        fontWeight: 500,
                      }}>
                        {log.departmentName?.split(' ')[0] || 'General'}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748B' }}>
                        {formatDate(log.completedAt)}
                      </span>
                    </div>
                    
                    {/* Summary */}
                    <div style={{ 
                      fontSize: 13, 
                      color: '#E2E8F0', 
                      marginBottom: 8,
                      lineHeight: 1.4,
                    }}>
                      {log.summary}
                    </div>
                    
                    {/* Tags & Message Count */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {log.tags?.map((tag, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '2px 8px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            borderRadius: 6,
                            fontSize: 10,
                            color: '#A78BFA',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      <span style={{ 
                        marginLeft: 'auto', 
                        fontSize: 11, 
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        <MessageSquare size={12} />
                        {log.messageCount} messages
                        {expandedLog === log.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </span>
                    </div>
                  </div>
                  
                  {/* Expanded Messages */}
                  {expandedLog === log.id && (
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      padding: '12px 20px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {log.messages?.map((msg, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              marginBottom: 8,
                              borderRadius: 8,
                              background: msg.role === 'user' 
                                ? 'rgba(59, 130, 246, 0.1)' 
                                : 'rgba(255,255,255,0.03)',
                              borderLeft: `3px solid ${msg.role === 'user' ? '#3B82F6' : '#64748B'}`,
                            }}
                          >
                            <div style={{ 
                              fontSize: 10, 
                              color: msg.role === 'user' ? '#3B82F6' : '#8B5CF6',
                              marginBottom: 4,
                              fontWeight: 500,
                            }}>
                              {msg.role === 'user' ? 'You' : 'Empire AI'}
                            </div>
                            <div style={{ 
                              fontSize: 12, 
                              color: '#CBD5E1',
                              lineHeight: 1.4,
                            }}>
                              {msg.content.substring(0, 200)}{msg.content.length > 200 ? '...' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this chat from history?')) {
                            deleteChatLog(log.id);
                          }
                        }}
                        style={{
                          marginTop: 8,
                          padding: '6px 12px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: 6,
                          color: '#EF4444',
                          fontSize: 11,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Trash2 size={12} />
                        Delete from history
                      </button>
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
