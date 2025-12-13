import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, MicOff, Square, Volume2, VolumeX, AlertCircle } from 'lucide-react';

const VoiceModal = ({ 
  isOpen, 
  onClose, 
  activeDepartment,
  systemInstructions,
  intelligenceIndex,
  queryIntelligence,
  addActivity,
  addToIntelligence
}) => {
  // Voice states
  const [voiceStatus, setVoiceStatus] = useState('idle'); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  
  // Refs
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Voice recognition not supported in this browser. Please use Chrome or Edge.');
    }
  }, []);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
    };
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setVoiceStatus('idle');
      setTranscript('');
      setResponse('');
      setError(null);
    } else {
      stopListening();
      stopSpeaking();
    }
  }, [isOpen]);

  // Build intelligence context for AI
  const buildIntelligenceContext = useCallback((query) => {
    if (!queryIntelligence || !intelligenceIndex) return '';
    
    const deptName = activeDepartment?.name || 'General';
    const relevant = queryIntelligence(intelligenceIndex, query, deptName);
    
    if (relevant.length === 0) return '';
    
    let context = '\n\nRelevant company knowledge:\n';
    relevant.slice(0, 5).forEach((item, i) => {
      const label = item.sourceType === 'knowledge' ? 'Knowledge Base' :
                    item.sourceType === 'resolved_issue' ? 'Resolved Issue' :
                    item.sourceType === 'chat_query' ? 'Previous Discussion' : 'Reference';
      context += `${i + 1}. [${label}] ${item.title}: ${item.content.substring(0, 200)}...\n`;
    });
    
    return context;
  }, [queryIntelligence, intelligenceIndex, activeDepartment]);

  // Send message to AI
  const sendToAI = async (message) => {
    const deptName = activeDepartment?.name || 'General';
    const deptDesc = activeDepartment?.description || '';
    const deptInstructions = activeDepartment?.instructions || '';
    
    // Build system prompt
    let systemPrompt = `You are Empire AI, the operational intelligence assistant for Empire Remodeling. 
You are currently in VOICE MODE - keep responses concise and conversational (2-3 sentences max unless more detail is requested).
Current Department: ${deptName}
Department Focus: ${deptDesc}`;

    if (systemInstructions?.trim()) {
      systemPrompt += `\n\n=== SYSTEM-WIDE INSTRUCTIONS ===\n${systemInstructions}`;
    }
    
    if (deptInstructions?.trim()) {
      systemPrompt += `\n\n=== ${deptName} DEPARTMENT INSTRUCTIONS ===\n${deptInstructions}`;
    }

    const intelligenceContext = buildIntelligenceContext(message);
    if (intelligenceContext) {
      systemPrompt += intelligenceContext;
    }

    systemPrompt += `\n\nRespond naturally and helpfully. Remember: this is voice mode, so be brief and clear.`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          systemPrompt,
          conversationHistory: []
        })
      });

      if (!res.ok) {
        throw new Error('API request failed');
      }

      const data = await res.json();
      return data.response;
    } catch (err) {
      console.error('Voice AI error:', err);
      return "I'm having trouble connecting right now. Please try again or use the chat interface.";
    }
  };

  // Text to Speech
  const speak = useCallback((text) => {
    if (isMuted || !text) {
      setVoiceStatus('idle');
      return;
    }

    stopSpeaking();
    setVoiceStatus('speaking');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to get a natural voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Natural') || 
      v.name.includes('Samantha') ||
      v.lang.startsWith('en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      setVoiceStatus('idle');
    };

    utterance.onerror = (e) => {
      console.error('Speech error:', e);
      setVoiceStatus('idle');
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [isMuted]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }
  }, []);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) return;

    setError(null);
    setTranscript('');
    setResponse('');
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setVoiceStatus('listening');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onend = async () => {
      const currentTranscript = transcript;
      
      if (currentTranscript && currentTranscript.trim().length > 0) {
        setVoiceStatus('processing');
        
        // Log to intelligence
        if (addToIntelligence) {
          addToIntelligence({
            sourceType: 'voice_interaction',
            sourceId: `voice_${Date.now()}`,
            title: 'Voice Query',
            content: currentTranscript,
            department: activeDepartment?.name || 'General',
            tags: ['voice', 'query'],
            metadata: { timestamp: new Date().toISOString() },
            relevanceBoost: 1
          });
        }

        // Get AI response
        const aiResponse = await sendToAI(currentTranscript);
        setResponse(aiResponse);

        // Log activity
        if (addActivity) {
          addActivity(`Voice conversation in ${activeDepartment?.name || 'General'}`);
        }

        // Speak the response
        speak(aiResponse);
      } else {
        setVoiceStatus('idle');
      }
    };

    recognition.onerror = (event) => {
      console.error('Recognition error:', event.error);
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'audio-capture') {
        setError('No microphone found. Please check your settings.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access.');
      } else {
        setError(`Error: ${event.error}`);
      }
      setVoiceStatus('idle');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, transcript, activeDepartment, addToIntelligence, addActivity, speak, sendToAI]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // Handle main button click
  const handleMainButton = () => {
    if (voiceStatus === 'idle') {
      startListening();
    } else if (voiceStatus === 'listening') {
      stopListening();
    } else if (voiceStatus === 'speaking') {
      stopSpeaking();
      setVoiceStatus('idle');
    }
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted && voiceStatus === 'speaking') {
      stopSpeaking();
      setVoiceStatus('idle');
    }
  };

  if (!isOpen) return null;

  // Status colors and animations
  const getOrbStyle = () => {
    const baseStyle = {
      width: '200px',
      height: '200px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.5s ease',
      position: 'relative'
    };

    switch (voiceStatus) {
      case 'listening':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, rgba(16,185,129,0.4), rgba(59,130,246,0.4))',
          boxShadow: '0 0 60px rgba(16,185,129,0.4), 0 0 100px rgba(16,185,129,0.2)',
          animation: 'pulse 1.5s ease-in-out infinite'
        };
      case 'processing':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, rgba(245,158,11,0.4), rgba(239,68,68,0.4))',
          boxShadow: '0 0 60px rgba(245,158,11,0.4)',
          animation: 'spin 2s linear infinite'
        };
      case 'speaking':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(59,130,246,0.4))',
          boxShadow: '0 0 60px rgba(139,92,246,0.4), 0 0 100px rgba(139,92,246,0.2)',
          animation: 'pulse 0.8s ease-in-out infinite'
        };
      default:
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
          boxShadow: 'none'
        };
    }
  };

  const getStatusText = () => {
    switch (voiceStatus) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      default: return 'Tap to speak';
    }
  };

  const getStatusColor = () => {
    switch (voiceStatus) {
      case 'listening': return '#10B981';
      case 'processing': return '#F59E0B';
      case 'speaking': return '#8B5CF6';
      default: return '#64748B';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.9)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      {/* CSS Animations */}
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

      {/* Modal Content */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.95)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '40px',
        width: '500px',
        maxWidth: '90vw',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#94A3B8'
          }}
        >
          <X size={20} />
        </button>

        {/* Department Header */}
        <div style={{ marginBottom: '8px', fontSize: '13px', color: '#64748B' }}>
          Voice Mode
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '32px', color: '#E2E8F0' }}>
          {activeDepartment?.name || 'Empire AI'}
        </h2>

        {/* Browser Support Warning */}
        {!isSupported && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <AlertCircle size={24} color="#EF4444" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: '600', color: '#EF4444', marginBottom: '4px' }}>
                Browser Not Supported
              </div>
              <div style={{ fontSize: '13px', color: '#94A3B8' }}>
                Please use Chrome or Edge for voice features.
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#F59E0B'
          }}>
            {error}
          </div>
        )}

        {/* Voice Orb */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '32px'
        }}>
          <div style={getOrbStyle()}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {voiceStatus === 'listening' ? (
                <Mic size={48} color="#fff" />
              ) : voiceStatus === 'processing' ? (
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                <Mic size={48} color="#fff" />
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '8px', 
            color: getStatusColor() 
          }}>
            {getStatusText()}
          </div>
        </div>

        {/* Transcript */}
        {transcript && (
          <div style={{
            marginBottom: '16px',
            padding: '16px',
            background: 'rgba(59,130,246,0.1)',
            borderRadius: '12px',
            textAlign: 'left'
          }}>
            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              You said
            </div>
            <div style={{ fontSize: '15px', color: '#E2E8F0', lineHeight: '1.5' }}>
              {transcript}
            </div>
          </div>
        )}

        {/* Response */}
        {response && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(139,92,246,0.1)',
            borderRadius: '12px',
            textAlign: 'left'
          }}>
            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Empire AI
            </div>
            <div style={{ fontSize: '15px', color: '#E2E8F0', lineHeight: '1.5' }}>
              {response}
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center' }}>
          {/* Main Button */}
          <button
            onClick={handleMainButton}
            disabled={!isSupported || voiceStatus === 'processing'}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: voiceStatus === 'idle' 
                ? 'linear-gradient(135deg, #10B981, #059669)' 
                : voiceStatus === 'listening'
                ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSupported && voiceStatus !== 'processing' ? 'pointer' : 'not-allowed',
              opacity: !isSupported || voiceStatus === 'processing' ? 0.5 : 1,
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}
          >
            {voiceStatus === 'idle' && <Mic size={28} color="#fff" />}
            {voiceStatus === 'listening' && <Square size={24} color="#fff" />}
            {voiceStatus === 'processing' && <div style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
            {voiceStatus === 'speaking' && <Square size={24} color="#fff" />}
          </button>

          {/* Mute Button */}
          <button
            onClick={toggleMute}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}
          >
            {isMuted ? (
              <VolumeX size={20} color="#EF4444" />
            ) : (
              <Volume2 size={20} color="#E2E8F0" />
            )}
          </button>
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: '24px',
          fontSize: '13px',
          color: '#64748B'
        }}>
          {voiceStatus === 'idle' && 'Tap the microphone to start speaking'}
          {voiceStatus === 'listening' && 'Speak clearly, then pause when done'}
          {voiceStatus === 'processing' && 'Getting response...'}
          {voiceStatus === 'speaking' && 'Tap to stop speaking'}
        </div>
      </div>
    </div>
  );
};

export default VoiceModal;
