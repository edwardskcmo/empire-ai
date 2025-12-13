// ==========================================
// VOICE MODAL - Real Voice Functionality
// Uses Web Speech API + existing Claude API
// ==========================================

import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Square, Volume2, VolumeX, AlertCircle } from 'lucide-react';

const VoiceModal = ({ 
  onClose, 
  activeDepartment,
  systemInstructions,
  intelligenceIndex,
  queryIntelligence,
  logActivity,
  addToIntelligence
}) => {
  // State
  const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  
  // Refs
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Voice not supported. Please use Chrome or Edge.');
    }
    
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Build context for AI
  const buildContext = (query) => {
    if (!queryIntelligence || !intelligenceIndex) return '';
    
    try {
      const deptName = activeDepartment?.name || 'General';
      const relevant = queryIntelligence(intelligenceIndex, query, deptName);
      
      if (!relevant || relevant.length === 0) return '';
      
      let context = '\n\nRelevant company knowledge:\n';
      relevant.slice(0, 3).forEach((item, i) => {
        context += `${i + 1}. ${item.title}: ${item.content?.substring(0, 150) || ''}...\n`;
      });
      return context;
    } catch (e) {
      console.error('Context build error:', e);
      return '';
    }
  };

  // Send to AI
  const sendToAI = async (message) => {
    const deptName = activeDepartment?.name || 'General';
    const deptDesc = activeDepartment?.description || '';
    const deptInstructions = activeDepartment?.instructions || '';
    
    let systemPrompt = `You are Empire AI, the assistant for Empire Remodeling. 
VOICE MODE: Keep responses brief (2-3 sentences max).
Department: ${deptName}
Focus: ${deptDesc}`;

    if (systemInstructions) {
      systemPrompt += `\n\nSystem Instructions: ${systemInstructions}`;
    }
    
    if (deptInstructions) {
      systemPrompt += `\n\nDepartment Instructions: ${deptInstructions}`;
    }

    const context = buildContext(message);
    if (context) {
      systemPrompt += context;
    }

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

      if (!res.ok) throw new Error('API error');
      
      const data = await res.json();
      return data.response || "I couldn't process that. Please try again.";
    } catch (err) {
      console.error('AI error:', err);
      return "I'm having trouble connecting. Please try the chat interface instead.";
    }
  };

  // Speak response
  const speak = (text) => {
    if (isMuted || !text || !window.speechSynthesis) {
      setStatus('idle');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      setStatus('speaking');
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      utterance.onend = () => setStatus('idle');
      utterance.onerror = () => setStatus('idle');
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech error:', e);
      setStatus('idle');
    }
  };

  // Start listening
  const startListening = () => {
    if (!isSupported) return;
    
    setError(null);
    setTranscript('');
    setResponse('');
    transcriptRef.current = '';
    
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setStatus('listening');
      };

      recognition.onresult = (event) => {
        let finalText = '';
        let interimText = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }

        const currentText = finalText || interimText;
        transcriptRef.current = currentText;
        setTranscript(currentText);
      };

      recognition.onend = async () => {
        const spokenText = transcriptRef.current.trim();
        
        if (spokenText.length > 0) {
          setStatus('processing');
          
          // Log to intelligence
          if (addToIntelligence) {
            try {
              addToIntelligence(
                'voice_interaction',
                `voice_${Date.now()}`,
                'Voice Query',
                spokenText,
                activeDepartment?.name || 'General',
                {},
                1
              );
            } catch (e) {}
          }

          // Get AI response
          const aiResponse = await sendToAI(spokenText);
          setResponse(aiResponse);

          // Log activity
          if (logActivity) {
            try {
              logActivity(`Voice: ${spokenText.substring(0, 50)}...`);
            } catch (e) {}
          }

          // Speak it
          speak(aiResponse);
        } else {
          setStatus('idle');
          setError('No speech detected. Try again.');
        }
      };

      recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        setStatus('idle');
        
        if (event.error === 'no-speech') {
          setError('No speech detected. Please try again.');
        } else if (event.error === 'audio-capture') {
          setError('No microphone found.');
        } else if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow access.');
        } else {
          setError('Voice error. Please try again.');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Start error:', e);
      setError('Could not start voice. Try refreshing.');
      setStatus('idle');
    }
  };

  // Stop everything
  const stopAll = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setStatus('idle');
  };

  // Main button handler
  const handleMainButton = () => {
    if (status === 'idle') {
      startListening();
    } else {
      stopAll();
    }
  };

  // Get orb color
  const getOrbColor = () => {
    switch (status) {
      case 'listening': return 'linear-gradient(135deg, #10B981, #059669)';
      case 'processing': return 'linear-gradient(135deg, #F59E0B, #D97706)';
      case 'speaking': return 'linear-gradient(135deg, #8B5CF6, #7C3AED)';
      default: return 'linear-gradient(135deg, #3B82F6, #2563EB)';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      default: return 'Tap to speak';
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
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
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '40px',
        width: '480px',
        maxWidth: '90vw',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Close */}
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

        {/* Header */}
        <div style={{ marginBottom: '8px', fontSize: '13px', color: '#64748B' }}>
          Voice Mode
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px', color: '#E2E8F0' }}>
          {activeDepartment?.name || 'Empire AI'}
        </h2>

        {/* Browser Warning */}
        {!isSupported && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <AlertCircle size={24} color="#EF4444" />
            <div style={{ textAlign: 'left', fontSize: '14px', color: '#EF4444' }}>
              Please use Chrome or Edge for voice features.
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(245,158,11,0.1)',
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#F59E0B'
          }}>
            {error}
          </div>
        )}

        {/* Orb */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            background: getOrbColor(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: status !== 'idle' ? '0 0 40px rgba(59,130,246,0.3)' : 'none',
            animation: status === 'listening' || status === 'speaking' ? 'pulse 1.5s ease-in-out infinite' : 'none',
            transition: 'all 0.3s ease'
          }}>
            {status === 'processing' ? (
              <div style={{
                width: '40px',
                height: '40px',
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

        {/* Status */}
        <div style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '20px',
          color: status === 'listening' ? '#10B981' : 
                 status === 'processing' ? '#F59E0B' : 
                 status === 'speaking' ? '#8B5CF6' : '#64748B'
        }}>
          {getStatusText()}
        </div>

        {/* Transcript */}
        {transcript && (
          <div style={{
            background: 'rgba(59,130,246,0.1)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '12px',
            textAlign: 'left'
          }}>
            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>
              You said
            </div>
            <div style={{ fontSize: '14px', color: '#E2E8F0' }}>{transcript}</div>
          </div>
        )}

        {/* Response */}
        {response && (
          <div style={{
            background: 'rgba(139,92,246,0.1)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>
              Empire AI
            </div>
            <div style={{ fontSize: '14px', color: '#E2E8F0', lineHeight: '1.5' }}>{response}</div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center' }}>
          {/* Main Button */}
          <button
            onClick={handleMainButton}
            disabled={!isSupported}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: status === 'idle' 
                ? 'linear-gradient(135deg, #10B981, #059669)' 
                : 'linear-gradient(135deg, #EF4444, #DC2626)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSupported ? 'pointer' : 'not-allowed',
              opacity: isSupported ? 1 : 0.5,
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
            }}
          >
            {status === 'idle' ? <Mic size={26} color="#fff" /> : <Square size={22} color="#fff" />}
          </button>

          {/* Mute */}
          <button
            onClick={() => {
              setIsMuted(!isMuted);
              if (!isMuted && status === 'speaking') {
                window.speechSynthesis?.cancel();
                setStatus('idle');
              }
            }}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isMuted ? <VolumeX size={18} color="#EF4444" /> : <Volume2 size={18} color="#E2E8F0" />}
          </button>
        </div>

        {/* Hint */}
        <div style={{ marginTop: '20px', fontSize: '13px', color: '#64748B' }}>
          {status === 'idle' && 'Tap microphone to start'}
          {status === 'listening' && 'Speak clearly, then pause'}
          {status === 'processing' && 'Processing...'}
          {status === 'speaking' && 'Tap stop to interrupt'}
        </div>
      </div>
    </div>
  );
};

export default VoiceModal;
