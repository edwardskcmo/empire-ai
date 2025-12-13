// ==========================================
// EMPIRE AI - MAIN APPLICATION
// Navigation, shared state, and page routing
// ==========================================

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Settings, BookOpen, ClipboardList, MessageSquare,
  ChevronLeft, ChevronRight, Menu, HelpCircle, Building2, Megaphone,
  DollarSign, Hammer, Calculator, Users, ShieldCheck, Plus, GripVertical,
  Mic
} from 'lucide-react';

import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Knowledge from './pages/Knowledge';
import Issues from './pages/Issues';
import Systems from './pages/Systems';
import Help from './pages/Help';
import VoiceModal from './components/VoiceModal';

import {
  STORAGE_KEYS, loadFromStorage, saveToStorage,
  DEFAULT_DEPARTMENTS, DEFAULT_TEAM_MEMBER, DEFAULT_COLUMNS,
  createIntelligenceItem, queryIntelligence, extractTags,
  formatDate, generateId
} from './utils';

// ==========================================
// ICON MAP
// ==========================================
const iconMap = {
  Building2, Megaphone, DollarSign, Hammer, Calculator, Users, ShieldCheck, Settings,
  LayoutDashboard, BookOpen, ClipboardList, MessageSquare, HelpCircle
};

// ==========================================
// GLOBAL STYLES
// ==========================================
const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'DM Sans', sans-serif; 
    background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
    min-height: 100vh;
    color: #E2E8F0;
  }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
  
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes thinking {
    0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  
  .thinking-dots span {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin: 0 2px;
    background: #3B82F6;
    border-radius: 50%;
    animation: thinking 1.4s infinite ease-in-out both;
  }
  .thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
  .thinking-dots span:nth-child(2) { animation-delay: -0.16s; }
`;

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  // ==========================================
  // STATE
  // ==========================================
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  
  // Data State
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
    loadFromStorage(STORAGE_KEYS.SYSTEM_INSTRUCTIONS, '') || ''
  );

  // ==========================================
  // PERSISTENCE
  // ==========================================
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

  // ==========================================
  // ACTIVITY LOGGING
  // ==========================================
  const logActivity = (action, details = '') => {
    const activity = {
      id: generateId('act'),
      action,
      details,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [activity, ...prev].slice(0, 100));
  };

  // ==========================================
  // INTELLIGENCE FUNCTIONS
  // ==========================================
  const addToIntelligence = (sourceType, sourceId, title, content, department, metadata = {}, boost = 1) => {
    const item = createIntelligenceItem(sourceType, sourceId, title, content, department, metadata, boost);
    setIntelligenceIndex(prev => [item, ...prev].slice(0, 500));
  };

  const searchIntelligence = (query, dept = null) => {
    return queryIntelligence(intelligenceIndex, query, dept);
  };

  // ==========================================
  // NAVIGATION
  // ==========================================
  const navigateTo = (page, dept = null) => {
    setCurrentPage(page);
    setActiveDepartment(dept);
  };

  // ==========================================
  // SHARED PROPS
  // ==========================================
  const sharedProps = {
    departments, setDepartments,
    conversations, setConversations,
    knowledge, setKnowledge,
    activities, setActivities,
    issues, setIssues,
    issueColumns, setIssueColumns,
    intelligenceIndex, setIntelligenceIndex,
    teamMembers, setTeamMembers,
    pendingInvites, setPendingInvites,
    systemInstructions, setSystemInstructions,
    logActivity, addToIntelligence, searchIntelligence,
    navigateTo, activeDepartment, setActiveDepartment,
    iconMap
  };

  // ==========================================
  // RENDER PAGE
  // ==========================================
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard {...sharedProps} />;
      case 'chat': return <Chat {...sharedProps} />;
      case 'knowledge': return <Knowledge {...sharedProps} />;
      case 'issues': return <Issues {...sharedProps} />;
      case 'systems': return <Systems {...sharedProps} />;
      case 'help': return <Help {...sharedProps} />;
      default: return <Dashboard {...sharedProps} />;
    }
  };

  // Count open issues for badge
  const openIssueCount = issues.filter(i => !i.archived && i.status !== 'Resolved').length;

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        
        {/* ==================== SIDEBAR ==================== */}
        <aside style={{
          width: sidebarCollapsed ? 60 : 260,
          background: 'rgba(15, 23, 42, 0.95)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s ease',
          position: 'fixed',
          height: '100vh',
          zIndex: 100
        }}>
          {/* Logo */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between'
          }}>
            {!sidebarCollapsed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 18
                }}>E</div>
                <span style={{ fontWeight: 600, fontSize: 18 }}>Empire AI</span>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 4
              }}
            >
              {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
            {/* Main Nav Items */}
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'systems', icon: Settings, label: 'Systems' },
              { id: 'knowledge', icon: BookOpen, label: 'Knowledge' },
              { id: 'issues', icon: ClipboardList, label: 'Issues', badge: openIssueCount },
              { id: 'help', icon: HelpCircle, label: 'Help / FAQ' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setCurrentPage(item.id); setActiveDepartment(null); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  marginBottom: 4,
                  background: currentPage === item.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  color: currentPage === item.id ? '#3B82F6' : '#94A3B8',
                  cursor: 'pointer',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  transition: 'all 0.2s'
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
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 10
                      }}>{item.badge}</span>
                    )}
                  </>
                )}
              </button>
            ))}

            {/* Departments Section */}
            {!sidebarCollapsed && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ 
                  padding: '0 12px', 
                  marginBottom: 8, 
                  fontSize: 11, 
                  fontWeight: 600, 
                  color: '#64748B', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Departments
                </div>
                {departments.map(dept => {
                  const Icon = iconMap[dept.icon] || Building2;
                  return (
                    <button
                      key={dept.id}
                      onClick={() => { setCurrentPage('chat'); setActiveDepartment(dept); }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        marginBottom: 2,
                        background: activeDepartment?.id === dept.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        border: 'none',
                        borderRadius: 6,
                        color: activeDepartment?.id === dept.id ? '#E2E8F0' : '#94A3B8',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'left'
                      }}
                    >
                      <Icon size={16} style={{ color: dept.color }} />
                      <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dept.name}
                      </span>
                    </button>
                  );
                })}
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
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Mic size={18} />
              {!sidebarCollapsed && <span>Voice Mode</span>}
            </button>
          </div>
        </aside>

        {/* ==================== MAIN CONTENT ==================== */}
        <main style={{
          flex: 1,
          marginLeft: sidebarCollapsed ? 60 : 260,
          padding: 24,
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
          background: `
            linear-gradient(135deg, #0F172A 0%, #1E293B 100%),
            repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 41px),
            repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 41px)
          `
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
      </div>
    </>
  );
}
