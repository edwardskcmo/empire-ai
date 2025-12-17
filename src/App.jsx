// Empire AI - Main Application Shell
// Version 3.1 - With Chat Logs Support

import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Settings, BookOpen, ClipboardList, HelpCircle, Mic, 
  ChevronLeft, ChevronRight, Menu, X, Building, TrendingUp, DollarSign, 
  Wrench, Calculator, Users, ShieldCheck, ClipboardCheck, Briefcase, 
  Target, Lightbulb, Package, Home, PiggyBank, UserCheck, Shield, 
  Clipboard, BarChart, FileText, Folder, Star, Heart, Zap, Globe, 
  Smartphone, Palette, BookOpenCheck, MessageSquare
} from 'lucide-react';

import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Knowledge from './pages/Knowledge';
import Issues from './pages/Issues';
import Systems from './pages/Systems';
import Help from './pages/Help';
import VoiceModal from './components/VoiceModal';

import { 
  STORAGE_KEYS, 
  loadFromStorage, 
  saveToStorage,
  extractTags,
  createIntelligenceItem,
  queryIntelligence,
  normalizeTags,
  checkForDuplicate,
  recordKnowledgeGap,
  getKnowledgeGaps,
  resolveKnowledgeGap,
  deleteKnowledgeGap,
  clearResolvedGaps,
  trackChatMessage,
  trackVoiceSession,
  trackIssueCreated,
  trackIssueResolved,
  trackDocConnected,
  trackKnowledgeAdded,
  trackSearch,
  getAnalyticsSummary,
  resetAnalytics,
  trimConversationHistory,
  getConversationSummary,
  CONVERSATION_MEMORY_CONFIG,
  DEFAULT_DEPARTMENTS,
  DEFAULT_TEAM_MEMBER,
  DEFAULT_COLUMNS,
  INTELLIGENCE_CONFIG,
} from './utils';

// Icon mapping for dynamic icon rendering
const ICON_MAP = {
  Building, TrendingUp, DollarSign, Wrench, Calculator, Users,
  ShieldCheck, ClipboardCheck, Briefcase, Target, Lightbulb, Package,
  Home, PiggyBank, UserCheck, Shield, Clipboard, BarChart, FileText,
  Folder, Star, Heart, Zap, Globe, Smartphone, Palette, BookOpenCheck,
  Settings, LayoutDashboard, HelpCircle, MessageSquare
};

const renderDeptIcon = (iconName, size = 16) => {
  if (!iconName) return null;
  
  // Check if it's a Lucide icon name (starts with capital letter, no emoji)
  if (typeof iconName === 'string' && /^[A-Z]/.test(iconName) && iconName.length > 1) {
    const IconComponent = ICON_MAP[iconName];
    if (IconComponent) {
      return <IconComponent size={size} />;
    }
  }
  
  // Otherwise treat as emoji
  return <span style={{ fontSize: size }}>{iconName}</span>;
};

export default function App() {
  // Navigation state
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Department state
  const [departments, setDepartments] = useState(() => 
    loadFromStorage(STORAGE_KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS)
  );
  const [activeDepartment, setActiveDepartment] = useState(null);
  
  // Core data state
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
  
  // Chat logs state (NEW)
  const [chatLogs, setChatLogs] = useState(() => 
    loadFromStorage(STORAGE_KEYS.CHAT_LOGS, [])
  );
  
  // Intelligence state
  const [intelligenceIndex, setIntelligenceIndex] = useState(() => 
    loadFromStorage(STORAGE_KEYS.INTELLIGENCE, [])
  );
  const [intelligenceCap, setIntelligenceCap] = useState(() => 
    loadFromStorage(STORAGE_KEYS.INTELLIGENCE_CAP, INTELLIGENCE_CONFIG.DEFAULT_CAP)
  );
  
  // Team state
  const [teamMembers, setTeamMembers] = useState(() => 
    loadFromStorage(STORAGE_KEYS.TEAM_MEMBERS, [DEFAULT_TEAM_MEMBER])
  );
  const [pendingInvites, setPendingInvites] = useState(() => 
    loadFromStorage(STORAGE_KEYS.PENDING_INVITES, [])
  );
  
  // Instructions state
  const [systemInstructions, setSystemInstructions] = useState(() => 
    loadFromStorage(STORAGE_KEYS.SYSTEM_INSTRUCTIONS, '')
  );
  
  // Connected docs state
  const [connectedDocs, setConnectedDocs] = useState(() => 
    loadFromStorage(STORAGE_KEYS.CONNECTED_DOCS, [])
  );
  
  // Knowledge gaps state (Item 8)
  const [knowledgeGaps, setKnowledgeGaps] = useState(() => 
    getKnowledgeGaps()
  );

  // Pending message from dashboard quick chat
  const [pendingMessage, setPendingMessage] = useState(null);

  // Persist to localStorage
  useEffect(() => { saveToStorage(STORAGE_KEYS.DEPARTMENTS, departments); }, [departments]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CONVERSATIONS, conversations); }, [conversations]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.KNOWLEDGE, knowledge); }, [knowledge]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.ACTIVITIES, activities); }, [activities]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.ISSUES, issues); }, [issues]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.ISSUE_COLUMNS, issueColumns); }, [issueColumns]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CHAT_LOGS, chatLogs); }, [chatLogs]); // NEW
  useEffect(() => { saveToStorage(STORAGE_KEYS.INTELLIGENCE, intelligenceIndex); }, [intelligenceIndex]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.INTELLIGENCE_CAP, intelligenceCap); }, [intelligenceCap]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.TEAM_MEMBERS, teamMembers); }, [teamMembers]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.PENDING_INVITES, pendingInvites); }, [pendingInvites]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SYSTEM_INSTRUCTIONS, systemInstructions); }, [systemInstructions]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CONNECTED_DOCS, connectedDocs); }, [connectedDocs]);

  // Refresh knowledge gaps when they change elsewhere
  const refreshKnowledgeGaps = useCallback(() => {
    setKnowledgeGaps(getKnowledgeGaps());
  }, []);

  // AI Tag Generation
  const generateSmartTags = async (content, title, sourceType) => {
    try {
      const response = await fetch('/api/generate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content?.substring(0, 1000), title, sourceType }),
      });
      if (response.ok) {
        const data = await response.json();
        return normalizeTags(data.tags || []);
      }
    } catch (e) {
      console.log('Smart tags unavailable, using extraction');
    }
    return normalizeTags(extractTags(content));
  };

  // Activity logging with intelligence
  const logActivity = useCallback(async (text, type = 'general', department = null, user = 'You') => {
    const deptName = department || activeDepartment?.name || 'General';
    
    const activity = {
      id: `act_${Date.now()}`,
      text,
      type,
      department: deptName,
      user,
      timestamp: new Date().toISOString(),
    };
    
    setActivities(prev => [activity, ...prev].slice(0, 100));
    
    // Add to intelligence
    const tags = await generateSmartTags(text, `Activity: ${type}`, 'activity_log');
    const intellItem = createIntelligenceItem(
      'activity_log',
      activity.id,
      `Activity: ${text.substring(0, 50)}`,
      text,
      deptName,
      [...tags, type, 'activity'],
      { user, activityType: type },
      1
    );
    
    addToIntelligence(intellItem);
  }, [activeDepartment]);

  // Add to intelligence with duplicate detection (Item 3)
  const addToIntelligence = useCallback(async (item) => {
    setIntelligenceIndex(prev => {
      // Check for duplicates
      const duplicateCheck = checkForDuplicate(item, prev);
      
      if (duplicateCheck.isDuplicate) {
        console.log(`Duplicate detected (${Math.round(duplicateCheck.similarity * 100)}% similar), updating existing item`);
        // Update existing item's timestamp instead of adding duplicate
        return prev.map(existing => 
          existing.id === duplicateCheck.existingItem.id
            ? { ...existing, createdAt: new Date().toISOString(), relevanceBoost: Math.max(existing.relevanceBoost, item.relevanceBoost) }
            : existing
        );
      }
      
      // No duplicate - add new item
      const newIndex = [item, ...prev];
      return newIndex.slice(0, intelligenceCap);
    });
  }, [intelligenceCap]);

  // Handle department click
  const handleDepartmentClick = (dept) => {
    setActiveDepartment(dept);
    setCurrentPage('chat');
    setMobileMenuOpen(false);
  };

  // Navigate to chat with message from dashboard
  const handleQuickChat = (message) => {
    setPendingMessage(message);
    if (!activeDepartment) {
      setActiveDepartment(departments[0]);
    }
    setCurrentPage('chat');
  };

  // Clear conversation history for a department (Item 7)
  const clearConversationHistory = useCallback((deptId) => {
    setConversations(prev => {
      const updated = { ...prev };
      delete updated[deptId];
      return updated;
    });
    logActivity('Cleared conversation history', 'system', activeDepartment?.name);
  }, [activeDepartment, logActivity]);

  // Fetch connected doc
  const fetchConnectedDoc = async (doc) => {
    try {
      const response = await fetch('/api/fetch-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: doc.url }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return { ...doc, content: data.content, status: 'synced', lastFetched: new Date().toISOString(), error: null };
      } else {
        const error = await response.json();
        return { ...doc, status: 'error', error: error.error || 'Failed to fetch' };
      }
    } catch (e) {
      return { ...doc, status: 'error', error: 'Network error' };
    }
  };

  // Refresh all connected docs
  const refreshAllDocs = async () => {
    const updated = await Promise.all(connectedDocs.map(fetchConnectedDoc));
    setConnectedDocs(updated);
  };

  // Auto-refresh docs on load and every 5 minutes
  useEffect(() => {
    if (connectedDocs.length > 0) {
      refreshAllDocs();
      const interval = setInterval(refreshAllDocs, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, []);

  // Nav items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'systems', label: 'Systems', icon: Settings },
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { id: 'issues', label: 'Issues', icon: ClipboardList, badge: issues.filter(i => !i.archived && i.status !== 'Resolved').length },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  // Render current page
  const renderPage = () => {
    const commonProps = {
      logActivity,
      activeDepartment,
      departments,
      setDepartments,
    };

    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard 
            {...commonProps}
            activities={activities}
            issues={issues}
            knowledge={knowledge}
            intelligenceIndex={intelligenceIndex}
            onNavigate={setCurrentPage}
            onQuickChat={handleQuickChat}
            setShowVoiceModal={setShowVoiceModal}
          />
        );
      case 'systems':
        return (
          <Systems 
            {...commonProps}
            intelligenceIndex={intelligenceIndex}
            intelligenceCap={intelligenceCap}
            setIntelligenceCap={setIntelligenceCap}
            teamMembers={teamMembers}
            setTeamMembers={setTeamMembers}
            pendingInvites={pendingInvites}
            setPendingInvites={setPendingInvites}
            systemInstructions={systemInstructions}
            setSystemInstructions={setSystemInstructions}
            connectedDocs={connectedDocs}
            knowledgeGaps={knowledgeGaps}
            refreshKnowledgeGaps={refreshKnowledgeGaps}
            resolveKnowledgeGap={resolveKnowledgeGap}
            deleteKnowledgeGap={deleteKnowledgeGap}
            clearResolvedGaps={clearResolvedGaps}
            getAnalyticsSummary={getAnalyticsSummary}
            resetAnalytics={resetAnalytics}
          />
        );
      case 'knowledge':
        return (
          <Knowledge 
            {...commonProps}
            knowledge={knowledge}
            setKnowledge={setKnowledge}
            addToIntelligence={addToIntelligence}
            generateSmartTags={generateSmartTags}
            connectedDocs={connectedDocs}
            setConnectedDocs={setConnectedDocs}
            fetchConnectedDoc={fetchConnectedDoc}
            refreshAllDocs={refreshAllDocs}
            trackDocConnected={trackDocConnected}
            trackKnowledgeAdded={trackKnowledgeAdded}
          />
        );
      case 'issues':
        return (
          <Issues 
            {...commonProps}
            issues={issues}
            setIssues={setIssues}
            issueColumns={issueColumns}
            setIssueColumns={setIssueColumns}
            addToIntelligence={addToIntelligence}
            generateSmartTags={generateSmartTags}
            trackIssueCreated={trackIssueCreated}
            trackIssueResolved={trackIssueResolved}
          />
        );
      case 'help':
        return <Help />;
      case 'chat':
        return (
          <Chat 
            {...commonProps}
            conversations={conversations}
            setConversations={setConversations}
            knowledge={knowledge}
            connectedDocs={connectedDocs}
            intelligenceIndex={intelligenceIndex}
            systemInstructions={systemInstructions}
            addToIntelligence={addToIntelligence}
            generateSmartTags={generateSmartTags}
            queryIntelligence={queryIntelligence}
            issues={issues}
            setIssues={setIssues}
            pendingMessage={pendingMessage}
            setPendingMessage={setPendingMessage}
            clearConversationHistory={clearConversationHistory}
            recordKnowledgeGap={recordKnowledgeGap}
            trackChatMessage={trackChatMessage}
            trackSearch={trackSearch}
            trackIssueCreated={trackIssueCreated}
            chatLogs={chatLogs}
            setChatLogs={setChatLogs}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      display: 'flex',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Mobile Header */}
      <div style={{
        display: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        zIndex: 1000,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }} className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 36, height: 36, 
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 18, color: 'white',
          }}>E</div>
          <span style={{ fontWeight: 600, fontSize: 18, color: '#E2E8F0' }}>Empire AI</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{
          background: 'none', border: 'none', color: '#E2E8F0', cursor: 'pointer', padding: 8
        }}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside style={{
        width: sidebarCollapsed ? 72 : 260,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        position: 'relative',
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ 
          padding: sidebarCollapsed ? '20px 16px' : '20px 24px', 
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{ 
            width: 40, height: 40, 
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 20, color: 'white',
            flexShrink: 0,
          }}>E</div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontWeight: 600, fontSize: 18, color: '#E2E8F0' }}>Empire AI</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Operations Platform</div>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {/* Dashboard */}
          {navItems.filter(item => item.id === 'dashboard').map(item => (
            <button
              key={item.id}
              onClick={() => { setCurrentPage(item.id); setActiveDepartment(null); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: sidebarCollapsed ? '12px' : '12px 16px',
                marginBottom: 4,
                background: currentPage === item.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                border: 'none',
                borderRadius: 10,
                color: currentPage === item.id ? '#3B82F6' : '#94A3B8',
                cursor: 'pointer',
                transition: 'all 0.2s',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                position: 'relative',
              }}
            >
              <item.icon size={20} />
              {!sidebarCollapsed && <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>}
            </button>
          ))}

          {/* Voice Mode Button - between Dashboard and Systems */}
          <button
            onClick={() => setShowVoiceModal(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: sidebarCollapsed ? '12px' : '12px 16px',
              marginBottom: 4,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 10,
              color: '#10B981',
              cursor: 'pointer',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            }}
          >
            <Mic size={20} />
            {!sidebarCollapsed && <span style={{ fontSize: 14, fontWeight: 500 }}>Voice Mode</span>}
          </button>

          {/* Remaining Nav Items (Systems, Knowledge, Issues, Help) */}
          {navItems.filter(item => item.id !== 'dashboard').map(item => (
            <button
              key={item.id}
              onClick={() => { setCurrentPage(item.id); setActiveDepartment(null); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: sidebarCollapsed ? '12px' : '12px 16px',
                marginBottom: 4,
                background: currentPage === item.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                border: 'none',
                borderRadius: 10,
                color: currentPage === item.id ? '#3B82F6' : '#94A3B8',
                cursor: 'pointer',
                transition: 'all 0.2s',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                position: 'relative',
              }}
            >
              <item.icon size={20} />
              {!sidebarCollapsed && <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>}
              {item.badge > 0 && (
                <span style={{
                  position: sidebarCollapsed ? 'absolute' : 'relative',
                  top: sidebarCollapsed ? 4 : 'auto',
                  right: sidebarCollapsed ? 4 : 'auto',
                  marginLeft: sidebarCollapsed ? 0 : 'auto',
                  background: '#EF4444',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 10,
                  minWidth: 18,
                  textAlign: 'center',
                }}>{item.badge}</span>
              )}
            </button>
          ))}

          {/* Departments Section */}
          {!sidebarCollapsed && (
            <div style={{ marginTop: 24 }}>
              <div style={{ 
                fontSize: 11, 
                fontWeight: 600, 
                color: '#64748B', 
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '0 16px',
                marginBottom: 8,
              }}>Departments</div>
              {departments.map(dept => (
                <button
                  key={dept.id}
                  onClick={() => handleDepartmentClick(dept)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 16px',
                    marginBottom: 2,
                    background: activeDepartment?.id === dept.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    color: activeDepartment?.id === dept.id ? '#3B82F6' : '#94A3B8',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ 
                    width: 28, height: 28, 
                    background: `${dept.color}20`,
                    borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: dept.color,
                  }}>
                    {renderDeptIcon(dept.icon, 14)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {dept.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </nav>

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
            background: '#1E293B',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%',
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
      <main style={{ 
        flex: 1, 
        overflow: 'auto',
        padding: 24,
      }}>
        {renderPage()}
      </main>

      {/* Voice Modal */}
      {showVoiceModal && (
        <VoiceModal 
          onClose={() => setShowVoiceModal(false)}
          activeDepartment={activeDepartment || departments[0]}
          systemInstructions={systemInstructions}
          intelligenceIndex={intelligenceIndex}
          queryIntelligence={queryIntelligence}
          knowledge={knowledge}
          connectedDocs={connectedDocs}
          issues={issues}
          setIssues={setIssues}
          departments={departments}
          logActivity={logActivity}
          addToIntelligence={addToIntelligence}
          recordKnowledgeGap={recordKnowledgeGap}
          trackVoiceSession={trackVoiceSession}
          trackSearch={trackSearch}
          trackIssueCreated={trackIssueCreated}
        />
      )}

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: 60,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.98)',
          zIndex: 999,
          padding: 20,
          overflowY: 'auto',
        }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setCurrentPage(item.id); setActiveDepartment(null); setMobileMenuOpen(false); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                marginBottom: 8,
                background: currentPage === item.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                border: 'none',
                borderRadius: 12,
                color: currentPage === item.id ? '#3B82F6' : '#E2E8F0',
                cursor: 'pointer',
              }}
            >
              <item.icon size={22} />
              <span style={{ fontSize: 16, fontWeight: 500 }}>{item.label}</span>
            </button>
          ))}
          
          <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 12 }}>DEPARTMENTS</div>
            {departments.map(dept => (
              <button
                key={dept.id}
                onClick={() => handleDepartmentClick(dept)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  marginBottom: 4,
                  background: activeDepartment?.id === dept.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  border: 'none',
                  borderRadius: 10,
                  color: activeDepartment?.id === dept.id ? '#3B82F6' : '#E2E8F0',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: dept.color }}>{renderDeptIcon(dept.icon, 18)}</span>
                <span style={{ fontSize: 15 }}>{dept.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        
        @media (max-width: 768px) {
          .mobile-header { display: flex !important; }
          aside { display: none !important; }
          main { padding-top: 76px !important; }
        }
      `}</style>
    </div>
  );
}
