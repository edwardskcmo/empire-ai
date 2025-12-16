import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Settings, BookOpen, ClipboardList, HelpCircle,
  ChevronLeft, ChevronRight, Mic, Menu, X, Plus, Search,
  Building, TrendingUp, DollarSign, Wrench, Calculator, Users,
  ShieldCheck, ClipboardCheck, Briefcase, Target, Lightbulb, Package,
  Home, PiggyBank, UserCheck, Shield, Clipboard, BarChart, FileText,
  Folder, Star, Heart, Zap, Globe, Smartphone, Palette, BookOpenCheck,
  MessageSquare, Brain, Activity
} from 'lucide-react';

// Import pages
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Knowledge from './pages/Knowledge';
import Issues from './pages/Issues';
import Systems from './pages/Systems';
import Help from './pages/Help';
import VoiceModal from './components/VoiceModal';

// Import utilities
import {
  STORAGE_KEYS,
  loadFromStorage,
  saveToStorage,
  DEFAULT_DEPARTMENTS,
  DEFAULT_TEAM_MEMBER,
  DEFAULT_COLUMNS,
  ROLES,
  extractTags,
  createIntelligenceItem,
  queryIntelligence,
  generateId,
  formatDate,
  cosineSimilarity,
} from './utils';

// Icon mapping for department icons
const ICON_MAP = {
  Building, TrendingUp, DollarSign, Wrench, Calculator, Users,
  ShieldCheck, ClipboardCheck, Briefcase, Target, Lightbulb, Package,
  Home, PiggyBank, UserCheck, Shield, Clipboard, BarChart, FileText,
  Folder, Star, Heart, Zap, Globe, Smartphone, Palette, BookOpen: BookOpenCheck,
  Settings, LayoutDashboard, HelpCircle, MessageSquare
};

// Render department icon (handles both Lucide names and emojis)
export const renderDeptIcon = (iconName, size = 20) => {
  if (!iconName) return null;
  
  // Check if it's a Lucide icon name (starts with capital letter)
  if (ICON_MAP[iconName]) {
    const IconComponent = ICON_MAP[iconName];
    return <IconComponent size={size} />;
  }
  
  // Otherwise treat as emoji
  return <span style={{ fontSize: size }}>{iconName}</span>;
};

function App() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState(null);
  
  // Data state
  const [departments, setDepartments] = useState(() => 
    loadFromStorage(STORAGE_KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS)
  );
  const [conversations, setConversations] = useState(() => 
    loadFromStorage(STORAGE_KEYS.CONVERSATIONS, {})
  );
  const [knowledge, setKnowledge] = useState(() => 
    loadFromStorage(STORAGE_KEYS.KNOWLEDGE, [])
  );
  const [activities, setActivities] = useState(() => 
    loadFromStorage(STORAGE_KEYS.ACTIVITIES, [])
  );
  const [issues, setIssues] = useState(() => 
    loadFromStorage(STORAGE_KEYS.ISSUES, [])
  );
  const [issueColumns, setIssueColumns] = useState(() => 
    loadFromStorage(STORAGE_KEYS.ISSUE_COLUMNS, DEFAULT_COLUMNS)
  );
  const [intelligenceIndex, setIntelligenceIndex] = useState(() => 
    loadFromStorage(STORAGE_KEYS.INTELLIGENCE, [])
  );
  const [teamMembers, setTeamMembers] = useState(() => 
    loadFromStorage(STORAGE_KEYS.TEAM_MEMBERS, [DEFAULT_TEAM_MEMBER])
  );
  const [pendingInvites, setPendingInvites] = useState(() => 
    loadFromStorage(STORAGE_KEYS.PENDING_INVITES, [])
  );
  const [systemInstructions, setSystemInstructions] = useState(() => 
    loadFromStorage(STORAGE_KEYS.SYSTEM_INSTRUCTIONS, '')
  );
  const [connectedDocs, setConnectedDocs] = useState(() => 
    loadFromStorage(STORAGE_KEYS.CONNECTED_DOCS, [])
  );

  // ============================================
  // PERSISTENCE - Save to localStorage
  // ============================================
  useEffect(() => { saveToStorage(STORAGE_KEYS.DEPARTMENTS, departments); }, [departments]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CONVERSATIONS, conversations); }, [conversations]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.KNOWLEDGE, knowledge); }, [knowledge]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.ACTIVITIES, activities); }, [activities]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.ISSUES, issues); }, [issues]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.ISSUE_COLUMNS, issueColumns); }, [issueColumns]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.INTELLIGENCE, intelligenceIndex); }, [intelligenceIndex]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.TEAM_MEMBERS, teamMembers); }, [teamMembers]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.PENDING_INVITES, pendingInvites); }, [pendingInvites]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SYSTEM_INSTRUCTIONS, systemInstructions); }, [systemInstructions]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CONNECTED_DOCS, connectedDocs); }, [connectedDocs]);

  // ============================================
  // SMART RAG - EMBEDDING GENERATION
  // ============================================
  const generateEmbedding = async (text) => {
    if (!text || text.length < 10) return null;
    
    try {
      const response = await fetch('/api/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.substring(0, 8000) }) // Limit input size
      });
      
      if (!response.ok) {
        console.warn('Embedding generation failed:', response.status);
        return null;
      }
      
      const data = await response.json();
      return data.embedding || null;
    } catch (error) {
      console.warn('Embedding generation error:', error);
      return null;
    }
  };

  // Query intelligence with semantic search
  const queryIntelligenceWithEmbedding = async (query, department = null) => {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Use the enhanced queryIntelligence from utils.js
    return queryIntelligence(intelligenceIndex, query, department, queryEmbedding);
  };

  // ============================================
  // SMART TAGGING (from previous session)
  // ============================================
  const generateSmartTags = async (content, title = '', sourceType = '') => {
    try {
      const response = await fetch('/api/generate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title, sourceType })
      });
      
      if (!response.ok) {
        console.warn('Smart tag generation failed, using fallback');
        return extractTags(content + ' ' + title);
      }
      
      const data = await response.json();
      return data.tags || extractTags(content + ' ' + title);
    } catch (error) {
      console.warn('Tag generation error:', error);
      return extractTags(content + ' ' + title);
    }
  };

  // ============================================
  // INTELLIGENCE SYSTEM - ADD TO INDEX
  // ============================================
  const addToIntelligence = useCallback(async (sourceType, sourceId, title, content, department, customTags = null, metadata = {}, relevanceBoost = 0) => {
    // Generate smart tags if not provided
    const tags = customTags || await generateSmartTags(content, title, sourceType);
    
    // Generate embedding for semantic search
    const textForEmbedding = `${title} ${content}`.trim();
    const embedding = await generateEmbedding(textForEmbedding);
    
    // Create the intelligence item with embedding
    const item = createIntelligenceItem(
      sourceType,
      sourceId,
      title,
      content,
      department,
      tags,
      metadata,
      relevanceBoost,
      embedding // NEW: Include embedding vector
    );
    
    setIntelligenceIndex(prev => {
      const newIndex = [item, ...prev];
      // Keep max 500 items
      return newIndex.slice(0, 500);
    });
    
    return item;
  }, []);

  // ============================================
  // ACTIVITY LOGGING (with intelligence integration)
  // ============================================
  const logActivity = useCallback(async (text, type = 'general', department = null, user = 'You') => {
    const deptName = department || activeDepartment?.name || 'General';
    
    const activity = {
      id: generateId('activity'),
      text,
      type,
      department: deptName,
      user,
      timestamp: new Date().toISOString(),
    };
    
    setActivities(prev => [activity, ...prev].slice(0, 100));
    
    // Also add to intelligence with embedding
    await addToIntelligence(
      'activity_log',
      activity.id,
      `Activity: ${text}`,
      `${user} performed action in ${deptName}: ${text}`,
      deptName,
      null, // Let smart tags generate
      { user, activityType: type },
      1
    );
    
    return activity;
  }, [activeDepartment, addToIntelligence]);

  // ============================================
  // CONNECTED DOCS - AUTO REFRESH
  // ============================================
  const fetchConnectedDoc = async (doc) => {
    try {
      const response = await fetch('/api/fetch-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: doc.url })
      });
      
      if (!response.ok) throw new Error('Fetch failed');
      
      const data = await response.json();
      return {
        ...doc,
        content: data.content,
        status: 'synced',
        lastFetched: new Date().toISOString(),
        error: null
      };
    } catch (error) {
      return {
        ...doc,
        status: 'error',
        error: error.message
      };
    }
  };

  const refreshAllDocs = async () => {
    const updated = await Promise.all(
      connectedDocs.map(doc => fetchConnectedDoc(doc))
    );
    setConnectedDocs(updated);
  };

  // Auto-refresh connected docs on load and every 5 minutes
  useEffect(() => {
    if (connectedDocs.length > 0) {
      refreshAllDocs();
      const interval = setInterval(refreshAllDocs, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, []); // Only on mount

  // ============================================
  // NAVIGATION
  // ============================================
  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'systems', name: 'Systems', icon: Settings },
    { id: 'knowledge', name: 'Knowledge', icon: BookOpen },
    { id: 'issues', name: 'Issues', icon: ClipboardList, badge: issues.filter(i => !i.archived && i.status !== 'Resolved').length },
    { id: 'help', name: 'Help / FAQ', icon: HelpCircle },
  ];

  const handleNavClick = (pageId) => {
    setCurrentPage(pageId);
    setActiveDepartment(null);
  };

  const handleDepartmentClick = (dept) => {
    setActiveDepartment(dept);
    setCurrentPage('chat');
  };

  // ============================================
  // RENDER PAGE
  // ============================================
  const renderPage = () => {
    const commonProps = {
      activeDepartment,
      departments,
      setDepartments,
      conversations,
      setConversations,
      knowledge,
      setKnowledge,
      issues,
      setIssues,
      activities,
      logActivity,
      intelligenceIndex,
      addToIntelligence,
      queryIntelligence: queryIntelligenceWithEmbedding, // Use semantic-enhanced version
      systemInstructions,
      setSystemInstructions,
      teamMembers,
      setTeamMembers,
      pendingInvites,
      setPendingInvites,
      connectedDocs,
      setConnectedDocs,
      fetchConnectedDoc,
      refreshAllDocs,
      setCurrentPage,
      setActiveDepartment,
      renderDeptIcon,
      issueColumns,
      setIssueColumns,
      generateEmbedding, // NEW: Pass embedding function to pages
    };

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard {...commonProps} />;
      case 'systems':
        return <Systems {...commonProps} />;
      case 'knowledge':
        return <Knowledge {...commonProps} />;
      case 'issues':
        return <Issues {...commonProps} />;
      case 'help':
        return <Help />;
      case 'chat':
        return <Chat {...commonProps} />;
      default:
        return <Dashboard {...commonProps} />;
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      display: 'flex',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Background Grid Pattern */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Sidebar */}
      <aside style={{
        width: sidebarCollapsed ? 70 : 260,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: 'white',
            fontSize: 18,
          }}>
            E
          </div>
          {!sidebarCollapsed && (
            <span style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 18 }}>
              Empire AI
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px',
                marginBottom: 4,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: currentPage === item.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: currentPage === item.id ? '#3B82F6' : '#94A3B8',
                transition: 'all 0.2s',
              }}
            >
              <item.icon size={20} />
              {!sidebarCollapsed && (
                <>
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.name}</span>
                  {item.badge > 0 && (
                    <span style={{
                      backgroundColor: '#EF4444',
                      color: 'white',
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 10,
                      fontWeight: 600,
                    }}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}

          {/* Departments Section */}
          {!sidebarCollapsed && (
            <div style={{ marginTop: 24 }}>
              <div style={{
                color: '#64748B',
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                padding: '8px 12px',
              }}>
                Departments
              </div>
              {departments.map(dept => (
                <button
                  key={dept.id}
                  onClick={() => handleDepartmentClick(dept)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    marginBottom: 2,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeDepartment?.id === dept.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    color: activeDepartment?.id === dept.id ? '#E2E8F0' : '#94A3B8',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ color: dept.color }}>{renderDeptIcon(dept.icon, 18)}</span>
                  <span style={{ fontSize: 13, textAlign: 'left' }}>{dept.name}</span>
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* Voice Mode Button */}
        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setShowVoiceModal(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: 'white',
              fontWeight: 600,
              transition: 'transform 0.2s',
            }}
          >
            <Mic size={18} />
            {!sidebarCollapsed && 'Voice Mode'}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            position: 'absolute',
            right: -12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: '#1E293B',
            color: '#94A3B8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {renderPage()}
      </main>

      {/* Voice Modal */}
      {showVoiceModal && (
        <VoiceModal
          onClose={() => setShowVoiceModal(false)}
          activeDepartment={activeDepartment}
          systemInstructions={systemInstructions}
          intelligenceIndex={intelligenceIndex}
          queryIntelligence={queryIntelligenceWithEmbedding}
          knowledge={knowledge}
          connectedDocs={connectedDocs}
          issues={issues}
          setIssues={setIssues}
          departments={departments}
          logActivity={logActivity}
          addToIntelligence={addToIntelligence}
          generateEmbedding={generateEmbedding}
        />
      )}

      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        ::-webkit-scrollbar {
          width: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .thinking-dots span {
          animation: thinking 1.4s infinite ease-in-out both;
        }
        
        .thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
        .thinking-dots span:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes thinking {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default App;
