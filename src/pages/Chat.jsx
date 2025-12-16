import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Brain, FileText, CheckCircle } from 'lucide-react';
import { formatDate, formatTimestamp, generateId, getSourceLabel } from '../utils';

function Chat({
  activeDepartment,
  departments,
  knowledge,
  connectedDocs,
  issues,
  setIssues,
  intelligenceIndex,
  queryIntelligence, // Now returns a Promise (async)
  systemInstructions,
  logActivity,
  addToIntelligence,
  conversations,
  setConversations,
  generateEmbedding, // NEW: For semantic search
}) {
  const [message, setMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [issueCreatedNotification, setIssueCreatedNotification] = useState(null);
  const messagesEndRef = useRef(null);
  
  const deptId = activeDepartment?.id || 'general';
  const deptMessages = conversations[deptId] || [];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [deptMessages, isThinking]);

  // Build knowledge context for AI (now async for semantic search)
  const buildKnowledgeContext = async (query) => {
    let context = '';
    
    // 1. Query intelligence with semantic search
    const relevantItems = await queryIntelligence(query, activeDepartment?.id);
    if (relevantItems && relevantItems.length > 0) {
      context += '=== RELEVANT COMPANY KNOWLEDGE ===\n';
      relevantItems.slice(0, 5).forEach((item, i) => {
        const label = getSourceLabel(item.sourceType);
        context += `${i + 1}. [${label}] ${item.title}: ${item.content?.substring(0, 500)}...\n`;
      });
      context += '\n';
    }
    
    // 2. Include connected Google Docs/Sheets (full content)
    const syncedDocs = connectedDocs?.filter(d => d.status === 'synced' && d.content) || [];
    if (syncedDocs.length > 0) {
      context += '=== CONNECTED GOOGLE DOCS/SHEETS ===\n';
      syncedDocs.forEach(doc => {
        context += `--- ${doc.name} (${doc.department}) ---\n`;
        context += doc.content?.substring(0, 50000) + '\n\n';
      });
    }
    
    // 3. Include active issues
    const activeIssues = issues?.filter(i => !i.archived) || [];
    if (activeIssues.length > 0) {
      context += '=== ISSUES BOARD (Active Issues) ===\n';
      activeIssues.forEach((issue, i) => {
        context += `${i + 1}. [${issue.status}] [${issue.priority}] ${issue.title} (Dept: ${issue.department}) - Assigned to: ${issue.assignee || 'Unassigned'}\n`;
        if (issue.description) context += `   Description: ${issue.description}\n`;
        context += `   Created: ${formatDate(issue.createdAt)}\n`;
      });
      context += '\n';
    }
    
    // 4. Include resolved issues
    const resolvedIssues = issues?.filter(i => i.archived || i.status === 'Resolved') || [];
    if (resolvedIssues.length > 0) {
      context += '=== RESOLVED/ARCHIVED ISSUES ===\n';
      resolvedIssues.slice(0, 10).forEach((issue, i) => {
        context += `${i + 1}. ${issue.title} - ${issue.status}\n`;
        if (issue.resolutionNotes) context += `   Resolution: ${issue.resolutionNotes}\n`;
      });
      context += '\n';
    }
    
    return context;
  };

  // Parse issue creation from AI response
  const parseIssueFromResponse = (response) => {
    const match = response.match(/\[ISSUE_CREATED\](.*?)\[\/ISSUE_CREATED\]/s);
    if (!match) return null;
    
    const parts = match[1].trim().split('|').map(p => p.trim());
    if (parts.length < 1) return null;
    
    return {
      title: parts[0] || 'New Issue',
      priority: parts[1] || 'Medium',
      department: parts[2] || activeDepartment?.name || 'General',
      description: parts[3] || '',
    };
  };

  // Create issue from parsed data
  const createIssue = async (issueData) => {
    const newIssue = {
      id: generateId('issue'),
      title: issueData.title,
      description: issueData.description,
      department: issueData.department,
      priority: issueData.priority,
      status: 'Open',
      assignee: '',
      createdAt: new Date().toISOString(),
      archived: false,
    };
    
    setIssues(prev => [newIssue, ...prev]);
    
    // Log to intelligence
    await addToIntelligence(
      'issue_created',
      newIssue.id,
      newIssue.title,
      `${newIssue.description} | Priority: ${newIssue.priority} | Department: ${newIssue.department}`,
      newIssue.department,
      null,
      { priority: newIssue.priority },
      newIssue.priority === 'High' ? 3 : newIssue.priority === 'Medium' ? 2 : 1
    );
    
    logActivity(`Created issue: ${newIssue.title}`, 'issue', newIssue.department);
    
    // Show notification
    setIssueCreatedNotification(newIssue.title);
    setTimeout(() => setIssueCreatedNotification(null), 4000);
    
    return newIssue;
  };

  // Clean response for display (remove markers)
  const cleanResponseForDisplay = (response) => {
    return response.replace(/\[ISSUE_CREATED\].*?\[\/ISSUE_CREATED\]/gs, '').trim();
  };

  // Send message
  const sendMessage = async () => {
    if (!message.trim() || isThinking) return;
    
    const userMessage = message.trim();
    setMessage('');
    
    // Add user message to conversation
    const newUserMsg = {
      id: generateId('msg'),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    
    setConversations(prev => ({
      ...prev,
      [deptId]: [...(prev[deptId] || []), newUserMsg],
    }));
    
    setIsThinking(true);
    
    try {
      // Build context with semantic search
      const knowledgeContext = await buildKnowledgeContext(userMessage);
      
      // Build system prompt
      let systemPrompt = `You are Empire AI, the operational intelligence assistant for Empire Remodeling.
      
Current Department: ${activeDepartment?.name || 'General'}
Department Focus: ${activeDepartment?.description || 'Cross-functional support'}

${knowledgeContext}

${systemInstructions ? `\n=== SYSTEM-WIDE INSTRUCTIONS ===\n${systemInstructions}` : ''}
${activeDepartment?.instructions ? `\n=== ${activeDepartment.name} DEPARTMENT INSTRUCTIONS ===\n${activeDepartment.instructions}` : ''}

ISSUE CREATION:
If the user asks you to create, log, add, or report an issue, include this marker in your response:
[ISSUE_CREATED] Title | Priority | Department | Description [/ISSUE_CREATED]
Example: [ISSUE_CREATED] Permit delay - Johnson | High | Production | Waiting on city approval [/ISSUE_CREATED]

Be helpful, specific, and reference the company knowledge when relevant.`;

      // Get recent conversation history
      const recentHistory = deptMessages.slice(-10).map(m => ({
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
          conversationHistory: recentHistory,
        }),
      });
      
      let aiResponse;
      if (response.ok) {
        const data = await response.json();
        aiResponse = data.response;
      } else {
        aiResponse = "I'm having trouble connecting right now. Please try again.";
      }
      
      // Check for issue creation
      const issueData = parseIssueFromResponse(aiResponse);
      if (issueData) {
        await createIssue(issueData);
      }
      
      // Clean and add AI response
      const cleanedResponse = cleanResponseForDisplay(aiResponse);
      const newAiMsg = {
        id: generateId('msg'),
        role: 'assistant',
        content: cleanedResponse,
        timestamp: new Date().toISOString(),
      };
      
      setConversations(prev => ({
        ...prev,
        [deptId]: [...(prev[deptId] || []), newAiMsg],
      }));
      
      // Log to intelligence (with embedding)
      await addToIntelligence(
        'chat_query',
        newAiMsg.id,
        `Q: ${userMessage.substring(0, 100)}`,
        `User asked: ${userMessage}\n\nAI responded: ${cleanedResponse.substring(0, 500)}`,
        activeDepartment?.id || 'general',
        null,
        { query: userMessage },
        1
      );
      
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = {
        id: generateId('msg'),
        role: 'assistant',
        content: "I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setConversations(prev => ({
        ...prev,
        [deptId]: [...(prev[deptId] || []), errorMsg],
      }));
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

  const hasCustomInstructions = systemInstructions || activeDepartment?.instructions;

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'transparent',
    }}>
      {/* Issue Created Notification */}
      {issueCreatedNotification && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          backgroundColor: 'rgba(16, 185, 129, 0.95)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <CheckCircle size={18} />
          Issue created: {issueCreatedNotification}
        </div>
      )}

      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        {activeDepartment && (
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: activeDepartment.color + '20',
            color: activeDepartment.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sparkles size={20} />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <h2 style={{ color: '#E2E8F0', fontSize: 18, fontWeight: 600, margin: 0 }}>
            {activeDepartment?.name || 'General Chat'}
          </h2>
          <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
            {activeDepartment?.description || 'Chat with Empire AI'}
          </p>
        </div>
        {hasCustomInstructions && (
          <div style={{
            backgroundColor: 'rgba(249, 115, 22, 0.15)',
            color: '#F97316',
            padding: '4px 10px',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <FileText size={12} />
            Custom Instructions Active
          </div>
        )}
        <div style={{
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          color: '#A78BFA',
          padding: '4px 10px',
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <Brain size={12} />
          RAG Enhanced
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
      }}>
        {deptMessages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#64748B',
            marginTop: 60,
          }}>
            <Sparkles size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <p style={{ fontSize: 16 }}>Start a conversation with Empire AI</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>
              Ask questions, get insights, or create issues
            </p>
          </div>
        )}
        
        {deptMessages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 16,
            }}
          >
            <div style={{
              maxWidth: '70%',
              padding: '12px 16px',
              borderRadius: 12,
              backgroundColor: msg.role === 'user' 
                ? 'rgba(59, 130, 246, 0.2)' 
                : 'rgba(30, 41, 59, 0.8)',
              color: '#E2E8F0',
            }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {msg.content}
              </p>
              <span style={{
                fontSize: 10,
                color: '#64748B',
                marginTop: 6,
                display: 'block',
              }}>
                {formatTimestamp(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}
        
        {isThinking && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: 16,
          }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: 12,
              backgroundColor: 'rgba(30, 41, 59, 0.8)',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>Empire AI is thinking</span>
              <span className="thinking-dots" style={{ display: 'flex', gap: 4 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  backgroundColor: '#3B82F6',
                }}>.</span>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  backgroundColor: '#3B82F6',
                }}>.</span>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  backgroundColor: '#3B82F6',
                }}>.</span>
              </span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
        }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${activeDepartment?.name || 'Empire AI'}...`}
            disabled={isThinking}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
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
            disabled={!message.trim() || isThinking}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              border: 'none',
              backgroundColor: message.trim() && !isThinking ? '#3B82F6' : 'rgba(59, 130, 246, 0.3)',
              color: 'white',
              cursor: message.trim() && !isThinking ? 'pointer' : 'not-allowed',
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
    </div>
  );
}

export default Chat;
