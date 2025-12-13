import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Settings, BookOpen, ClipboardList, HelpCircle,
  ChevronLeft, ChevronRight, MessageSquare, Mic, Menu, X,
  Building2, TrendingUp, Users, Wrench, DollarSign, GraduationCap,
  Shield, Briefcase, Plus, Search
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
  STORAGE_KEYS, loadFromStorage, saveToStorage,
  DEFAULT_DEPARTMENTS, DEFAULT_TEAM_MEMBER, DEFAULT_COLUMNS,
  extractTags, queryIntelligence, generateId, formatDate
} from './utils';

const ICON_MAP = {
  Building2, TrendingUp, Users, Wrench, DollarSign, 
  GraduationCap, Shield, Briefcase
};

export default function App() {
  // Navigation state
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
  
  // NEW: Connected Google Docs state
  const [connectedDocs, setConnectedDocs] = useState(() => 
    loadFromStorage(STORAGE_KEYS.CONNECTED_DOCS, [])
  );

  // Save to localStorage on changes
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

  // Activity logging
  const logActivity = (action, details = '') => {
    const activity = {
      id: generateId('act'),
      action,
      details,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [activity, ...prev].slice(0, 100));
  };

  // Intelligence functions
  const addToIntelligence = (item) => {
    setIntelligenceIndex(prev => {
      const updated = [item, ...prev].slice(0, 500);
      return updated;
    });
  };

  // Fetch a single connected doc
  const fetchConnectedDoc = async (doc) => {
    try {
      const response = await fetch('/api/fetch-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: doc.url })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch');
      }
      
      const data = await response.json();
      return {
        ...doc,
        content: data.content,
        lastFetched: data.fetchedAt,
        status: 'synced',
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

  // Fetch all connected docs
  const refreshAllDocs = async () => {
    if (connectedDocs.length === 0) return;
    
    const updatedDocs = await Promise.all(
      connectedDocs.map(doc => fetchConnectedDoc(doc))
    );
    
    setConnectedDocs(updatedDocs);
    
    // Update knowledge base with synced content
    updatedDocs.forEach(doc => {
      if (doc.status === 'synced' && doc.content) {
        // Find existing knowledge item for this doc or create new
        const existingIndex = knowledge.findIndex(k => k.linkedDocId === doc.id);
        const knowledgeItem = {
          id: existingIndex >= 0 ? knowledge[existingIndex].id : generateId('know'),
          type: 'google-doc',
          title: doc.name,
          content: doc.content.substring(0, 5000), // Limit content size
          department: doc.department,
          linkedDocId: doc.id,
          linkedDocUrl: doc.url,
          createdAt: existingIndex >= 0 ? knowledge[existingIndex].createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        if (existingIndex >= 0) {
          setKnowledge(prev => {
            const updated = [...prev];
            updated[existingIndex] = knowledgeItem;
            return updated;
          });
        } else {
          setKnowledge(prev => [knowledgeItem, ...prev]);
          
          // Add to intelligence
          addToIntelligence({
            id: generateId('intel'),
            sourceType: 'google_doc',
            sourceId: doc.id,
            title: doc.name,
            content: doc.content.substring(0, 1000),
            department: doc.department,
            tags: extractTags(doc.content),
            metadata: { url: doc.url },
            createdAt: new Date().toISOString(),
            relevanceBoost: 2
          });
        }
      }
    });
    
    logActivity('Docs synced', `Refreshed ${updatedDocs.length} connected document(s)`);
  };

  // Auto-refresh docs on load and every 5 minutes
  useEffect(() => {
    if (connectedDocs.length > 0) {
      refreshAllDocs();
      const interval = setInterval(refreshAllDocs, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, []); // Only on mount

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'systems', label: 'Systems', icon: Settings },
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { id: 'issues', label: 'Issues', icon: ClipboardList, badge: issues.filter(i => !i.archived && i.status !== 'Resolved').length },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  // Filter departments by search
  const filteredDepartments = departments.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get department icon component
  const getDeptIcon = (iconName) => {
    return ICON_MAP[iconName] || Building2;
  };

  // Handle department click
  const handleDepartmentClick = (dept) => {
    setActiveDepartment(dept);
    setCurrentPage('chat');
  };

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard 
            activities={activities}
            knowledge={knowledge}
            issues={issues}
            setCurrentPage={setCurrentPage}
            setShowVoiceModal={setShowVoiceModal}
            logActivity={logActivity}
          />
        );
      case 'chat':
        return (
          <Chat 
            activeDepartment={activeDepartment}
            conversations={conversations}
            setConversations={setConversations}
            systemInstructions={systemInstructions}
            intelligenceIndex={intelligenceIndex}
            queryIntelligence={queryIntelligence}
            logActivity={logActivity}
            addToIntelligence={addToIntelligence}
          />
        );
      case 'knowledge':
        return (
          <Knowledge 
            departments={departments}
            setDepartments={setDepartments}
            knowledge={knowledge}
            setKnowledge={setKnowledge}
            connectedDocs={connectedDocs}
            setConnectedDocs={setConnectedDocs}
            refreshAllDocs={refreshAllDocs}
            fetchConnectedDoc={fetchConnectedDoc}
            logActivity={logActivity}
            addToIntelligence={addToIntelligence}
            getDeptIcon={getDeptIcon}
          />
        );
      case 'issues':
        return (
          <Issues 
            issues={issues}
            setIssues={setIssues}
            issueColumns={issueColumns}
            setIssueColumns={setIssueColumns}
            departments={departments}
            teamMembers={teamMembers}
            logActivity={logActivity}
            addToIntelligence={addToIntelligence}
          />
        );
      case 'systems':
        return (
          <Systems 
            systemInstructions={systemInstructions}
            setSystemInstructions={setSystemInstructions}
            intelligenceIndex={intelligenceIndex}
            teamMembers={teamMembers}
            setTeamMembers={setTeamMembers}
            pendingInvites={pendingInvites}
            setPendingInvites={setPendingInvites}
            departments={departments}
            knowledge={knowledge}
            connectedDocs={connectedDocs}
            logActivity={logActivity}
            addToIntelligence={addToIntelligence}
          />
        );
      case 'help':
        return <Help />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      display: 'flex',
      fontFamily: "'DM Sans', sans-serif"
    }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarCollapsed ? '70px' : '260px',
        background: 'rgba(15, 23, 42, 0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        position: 'fixed',
        height: '100vh',
        zIndex: 50
      }}>
        {/* Logo */}
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: 'white',
                fontSize: '18px'
              }}>E</div>
              <span style={{ color: '#E2E8F0', fontWeight: '600', fontSize: '18px' }}>Empire AI</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: '#94A3B8'
            }}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Main Nav */}
        <nav style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setCurrentPage(item.id); setActiveDepartment(null); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  marginBottom: '4px',
                  background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: isActive ? '#3B82F6' : '#94A3B8',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  position: 'relative'
                }}
              >
                <Icon size={20} />
                {!sidebarCollapsed && <span style={{ fontSize: '14px' }}>{item.label}</span>}
                {item.badge > 0 && (
                  <span style={{
                    position: sidebarCollapsed ? 'absolute' : 'static',
                    top: sidebarCollapsed ? '4px' : 'auto',
                    right: sidebarCollapsed ? '4px' : 'auto',
                    marginLeft: sidebarCollapsed ? 0 : 'auto',
                    background: '#EF4444',
                    color: 'white',
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontWeight: '600'
                  }}>{item.badge}</span>
                )}
              </button>
            );
          })}

          {/* Departments Section */}
          {!sidebarCollapsed && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ 
                color: '#64748B', 
                fontSize: '11px', 
                fontWeight: '600', 
                letterSpacing: '0.5px',
                padding: '0 12px',
                marginBottom: '12px'
              }}>
                DEPARTMENTS
              </div>
              
              {/* Search */}
              <div style={{ padding: '0 8px', marginBottom: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  gap: '8px'
                }}>
                  <Search size={14} style={{ color: '#64748B' }} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#E2E8F0',
                      fontSize: '13px',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                </div>
              </div>

              {/* Department List */}
              {filteredDepartments.map(dept => {
                const DeptIcon = getDeptIcon(dept.icon);
                const isActive = activeDepartment?.id === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => handleDepartmentClick(dept)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      marginBottom: '2px',
                      background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: isActive ? '#E2E8F0' : '#94A3B8',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '28px',
                      background: `${dept.color}20`,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <DeptIcon size={14} style={{ color: dept.color }} />
                    </div>
                    <span style={{ fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dept.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* Voice Mode Button */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setShowVoiceModal(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: '12px',
              padding: '12px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              color: 'white',
              fontWeight: '500'
            }}
          >
            <Mic size={20} />
            {!sidebarCollapsed && <span>Voice Mode</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ 
        flex: 1, 
        marginLeft: sidebarCollapsed ? '70px' : '260px',
        transition: 'margin-left 0.3s ease',
        minHeight: '100vh'
      }}>
        {renderPage()}
      </main>

      {/* Voice Modal */}
      {showVoiceModal && (
        <VoiceModal 
          onClose={() => setShowVoiceModal(false)}
          activeDepartment={activeDepartment}
          systemInstructions={systemInstructions}
          intelligenceIndex={intelligenceIndex}
          queryIntelligence={queryIntelligence}
          logActivity={logActivity}
          addToIntelligence={addToIntelligence}
        />
      )}

      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        
        input::placeholder, textarea::placeholder { color: #64748B; }
      `}</style>
    </div>
  );
}
