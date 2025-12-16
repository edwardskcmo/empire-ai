// Empire AI - Voice Mode Modal
// Speech recognition + ElevenLabs TTS + AI processing

import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, VolumeX, Volume2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { queryIntelligence, getSourceLabel, semanticSearch } from '../utils';

export default function VoiceModal({
  onClose,
  activeDepartment,
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
  const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [debug, setDebug] = useState('');
  const [notification, setNotification] = useState(null);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const audioRef = useRef(null);
  const shouldAutoRestartRef = useRef(true);
  const autoRestartTimeoutRef = useRef(null);
  
  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setTranscript(transcript);
        
        if (event.results[event.results.length - 1].isFinal) {
          setDebug('Got text: ' + transcript.substring(0, 30) + '...');
          processTranscript(transcript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setDebug('Recognition error: ' + event.error);
        setStatus('idle');
      };
      
      recognitionRef.current.onend = () => {
        if (status === 'listening') {
          setStatus('idle');
        }
      };
    }
    
    synthRef.current = window.speechSynthesis;
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (autoRestartTimeoutRef.current) {
        clearTimeout(autoRestartTimeoutRef.current);
      }
    };
  }, []);
  
  // Build knowledge context with semantic search (uses cache - Item 4)
  const buildKnowledgeContext = async (query) => {
    let context = '';
    
    // Try semantic search first (with caching - Item 4)
    try {
      const semanticResults = await semanticSearch(
        intelligenceIndex, 
        query, 
        activeDepartment?.name,
        {
          searchAllDepartments: false,
          maxResults: 10,
          useEmbeddings: true,
        }
      );
      
      if (semanticResults.length > 0) {
        context += '\n=== RELEVANT COMPANY KNOWLEDGE ===\n';
        semanticResults.forEach((item, i) => {
          const label = getSourceLabel(item.sourceType);
          context += `${i + 1}. [${label}] ${item.title}: ${item.content?.substring(0, 300)}...\n`;
        });
      }
    } catch (error) {
      console.log('Semantic search failed, using keyword search:', error);
      // Fall back to keyword search
      const keywordResults = queryIntelligence(intelligenceIndex, query, activeDepartment?.name);
      if (keywordResults.length > 0) {
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
        context += '\n=== CONNECTED SPREADSHEETS & DOCUMENTS ===\n';
        syncedDocs.forEach(doc => {
          context += `\n--- ${doc.name} ---\n`;
          context += doc.content?.substring(0, 50000) + '\n';
        });
      }
    }
    
    // Add issues data
    if (issues && issues.length > 0) {
      const activeIssues = issues.filter(i => !i.archived);
      if (activeIssues.length > 0) {
        context += '\n=== ACTIVE ISSUES ===\n';
        activeIssues.slice(0, 15).forEach((issue, i) => {
          context += `${i + 1}. [${issue.status}] [${issue.priority}] ${issue.title} (${issue.department})\n`;
        });
      }
    }
    
    return context;
  };
  
  // Parse for issue creation
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
  
  // Create issue
  const createIssue = (issueData) => {
    const matchedDept = departments?.find(d => 
      d.name.toLowerCase().includes(issueData.department.toLowerCase())
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
    setIssues?.(prev => [...prev, newIssue]);
    logActivity?.(`Created issue via voice: ${newIssue.title}`, 'voice', newIssue.department);
    setNotification({ type: 'success', message: `Issue created: ${newIssue.title}` });
    setTimeout(() => setNotification(null), 3000);
  };
  
  const cleanResponse = (text) => {
    return text.replace(/\[ISSUE_CREATED\].*?\[\/ISSUE_CREATED\]/gs, '').trim();
  };
  
  // Process transcript and get AI response
  const processTranscript = async (text) => {
    if (!text.trim()) return;
    
    setStatus('processing');
    setDebug('Calling API...');
    
    try {
      // Build context with semantic search (uses cache - Item 4)
      const knowledgeContext = await buildKnowledgeContext(text);
      
      let systemPrompt = `You are Carson, the voice assistant for Empire AI at Empire Remodeling.
Your name is Carson. If asked your name, say "I'm Carson, your Empire AI assistant."

Current Department: ${activeDepartment?.name || 'General'}

${knowledgeContext}

VOICE RESPONSE RULES - FOLLOW STRICTLY:
1. ONE sentence answer maximum - then STOP talking immediately
2. After answering, ask: "Anything else?" or "What else do you need?"
3. NEVER list multiple items unless user says "list them" or "what are all of them"
4. NEVER mention where the information came from
5. NEVER explain your reasoning
6. Wait for user to ask follow-up questions

ISSUE CREATION: If user wants to create/log/report an issue, include:
[ISSUE_CREATED] Title | Priority | Department | Description [/ISSUE_CREATED]

Examples of CORRECT responses:
- "54 projects total. Anything else?"
- "Johnson Kitchen Remodel. Need more details?"
- "$45,000 budget. What else?"
- "Issue created for permit delay. Anything else?"

Examples of WRONG responses (TOO LONG):
- "Based on the spreadsheet data, I can see there are 54 projects..."
- "The Johnson project is a kitchen remodel with a budget of $45,000 starting on..."`;

      if (systemInstructions?.trim()) {
        systemPrompt += `\n\nSYSTEM INSTRUCTIONS:\n${systemInstructions}`;
      }
      if (activeDepartment?.instructions?.trim()) {
        systemPrompt += `\n\nDEPARTMENT INSTRUCTIONS:\n${activeDepartment.instructions}`;
      }
      
      const apiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          systemPrompt,
          conversationHistory: [],
        }),
      });
      
      setDebug('API Status: ' + apiResponse.status);
      
      if (!apiResponse.ok) {
        throw new Error('API request failed');
      }
      
      const data = await apiResponse.json();
      let aiResponse = data.response;
      
      // Check for issue creation
      const issueData = parseIssueFromResponse(aiResponse);
      if (issueData) {
        createIssue(issueData);
        aiResponse = cleanResponse(aiResponse);
      }
      
      setResponse(aiResponse);
      setDebug('Success!');
      
      // Log to activity
      logActivity?.(`Voice chat in ${activeDepartment?.name || 'General'}`, 'voice', activeDepartment?.name);
      
      // Speak the response
      if (!isMuted) {
        await speakWithElevenLabs(aiResponse);
      } else {
        setStatus('idle');
        // Auto restart after muted response
        if (shouldAutoRestartRef.current) {
          autoRestartTimeoutRef.current = setTimeout(() => {
            startListening();
          }, 800);
        }
      }
      
    } catch (error) {
      console.error('Voice processing error:', error);
      setDebug('Error: ' + error.message);
      setResponse("I'm having trouble connecting. Please try again.");
      setStatus('idle');
    }
  };
  
  // ElevenLabs TTS
  const speakWithElevenLabs = async (text) => {
    setStatus('speaking');
    
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        console.log('ElevenLabs failed:', response.status);
        fallbackToWebSpeech(text);
        return;
      }
      
      const data = await response.json();
      
      // Convert base64 to audio
      const audioBlob = base64ToBlob(data.audio, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setStatus('idle');
        
        // Auto-continue listening
        if (shouldAutoRestartRef.current) {
          autoRestartTimeoutRef.current = setTimeout(() => {
            startListening();
          }, 800);
        }
      };
      audioRef.current.onerror = () => {
        fallbackToWebSpeech(text);
      };
      audioRef.current.play();
      
    } catch (error) {
      console.error('ElevenLabs error:', error);
      fallbackToWebSpeech(text);
    }
  };
  
  // Helper to convert base64 to blob
  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };
  
  // Fallback to browser speech
  const fallbackToWebSpeech = (text) => {
    if (!synthRef.current) {
      setStatus('idle');
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
      setStatus('idle');
      
      if (shouldAutoRestartRef.current) {
        autoRestartTimeoutRef.current = setTimeout(() => {
          startListening();
        }, 800);
      }
    };
    
    synthRef.current.speak(utterance);
  };
  
  // Start listening
  const startListening = () => {
    if (!recognitionRef.current) {
      setDebug('Browser not supported');
      return;
    }
    
    shouldAutoRestartRef.current = true;
    setTranscript('');
    setStatus('listening');
    setDebug('Listening started');
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Start error:', error);
      setDebug('Start error: ' + error.message);
    }
  };
  
  // Stop everything
  const stopAll = () => {
    shouldAutoRestartRef.current = false;
    
    if (autoRestartTimeoutRef.current) {
      clearTimeout(autoRestartTimeoutRef.current);
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setStatus('idle');
  };
  
  // Handle close
  const handleClose = () => {
    stopAll();
    onClose();
  };
  
  // Get orb color based on status
  const getOrbColor = () => {
    switch (status) {
      case 'listening': return '#10B981';
      case 'processing': return '#F59E0B';
      case 'speaking': return '#8B5CF6';
      default: return '#3B82F6';
    }
  };
  
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
      zIndex: 1000,
    }}>
      {/* Close button */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: '50%',
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#94A3B8',
        }}
      >
        <X size={24} />
      </button>
      
      {/* Header */}
      <div style={{ 
        position: 'absolute', 
        top: 24, 
        left: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Sparkles size={20} style={{ color: '#A78BFA' }} />
        <span style={{ color: '#A78BFA', fontSize: 14 }}>Carson powered by ElevenLabs</span>
      </div>
      
      {/* Notification */}
      {notification && (
        <div style={{
          position: 'absolute',
          top: 80,
          padding: '12px 20px',
          borderRadius: 8,
          background: 'rgba(16,185,129,0.9)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <CheckCircle2 size={16} />
          {notification.message}
        </div>
      )}
      
      {/* Animated Orb */}
      <div style={{
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${getOrbColor()}, ${getOrbColor()}88, ${getOrbColor()}44)`,
        boxShadow: `0 0 60px ${getOrbColor()}66, 0 0 120px ${getOrbColor()}33`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: status === 'listening' || status === 'speaking' ? 'pulse 2s ease-in-out infinite' : 
                   status === 'processing' ? 'spin 2s linear infinite' : 'none',
        marginBottom: 40,
      }}>
        <div style={{
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${getOrbColor()}cc, ${getOrbColor()}66)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, white, ${getOrbColor()})`,
            opacity: 0.9,
          }} />
        </div>
      </div>
      
      {/* Status Text */}
      <div style={{
        color: '#E2E8F0',
        fontSize: 18,
        marginBottom: 8,
        textTransform: 'capitalize',
      }}>
        {status === 'idle' ? 'Ready' : status}
      </div>
      
      {/* Department Badge */}
      <div style={{
        color: '#64748B',
        fontSize: 13,
        marginBottom: 24,
      }}>
        {activeDepartment?.name || 'General'}
      </div>
      
      {/* Transcript */}
      {transcript && (
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '12px 20px',
          marginBottom: 16,
          maxWidth: '80%',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>You said:</div>
          <div style={{ color: '#E2E8F0' }}>{transcript}</div>
        </div>
      )}
      
      {/* Response */}
      {response && (
        <div style={{
          background: 'rgba(139, 92, 246, 0.2)',
          borderRadius: 12,
          padding: '12px 20px',
          marginBottom: 24,
          maxWidth: '80%',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, color: '#A78BFA', marginBottom: 4 }}>Carson:</div>
          <div style={{ color: '#E2E8F0' }}>{response}</div>
        </div>
      )}
      
      {/* Controls */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Main button */}
        {status === 'idle' ? (
          <button
            onClick={startListening}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: 'none',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
            }}
          >
            <Mic size={28} color="white" />
          </button>
        ) : (
          <button
            onClick={stopAll}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: 'none',
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
            }}
          >
            <Square size={24} color="white" />
          </button>
        )}
        
        {/* Mute toggle */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.2)',
            background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isMuted ? (
            <VolumeX size={20} color="#EF4444" />
          ) : (
            <Volume2 size={20} color="#94A3B8" />
          )}
        </button>
      </div>
      
      {/* Debug info */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        fontSize: 11,
        color: '#64748B',
      }}>
        {debug}
      </div>
      
      {/* Browser support warning */}
      {!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window) && (
        <div style={{
          position: 'absolute',
          bottom: 60,
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 8,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertCircle size={16} style={{ color: '#EF4444' }} />
          <span style={{ color: '#F87171', fontSize: 13 }}>
            Voice mode requires Chrome or Edge browser
          </span>
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
