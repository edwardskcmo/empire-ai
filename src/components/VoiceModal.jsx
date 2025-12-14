import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, VolumeX, Volume2 } from 'lucide-react';

export default function VoiceModal({
  onClose,
  activeDepartment,
  systemInstructions,
  intelligenceIndex,
  queryIntelligence,
  logActivity,
  addToIntelligence,
  knowledge,
  connectedDocs
}) {
  const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);
  const autoRestartTimeoutRef = useRef(null);
  const shouldAutoRestartRef = useRef(true);

  // Check browser support
  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  useEffect(() => {
    // Initialize speech recognition
    if (isSupported) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptText = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptText;
          } else {
            interimTranscript += transcriptText;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
          handleUserInput(finalTranscript);
        } else {
          setTranscript(interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          setError('No speech detected. Tap the mic to try again.');
        } else if (event.error === 'audio-capture') {
          setError('No microphone found. Please check your mic.');
        } else if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow access in browser settings.');
        } else {
          setError(`Error: ${event.error}`);
        }
        setStatus('idle');
      };

      recognitionRef.current.onend = () => {
        // Recognition ended - status will be managed by handleUserInput or error handler
      };
    }

    return () => {
      // Cleanup on unmount
      if (autoRestartTimeoutRef.current) {
        clearTimeout(autoRestartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const buildKnowledgeContext = (query) => {
    let context = '';
    
    // Get relevant items from intelligence
    if (queryIntelligence && intelligenceIndex) {
      const relevant = queryIntelligence(intelligenceIndex, query, activeDepartment?.id);
      if (relevant && relevant.length > 0) {
        context += '\n\nRelevant company knowledge:\n';
        relevant.slice(0, 5).forEach((item, i) => {
          const label = item.sourceType === 'knowledge' ? 'Knowledge' : 
                       item.sourceType === 'resolved_issue' ? 'Resolved Issue' :
                       item.sourceType === 'google_doc' ? 'Connected Doc' : 'Info';
          context += `${i + 1}. [${label}] ${item.title}: ${item.content?.substring(0, 300)}...\n`;
        });
      }
    }

    // Include connected docs/sheets content - THIS IS KEY FOR SPREADSHEET ACCESS
    if (connectedDocs && connectedDocs.length > 0) {
      const syncedDocs = connectedDocs.filter(d => d.status === 'synced' && d.content);
      if (syncedDocs.length > 0) {
        context += '\n\nConnected Google Docs/Sheets data:\n';
        syncedDocs.forEach((doc) => {
          context += `\n--- ${doc.name} (${doc.department || 'General'}) ---\n`;
          context += doc.content?.substring(0, 1500) + (doc.content?.length > 1500 ? '...' : '') + '\n';
        });
      }
    }

    // Include relevant knowledge items
    if (knowledge && knowledge.length > 0) {
      const deptKnowledge = activeDepartment 
        ? knowledge.filter(k => k.department === activeDepartment.id || k.department === 'company-wide')
        : knowledge;
      
      if (deptKnowledge.length > 0 && !context.includes('Knowledge base items')) {
        context += '\n\nKnowledge base items:\n';
        deptKnowledge.slice(0, 3).forEach((item, i) => {
          context += `${i + 1}. ${item.title}: ${item.content?.substring(0, 200)}...\n`;
        });
      }
    }

    return context;
  };

  const handleUserInput = async (text) => {
    if (!text.trim()) return;
    
    setStatus('processing');
    setError('');

    // Build context including connected sheets/docs
    const knowledgeContext = buildKnowledgeContext(text);

    // Build system prompt
    let systemPrompt = `You are Empire AI, the operational intelligence assistant for Empire Remodeling. You are having a voice conversation, so keep responses conversational and concise (2-4 sentences unless more detail is needed). Be helpful and reference company data when relevant.`;

    if (activeDepartment) {
      systemPrompt += `\n\nCurrent Department: ${activeDepartment.name}`;
      if (activeDepartment.description) {
        systemPrompt += `\nDepartment Focus: ${activeDepartment.description}`;
      }
      if (activeDepartment.instructions) {
        systemPrompt += `\n\nDepartment Instructions: ${activeDepartment.instructions}`;
      }
    }

    if (systemInstructions) {
      systemPrompt += `\n\nSystem-wide Instructions: ${systemInstructions}`;
    }

    if (knowledgeContext) {
      systemPrompt += knowledgeContext;
    }

    // Add conversation history for context
    const historyForAPI = conversationHistory.slice(-6).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          systemPrompt,
          conversationHistory: historyForAPI
        })
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      const aiResponse = data.response || "I'm sorry, I couldn't process that request.";

      setResponse(aiResponse);
      
      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: aiResponse }
      ]);

      // Log to intelligence
      if (addToIntelligence) {
        addToIntelligence({
          sourceType: 'voice_interaction',
          sourceId: `voice_${Date.now()}`,
          title: `Voice: ${text.substring(0, 50)}...`,
          content: `Q: ${text}\nA: ${aiResponse}`,
          department: activeDepartment?.id || 'general',
          tags: ['voice', 'query'],
          metadata: { type: 'voice' },
          relevanceBoost: 1
        });
      }

      // Log activity
      if (logActivity) {
        logActivity(`Voice conversation in ${activeDepartment?.name || 'General'}`, 'voice');
      }

      // Speak the response
      if (!isMuted) {
        speakResponse(aiResponse);
      } else {
        setStatus('idle');
      }

    } catch (err) {
      console.error('Voice API error:', err);
      setError('Having trouble connecting. Please try again.');
      setResponse('');
      setStatus('idle');
    }
  };

  const speakResponse = (text) => {
    setStatus('speaking');
    
    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to get a natural voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Samantha') || 
      v.name.includes('Google') || 
      v.name.includes('Natural') ||
      v.lang.startsWith('en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      setStatus('idle');
      
      // Auto-start listening again for continuous conversation
      // Use ref to check if we should continue (avoids stale closure)
      if (shouldAutoRestartRef.current) {
        autoRestartTimeoutRef.current = setTimeout(() => {
          startListening();
        }, 800);
      }
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setStatus('idle');
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const startListening = () => {
    if (!isSupported) {
      setError('Speech recognition not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    // Clear any pending auto-restart
    if (autoRestartTimeoutRef.current) {
      clearTimeout(autoRestartTimeoutRef.current);
    }

    setError('');
    setTranscript('');
    setStatus('listening');
    shouldAutoRestartRef.current = true;

    try {
      recognitionRef.current.start();
    } catch (e) {
      // Already started, ignore
      console.log('Recognition already active');
    }
  };

  const stopAll = () => {
    // Disable auto-restart
    shouldAutoRestartRef.current = false;
    
    // Clear any pending auto-restart timeout
    if (autoRestartTimeoutRef.current) {
      clearTimeout(autoRestartTimeoutRef.current);
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setStatus('idle');
  };

  const handleClose = () => {
    stopAll();
    onClose();
  };

  const getOrbStyle = () => {
    const baseStyle = {
      width: '200px',
      height: '200px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
      position: 'relative'
    };

    switch (status) {
      case 'listening':
        return {
          ...baseStyle,
          background: 'radial-gradient(circle, #10B981 0%, #059669 50%, #047857 100%)',
          boxShadow: '0 0 60px rgba(16, 185, 129, 0.6)',
          animation: 'pulse 1.5s ease-in-out infinite'
        };
      case 'processing':
        return {
          ...baseStyle,
          background: 'radial-gradient(circle, #F59E0B 0%, #D97706 50%, #B45309 100%)',
          boxShadow: '0 0 60px rgba(245, 158, 11, 0.6)',
          animation: 'spin 2s linear infinite'
        };
      case 'speaking':
        return {
          ...baseStyle,
          background: 'radial-gradient(circle, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
          boxShadow: '0 0 60px rgba(139, 92, 246, 0.6)',
          animation: 'pulse 1s ease-in-out infinite'
        };
      default:
        return {
          ...baseStyle,
          background: 'radial-gradient(circle, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
          boxShadow: '0 0 40px rgba(59, 130, 246, 0.4)'
        };
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      default: return 'Tap microphone to start';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{
        background: 'rgba(30, 41, 59, 0.95)',
        borderRadius: '24px',
        padding: '40px',
        width: '500px',
        maxWidth: '90vw',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ color: '#E2E8F0', fontSize: '24px', fontWeight: '700', margin: 0 }}>
              Voice Mode
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '14px', margin: '4px 0 0 0' }}>
              {activeDepartment?.name || 'General'} Assistant
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: '#94A3B8'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Orb */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={getOrbStyle()}>
            <Mic size={60} style={{ color: 'white', opacity: 0.9 }} />
          </div>
        </div>

        {/* Status */}
        <p style={{ textAlign: 'center', color: '#E2E8F0', fontSize: '18px', marginBottom: '20px' }}>
          {getStatusText()}
        </p>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            color: '#FCA5A5',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px'
          }}>
            <p style={{ color: '#6EE7B7', fontSize: '12px', marginBottom: '4px' }}>You said:</p>
            <p style={{ color: '#E2E8F0', fontSize: '14px', margin: 0 }}>{transcript}</p>
          </div>
        )}

        {/* Response */}
        {response && (
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            maxHeight: '150px',
            overflowY: 'auto'
          }}>
            <p style={{ color: '#A78BFA', fontSize: '12px', marginBottom: '4px' }}>Empire AI:</p>
            <p style={{ color: '#E2E8F0', fontSize: '14px', margin: 0 }}>{response}</p>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          {status === 'idle' ? (
            <button
              onClick={startListening}
              style={{
                background: '#10B981',
                border: 'none',
                borderRadius: '50%',
                width: '64px',
                height: '64px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
              }}
            >
              <Mic size={28} style={{ color: 'white' }} />
            </button>
          ) : (
            <button
              onClick={stopAll}
              style={{
                background: '#EF4444',
                border: 'none',
                borderRadius: '50%',
                width: '64px',
                height: '64px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)'
              }}
            >
              <Square size={24} style={{ color: 'white' }} />
            </button>
          )}

          {/* Mute Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            style={{
              background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)',
              border: '1px solid ' + (isMuted ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.2)'),
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isMuted ? 'Unmute responses' : 'Mute responses'}
          >
            {isMuted ? (
              <VolumeX size={20} style={{ color: '#EF4444' }} />
            ) : (
              <Volume2 size={20} style={{ color: '#94A3B8' }} />
            )}
          </button>
        </div>

        {/* Browser Support Notice */}
        {!isSupported && (
          <p style={{ color: '#F59E0B', fontSize: '12px', textAlign: 'center', marginTop: '16px' }}>
            Voice recognition requires Chrome or Edge browser
          </p>
        )}

        {/* Conversation indicator */}
        {conversationHistory.length > 0 && (
          <p style={{ color: '#64748B', fontSize: '12px', textAlign: 'center', marginTop: '16px' }}>
            {Math.floor(conversationHistory.length / 2)} exchanges in this session
          </p>
        )}
      </div>
    </div>
  );
}
