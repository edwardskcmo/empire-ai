// Empire AI - Chat Interface
// Department-specific AI conversations with RAG-enhanced context

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Loader2, Sparkles, AlertCircle, CheckCircle2,
  Globe, Building
} from 'lucide-react';
import { 
  formatTimestamp, queryIntelligence, getSourceLabel, 
  semanticSearch, renderDeptIcon 
} from '../utils';

export default function Chat({
  activeDepartment,
  conversations,
  setConversations,
  systemInstructions,
  intelligenceIndex,
  knowledge,
  connectedDocs,
  issues,
  setIssues,
  departments,
  logActivity,
  addToIntelligence,
}) {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [notification, setNotification] = useState(null);
  const [searchAllDepts, setSearchAllDepts] = useState(false); // Item 5: Toggle state
  const [ragStatus, setRagStatus] = useState({ active: false, source: 'none' }); // Track embedding source
  const messagesEndRef = useRef(null);
  
  const deptId = activeDepartment?.id || 'general';
  const messages = conversations[deptId] || [];
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);
  
  // Build knowledge context including issues and connected docs
  const buildKnowledgeContext = async (query) => {
    let context = '';
    
    // Try semantic search first (with caching - Item 4)
    try {
      const semanticResults = await semanticSearch(
        intelligenceIndex, 
        query, 
        searchAllDepts ? null : activeDepartment?.name, // Item 5: Pass null to search all
        {
          searchAllDepartments: searchAllDepts,
          maxResults: 10,
          useEmbeddings: true,
        }
      );
      
      if (semanticResults.length > 0) {
        // Track RAG status for UI badge
        setRagStatus({ 
          active: true, 
          source: semanticResults[0].embeddingSource || 'keyword'
        });
        
        context += '\n=== RELEVANT COMPANY KNOWLEDGE ===\n';
        semanticResults.forEach((item, i) => {
          const label = getSourceLabel(item.sourceType);
          context += `${i + 1}. [${label}] ${item.title}: ${item.content?.substring(0, 300)}...\n`;
        });
      } else {
        setRagStatus({ active: false, source: 'none' });
      }
    } catch (error) {
      console.log('Semantic search failed, using keyword search:', error);
      // Fall back to keyword search
      const keywordResults = queryIntelligence(
        intelligenceIndex, 
        query, 
        searchAllDepts ? null : activeDepartment?.name
      );
      
      if (keywordResults.length > 0) {
        setRagStatus({ active: true, source: 'keyword' });
        context += '\n=== RELEVANT COMPANY KNOWLEDGE ===\n';
        keywordResults.forEach((item, i) => {
          const label = getSourceLabel(item.sourceType);
          context += `${i + 1}. [${label}] ${item.title}: ${item.content?.substring(0, 300)}...\n`;
        });
      }
    }
    
    // Add connected Google Docs/Sheets data
    if (connectedDocs && connectedDocs.length > 0) {
      const syncedDocs = connectedDocs.filter(d => d.status === 'synced' && d.content);
      if (syncedDocs.length > 0) {
        context += '\n=== CONNECTED DOCUMENTS ===\n';
        syncedDocs.forEach(doc => {
          context += `\n--- ${doc.name} (${doc.department}) ---\n`;
          context += doc.content?.substring(0, 50000) + '\n';
        });
      }
    }
    
    // Add issues data
    if (issues && issues.length > 0) {
      const activeIssues = issues.filter(i => !i.archived);
      const resolvedIssues = issues.filter(i => i.archived || i.status === 'Resolved');
      
      if (activeIssues.length > 0) {
        context += '\n=== ISSUES BOARD (Active Issues) ===\n';
        activeIssues.slice(0, 20).forEach((issue, i) => {
          context += `${i + 1}. [${issue.status}] [${issue.priority}] ${issue.title} (Dept: ${issue.department}) - Assigned to: ${issue.assignee || 'Unassigned'}\n`;
          if (issue.description) context += `   Description: ${issue.description}\n`;
          context += `   Created: ${new Date(issue.createdAt).toLocaleDateString()}\n`;
        });
      }
      
      if (resolvedIssues.length > 0) {
        context += '\n=== RESOLVED/ARCHIVED ISSUES ===\n';
        resolvedIssues.slice(0, 10).forEach((issue, i) => {
          context += `${i + 1}. ${issue.title} - ${issue.status}\n`;
          if (issue.resolutionNotes) context += `   Resolution: ${issue.resolutionNotes}\n`;
        });
      }
    }
    
    return context;
  };
  
  // Parse AI response for issue creation markers
  const parseIssueFromResponse = (response) => {
    const match = response.match(/\[ISSUE_CREATED\](.*?)\[\/ISSUE_CREATED\]/s);
    if (!match) return null;
    
    const parts = match[1].split('|').map(p => p.trim());
    if (parts.length < 2) return null;
    
    return {
      title: parts[0],
      priority: parts[1] || 'Medium',
      department: parts[2] || activeDepartment?.name || 'General',
      description: parts[3] || '',
    };
  };
  
  // Create issue from parsed data
  const createIssue = (issueData) => {
    const matchedDept = departments.find(d => 
      d.name.toLowerCase().includes(issueData.department.toLowerCase()) ||
      issueData.department.toLowerCase().includes(d.name.toLowerCase())
    );
    
    const newIssue = {
      id: `issue_${Date.now()}`,
      title: issueData.title,
      description: issueData.description,
      department: matchedDept?.name || activeDepartment?.name || 'General',
      priority: ['High', 'Medium', 'Low'].includes(issueData.priority) ? issueData.priority : 'Medium',
      status: 'Open',
      assignee: '',
      createdAt: new Date().toISOString(),
      archived: false,
    };
    
    setIssues(prev => [...prev, newIssue]);
    logActivity(`Created issue via chat: ${newIssue.title}`, 'issue', newIssue.department);
    
    // Add to intelligence
    addToIntelligence(
      'issue_created',
      newIssue.id,
      newIssue.title,
      `${newIssue.description} | Priority: ${newIssue.priority} | Department: ${newIssue.department}`,
      newIssue.department,
      ['issue', 'open', newIssue.priority.toLowerCase()],
      { priority: newIssue.priority },
      newIssue.priority === 'High' ? 3 : newIssue.priority === 'Medium' ? 2 : 1
    );
    
    setNotification({ type: 'success', message: `Issue created: ${newIssue.title}` });
    setTimeout(() => setNotification(null), 3000);
  };
  
  // Clean response for display (remove markers)
  const cleanResponseForDisplay = (response) => {
    return response.replace(/\[ISSUE_CREATED\].*?\[\/ISSUE_CREATED\]/gs, '').trim();
  };
  
  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Add user message to conversation
    const newMessages = [...messages, { role: 'user', content: userMessage, timestamp: new Date().toISOString() }];
    setConversations(prev => ({ ...prev, [deptId]: newMessages }));
    
    setIsThinking(true);
    
    try {
      // Build context with semantic search (uses cache - Item 4)
      const knowledgeContext = await buildKnowledgeContext(userMessage);
      
      // Build system prompt
      let systemPrompt = `You are Empire AI, the operational intelligence assistant for Empire Remodeling.

Current Department: ${activeDepartment?.name || 'General'}
Department Focus: ${activeDepartment?.description || 'General assistance'}
${searchAllDepts ? '\n[CROSS-DEPARTMENT SEARCH ENABLED - Drawing from all departments]\n' : ''}
${knowledgeContext}

CRITICAL: You have access to the company's knowledge base, connected Google Sheets/Docs, and issues board. USE THIS DATA to answer questions accurately.

When asked about projects, budgets, schedules, or any company data - reference the specific information provided above.

ISSUE CREATION: If the user asks you to create, log, add, or report an issue, include this marker in your response:
[ISSUE_CREATED] Issue Title | Priority | Department | Description [/ISSUE_CREATED]
Example: [ISSUE_CREATED] Permit delay - Johnson | High | Production & Project Management | Waiting on city approval [/ISSUE_CREATED]

Be helpful, specific, and reference actual company data when available.`;

      // Add custom instructions
      if (systemInstructions?.trim()) {
        systemPrompt += `\n\n=== SYSTEM-WIDE INSTRUCTIONS ===\n${systemInstructions}`;
      }
      if (activeDepartment?.instructions?.trim()) {
        systemPrompt += `\n\n=== ${activeDepartment.name} DEPARTMENT INSTRUCTIONS ===\n${activeDepartment.instructions}`;
      }
      
      // Prepare conversation history (last 10 messages)
      const history = newMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));
      
      // Call API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          systemPrompt,
          conversationHistory: history,
        }),
      });
      
      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      let aiResponse = data.response;
      
      // Check for issue creation
      const issueData = parseIssueFromResponse(aiResponse);
      if (issueData) {
        createIssue(issueData);
        aiResponse = cleanResponseForDisplay(aiResponse);
      }
      
      // Add AI response
      const updatedMessages = [...newMessages, { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }];
      setConversations(prev => ({ ...prev, [deptId]: updatedMessages }));
      
      // Log to activity and intelligence
      logActivity(`Chat in ${activeDepartment?.name || 'General'}`, 'chat', activeDepartment?.name);
      
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = "I'm having trouble connecting. Please try again.";
      const updatedMessages = [...newMessages, { role: 'assistant', content: errorMessage, timestamp: new Date().toISOString() }];
      setConversations(prev => ({ ...prev, [deptId]: updatedMessages }));
    } finally {
      setIsThinking(false);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header with Department Toggle - Item 5 */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: activeDepartment?.color || '#3B82F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {renderDeptIcon(activeDepartment?.icon, 20, 'text-white')}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#E2E8F0' }}>
              {activeDepartment?.name || 'General Chat'}
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              {activeDepartment?.description || 'Ask anything'}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Item 5: Search All Departments Toggle */}
          <button
            onClick={() => setSearchAllDepts(!searchAllDepts)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid',
              borderColor: searchAllDepts ? '#3B82F6' : 'rgba(255,255,255,0.1)',
              background: searchAllDepts ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
              color: searchAllDepts ? '#60A5FA' : '#94A3B8',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title={searchAllDepts ? 'Searching all departments' : 'Searching current department only'}
          >
            {searchAllDepts ? <Globe size={14} /> : <Building size={14} />}
            {searchAllDepts ? 'All Depts' : 'This Dept'}
          </button>
          
          {/* RAG Status Badge */}
          {ragStatus.active && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: 4,
              background: ragStatus.source === 'cache' ? 'rgba(16,185,129,0.2)' : 'rgba(139,92,246,0.2)',
              color: ragStatus.source === 'cache' ? '#10B981' : '#A78BFA',
              fontSize: 11,
            }}>
              <Sparkles size={12} />
              {ragStatus.source === 'cache' ? 'RAG (Cached)' : ragStatus.source === 'api' ? 'RAG Enhanced' : 'RAG Active'}
            </div>
          )}
          
          {/* Custom Instructions Badge */}
          {(systemInstructions?.trim() || activeDepartment?.instructions?.trim()) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: 4,
              background: 'rgba(249,115,22,0.2)',
              color: '#FB923C',
              fontSize: 11,
            }}>
              <Sparkles size={12} />
              Custom Instructions
            </div>
          )}
        </div>
      </div>
      
      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'absolute',
          top: 80,
          right: 20,
          padding: '12px 16px',
          borderRadius: 8,
          background: notification.type === 'success' ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: 14,
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {notification.message}
        </div>
      )}
      
      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#64748B',
            padding: '60px 20px',
          }}>
            <Sparkles size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            <div style={{ fontSize: 18, marginBottom: 8 }}>Start a conversation</div>
            <div style={{ fontSize: 14 }}>
              Ask about {activeDepartment?.name || 'anything'} or request help with tasks
            </div>
            {searchAllDepts && (
              <div style={{ fontSize: 12, marginTop: 12, color: '#60A5FA' }}>
                <Globe size={14} style={{ display: 'inline', marginRight: 4 }} />
                Cross-department search enabled
              </div>
            )}
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '75%',
              padding: '12px 16px',
              borderRadius: 12,
              background: msg.role === 'user' 
                ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                : 'rgba(30, 41, 59, 0.8)',
              color: '#E2E8F0',
            }}>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{msg.content}</div>
              <div style={{
                fontSize: 10,
                color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : '#64748B',
                marginTop: 8,
                textAlign: 'right',
              }}>
                {formatTimestamp(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}
        
        {isThinking && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(30, 41, 59, 0.8)',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              Empire AI is thinking...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end',
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${activeDepartment?.name || 'Empire AI'}...`}
            disabled={isThinking}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#E2E8F0',
              fontSize: 14,
              resize: 'none',
              minHeight: 48,
              maxHeight: 120,
              outline: 'none',
              fontFamily: 'inherit',
            }}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isThinking}
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: input.trim() && !isThinking 
                ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                : 'rgba(255,255,255,0.1)',
              color: input.trim() && !isThinking ? 'white' : '#64748B',
              cursor: input.trim() && !isThinking ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
      
      {/* Animation styles */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
