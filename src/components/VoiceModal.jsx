import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, VolumeX, Volume2, CheckCircle } from 'lucide-react';
import { generateId, getSourceLabel, formatDate } from '../utils';

function VoiceModal({
  onClose,
  activeDepartment,
  systemInstructions,
  intelligenceIndex,
  queryIntelligence, // Now async
  knowledge,
  connectedDocs,
  issues,
  setIssues,
  departments,
  logActivity,
  addToIntelligence,
  generateEmbedding,
}) {
  const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [muted, setMuted] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [issueCreatedNotification, setIssueCreatedNotification] = useState(null);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const audioRef = useRef(null);
  const autoRestartTimeoutRef = useRef(null);
  const shouldAutoRestartRef = useRef(true);

  // Check browser support
  const isSupported = typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  // Build knowledge context (async for semantic search)
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
    
    // 2. Include connected Google Docs/Sheets
    const syncedDocs = connectedDocs?.filter(d => d.status === 'synced' && d.content) || [];
    if (syncedDocs.length > 0) {
      context += '=== CONNECTED GOOGLE DOCS/SHEETS ===\n';
      syncedDocs.forEach(doc => {
        context += `--- ${doc.name} ---\n`;
        context += doc.content?.substring(0, 50000) + '\n\n';
      });
    }
    
    // 3. Include issues
    const activeIssues = issues?.filter(i => !i.archived) || [];
    if (activeIssues.length > 0) {
      context += '=== ACTIVE ISSUES ===\n';
      activeIssues.forEach((issue, i) => {
        context += `${i + 1}. [${issue.status}] ${issue.title} - ${issue.priority} priority\n`;
      });
      context += '\n';
    }
    
    return context;
  };

  // Parse issue creation from response
  const parseIssueFromResponse = (text) => {
    const match = text.match(/\[ISSUE_CREATED\](.*?)\[\/ISSUE_CREATED\]/s);
    if (!match) return null;
    
    const parts = match[1].trim().split('|').map(p => p.trim());
    return {
      title: parts[0] || 'New Issue',
      priority: parts[1] || 'Medium',
      department: parts[2] || activeDepartment?.name || 'General',
      description: parts[3] || '',
    };
  };

  // Create issue
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
    
    await addToIntelligence(
      'issue_created',
      newIssue.id,
      newIssue.title,
      `${newIssue.description} | Priority: ${newIssue.priority}`,
      newIssue.department,
      null,
      {},
      newIssue.priority === 'High' ? 3 : 2
    );
    
    logActivity(`Created issue via voice: ${newIssue.title}`, 'voice');
    
    setIssueCreatedNotification(newIssue.title);
    setTimeout(() => setIssueCreatedNotification(null), 4000);
  };

  // Clean response for display
  const cleanResponse = (text) => {
    return text.replace(/\[ISSUE_CREATED\].*?\[\/ISSUE_CREATED\]/gs, '').trim();
  };

  // Speak with ElevenLabs
  const speakWithElevenLabs = async (text) => {
    if (muted) {
      setStatus('idle');
      scheduleAutoRestart();
      return;
    }
    
    try {
      setDebugInfo('Calling ElevenLabs...');
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      setDebugInfo(`ElevenLabs response: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`ElevenLabs failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.audio) {
        setDebugInfo('Playing ElevenLabs audio...');
        const audioBlob = base64ToBlob(data.audio, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => {
          setStatus('idle');
          scheduleAutoRestart();
        };
        audioRef.current.onerror = () => {
          fallbackToWebSpeech(text);
        };
        audioRef.current.play();
        setDebugInfo('ElevenLabs playing ✓');
      } else {
        throw new Error('No audio in response');
      }
    } catch (error) {
      setDebugInfo(`ElevenLabs error: ${error.message}`);
      fallbackToWebSpeech(text);
    }
  };

  // Convert base64 to blob
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
    setDebugInfo('Using browser voice (fallback)');
    if (!synthRef.current) synthRef.current = window.speechSynthesis;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
      setStatus('idle');
      scheduleAutoRestart();
    };
    
    synthRef.current.speak(utterance);
  };

  // Schedule auto-restart of listening
  const scheduleAutoRestart = () => {
    if (shouldAutoRestartRef.current) {
      autoRestartTimeoutRef.current = setTimeout(() => {
        if (shouldAutoRestartRef.current) {
          startListening();
        }
      }, 800);
    }
  };

  // Start listening
  const startListening = () => {
    if (!isSupported) {
      setDebugInfo('Browser not supported');
      return;
    }
    
    shouldAutoRestartRef.current = true;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    
    recognitionRef.current.onstart = () => {
      setStatus('listening');
      setTranscript('');
      setDebugInfo('Listening started');
    };
    
    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setTranscript(finalTranscript);
    };
    
    recognitionRef.current.onend = async () => {
      const currentTranscript = transcript || document.querySelector('[data-transcript]')?.textContent;
      
      if (currentTranscript && currentTranscript.trim().length > 0) {
        setDebugInfo(`Got text: "${currentTranscript}"`);
        await processVoiceInput(currentTranscript.trim());
      } else {
        setStatus('idle');
        scheduleAutoRestart();
      }
    };
    
    recognitionRef.current.onerror = (event) => {
      setDebugInfo(`Speech error: ${event.error}`);
      setStatus('idle');
      if (event.error !== 'aborted') {
        scheduleAutoRestart();
      }
    };
    
    recognitionRef.current.start();
  };

  // Process voice input
  const processVoiceInput = async (text) => {
    setStatus('processing');
    setDebugInfo('Calling API...');
    
    try {
      // Build context with semantic search
      const knowledgeContext = await buildKnowledgeContext(text);
      
      const systemPrompt = `You are Carson, Empire AI's voice assistant for Empire Remodeling.

VOICE RESPONSE RULES - FOLLOW STRICTLY:
1. ONE sentence answer maximum - then STOP talking
2. After answering, ask: "Anything else?" or "What else do you need?" or "Need more?"
3. NEVER list multiple items unless user says "list them" or "what are they"
4. NEVER mention where the info came from or your data sources
5. NEVER explain your reasoning
6. Wait for the user to ask follow-up questions

If asked "what's your name" or "who are you": Say "I'm Carson, your Empire AI assistant. How can I help?"

Current Department: ${activeDepartment?.name || 'General'}

${knowledgeContext}

${systemInstructions ? `SYSTEM INSTRUCTIONS:\n${systemInstructions}` : ''}
${activeDepartment?.instructions ? `DEPARTMENT INSTRUCTIONS:\n${activeDepartment.instructions}` : ''}

ISSUE CREATION:
If user wants to create/log/add an issue, include:
[ISSUE_CREATED] Title | Priority | Department | Description [/ISSUE_CREATED]`;

      const apiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          systemPrompt,
          conversationHistory: [],
        }),
      });
      
      setDebugInfo(`API Status: ${apiResponse.status}`);
      
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        let aiResponse = data.response || "I didn't catch that.";
        
        // Check for issue creation
        const issueData = parseIssueFromResponse(aiResponse);
        if (issueData) {
          await createIssue(issueData);
        }
        
        // Clean and display response
        aiResponse = cleanResponse(aiResponse);
        setResponse(aiResponse);
        
        // Log to intelligence
        await addToIntelligence(
          'voice_interaction',
          generateId('voice'),
          `Voice: ${text.substring(0, 50)}`,
          `User asked: ${text}\nCarson responded: ${aiResponse}`,
          activeDepartment?.id || 'general',
          null,
          {},
          1
        );
        
        setDebugInfo('Success!');
        setStatus('speaking');
        await speakWithElevenLabs(aiResponse);
      } else {
        throw new Error(`API error: ${apiResponse.status}`);
      }
    } catch (error) {
      setDebugInfo(`Error: ${error.message}`);
      setResponse("Sorry, I had trouble processing that.");
      setStatus('idle');
      scheduleAutoRestart();
    }
  };

  // Stop all
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  // Status colors
  const getOrbColor = () => {
    switch (status) {
      case 'listening': return '#10B981';
      case 'processing': return '#F59E0B';
      case 'speaking': return '#8B5CF6';
      default: return '#3B82F6';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'speaking': return 'Carson is speaking...';
      default: return 'Tap to speak';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      {/* Issue Created Notification */}
      {issueCreatedNotification && (
        <div style={{
          position: 'absolute',
          top: 20,
          backgroundColor: 'rgba(16, 185, 129, 0.95)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <CheckCircle size={18} />
          Issue created: {issueCreatedNotification}
        </div>
      )}

      {/* Close Button */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'none',
          border: 'none',
          color: '#94A3B8',
          cursor: 'pointer',
          padding: 8,
        }}
      >
        <X size={28} />
      </button>

      {/* Title */}
      <h2 style={{
        color: '#E2E8F0',
        fontSize: 24,
        fontWeight: 600,
        marginBottom: 8,
      }}>
        ✨ Carson <span style={{ fontSize: 14, color: '#8B5CF6' }}>powered by ElevenLabs</span>
      </h2>
      <p style={{ color: '#64748B', marginBottom: 40 }}>
        {activeDepartment?.name || 'General'} • RAG Enhanced
      </p>

      {/* Orb */}
      <div style={{
        width: 180,
        height: 180,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${getOrbColor()}40, ${getOrbColor()}20)`,
        border: `3px solid ${getOrbColor()}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        animation: status !== 'idle' ? 'pulse 2s ease-in-out infinite' : 'none',
        boxShadow: `0 0 60px ${getOrbColor()}40`,
      }}>
        <div style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          backgroundColor: getOrbColor() + '60',
          animation: status === 'processing' ? 'spin 1s linear infinite' : 'none',
        }} />
      </div>

      {/* Status */}
      <p style={{
        color: getOrbColor(),
        fontSize: 18,
        fontWeight: 500,
        marginBottom: 20,
      }}>
        {getStatusText()}
      </p>

      {/* Transcript */}
      {transcript && (
        <div 
          data-transcript
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            padding: '12px 20px',
            borderRadius: 12,
            marginBottom: 16,
            maxWidth: 500,
          }}
        >
          <span style={{ color: '#64748B', fontSize: 12 }}>You:</span>
          <p style={{ color: '#E2E8F0', margin: '4px 0 0' }}>{transcript}</p>
        </div>
      )}

      {/* Response */}
      {response && (
        <div style={{
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          padding: '12px 20px',
          borderRadius: 12,
          marginBottom: 20,
          maxWidth: 500,
        }}>
          <span style={{ color: '#8B5CF6', fontSize: 12 }}>Carson:</span>
          <p style={{ color: '#E2E8F0', margin: '4px 0 0' }}>{response}</p>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 16 }}>
        {status === 'idle' ? (
          <button
            onClick={startListening}
            disabled={!isSupported}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#10B981',
              color: 'white',
              cursor: isSupported ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s',
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
              border: 'none',
              backgroundColor: '#EF4444',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Square size={24} />
          </button>
        )}
        
        <button
          onClick={() => setMuted(!muted)}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            color: muted ? '#EF4444' : '#94A3B8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {/* Debug Info */}
      <p style={{
        color: '#475569',
        fontSize: 11,
        marginTop: 20,
        fontFamily: 'monospace',
      }}>
        {debugInfo}
      </p>

      {!isSupported && (
        <p style={{
          color: '#EF4444',
          fontSize: 13,
          marginTop: 20,
        }}>
          Voice not supported in this browser. Use Chrome or Edge.
        </p>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default VoiceModal;
