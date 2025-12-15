import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, VolumeX, Volume2, CheckCircle } from 'lucide-react';

export default function VoiceModal({
  onClose,
  activeDepartment,
  systemInstructions,
  intelligenceIndex,
  queryIntelligence,
  logActivity,
  addToIntelligence,
  knowledge,
  connectedDocs,
  issues,
  setIssues,
  departments
}) {
  const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [issueCreated, setIssueCreated] = useState(null);
  
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

  // Clear issue created notification after 5 seconds
  useEffect(() => {
    if (issueCreated) {
      const timer = setTimeout(() => setIssueCreated(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [issueCreated]);

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

    // Include connected docs/sheets content
    if (connectedDocs && connectedDocs.length > 0) {
      const syncedDocs = connectedDocs.filter(d => d.status === 'synced' && d.content);
      if (syncedDocs.length > 0) {
        context += '\n\nConnected Google Docs/Sheets data:\n';
        syncedDocs.forEach((doc) => {
          context += `\n--- ${doc.name} (${doc.department || 'General'}) ---\n`;
          context += doc.content?.substring(0, 50000) + (doc.content?.length > 50000 ? '...' : '') + '\n';
        });
      }
    }

    // Include issues board data
    if (issues && issues.length > 0) {
      const activeIssues = issues.filter(i => !i.archived);
      const resolvedIssues = issues.filter(i => i.archived || i.status === 'Resolved');
      
      if (activeIssues.length > 0) {
        context += '\n\n=== ISSUES BOARD (Active Issues) ===\n';
        activeIssues.forEach((issue, i) => {
          context += `${i + 1}. [${issue.status}] [${issue.priority}] ${issue.title}`;
          if (issue.department) context += ` (Dept: ${issue.department})`;
          if (issue.assignee) context += ` - Assigned to: ${issue.assignee}`;
          if (issue.description) context += `\n   Description: ${issue.description}`;
          context += `\n   Created: ${new Date(issue.createdAt).toLocaleDateString()}\n`;
        });
      }
      
      if (resolvedIssues.length > 0) {
        context += '\n=== RESOLVED/ARCHIVED ISSUES ===\n';
        resolvedIssues.slice(0, 10).forEach((issue, i) => {
          context += `${i + 1}. ${issue.title} - ${issue.status}`;
          if (issue.resolutionNotes) context += `\n   Resolution: ${issue.resolutionNotes}`;
          context += '\n';
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

  // Parse AI response for issue creation command
  const parseIssueFromResponse = (response) => {
    const issueMatch = response.match(/\[ISSUE_CREATED\]\s*([^|]+)\s*\|\s*(High|Medium|Low)\s*\|\s*([^|]+)\s*\|\s*(.+?)(?:\[\/ISSUE_CREATED\]|$)/i);
    
    if (issueMatch) {
      return {
        title: issueMatch[1].trim(),
        priority: issueMatch[2].trim(),
        department: issueMatch[3].trim(),
        description: issueMatch[4].trim().replace(/\[\/ISSUE_CREATED\]/i, '').trim()
      };
    }
    return null;
  };

  // Create issue in the system
  const createIssue = (issueData) => {
    let deptIdForIssue = activeDepartment?.id || 'general';
    if (departments && issueData.department) {
      const matchedDept = departments.find(d => 
        d.name.toLowerCase().includes(issueData.department.toLowerCase()) ||
        issueData.department.toLowerCase().includes(d.name.toLowerCase())
      );
      if (matchedDept) {
        deptIdForIssue = matchedDept.id;
      }
    }

    const newIssue = {
      id: `issue_${Date.now()}`,
      title: issueData.title,
      description: issueData.description,
      department: deptIdForIssue,
      priority: issueData.priority,
      status: 'Open',
      assignee: '',
      createdAt: new Date().toISOString(),
      archived: false
    };

    setIssues(prev => [newIssue, ...prev]);
    
    if (logActivity) {
      logActivity(`Issue created via voice: ${issueData.title}`, 'issue');
    }

    if (addToIntelligence) {
      addToIntelligence({
        sourceType: 'issue_created',
        sourceId: newIssue.id,
        title: `Issue: ${issueData.title}`,
        content: `New issue created: ${issueData.title}. Priority: ${issueData.priority}. ${issueData.description}`,
        department: deptIdForIssue,
        tags: ['issue', 'open', issueData.priority.toLowerCase()],
        metadata: { priority: issueData.priority },
        relevanceBoost: issueData.priority === 'High' ? 3 : issueData.priority === 'Medium' ? 2 : 1
      });
    }

    return newIssue;
  };

  // Clean the AI response for display
  const cleanResponseForDisplay = (response) => {
    return response
      .replace(/\[ISSUE_CREATED\].*?\[\/ISSUE_CREATED\]/gis, '')
      .replace(/\[ISSUE_CREATED\].*$/gis, '')
      .trim();
  };

  const handleUserInput = async (text) => {
    if (!text.trim()) return;
    
    setStatus('processing');
    setError('');

    const knowledgeContext = buildKnowledgeContext(text);
    const deptList = departments ? departments.map(d => d.name).join(', ') : 'General';

    // Build system prompt with issue creation capability
    let systemPrompt = `You are Empire AI, a voice assistant for Empire Remodeling.

VOICE RESPONSE RULES - FOLLOW STRICTLY:
1. MAXIMUM 1-2 sentences per response
2. Answer ONLY what was asked - stop immediately after
3. NEVER volunteer extra information
4. NEVER explain your reasoning
5. If asked a number: say the number and stop
6. If asked about a specific item: name it and stop

=== ISSUE CREATION CAPABILITY ===
You can create issues. When user asks to create, log, add, or report an issue:
1. Say a brief confirmation (one sentence)
2. Include this EXACT format at the END:
[ISSUE_CREATED] Title | Priority | Department | Description [/ISSUE_CREATED]

Priority: High, Medium, or Low (use Medium if not specified)
Department: one of: ${deptList}

Example - user says "create an issue about permit delay":
"I'll create that issue now. [ISSUE_CREATED] Permit delay | Medium | Production & Project Management | Permit approval is delayed [/ISSUE_CREATED]"

IMPORTANT: Always include [ISSUE_CREATED] marker when creating issues.
=== END ISSUE CREATION ===

EXAMPLES:
Q: "How many open issues?"
A: "You have 3 open issues."

Q: "Create an issue about the supply shortage"
A: "Done. [ISSUE_CREATED] Supply shortage | Medium | Production & Project Management | Materials supply shortage reported [/ISSUE_CREATED]"

Be concise. Stop talking after answering.`;

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
      let aiResponse = data.response || "I'm sorry, I couldn't process that request.";

      // Check if AI created an issue
      const issueData = parseIssueFromResponse(aiResponse);
      if (issueData && setIssues) {
        const createdIssue = createIssue(issueData);
        setIssueCreated(createdIssue);
        aiResponse = cleanResponseForDisplay(aiResponse);
        if (!aiResponse) {
          aiResponse = `Created issue: ${issueData.title}`;
        }
      }

      setResponse(aiResponse);
      
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: aiResponse }
      ]);

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

      if (logActivity) {
        logActivity(`Voice conversation in ${activeDepartment?.name || 'General'}`, 'voice');
      }

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
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

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
      console.log('Recognition already active');
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
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Issue Created Notification */}
      {issueCreated && (
        <div style={{
          position: 'absolute',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(16, 185, 129, 0.95)',
          borderRadius: '12px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
          zIndex: 1001,
          animation: 'slideIn 0.3s ease'
        }}>
          <CheckCircle size={20} style={{ color: 'white' }} />
          <span style={{ color: 'white', fontWeight: '500' }}>
            Issue created: {issueCreated.title}
          </span>
        </div>
      )}

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

        {/* Tips */}
        <p style={{ color: '#64748B', fontSize: '12px', textAlign: 'center', marginTop: '16px' }}>
          💡 Say "create an issue about..." to log issues
        </p>

        {/* Conversation indicator */}
        {conversationHistory.length > 0 && (
          <p style={{ color: '#64748B', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
            {Math.floor(conversationHistory.length / 2)} exchanges in this session
          </p>
        )}
      </div>
    </div>
  );
}
