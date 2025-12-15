import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Settings, BookOpen, ClipboardList, MessageSquare, 
  HelpCircle, Mic, ChevronLeft, ChevronRight, Plus, Search, Menu,
  Building, TrendingUp, DollarSign, Wrench, Calculator, Users, 
  ShieldCheck, ClipboardCheck, Briefcase, Target, Lightbulb, Package,
  Home, PiggyBank, UserCheck, Shield, Clipboard, BarChart, FileText,
  Folder, Star, Heart, Zap, Globe, Smartphone, Palette
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
  extractTags,
  queryIntelligence as queryIntel,
  getSourceLabel
} from './utils';

// Icon mapping for string-to-component conversion
const ICON_MAP = {
  Building, TrendingUp, DollarSign, Wrench, Calculator, Users,
  ShieldCheck, ClipboardCheck, Briefcase, Target, Lightbulb, Package,
  Home, PiggyBank, UserCheck, Shield, Clipboard, BarChart, FileText,
  Folder, Star, Heart, Zap, Globe, Smartphone, Palette, BookOpen,
  Settings, LayoutDashboard, HelpCircle, MessageSquare
};

// Helper to render department icon (handles both emoji and Lucide icon names)
const renderDeptIcon = (icon, size = 16, color = 'currentColor') => {
  if (!icon) return <Folder size={size} color={color} />;
  
  // Check if it's a Lucide icon name (string starting with capital letter, no emoji)
  if (typeof icon === 'string' && /^[A-Z][a-zA-Z]+$/.test(icon)) {
    const IconComponent = ICON_MAP[icon];
    if (IconComponent) {
      return <IconComponent size={size} color={color} />;
    }
  }
  
  // Otherwise treat as emoji
  return <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>{icon}</span>;
};

export default function App() {
  // Navigation state
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Data state
  const [departments, setDepartments] = useState(() => loadFromStorage(STORAGE_KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS));
  const [conversations, setConversations] = useState(() => loadFromStorage(STORAGE_KEYS.CONVERSATIONS, {}));
  const [knowledge, setKnowledge] = useState(() => loadFromStorage(STORAGE_KEYS.KNOWLEDGE, []));
  const [activities, setActivities] = useState(() => loadFromStorage(STORAGE_KEYS.ACTIVITIES, []));
  const [issues, setIssues] = useState(() => loadFromStorage(STORAGE_KEYS.ISSUES, []));
  const [issueColumns, setIssueColumns] = useState(() => loadFromStorage(STORAGE_KEYS.ISSUE_COLUMNS, DEFAULT_COLUMNS));
  const [intelligenceIndex, setIntelligenceIndex] = useState(() => loadFromStorage(STORAGE_KEYS.INTELLIGENCE, []));
  const [teamMembers, setTeamMembers] = useState(() => loadFromStorage(STORAGE_KEYS.TEAM_MEMBERS, [DEFAULT_TEAM_MEMBER]));
  const [pendingInvites, setPendingInvites] = useState(() => loadFromStorage(STORAGE_KEYS.PENDING_INVITES, []));
  const [systemInstructions, setSystemInstructions] = useState(() => loadFromStorage(STORAGE_KEYS.SYSTEM_INSTRUCTIONS, ''));
  const [connectedDocs, setConnectedDocs] = useState(() => loadFromStorage(STORAGE_KEYS.CONNECTED_DOCS, []));

  // Persist data on changes
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

  // Fetch connected docs on load and every 5 minutes
  useEffect(() => {
    if (connectedDocs.length > 0) {
      refreshAllDocs();
    }
    const interval = setInterval(() => {
      if (connectedDocs.length > 0) {
        refreshAllDocs();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch a single connected doc
  const fetchConnectedDoc = async (doc) => {
    try {
      const res = await fetch('/api/fetch-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: doc.url })
      });
      const data = await res.json();
      
      if (data.error) {
        return { ...doc, status: 'error', error: data.error, lastFetched: new Date().toISOString() };
      }
      
      return { 
        ...doc, 
        status: 'synced', 
        content: data.content, 
        error: null, 
        lastFetched: new Date().toISOString() 
      };
    } catch (err) {
      return { ...doc, status: 'error', error: err.message, lastFetched: new Date().toISOString() };
    }
  };

  // Refresh all connected docs
  const refreshAllDocs = async () => {
    const updated = await Promise.all(
      connectedDocs.map(doc => fetchConnectedDoc(doc))
    );
    setConnectedDocs(updated);
  };

  // Generate smart tags using AI
  const generateSmartTags = async (content, title, sourceType) => {
    try {
      const res = await fetch('/api/generate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title, sourceType })
      });
      const data = await res.json();
      
      if (data.tags && data.tags.length > 0) {
        return data.tags;
      }
      // Fallback to keyword matching if API returns empty
      return extractTags(content || title || '');
    } catch (err) {
      console.log('Smart tagging unavailable, using keyword matching');
      return extractTags(content || title || '');
    }
  };

  // Log activity (also adds to Central Intelligence with smart tags)
  const logActivity = async (text, type = 'general', department = null, user = 'You') => {
    const deptName = department || activeDepartment?.name || 'General';
    const deptId = department ? departments.find(d => d.name === department)?.id : activeDepartment?.id || 'general';
    
    const activity = {
      id: `activity_${Date.now()}`,
      text,
      type,
      department: deptName,
      user: user,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [activity, ...prev].slice(0, 50));
    
    // Generate smart tags for the activity
    const smartTags = await generateSmartTags(text, null, 'activity_log');
    
    // Also add to Central Intelligence for AI awareness
    const intelligenceItem = {
      id: `intel_activity_${Date.now()}`,
      sourceType: 'activity_log',
      sourceId: activity.id,
      title: `Activity: ${text}`,
      content: `${user} performed action in ${deptName}: ${text}`,
      department: deptId,
      tags: smartTags.concat(['activity', type]),
      metadata: { user, type, department: deptName },
      createdAt: activity.timestamp,
      relevanceBoost: 1
    };
    setIntelligenceIndex(prev => [intelligenceItem, ...prev].slice(0, 500));
  };

  // Add to intelligence (with smart tagging)
  const addToIntelligence = async (item) => {
    // Generate smart tags if not provided or empty
    let tags = item.tags;
    if (!tags || tags.length === 0) {
      tags = await generateSmartTags(item.content, item.title, item.sourceType);
    }
    
    const newItem = {
      id: item.id || `intel_${Date.now()}`,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      title: item.title,
      content: item.content,
      department: item.department,
      tags: tags,
      metadata: item.metadata || {},
      createdAt: new Date().toISOString(),
      relevanceBoost: item.relevanceBoost || 0
    };
    setIntelligenceIndex(prev => [newItem, ...prev].slice(0, 500));
  };

  // Query intelligence wrapper
  const queryIntelligence = (index, query, dept) => {
    return queryIntel(index, query, dept);
  };

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'systems', label: 'Systems', icon: Settings },
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { id: 'issues', label: 'Issues', icon: ClipboardList, badge: issues.filter(i => !i.archived && i.status === 'Open').length },
    { id: 'help', label: 'Help / FAQ', icon: HelpCircle },
  ];

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            activities={activities}
            knowledge={knowledge}
            issues={issues}
            conversations={conversations}
            setCurrentPage={setCurrentPage}
            setActiveDepartment={setActiveDepartment}
            departments={departments}
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
            knowledge={knowledge}
            connectedDocs={connectedDocs}
            issues={issues}
            setIssues={setIssues}
            departments={departments}
          />
        );
      case 'knowledge':
        return (
          <Knowledge
            departments={departments}
            setDepartments={setDepartments}
            knowledge={knowledge}
            setKnowledge={setKnowledge}
            logActivity={logActivity}
            addToIntelligence={addToIntelligence}
            connectedDocs={connectedDocs}
            setConnectedDocs={setConnectedDocs}
            fetchConnectedDoc={fetchConnectedDoc}
            refreshAllDocs={refreshAllDocs}
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
        return <Dashboard activities={activities} knowledge={knowledge} issues={issues} />;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      display: 'flex',
      fontFamily: "'DM Sans', sans-serif"
    }}>
      {/* Background grid pattern */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none'
      }} />

      {/* Sidebar */}
      <aside style={{
        width: sidebarCollapsed ? '70px' : '260px',
        background: 'rgba(15, 23, 42, 0.8)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Logo */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          marginBottom: '24px',
          padding: '8px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            color: 'white',
            fontSize: '18px'
          }}>
            E
          </div>
          {!sidebarCollapsed && (
            <span style={{ color: '#E2E8F0', fontSize: '20px', fontWeight: '700' }}>
              Empire AI
            </span>
          )}
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            position: 'absolute',
            right: '-12px',
            top: '70px',
            width: '24px',
            height: '24px',
            background: '#1E293B',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#94A3B8'
          }}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Nav Items */}
        <nav style={{ flex: 1 }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                setActiveDepartment(null);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                marginBottom: '4px',
                background: currentPage === item.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: currentPage === item.id ? '#3B82F6' : '#94A3B8',
                cursor: 'pointer',
                transition: 'all 0.2s',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start'
              }}
            >
              <item.icon size={20} />
              {!sidebarCollapsed && (
                <>
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  {item.badge > 0 && (
                    <span style={{
                      background: '#EF4444',
                      color: 'white',
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontWeight: '600'
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
            <div style={{ marginTop: '24px' }}>
              <p style={{ 
                color: '#64748B', 
                fontSize: '11px', 
                fontWeight: '600', 
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '0 12px',
                marginBottom: '8px'
              }}>
                Departments
              </p>
              {departments.map(dept => (
                <button
                  key={dept.id}
                  onClick={() => {
                    setActiveDepartment(dept);
                    setCurrentPage('chat');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    marginBottom: '2px',
                    background: activeDepartment?.id === dept.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: activeDepartment?.id === dept.id ? '#E2E8F0' : '#94A3B8',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                    textAlign: 'left'
                  }}
                >
                  {renderDeptIcon(dept.icon, 16, activeDepartment?.id === dept.id ? '#E2E8F0' : '#94A3B8')}
                  <span style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }}>
                    {dept.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* Voice Mode Button */}
        <button
          onClick={() => setShowVoiceModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            gap: '12px',
            padding: '12px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            marginTop: 'auto'
          }}
        >
          <Mic size={20} />
          {!sidebarCollapsed && 'Voice Mode'}
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ 
        flex: 1, 
        overflow: 'auto',
        position: 'relative'
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
          knowledge={knowledge}
          connectedDocs={connectedDocs}
          issues={issues}
          setIssues={setIssues}
          departments={departments}
        />
      )}
    </div>
  );
}
