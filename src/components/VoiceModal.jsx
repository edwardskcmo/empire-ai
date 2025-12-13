// ==========================================
// EMPIRE AI - VOICE MODE MODAL
// Animated orb visualizer with voice interaction
// ==========================================

import React, { useState, useEffect } from 'react';
import { X, Mic, MicOff, Square, Volume2 } from 'lucide-react';

export default function VoiceModal({ onClose, logActivity, addToIntelligence }) {
  const [voiceState, setVoiceState] = useState('idle'); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // Simulate voice interaction for demo
  const startListening = () => {
    setVoiceState('listening');
    setTranscript('');
    setResponse('');
    
    // Log voice session start
    addToIntelligence('voice_session', `voice_${Date.now()}`, 'Voice session started', 'User initiated voice mode', 'general', {}, 0);
    
    // Simulate listening for 3 seconds
    setTimeout(() => {
      setTranscript('What are the safety requirements for the Johnson project?');
      setVoiceState('processing');
      
      // Simulate processing
      setTimeout(() => {
        const aiResponse = 'Based on our safety protocols, the Johnson project requires hard hats, safety vests, and fall protection for any work above 6 feet. I also recommend scheduling a safety briefing before the crew starts.';
        setResponse(aiResponse);
        setVoiceState('speaking');
        
        // Log the interaction
        addToIntelligence(
          'voice_interaction',
          `voice_${Date.now()}`,
          'Voice: Safety requirements query',
          `Q: What are the safety requirements for the Johnson project?\nA: ${aiResponse}`,
          'general',
          {},
          1
        );
        logActivity('Voice interaction', 'Safety requirements query');
        
        // Return to idle after "speaking"
        setTimeout(() => {
          setVoiceState('idle');
        }, 4000);
      }, 1500);
    }, 3000);
  };

  const stopListening = () => {
    setVoiceState('idle');
  };

  // Orb colors based on state
  const orbColors = {
    idle: ['#3B82F6', '#6366F1'],
    listening: ['#10B981', '#059669'],
    processing: ['#F59E0B', '#D97706'],
    speaking: ['#8B5CF6', '#7C3AED']
  };

  const currentColors = orbColors[voiceState];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: 8,
          padding: 12,
          color: '#94A3B8',
          cursor: 'pointer'
        }}
      >
        <X size={24} />
      </button>

      {/* Status */}
      <div style={{
        position: 'absolute',
        top: 24,
        left: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          background: voiceState === 'idle' ? '#64748B' : currentColors[0],
          animation: voiceState !== 'idle' ? 'pulse 1s infinite' : 'none'
        }} />
        <span style={{ color: '#94A3B8', fontSize: 14, textTransform: 'capitalize' }}>
          {voiceState === 'idle' ? 'Ready' : voiceState}
        </span>
      </div>

      {/* Orb Visualizer */}
      <div style={{
        position: 'relative',
        width: 200,
        height: 200,
        marginBottom: 48
      }}>
        {/* Outer glow */}
        <div style={{
          position: 'absolute',
          inset: -20,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${currentColors[0]}33 0%, transparent 70%)`,
          animation: voiceState !== 'idle' ? 'pulse 2s infinite' : 'none'
        }} />
        
        {/* Main orb */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${currentColors[0]}, ${currentColors[1]})`,
          boxShadow: `0 0 60px ${currentColors[0]}66`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: voiceState === 'listening' ? 'pulse 1s infinite' : 
                     voiceState === 'processing' ? 'spin 2s linear infinite' : 'none'
        }}>
          {voiceState === 'idle' && <Mic size={48} style={{ color: 'white', opacity: 0.8 }} />}
          {voiceState === 'listening' && <Mic size={48} style={{ color: 'white' }} />}
          {voiceState === 'processing' && (
            <div style={{
              width: 48,
              height: 48,
              border: '3px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}
          {voiceState === 'speaking' && <Volume2 size={48} style={{ color: 'white' }} />}
        </div>

        {/* Ripple effects when active */}
        {voiceState !== 'idle' && (
          <>
            <div style={{
              position: 'absolute',
              inset: -10,
              borderRadius: '50%',
              border: `2px solid ${currentColors[0]}44`,
              animation: 'pulse 1.5s infinite'
            }} />
            <div style={{
              position: 'absolute',
              inset: -25,
              borderRadius: '50%',
              border: `1px solid ${currentColors[0]}22`,
              animation: 'pulse 2s infinite 0.5s'
            }} />
          </>
        )}
      </div>

      {/* Transcript & Response */}
      <div style={{
        width: '100%',
        maxWidth: 600,
        padding: '0 24px',
        textAlign: 'center'
      }}>
        {transcript && (
          <div style={{
            marginBottom: 16,
            padding: 16,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>You said:</div>
            <div style={{ color: '#E2E8F0', fontSize: 16 }}>{transcript}</div>
          </div>
        )}
        
        {response && (
          <div style={{
            padding: 16,
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: 12,
            border: '1px solid rgba(139, 92, 246, 0.2)'
          }}>
            <div style={{ fontSize: 12, color: '#8B5CF6', marginBottom: 4 }}>Empire AI:</div>
            <div style={{ color: '#E2E8F0', fontSize: 16, lineHeight: 1.6 }}>{response}</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        position: 'absolute',
        bottom: 48,
        display: 'flex',
        gap: 16,
        alignItems: 'center'
      }}>
        {voiceState === 'idle' ? (
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
              transition: 'transform 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Mic size={28} />
          </button>
        ) : (
          <button
            onClick={stopListening}
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
              boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)'
            }}
          >
            <Square size={24} />
          </button>
        )}

        <button
          onClick={() => setIsMuted(!isMuted)}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)',
            border: isMuted ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
            color: isMuted ? '#EF4444' : '#94A3B8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isMuted ? <MicOff size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {/* API Notice */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        fontSize: 12,
        color: '#64748B'
      }}>
        Voice Mode Preview • Full API integration coming soon
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
