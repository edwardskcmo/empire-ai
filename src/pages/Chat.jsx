// Empire AI - Chat Interface
// Version 3.6 - Maximum Error Protection

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Loader2, Sparkles, Building, Globe, Trash2, 
  MessageSquare, Clock, FileText, Database, Plus,
  ChevronDown, ChevronUp, User, Calendar
} from 'lucide-react';

// Safe utility imports with fallbacks
let formatTimestamp, formatDate, getCachedEmbedding, setCachedEmbedding,
    trimConversationHistory, getConversationSummary, generateId,
    CONVERSATION_MEMORY_CONFIG, KNOWLEDGE_GAPS_CONFIG, CHAT_LOGS_CONFIG;

try {
  const utils = require('../utils');
  formatTimestamp = utils.formatTimestamp;
  formatDate = utils.formatDate;
  getCachedEmbedding = utils.getCachedEmbedding;
  setCachedEmbedding = utils.setCachedEmbedding;
  trimConversationHistory = utils.trimConversationHistory;
  getConversationSummary = utils.getConversationSummary;
  generateId = utils.generateId;
  CONVERSATION_MEMORY_CONFIG = utils.CONVERSATION_MEMORY_CONFIG;
  KNOWLEDGE_GAPS_CONFIG = utils.KNOWLEDGE_GAPS_CONFIG;
  CHAT_LOGS_CONFIG = utils.CHAT_LOGS_CONFIG;
} catch (e) {
  console.log('Utils import issue, using fallbacks');
}

// Fallback implementations
const safeFormatTimestamp = (ts) => {
  try {
    if (typeof formatTimestamp === 'function') return formatTimestamp(ts);
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch(e) { return ''; }
};

const safeFormatDate = (ts) => {
  try {
    if (typeof formatDate === 'function') return formatDate(ts);
    if (!ts) return '';
    return new Date(ts).toLocaleDateString();
  } catch(e) { return ''; }
};

const safeGenerateId = (prefix = 'id') => {
  try {
    if (typeof generateId === 'function') return generateId(prefix);
  } catch(e) {}
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const safeGetConversationSummary = (messages) => {
  try {
    if (typeof getConversationSummary === 'function') return getConversationSummary(messages);
    if (!messages || !Array.isArray(messages) || messages.length === 0) return '';
    const userMsgs = messages.filter(m => m && m.role === 'user').slice(-3);
    return userMsgs.map(m => (m.content || '').substring(0, 50)).join('; ');
  } catch(e) { return ''; }
};

const safeTrimHistory = (convos, max) => {
  try {
    if (typeof trimConversationHistory === 'function') return trimConversationHistory(convos, max);
    const result = {};
    Object.keys(convos || {}).forEach(key => {
      result[key] = (convos[key] || []).slice(-(max || 20));
    });
    return result;
  } catch(e) { return convos || {}; }
};

const safeGetCached = (query) => {
  try {
    if (typeof getCachedEmbedding === 'function') return getCachedEmbedding(query);
  } catch(e) {}
  return null;
};

const safeSetCached = (query, emb) => {
  try {
    if (typeof setCachedEmbedding === 'function') setCachedEmbedding(query, emb);
  } catch(e) {}
};

// Config defaults
const CONV_CONFIG = CONVERSATION_MEMORY_CONFIG || { MAX_MESSAGES_PER_DEPT: 20 };
const GAPS_CONFIG = KNOWLEDGE_GAPS_CONFIG || { LOW_RELEVANCE_THRESHOLD: 20, MIN_QUERY_LENGTH: 10 };
const LOGS_CONFIG = CHAT_LOGS_CONFIG || { MAX_LOGS_PER_DEPT: 10, MAX_LOGS: 50 };

export default function Chat(props) {
  // Destructure with defaults
  const {
    activeDepartment = null,
    conversations = {},
    setConversations = null,
    systemInstructions = '',
    intelligenceIndex = [],
    queryIntelligence = null,
    knowledge = [],
    connectedDocs = [],
    issues = [],
    setIssues = null,
    departments = [],
    logActivity = null,
    addToIntelligence = null,
    trackSearch = null,
    trackChatMessage = null,
    recordKnowledgeGap = null,
    chatLogs = [],
    setChatLogs = null,
  } = props || {};

  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [searchAllDepts, setSearchAllDepts] = useState(false);
  const [ragInfo, setRagInfo] = useState({ active: false, cached: false, topScore: 0 });
  const [notification, setNotification] = useState('');
  const [showChatLogs, setShowChatLogs] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);
  const [debugError, setDebugError] = useState('');
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pendingProcessed = useRef(false);
  
  const deptId = activeDepartment?.id || 'general';
  const deptName = activeDepartment?.name || 'General';
  
  // Safe array access
  const safeConvos = conversations || {};
  const messages = Array.isArray(safeConvos[deptId]) ? safeConvos[deptId] : [];
  const safeChatLogs = Array.isArray(chatLogs) ? chatLogs : [];
  const deptChatLogs = safeChatLogs.filter(l => l && l.departmentId === deptId);
  const safeKnowledge = Array.isArray(knowledge) ? knowledge : [];
  const safeDocs = Array.isArray(connectedDocs) ? connectedDocs : [];
  const safeIssues = Array.isArray(issues) ? issues : [];
  const safeIndex = Array.isArray(intelligenceIndex) ? intelligenceIndex : [];
  const safeDepts = Array.isArray(departments) ? departments : [];

  // Scroll on new messages
  useEffect(() => {
    try { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); } catch(e) {}
  }, [messages.length, isThinking]);

  // Handle pending message from dashboard
  useEffect(() => {
    if (pendingProcessed.current) return;
    try {
      const pending = sessionStorage.getItem('pendingChatMessage');
      if (pending) {
        pendingProcessed.current = true;
        sessionStorage.removeItem('pendingChatMessage');
        setInput(pending);
        setTimeout(() => handleSend(pending), 400);
      }
    } catch(e) {}
  }, [deptId]);
  
  useEffect(() => { pendingProcessed.current = false; }, [deptId]);

  // Session continuation check
  let isReturning = false;
  try {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last && last.timestamp) {
        isReturning = (Date.now() - new Date(last.timestamp).getTime()) > 3600000;
      }
    }
  } catch(e) {}

  // Build context
  const buildContext = async (query) => {
    let context = '';
    let topScore = 0;
    let cached = false;
    
    // Intelligence search
    if (safeIndex.length > 0 && typeof queryIntelligence === 'function') {
      try {
        let emb = safeGetCached(query);
        if (emb) {
          cached = true;
        } else {
          try {
            const resp = await fetch('/api/generate-embedding', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: query })
            });
            if (resp.ok) {
              const data = await resp.json();
              emb = data.embedding;
              safeSetCached(query, emb);
            }
          } catch(e) {}
        }
        
        const results = queryIntelligence(query, searchAllDepts ? null : deptId, emb);
        if (Array.isArray(results) && results.length > 0) {
          topScore = results[0]?.score || 0;
          context += '\n=== COMPANY KNOWLEDGE ===\n';
          results.slice(0, 8).forEach((item, i) => {
            if (item) {
              context += `${i+1}. ${item.title || 'Item'}: ${(item.content || '').substring(0, 250)}...\n`;
            }
          });
        }
      } catch(e) {
        console.log('Query intelligence error:', e);
      }
    }
    
    // Connected docs
    if (safeDocs.length > 0) {
      try {
        const synced = safeDocs.filter(d => d && d.status === 'synced' && d.content);
        if (synced.length > 0) {
          context += '\n=== CONNECTED DOCS ===\n';
          synced.forEach(d => {
            context += `[${d.name || 'Doc'}]: ${(d.content || '').substring(0, 10000)}\n`;
          });
        }
      } catch(e) {}
    }
    
    // Knowledge base
    if (safeKnowledge.length > 0) {
      try {
        const filtered = searchAllDepts ? safeKnowledge : safeKnowledge.filter(k => k && k.department === deptId);
        if (filtered.length > 0) {
          context += '\n=== KNOWLEDGE BASE ===\n';
          filtered.slice(0, 5).forEach(k => {
            if (k) context += `- ${k.title || 'Item'}: ${(k.content || '').substring(0, 300)}\n`;
          });
        }
      } catch(e) {}
    }
    
    // Issues
    if (safeIssues.length > 0) {
      try {
        const active = safeIssues.filter(i => i && !i.archived);
        if (active.length > 0) {
          context += '\n=== ACTIVE ISSUES ===\n';
          active.slice(0, 10).forEach((iss, i) => {
            context += `${i+1}. [${iss.status || 'Open'}] ${iss.title || 'Issue'}\n`;
          });
        }
      } catch(e) {}
    }
    
    return { context, topScore, cached };
  };

  // Parse issue from response
  const parseIssue = (resp) => {
    try {
      if (!resp) return null;
      const m = resp.match(/\[ISSUE_CREATED\](.*?)\[\/ISSUE_CREATED\]/s);
      if (m) {
        const parts = m[1].split('|').map(p => p.trim());
        if (parts.length >= 1) {
          return { title: parts[0], priority: parts[1] || 'Medium', department: parts[2] || deptId, description: parts[3] || '' };
        }
      }
    } catch(e) {}
    return null;
  };

  // Create issue
  const createNewIssue = (data) => {
    try {
      if (!data || typeof setIssues !== 'function') return;
      
      let dept = deptId;
      if (data.department && safeDepts.length > 0) {
        const found = safeDepts.find(d => d && d.name && d.name.toLowerCase().includes(data.department.toLowerCase()));
        if (found) dept = found.id;
      }
      
      const issue = {
        id: safeGenerateId('issue'),
        title: data.title || 'New Issue',
        description: data.description || '',
        department: dept,
        priority: ['High','Medium','Low'].includes(data.priority) ? data.priority : 'Medium',
        status: 'Open',
        assignee: '',
        createdAt: new Date().toISOString(),
        archived: false,
      };
      
      setIssues(prev => [...(Array.isArray(prev) ? prev : []), issue]);
      
      if (typeof logActivity === 'function') {
        try { logActivity(`Created issue: ${issue.title}`, 'issue', deptName); } catch(e) {}
      }
      if (typeof addToIntelligence === 'function') {
        try { addToIntelligence({ sourceType: 'issue_created', sourceId: issue.id, title: issue.title, content: issue.description, department: dept, relevanceBoost: 2 }); } catch(e) {}
      }
      
      setNotification(`Issue created: ${issue.title}`);
      setTimeout(() => setNotification(''), 3000);
    } catch(e) {
      console.log('Create issue error:', e);
    }
  };

  // Clean response
  const cleanResponse = (resp) => {
    try {
      if (!resp) return '';
      return resp.replace(/\[ISSUE_CREATED\].*?\[\/ISSUE_CREATED\]/gs, '').trim();
    } catch(e) { return resp || ''; }
  };

  // Main send function
  const handleSend = async (msgText) => {
    const text = (msgText || input || '').trim();
    if (!text || isThinking) return;
    
    setDebugError('');
    setInput('');
    setIsThinking(true);
    
    // Add user message
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    
    if (typeof setConversations === 'function') {
      try {
        setConversations(prev => {
          const p = prev || {};
          return { ...p, [deptId]: [...(Array.isArray(p[deptId]) ? p[deptId] : []), userMsg] };
        });
      } catch(e) { console.log('Add user msg error:', e); }
    }
    
    try {
      // Build context
      let context = '', topScore = 0, cached = false;
      try {
        const ctx = await buildContext(text);
        context = ctx.context || '';
        topScore = ctx.topScore || 0;
        cached = ctx.cached || false;
      } catch(e) { console.log('Build context error:', e); }
      
      setRagInfo({ active: context.length > 0, cached, topScore });
      
      if (typeof trackSearch === 'function') {
        try { trackSearch(cached); } catch(e) {}
      }
      
      // Build prompt
      const summary = safeGetConversationSummary(messages);
      const deptInstr = activeDepartment?.instructions || '';
      
      const sysPrompt = `You are Empire AI, the operational intelligence assistant for Empire Remodeling.

Current Department: ${deptName}
${activeDepartment?.description ? `Focus: ${activeDepartment.description}` : ''}
${summary ? `\nRecent context: ${summary}` : ''}
${context}
${systemInstructions ? `\n=== SYSTEM INSTRUCTIONS ===\n${systemInstructions}` : ''}
${deptInstr ? `\n=== ${deptName.toUpperCase()} INSTRUCTIONS ===\n${deptInstr}` : ''}

If user asks to create an issue, include: [ISSUE_CREATED] Title | Priority | Dept | Description [/ISSUE_CREATED]

Be helpful and reference company knowledge when relevant.`;

      // Get history
      let history = [];
      try {
        history = messages.slice(-8).map(m => ({ role: m?.role || 'user', content: m?.content || '' }));
      } catch(e) {}
      
      // API call
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, systemPrompt: sysPrompt, conversationHistory: history })
      });
      
      if (!resp.ok) throw new Error(`API ${resp.status}`);
      
      const data = await resp.json();
      if (!data || typeof data.response !== 'string') throw new Error('Bad response');
      
      // Check for issue
      const issueData = parseIssue(data.response);
      if (issueData) createNewIssue(issueData);
      
      // Add AI response
      const clean = cleanResponse(data.response);
      const aiMsg = { role: 'assistant', content: clean, timestamp: new Date().toISOString() };
      
      if (typeof setConversations === 'function') {
        try {
          setConversations(prev => {
            const p = prev || {};
            const curr = [...(Array.isArray(p[deptId]) ? p[deptId] : []), aiMsg];
            const trimmed = safeTrimHistory({ [deptId]: curr }, CONV_CONFIG.MAX_MESSAGES_PER_DEPT);
            return { ...p, [deptId]: trimmed[deptId] || curr };
          });
        } catch(e) { console.log('Add AI msg error:', e); }
      }
      
      // Analytics
      if (typeof trackChatMessage === 'function') {
        try { trackChatMessage(deptId); } catch(e) {}
      }
      if (topScore < GAPS_CONFIG.LOW_RELEVANCE_THRESHOLD && text.length >= GAPS_CONFIG.MIN_QUERY_LENGTH && typeof recordKnowledgeGap === 'function') {
        try { recordKnowledgeGap(text, deptId, topScore); } catch(e) {}
      }
      if (typeof addToIntelligence === 'function') {
        try { addToIntelligence({ sourceType: 'chat_query', sourceId: safeGenerateId('chat'), title: text.substring(0,50), content: `Q: ${text}\nA: ${clean.substring(0,500)}`, department: deptId, relevanceBoost: 1 }); } catch(e) {}
      }
      
    } catch(err) {
      console.error('Chat error:', err);
      setDebugError(err.message || 'Error');
      
      const errMsg = { role: 'assistant', content: "I'm having trouble connecting. Please try again.", timestamp: new Date().toISOString() };
      if (typeof setConversations === 'function') {
        try {
          setConversations(prev => {
            const p = prev || {};
            return { ...p, [deptId]: [...(Array.isArray(p[deptId]) ? p[deptId] : []), errMsg] };
          });
        } catch(e) {}
      }
    } finally {
      setIsThinking(false);
    }
  };

  const onSubmit = (e) => { if (e) e.preventDefault(); handleSend(input); };
  const onClickSend = (e) => { if (e) e.preventDefault(); handleSend(input); };

  // New chat
  const startNew = () => {
    try {
      if (messages.length === 0) return;
      
      const first = messages.find(m => m && m.role === 'user');
      const summary = first ? (first.content || '').substring(0, 80) : 'Chat';
      
      const log = {
        id: safeGenerateId('log'),
        departmentId: deptId,
        departmentName: deptName,
        messages: messages.map(m => ({ role: m?.role, content: m?.content, timestamp: m?.timestamp })),
        summary,
        messageCount: messages.length,
        savedAt: new Date().toISOString(),
        savedBy: 'You'
      };
      
      if (typeof setChatLogs === 'function') {
        setChatLogs(prev => {
          const p = Array.isArray(prev) ? prev : [];
          const other = p.filter(l => l && l.departmentId !== deptId);
          const same = p.filter(l => l && l.departmentId === deptId);
          return [...[log, ...same].slice(0, LOGS_CONFIG.MAX_LOGS_PER_DEPT), ...other].slice(0, LOGS_CONFIG.MAX_LOGS);
        });
      }
      
      if (typeof setConversations === 'function') {
        setConversations(prev => ({ ...(prev || {}), [deptId]: [] }));
      }
      
      setNotification('Chat saved');
      setTimeout(() => setNotification(''), 2000);
    } catch(e) {}
  };

  const deleteLog = (id) => {
    if (typeof setChatLogs === 'function') {
      try { setChatLogs(prev => (Array.isArray(prev) ? prev : []).filter(l => l && l.id !== id)); } catch(e) {}
    }
  };

  const clearChat = () => {
    if (confirm('Clear conversation?')) {
      if (typeof setConversations === 'function') {
        try { setConversations(prev => ({ ...(prev || {}), [deptId]: [] })); } catch(e) {}
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(30, 41, 59, 0.5)', flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: activeDepartment?.color || '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={20} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#E2E8F0' }}>{deptName}</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{activeDepartment?.description || 'General'}</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {ragInfo.active && (
            <div style={{ padding: '4px 10px', background: ragInfo.cached ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)', borderRadius: 12, fontSize: 11, color: ragInfo.cached ? '#A78BFA' : '#60A5FA', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Database size={12} /> RAG {ragInfo.cached ? '(Cached)' : ''}
            </div>
          )}
          
          <button onClick={() => setSearchAllDepts(!searchAllDepts)} style={{
            padding: '6px 12px', background: searchAllDepts ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${searchAllDepts ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 8, color: searchAllDepts ? '#60A5FA' : '#94A3B8', fontSize: 12, cursor: 'pointer',
          }}>
            {searchAllDepts ? <Globe size={14} style={{marginRight:4}}/> : <Building size={14} style={{marginRight:4}}/>}
            {searchAllDepts ? 'All' : 'Dept'}
          </button>
          
          {messages.length > 0 && (
            <>
              <span style={{ fontSize: 11, color: '#64748B' }}>{messages.length}/{CONV_CONFIG.MAX_MESSAGES_PER_DEPT}</span>
              <button onClick={startNew} style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#60A5FA', fontSize: 12, cursor: 'pointer' }}>
                <Plus size={14} style={{marginRight:4}}/> New
              </button>
              <button onClick={clearChat} style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#EF4444', fontSize: 12, cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isReturning && messages.length > 0 && (
          <div style={{ textAlign: 'center', padding: '8px 16px', background: 'rgba(139,92,246,0.1)', borderRadius: 8, fontSize: 12, color: '#A78BFA' }}>
            Continuing session
          </div>
        )}
        
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748B', textAlign: 'center', gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={40} color="#3B82F6" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#E2E8F0' }}>Start a conversation</div>
          </div>
        )}
        
        {messages.map((msg, i) => msg && (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '70%', padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : 'rgba(30,41,59,0.8)',
              color: '#E2E8F0', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {msg.content || ''}
              <div style={{ fontSize: 10, color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : '#64748B', marginTop: 6 }}>
                {safeFormatTimestamp(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}
        
        {isThinking && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: 'rgba(30,41,59,0.8)', color: '#94A3B8', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={16} className="spin" /> Thinking...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <form onSubmit={onSubmit} style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(30,41,59,0.5)' }}>
        {debugError && (
          <div style={{ marginBottom: 8, padding: 8, background: 'rgba(239,68,68,0.1)', borderRadius: 8, fontSize: 12, color: '#EF4444' }}>
            Debug: {debugError}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${deptName.toLowerCase()}...`}
            disabled={isThinking}
            style={{ flex: 1, padding: '12px 16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#E2E8F0', fontSize: 14, outline: 'none' }}
          />
          <button
            type="button"
            onClick={onClickSend}
            disabled={!input.trim() || isThinking}
            style={{
              padding: '12px 20px',
              background: input.trim() && !isThinking ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : 'rgba(255,255,255,0.05)',
              border: 'none', borderRadius: 12, color: input.trim() && !isThinking ? 'white' : '#64748B',
              cursor: input.trim() && !isThinking ? 'pointer' : 'not-allowed',
            }}
          >
            {isThinking ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          </button>
        </div>
      </form>
      
      {/* Chat Logs */}
      {deptChatLogs.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.5)' }}>
          <button onClick={() => setShowChatLogs(!showChatLogs)} style={{ width: '100%', padding: '12px 24px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: '#94A3B8' }}>
            <span><Calendar size={14} style={{marginRight:6}}/>History ({deptChatLogs.length})</span>
            {showChatLogs ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
          
          {showChatLogs && (
            <div style={{ maxHeight: 250, overflowY: 'auto', padding: '0 24px 16px' }}>
              {deptChatLogs.map(log => log && (
                <div key={log.id} onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)} style={{ padding: 10, background: 'rgba(30,41,59,0.5)', borderRadius: 8, marginBottom: 6, cursor: 'pointer', border: expandedLog === log.id ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#E2E8F0' }}>{log.summary || 'Chat'}</span>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748B', marginRight: 8 }}>{safeFormatDate(log.savedAt)}</span>
                      <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) deleteLog(log.id); }} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}><Trash2 size={12}/></button>
                    </div>
                  </div>
                  {expandedLog === log.id && Array.isArray(log.messages) && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {log.messages.slice(0,6).map((m, i) => m && (
                        <div key={i} style={{ padding: '6px 10px', marginBottom: 4, borderRadius: 6, background: m.role === 'user' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)', borderLeft: `2px solid ${m.role === 'user' ? '#3B82F6' : '#64748B'}` }}>
                          <div style={{ fontSize: 10, color: m.role === 'user' ? '#60A5FA' : '#94A3B8' }}>{m.role === 'user' ? 'You' : 'AI'}</div>
                          <div style={{ fontSize: 11, color: '#E2E8F0' }}>{(m.content || '').substring(0, 200)}{(m.content || '').length > 200 ? '...' : ''}</div>
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
      
      {notification && (
        <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#10B981,#059669)', color: 'white', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 500, zIndex: 1000 }}>
          <Sparkles size={16} style={{marginRight:8}}/>{notification}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
