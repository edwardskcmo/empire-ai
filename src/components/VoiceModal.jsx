import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, VolumeX, Volume2 } from 'lucide-react';

const VoiceModal = ({ 
  onClose, 
  activeDepartment, 
  systemInstructions, 
  intelligenceIndex, 
  queryIntelligence,
  knowledge,
  connectedDocs,
  logActivity,
  addToIntelligence,
  issues,
  setIssues,
  departments
}) => {
  const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [notification, setNotification] = useState(null);
  
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const autoRestartTimeoutRef = useRef(null);
  const shouldAutoRestartRef = useRef(true);

  useEffect(() => {
    // Check for browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported. Please use Chrome or Edge.');
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      setTranscript(finalTranscript || interimTranscript);
      
      if (finalTranscript) {
        processQuery(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Speech error: ${event.error}`);
      }
      setStatus('idle');
    };

    recognitionRef.current.onend = () => {
      if (status === 'listening') {
        setStatus('idle');
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (autoRestartTimeoutRef.current) {
        clearTimeout(autoRestartTimeoutRef.current);
      }
    };
  }, []);

  const buildKnowledgeContext = (query) => {
    let context = '';
    
    // Add intelligence results
    if (queryIntelligence && intelligenceIndex) {
      const results = queryIntelligence(intelligenceIndex, query, activeDepartment?.id);
      if (results.length > 0) {
        context += '\n=== RELEVANT COMPANY KNOWLEDGE ===\n';
        results.slice(0, 5).forEach((item, i) => {
          context += `${i + 1}. [${item.sourceType}] ${item.title}: ${item.content?.substring(0, 300)}...\n`;
        });
      }
    }
    
    // Add connected docs (Google Sheets/Docs) - increased limit to 50,000
    if (connectedDocs && connectedDocs.length > 0) {
      const syncedDocs = connectedDocs.filter(d => d.status === 'synced' && d.content);
      if (syncedDocs.length > 0) {
        context += '\n=== CONNECTED GOOGLE DOCS/SHEETS ===\n';
        syncedDocs.forEach(doc => {
          context += `\n--- ${doc.name} (${doc.department}) ---\n`;
          context += doc.content?.substring(0, 50000) + '\n';
        });
      }
    }
    
    // Add knowledge base items
    if (knowledge && knowledge.length > 0) {
      const deptKnowledge = activeDepartment 
        ? knowledge.filter(k => k.department === activeDepartment.id || k.department === 'company-wide')
        : knowledge;
      if (deptKnowledge.length > 0) {
        context += '\n=== KNOWLEDGE BASE ===\n';
        deptKnowledge.slice(0, 10).forEach((item, i) => {
          context += `${i + 1}. ${item.title}: ${item.content?.substring(0, 200)}...\n`;
        });
      }
    }
    
    // Add issues
    if (issues && issues.length > 0) {
      const activeIssues = issues.filter(i => !i.archived);
      const resolvedIssues = issues.filter(i => i.archived || i.status === 'Resolved');
      
      if (activeIssues.length > 0) {
        context += '\n=== ISSUES BOARD (Active Issues) ===\n';
        activeIssues.slice(0, 10).forEach((issue, i) => {
          context += `${i + 1}. [${issue.status}] [${issue.priority}] ${issue.title} (Dept: ${issue.department}) - Assigned to: ${issue.assignee || 'Unassigned'}\n`;
          if (issue.description) context += `   Description: ${issue.description}\n`;
        });
      }
      
      if (resolvedIssues.length > 0) {
        context += '\n=== RESOLVED/ARCHIVED ISSUES ===\n';
        resolvedIssues.slice(0, 5).forEach((issue, i) => {
          context += `${i + 1}. ${issue.title} - ${issue.status}\n`;
          if (issue.resolutionNotes) context += `   Resolution: ${issue.resolutionNotes}\n`;
        });
      }
    }
    
    return context;
  };

  const parseIssueFromResponse = (response) => {
    const issueMatch = response.match(/\[ISSUE_CREATED\](.*?)\[\/ISSUE_CREATED\]/s);
    if (issueMatch) {
      const parts = issueMatch[1].split('|').map(p => p.trim());
      if (parts.length >= 2) {
        return {
          title: parts[0],
          priority: parts[1] || 'Medium',
          department: parts[2] || activeDepartment?.name || 'Operations & Admin',
          description: parts[3] || ''
        };
      }
    }
    return null;
  };

  const createIssue = (issueData) => {
    const deptMatch = departments?.find(d => 
      d.name.toLowerCase().includes(issueData.department.toLowerCase()) ||
      issueData.department.toLowerCase().includes(d.name.toLowerCase())
    );
    
    const newIssue = {
      id: 'issue_' + Date.now(),
      title: issueData.title,
      description: issueData.description,
      department: deptMatch?.id || activeDepartment?.id || 'operations',
      priority: issueData.priority,
      status: 'Open',
      assignee: '',
      createdAt: new Date().toISOString(),
      archived: false
    };
    
    if (setIssues) {
      setIssues(prev => [...prev, newIssue]);
    }
    
    if (logActivity) {
      logActivity(`Created issue via voice: ${newIssue.title}`, 'issue');
    }
    
    if (addToIntelligence) {
      addToIntelligence({
        sourceType: 'issue_created',
        sourceId: newIssue.id,
        title: newIssue.title,
        content: `Issue created: ${newIssue.title}. Priority: ${newIssue.priority}. ${newIssue.description}`,
        department: newIssue.department,
        tags: ['issue', 'voice-created', newIssue.priority.toLowerCase()],
        relevanceBoost: newIssue.priority === 'High' ? 3 : newIssue.priority === 'Medium' ? 2 : 1
      });
    }
    
    setNotification(`Issue created: ${newIssue.title}`);
    setTimeout(() => setNotification(null), 3000);
    
    return newIssue;
  };

  const cleanResponseForDisplay = (response) => {
    return response.replace(/\[ISSUE_CREATED\].*?\[\/ISSUE_CREATED\]/gs, '').trim();
  };

  const processQuery = async (query) => {
    setStatus('processing');
    setDebugInfo('Calling API...');
    setError('');
    
    try {
      const knowledgeContext = buildKnowledgeContext(query);
      
      const deptName = activeDepartment?.name || 'General';
      const deptInstructions = activeDepartment?.instructions || '';
      
      let systemPrompt = `You are Carson, Empire Remodeling's voice assistant for the ${deptName} department.

=== CRITICAL: BREVITY RULES ===
You are a VOICE assistant. Users are LISTENING, not reading. Long responses are frustrating.

1. ONE sentence answer maximum - then STOP
2. After answering, ask: "Anything else?" or "What else do you need?"
3. NEVER list multiple items unless specifically asked to "list them all"
4. NEVER mention data sources, spreadsheets, or where info came from
5. NEVER explain your reasoning or add context
6. NEVER volunteer extra information
7. If asked a number: say ONLY the number, then "Anything else?"
8. If asked about one item: give ONLY that item's key detail, then "Anything else?"
9. Wait for user to ask follow-up questions - DO NOT anticipate them

=== RESPONSE FORMAT ===
[Direct answer in 1 sentence]. Anything else?

=== EXAMPLES ===
User: "How many projects do we have?"
GOOD: "You have 54 projects. Anything else?"
BAD: "You have 54 projects. Let me tell you about them - Project 1 is..."

User: "What's project 16?"
GOOD: "Project 16 is the Johnson Kitchen Remodel. Need more details?"
BAD: "Project 16 is the Johnson Kitchen Remodel, located at 123 Main St, with a budget of $45,000, scheduled for..."

User: "How many open issues?"
GOOD: "5 open issues. Want me to list them?"
BAD: "You have 5 open issues. Issue 1 is about permits, Issue 2 is..."

User: "Tell me more about project 16"
GOOD: "It's a $45,000 kitchen remodel starting January 15th. What specifically do you want to know?"

=== ISSUE CREATION ===
If user wants to create/log/report an issue:
[ISSUE_CREATED] Title | Priority | Department | Description [/ISSUE_CREATED]
Say: "Done. Anything else?"

=== IDENTITY ===
If asked your name: "I'm Carson, your Empire AI assistant. How can I help?"`;

      if (systemInstructions) {
        systemPrompt += `\n\n=== SYSTEM INSTRUCTIONS ===\n${systemInstructions}`;
      }
      
      if (deptInstructions) {
        systemPrompt += `\n\n=== ${deptName} INSTRUCTIONS ===\n${deptInstructions}`;
      }
      
      if (knowledgeContext) {
        systemPrompt += `\n\n=== AVAILABLE CONTEXT (Reference only - DO NOT dump this data) ===\n${knowledgeContext}`;
      }

      const apiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          systemPrompt: systemPrompt,
          conversationHistory: []
        })
      });

      setDebugInfo(`API Status: ${apiResponse.status}`);

      if (!apiResponse.ok) {
        throw new Error(`API error: ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      let aiResponse = data.response || 'I could not generate a response.';
      
      // Check for issue creation
      const issueData = parseIssueFromResponse(aiResponse);
      if (issueData) {
        createIssue(issueData);
      }
      
      // Clean response for display
      const displayResponse = cleanResponseForDisplay(aiResponse);
      setResponse(displayResponse);
      setDebugInfo('Success!');
      
      // Log to intelligence
      if (addToIntelligence) {
        addToIntelligence({
          sourceType: 'voice_interaction',
          sourceId: 'voice_' + Date.now(),
          title: query.substring(0, 50),
          content: `Voice Q: ${query}\nVoice A: ${displayResponse.substring(0, 500)}`,
          department: activeDepartment?.id || 'general',
          tags: ['voice', 'query'],
          relevanceBoost: 1
        });
      }
      
      if (logActivity) {
        logActivity(`Voice query: "${query.substring(0, 30)}..."`, 'voice');
      }
      
      // Speak the response using ElevenLabs
      if (!isMuted) {
        await speakWithElevenLabs(displayResponse);
      } else {
        setStatus('idle');
        // Auto-restart listening if not muted
        if (shouldAutoRestartRef.current) {
          autoRestartTimeoutRef.current = setTimeout(() => {
            startListening();
          }, 800);
        }
      }
      
    } catch (err) {
      console.error('Voice processing error:', err);
      setError('Connection issue. Please try again.');
      setDebugInfo(`Error: ${err.message}`);
      setStatus('idle');
    }
  };

  const speakWithElevenLabs = async (text) => {
    setStatus('speaking');
    setDebugInfo('Calling ElevenLabs...');
    
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      setDebugInfo(`ElevenLabs response: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('ElevenLabs failed:', response.status, errorData);
        setDebugInfo(`ElevenLabs error: ${response.status} - ${errorData.error || 'Unknown'}`);
        fallbackToWebSpeech(text);
        return;
      }
      
      const data = await response.json();
      
      // Create audio from base64
      const audioBlob = base64ToBlob(data.audio, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play the audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setStatus('idle');
        
        // Auto-restart listening after speaking
        if (shouldAutoRestartRef.current) {
          autoRestartTimeoutRef.current = setTimeout(() => {
            startListening();
          }, 800);
        }
      };
      
      audioRef.current.onerror = (e) => {
        console.error('Audio playback error:', e);
        URL.revokeObjectURL(audioUrl);
        setStatus('idle');
      };
      
      audioRef.current.play();
      
    } catch (err) {
      console.error('ElevenLabs error:', err);
      fallbackToWebSpeech(text);
    }
  };

  const base64ToBlob = (base64, contentType) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: contentType });
  };

  const fallbackToWebSpeech = (text) => {
    if ('speechSynthesis' in window) {
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
      
      window.speechSynthesis.speak(utterance);
    } else {
      setStatus('idle');
    }
  };

  const startListening = () => {
    if (recognitionRef.current && status === 'idle') {
      setTranscript('');
      setError('');
      shouldAutoRestartRef.current = true;
      
      try {
        recognitionRef.current.start();
        setStatus('listening');
        setDebugInfo('Listening started');
      } catch (err) {
        console.error('Failed to start recognition:', err);
      }
    }
  };

  const stopAll = () => {
    shouldAutoRestartRef.current = false;
    
    if (autoRestartTimeoutRef.current) {
      clearTimeout(autoRestartTimeoutRef.current);
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    setStatus('idle');
  };

  const handleClose = () => {
    stopAll();
    onClose();
  };

  const getOrbStyle = () => {
    const baseStyle = {
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
    };
    
    switch (status) {
      case 'listening':
        return {
          ...baseStyle,
          background: 'radial-gradient(circle, #10B981 0%, #059669 50%, #047857 100%)',
          boxShadow: '0 0 40px rgba(16, 185, 129, 0.6)',
          animation: 'pulse 1.5s ease-in-out infinite',
        };
      case 'processing':
        return {
          ...baseStyle,
          background: 'radial-gradient(circle, #F59E0B 0%, #D97706 50%, #B45309 100%)',
          boxShadow: '0 0 40px rgba(245, 158, 11, 0.6)',
          animation: 'spin 1s linear infinite',
        };
      case 'speaking':
        return {
          ...baseStyle,
          background: 'radial-gradient(circle, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
          boxShadow: '0 0 40px rgba(139, 92, 246, 0.6)',
          animation: 'pulse 1s ease-in-out infinite',
        };
      default:
        return {
          ...baseStyle,
          background: 'radial-gradient(circle, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
          boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
        };
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
        borderRadius: '24px',
        padding: '40px',
        width: '90%',
        maxWidth: '500px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
      }}>
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            color: '#94A3B8',
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ color: '#E2E8F0', margin: 0, fontSize: '24px' }}>Voice Mode</h2>
          <p style={{ color: '#64748B', margin: '8px 0 0', fontSize: '14px' }}>
            {activeDepartment?.name || 'General'} Department
          </p>
          <p style={{ color: '#10B981', margin: '4px 0 0', fontSize: '12px' }}>
            ✨ Carson powered by ElevenLabs
          </p>
        </div>

        {/* Orb */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <div style={getOrbStyle()}>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
              {status === 'idle' && 'Ready'}
              {status === 'listening' && 'Listening...'}
              {status === 'processing' && 'Thinking...'}
              {status === 'speaking' && 'Speaking...'}
            </span>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid #10B981',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            textAlign: 'center',
            color: '#10B981',
          }}>
            ✓ {notification}
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 4px' }}>You said:</p>
            <p style={{ color: '#E2E8F0', margin: 0 }}>{transcript}</p>
          </div>
        )}

        {/* Response */}
        {response && (
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 4px' }}>Carson:</p>
            <p style={{ color: '#E2E8F0', margin: 0 }}>{response}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <p style={{ color: '#EF4444', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Debug info - can remove later */}
        {debugInfo && (
          <p style={{ color: '#64748B', fontSize: '11px', textAlign: 'center', margin: '0 0 16px' }}>
            {debugInfo}
          </p>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          {status === 'idle' ? (
            <button
              onClick={startListening}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '50%',
                width: '64px',
                height: '64px',
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
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                border: 'none',
                borderRadius: '50%',
                width: '64px',
                height: '64px',
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

          <button
            onClick={() => setIsMuted(!isMuted)}
            style={{
              background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid ' + (isMuted ? '#EF4444' : 'rgba(255, 255, 255, 0.2)'),
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isMuted ? <VolumeX size={20} color="#EF4444" /> : <Volume2 size={20} color="#94A3B8" />}
          </button>
        </div>

        {/* Mute indicator */}
        {isMuted && (
          <p style={{ color: '#EF4444', fontSize: '12px', textAlign: 'center', marginTop: '12px' }}>
            Voice output muted
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceModal;
