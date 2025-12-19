// Empire AI - Voice Modal (Carson)
// Version 3.2 - Fixes: Doc limit 100k, department filtering, error display, defensive imports

import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, MicOff, Square, Volume2, VolumeX, Sparkles, AlertCircle } from 'lucide-react';

// Defensive utils import with fallbacks
let createIntelligenceItem, KNOWLEDGE_GAPS_CONFIG, getCachedEmbedding, setCachedEmbedding;

try {
  const utils = require('../utils');
  createIntelligenceItem = utils.createIntelligenceItem;
  KNOWLEDGE_GAPS_CONFIG = utils.KNOWLEDGE_GAPS_CONFIG;
  getCachedEmbedding = utils.getCachedEmbedding;
  setCachedEmbedding = utils.setCachedEmbedding;
} catch (e) {
  console.warn('Utils import failed, using fallbacks:', e);
}

// Fallback implementations
if (!createIntelligenceItem) {
  createIntelligenceItem = (sourceType, sourceId, title, content, department, tags, metadata, boost) => ({
    id: `intel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sourceType,
    sourceId,
    title,
    content,
    department,
    tags: tags || [],
    metadata: metadata || {},
    relevanceBoost: boost || 1,
    createdAt: new Date().toISOString(),
  });
}

if (!KNOWLEDGE_GAPS_CONFIG) {
  KNOWLEDGE_GAPS_CONFIG = {
    LOW_RELEVANCE_THRESHOLD: 20,
    MIN_QUERY_LENGTH: 10,
  };
}

if (!getCachedEmbedding) {
  getCachedEmbedding = () => null;
}

if (!setCachedEmbedding) {
  setCachedEmbedding = () => {};
}

// Safe ID generator
const safeGenerateId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Voice configuration
const VOICE_CONFIG = {
  RESTART_DELAY: 2500,
  SILENCE_DELAY: 1500,
  ELEVENLABS: {
    stability: 0.75,
    similarity_boost: 0.75,
    style: 0.0,
    speed: 0.85,
  }
};

// Department matching helper (matches Chat.jsx logic)
const matchesDepartment = (item, deptId, deptName) => {
  if (!item) return false;
  const itemDept = (item.department || '').toLowerCase();
  
  // Company-wide items match everything
  if (itemDept === 'company-wide' || itemDept === 'general' || !itemDept) {
    return true;
  }
  
  // Check by ID
  if (deptId && itemDept === deptId.toLowerCase()) {
    return true;
  }
  
  // Check by name
  if (deptName) {
    const deptNameLower = deptName.toLowerCase();
    if (itemDept === deptNameLower) return true;
    if (itemDept.includes(deptNameLower) || deptNameLower.includes(itemDept)) return true;
  }
  
  return false;
};

export default function VoiceModal({
  onClose,
  activeDepartment,
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
  recordKnowledgeGap,
  trackVoiceSession,
  trackSearch,
  trackIssueCreated,
}) {
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [debug, setDebug] = useState('Tap the mic to start');
  const [notification, setNotification] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null); // NEW: Error display
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const audioRef = useRef(null);
  const shouldAutoRestartRef = useRef(true);
  const autoRestartTimeoutRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const sessionTrackedRef = useRef(false);
  const finalTranscriptRef = useRef('');

  // Safe array check
  const safeArray = (arr) => Array.isArray(arr) ? arr : [];

  // Track voice session once on mount
  useEffect(() => {
    try {
      if (!sessionTrackedRef.current) {
        if (typeof trackVoiceSession === 'function') {
          trackVoiceSession();
        }
        sessionTrackedRef.current = true;
        if (typeof logActivity === 'function') {
          logActivity('Started voice session with Carson', 'voice', activeDepartment?.name);
        }
      }
    } catch (e) {
      console.error('Session tracking error:', e);
    }
  }, []);

  // Build knowledge context
  const buildKnowledgeContext = async (query) => {
    let context = '';
    let cacheHit = false;
    let maxScore = 0;
    
    try {
      // Check embedding cache
      const cachedEmb = getCachedEmbedding(query);
      cacheHit = !!cachedEmb;
      if (typeof trackSearch === 'function') {
        trackSearch(cacheHit);
      }
      
      // Query intelligence - signature: (index, query, dept, limit)
      const safeIndex = safeArray(intelligenceIndex);
      let relevantItems = [];
      
      if (typeof queryIntelligence === 'function' && safeIndex.length > 0) {
        try {
          relevantItems = queryIntelligence(safeIndex, query, activeDepartment?.name, 10) || [];
        } catch (e) {
          console.error('queryIntelligence error:', e);
          relevantItems = [];
        }
      }
      
      if (relevantItems.length > 0) {
        maxScore = relevantItems[0].score || 0;
        context += '\n\n=== RELEVANT KNOWLEDGE ===\n';
        relevantItems.forEach((item, i) => {
          const content = item.content || '';
          context += `${i + 1}. ${item.title || 'Untitled'}: ${content.substring(0, 300)}...\n`;
        });
      }
      
      // Add connected docs - filtered by department, increased limit to 100k
      const safeDocs = safeArray(connectedDocs);
      const deptId = activeDepartment?.id || '';
      const deptName = activeDepartment?.name || '';
      
      const relevantDocs = safeDocs.filter(d => {
        if (d.status !== 'synced' || !d.content) return false;
        return matchesDepartment(d, deptId, deptName);
      });
      
      if (relevantDocs.length > 0) {
        context += '\n\n=== SPREADSHEETS & DOCUMENTS ===\n';
        relevantDocs.forEach(doc => {
          context += `\n--- ${doc.name || 'Document'} ---\n`;
          // Increased from 50,000 to 100,000 chars
          context += (doc.content || '').substring(0, 100000) + '\n';
        });
      }
      
      // Add issues - filtered by department
      const safeIssues = safeArray(issues);
      const activeIssues = safeIssues.filter(i => {
        if (i.archived || i.status === 'Resolved') return false;
        return matchesDepartment(i, deptId, deptName);
      });
      
      if (activeIssues.length > 0) {
        context += '\n\n=== ACTIVE ISSUES ===\n';
        activeIssues.slice(0, 10).forEach((issue, i) => {
          context += `${i + 1}. [${issue.priority || 'Medium'}] ${issue.title || 'Untitled'} (${issue.department || 'General'})\n`;
        });
      }
    } catch (e) {
      console.error('buildKnowledgeContext error:', e);
      setErrorMessage(`Context build error: ${e.message}`);
    }
    
    return { context, maxScore };
  };

  // Parse issue from response
  const parseIssueFromResponse = (text) => {
    if (!text) return null;
    const regex = /\[ISSUE_CREATED\]\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\[\/ISSUE_CREATED\]/i;
    const match = text.match(regex);
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

  // Create issue
  const createIssue = async (issueData) => {
    try {
      const safeDepts = safeArray(departments);
      const matchingDept = safeDepts.find(d => 
        d.name && d.name.toLowerCase().includes(issueData.department.toLowerCase())
      );
      
      const newIssue = {
        id: safeGenerateId('issue'), // Consistent with Chat.jsx
        title: issueData.title,
        description: issueData.description,
        department: matchingDept?.name || activeDepartment?.name || 'General',
        priority: ['High', 'Medium', 'Low'].includes(issueData.priority) ? issueData.priority : 'Medium',
        status: 'Open',
        assignee: '',
        createdAt: new Date().toISOString(),
        archived: false,
      };
      
      if (typeof setIssues === 'function') {
        setIssues(prev => [newIssue, ...safeArray(prev)]);
      }
      
      if (typeof logActivity === 'function') {
        logActivity(`Created issue via voice: ${newIssue.title}`, 'issue', newIssue.department);
      }
      
      if (typeof trackIssueCreated === 'function') {
        trackIssueCreated(newIssue.priority, newIssue.department);
      }
      
      setNotification(`Issue created: "${newIssue.title}"`);
      setTimeout(() => setNotification(null), 4000);
      
      return newIssue;
    } catch (e) {
      console.error('createIssue error:', e);
      setErrorMessage(`Issue creation error: ${e.message}`);
      return null;
    }
  };

  // Clean response
  const cleanResponse = (text) => {
    if (!text) return '';
    return text.replace(/\[ISSUE_CREATED\][\s\S]*?\[\/ISSUE_CREATED\]/gi, '').trim();
  };

  // Speak with ElevenLabs
  const speakWithElevenLabs = async (text) => {
    if (isMuted) {
      setStatus('idle');
      setDebug('Response muted. Tap mic when ready.');
      shouldAutoRestartRef.current = true;
      autoRestartTimeoutRef.current = setTimeout(() => startListening(), VOICE_CONFIG.RESTART_DELAY);
      return;
    }
    
    try {
      setDebug('Carson is speaking...');
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          voice_settings: VOICE_CONFIG.ELEVENLABS
        }),
      });
      
      if (!response.ok) {
        throw new Error('ElevenLabs API error');
      }
      
      const data = await response.json();
      
      // Convert base64 to audio
      const audioData = atob(data.audio);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onended = () => {
        setStatus('idle');
        setDebug('Your turn. Tap mic or just start speaking...');
        if (shouldAutoRestartRef.current) {
          autoRestartTimeoutRef.current = setTimeout(() => {
            setDebug('Listening...');
            startListening();
          }, VOICE_CONFIG.RESTART_DELAY);
        }
      };
      
      audioRef.current.play();
      setStatus('speaking');
      
    } catch (error) {
      console.log('ElevenLabs failed, using browser speech:', error);
      fallbackToWebSpeech(text);
    }
  };

  // Fallback to browser speech
  const fallbackToWebSpeech = (text) => {
    if (!synthRef.current) {
      synthRef.current = window.speechSynthesis;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    utterance.onend = () => {
      setStatus('idle');
      setDebug('Your turn. Tap mic when ready.');
      if (shouldAutoRestartRef.current) {
        autoRestartTimeoutRef.current = setTimeout(() => startListening(), VOICE_CONFIG.RESTART_DELAY);
      }
    };
    
    synthRef.current.speak(utterance);
    setStatus('speaking');
  };

  // Clear all timeouts
  const clearAllTimeouts = () => {
    if (autoRestartTimeoutRef.current) {
      clearTimeout(autoRestartTimeoutRef.current);
      autoRestartTimeoutRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  };

  // Start listening
  const startListening = () => {
    clearAllTimeouts();
    setErrorMessage(null); // Clear any previous errors
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setDebug('Browser not supported. Try Chrome or Edge.');
      setErrorMessage('Speech recognition not supported in this browser');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    
    finalTranscriptRef.current = '';
    
    recognitionRef.current.onstart = () => {
      setStatus('listening');
      setTranscript('');
      shouldAutoRestartRef.current = true;
      setDebug('Listening... speak naturally');
    };
    
    recognitionRef.current.onresult = (event) => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript + ' ';
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      const displayText = finalTranscriptRef.current + interimTranscript;
      setTranscript(displayText.trim());
      
      if (finalTranscriptRef.current.trim()) {
        silenceTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
          const finalText = finalTranscriptRef.current.trim();
          if (finalText) {
            processQuery(finalText);
          }
        }, VOICE_CONFIG.SILENCE_DELAY);
      }
    };
    
    recognitionRef.current.onerror = (event) => {
      if (event.error === 'no-speech') {
        setDebug('No speech detected. Tap mic to try again.');
      } else if (event.error === 'aborted') {
        // User stopped - this is fine
      } else {
        setDebug(`Error: ${event.error}`);
        setErrorMessage(`Speech recognition error: ${event.error}`);
      }
      setStatus('idle');
    };
    
    recognitionRef.current.onend = () => {
      const finalText = finalTranscriptRef.current.trim();
      if (finalText && status === 'listening') {
        processQuery(finalText);
      } else if (status === 'listening') {
        setStatus('idle');
        setDebug('Tap mic to start');
      }
    };
    
    try {
      recognitionRef.current.start();
    } catch (e) {
      setDebug('Could not start listening. Try again.');
      setErrorMessage(`Start listening error: ${e.message}`);
    }
  };

  // Process query
  const processQuery = async (query) => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    
    setStatus('processing');
    setDebug('Thinking...');
    setErrorMessage(null);
    
    try {
      const { context, maxScore } = await buildKnowledgeContext(query);
      
      // Record knowledge gap if low relevance
      if (maxScore < KNOWLEDGE_GAPS_CONFIG.LOW_RELEVANCE_THRESHOLD && 
          query.length >= KNOWLEDGE_GAPS_CONFIG.MIN_QUERY_LENGTH) {
        if (typeof recordKnowledgeGap === 'function') {
          recordKnowledgeGap(query, maxScore, activeDepartment?.name || 'General');
        }
      }
      
      const deptInstructions = activeDepartment?.instructions || '';
      
      const systemPrompt = `You are Carson, a calm and helpful voice assistant for Empire Remodeling.
Your name is Carson. If asked your name, say "I'm Carson, your Empire AI assistant."

Department: ${activeDepartment?.name || 'General'}
${systemInstructions ? `\nSystem Instructions: ${systemInstructions}` : ''}
${deptInstructions ? `\nDepartment Instructions: ${deptInstructions}` : ''}
${context}

VOICE CONVERSATION RULES:
1. Speak in a calm, natural, conversational tone
2. Keep answers brief - one or two sentences maximum
3. Pause naturally between thoughts
4. After answering, invite follow-up: "What else?" or "Anything else you need?"
5. If the user seems to be still talking or got cut off, apologize and ask them to continue
6. Never list more than 2-3 items verbally - offer to go through them one at a time
7. Don't mention where information came from
8. Don't over-explain - the user will ask if they want more detail

PACING:
- Use commas and periods to create natural pauses
- Avoid long run-on sentences
- If giving a number, pause slightly after it

ISSUE CREATION:
If asked to create/log/add/report an issue, include at the END of your response:
[ISSUE_CREATED] Title | Priority | Department | Description [/ISSUE_CREATED]

Example good responses:
- "54 projects total. Want me to break those down by status?"
- "That's the Johnson Kitchen Remodel. $45,000 budget, started last month. What would you like to know about it?"
- "Got it, I've logged that as a high priority issue. Anything else?"`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          systemPrompt,
          conversationHistory: [],
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      let aiResponse = data.response;
      
      // Check for issue creation
      const issueData = parseIssueFromResponse(aiResponse);
      if (issueData) {
        await createIssue(issueData);
        aiResponse = cleanResponse(aiResponse);
      }
      
      setResponse(aiResponse);
      
      // Log to intelligence
      if (typeof addToIntelligence === 'function') {
        try {
          addToIntelligence(createIntelligenceItem(
            'voice_interaction',
            safeGenerateId('voice'),
            `Voice Q: ${query.substring(0, 50)}`,
            `User asked: ${query}\nCarson: ${aiResponse}`,
            activeDepartment?.name || 'General',
            ['voice', 'conversation'],
            {},
            1
          ));
        } catch (e) {
          console.error('addToIntelligence error:', e);
        }
      }
      
      // Speak the response
      speakWithElevenLabs(aiResponse);
      
    } catch (error) {
      console.error('Voice processing error:', error);
      setDebug(`Error: ${error.message}`);
      setErrorMessage(`Processing error: ${error.message}`);
      const errorMsg = "Sorry, I'm having trouble right now. Can you try again?";
      setResponse(errorMsg);
      speakWithElevenLabs(errorMsg);
    }
  };

  // Stop everything
  const stopAll = () => {
    shouldAutoRestartRef.current = false;
    clearAllTimeouts();
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    finalTranscriptRef.current = '';
    setStatus('idle');
    setDebug('Stopped. Tap mic to start again.');
  };

  // Handle close
  const handleClose = () => {
    stopAll();
    onClose();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  // Status colors
  const getOrbStyle = () => {
    const colors = {
      idle: { bg: '#3B82F6', shadow: 'rgba(59, 130, 246, 0.5)' },
      listening: { bg: '#10B981', shadow: 'rgba(16, 185, 129, 0.5)' },
      processing: { bg: '#F59E0B', shadow: 'rgba(245, 158, 11, 0.5)' },
      speaking: { bg: '#8B5CF6', shadow: 'rgba(139, 92, 246, 0.5)' },
    };
    return colors[status] || colors.idle;
  };

  const orbStyle = getOrbStyle();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    }}>
      {/* Close Button */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          width: 48,
          height: 48,
          background: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          borderRadius: '50%',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={24} />
      </button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#E2E8F0', marginBottom: 8 }}>
          ✨ Carson
        </h2>
        <p style={{ color: '#64748B', fontSize: 14 }}>
          {activeDepartment?.name || 'General'} • ElevenLabs Voice
        </p>
      </div>

      {/* Error Display - NEW */}
      {errorMessage && (
        <div style={{
          position: 'absolute',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 8,
          padding: '8px 16px',
          maxWidth: 400,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertCircle size={16} color="#EF4444" />
          <span style={{ color: '#FCA5A5', fontSize: 12 }}>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FCA5A5',
              cursor: 'pointer',
              padding: 0,
              marginLeft: 8,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Orb */}
      <div style={{
        width: 180,
        height: 180,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${orbStyle.bg}, ${orbStyle.bg}80)`,
        boxShadow: `0 0 60px ${orbStyle.shadow}, 0 0 120px ${orbStyle.shadow}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        animation: status === 'listening' || status === 'speaking' ? 'pulse 2s ease-in-out infinite' : 
                   status === 'processing' ? 'spin 1s linear infinite' : 'none',
      }}>
        <Sparkles size={48} color="white" style={{ opacity: 0.9 }} />
      </div>

      {/* Status */}
      <div style={{
        padding: '10px 24px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        marginBottom: 24,
      }}>
        <span style={{ color: '#E2E8F0', fontSize: 14, textTransform: 'capitalize' }}>
          {status === 'idle' ? 'Ready' : status === 'listening' ? 'Listening...' : status === 'processing' ? 'Thinking...' : 'Speaking'}
        </span>
      </div>

      {/* Transcript */}
      {transcript && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          maxWidth: 500,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>You said:</div>
          <div style={{ color: '#E2E8F0', fontSize: 16 }}>{transcript}</div>
        </div>
      )}

      {/* Response */}
      {response && (
        <div style={{
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          maxWidth: 500,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Carson:</div>
          <div style={{ color: '#E2E8F0', fontSize: 16 }}>{response}</div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Start/Stop Button */}
        {status === 'idle' ? (
          <button
            onClick={startListening}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
            }}
          >
            <Mic size={28} />
          </button>
        ) : (
          <button
            onClick={stopAll}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
            }}
          >
            <Square size={24} />
          </button>
        )}

        {/* Mute Toggle */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            border: isMuted ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
            color: isMuted ? '#EF4444' : '#E2E8F0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {/* Debug/Status Message */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        fontSize: 12,
        color: '#94A3B8',
        textAlign: 'center',
        maxWidth: 300,
      }}>
        {debug}
      </div>
      
      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: 100,
          background: 'linear-gradient(135deg, #10B981, #059669)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 500,
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
        }}>
          <Sparkles size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
          {notification}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
