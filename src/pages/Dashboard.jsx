import React, { useState } from 'react';
import { 
  LayoutDashboard, MessageSquare, Lightbulb, Upload, Mic, AlertTriangle,
  Clock, Send, TrendingUp, Users, BookOpen, CheckCircle
} from 'lucide-react';

export default function Dashboard({ 
  activities, 
  knowledge, 
  issues,
  conversations,
  setCurrentPage,
  setActiveDepartment,
  departments,
  setShowVoiceModal,
  logActivity
}) {
  const [quickMessage, setQuickMessage] = useState('');

  // Calculate stats
  const activeProjects = issues.filter(i => !i.archived && i.status !== 'Resolved').length;
  const openIssues = issues.filter(i => !i.archived && i.status === 'Open').length;
  const knowledgeCount = knowledge.length;
  const teamOnline = 3; // Placeholder

  const stats = [
    { label: 'Active Projects', value: activeProjects, icon: TrendingUp, color: '#3B82F6' },
    { label: 'Open Issues', value: openIssues, icon: AlertTriangle, color: '#F59E0B' },
    { label: 'Knowledge Items', value: knowledgeCount, icon: BookOpen, color: '#8B5CF6' },
    { label: 'Team Online', value: teamOnline, icon: Users, color: '#10B981' },
  ];

  const quickActions = [
    { label: 'Start Chat', icon: MessageSquare, action: () => setCurrentPage('chat'), color: '#3B82F6' },
    { label: 'Log Insight', icon: Lightbulb, action: () => setCurrentPage('knowledge'), color: '#F59E0B' },
    { label: 'Upload Doc', icon: Upload, action: () => setCurrentPage('knowledge'), color: '#8B5CF6' },
    { label: 'Voice Mode', icon: Mic, action: () => setShowVoiceModal(true), color: '#10B981' },
    { label: 'Report Issue', icon: AlertTriangle, action: () => setCurrentPage('issues'), color: '#EF4444' },
  ];

  const suggestions = [
    "What's on the schedule today?",
    "Show me open issues",
    "Summarize recent activity",
    "Help me draft a client email"
  ];

  const handleQuickChat = () => {
    if (!quickMessage.trim()) return;
    
    // Find general department or first available
    const generalDept = departments.find(d => d.name.toLowerCase().includes('company') || d.name.toLowerCase().includes('general')) || departments[0];
    
    if (generalDept) {
      // Store the message to be sent
      sessionStorage.setItem('pendingChatMessage', quickMessage.trim());
      
      // Set the department and navigate
      setActiveDepartment(generalDept);
      setCurrentPage('chat');
      
      // Log the activity
      logActivity('Started quick chat from dashboard', 'chat');
    }
    
    setQuickMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickChat();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuickMessage(suggestion);
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LayoutDashboard size={32} style={{ color: '#3B82F6' }} />
          Dashboard
        </h1>
        <p style={{ color: '#94A3B8', marginTop: '4px' }}>Welcome back to Empire AI</p>
      </div>

      {/* Quick Chat Box - NOW AT TOP */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <h3 style={{ color: '#E2E8F0', fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} style={{ color: '#3B82F6' }} />
          Quick Chat
        </h3>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <input
            type="text"
            value={quickMessage}
            onChange={(e) => setQuickMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Empire AI anything..."
            style={{
              flex: 1,
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#E2E8F0',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            onClick={handleQuickChat}
            disabled={!quickMessage.trim()}
            style={{
              background: quickMessage.trim() ? '#3B82F6' : 'rgba(59, 130, 246, 0.3)',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              color: '#fff',
              cursor: quickMessage.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            <Send size={18} />
            Send
          </button>
        </div>

        {/* Suggestion Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '20px',
                padding: '6px 14px',
                color: '#94A3B8',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(59, 130, 246, 0.2)';
                e.target.style.color = '#E2E8F0';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                e.target.style.color = '#94A3B8';
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards - COMPACT VERSION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {stats.map((stat, i) => (
          <div key={i} style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '10px',
            padding: '14px 16px',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: `${stat.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <stat.icon size={22} style={{ color: stat.color }} />
            </div>
            <div>
              <p style={{ 
                color: '#E2E8F0', 
                fontSize: '24px', 
                fontWeight: '700', 
                fontFamily: 'Space Mono, monospace',
                lineHeight: 1,
                margin: 0
              }}>
                {stat.value}
              </p>
              <p style={{ color: '#94A3B8', fontSize: '12px', margin: '2px 0 0 0' }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Feed & Quick Actions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        
        {/* Activity Feed */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <h3 style={{ color: '#E2E8F0', fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} style={{ color: '#8B5CF6' }} />
            Recent Activity
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activities.slice(0, 6).map((activity, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px',
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '8px'
              }}>
                <CheckCircle size={16} style={{ color: '#10B981', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ 
                      color: '#3B82F6', 
                      fontSize: '13px', 
                      fontWeight: '600'
                    }}>
                      {activity.user || 'You'}
                    </span>
                    <span style={{ color: '#64748B', fontSize: '12px' }}>•</span>
                    <span style={{ 
                      color: '#8B5CF6', 
                      fontSize: '12px',
                      background: 'rgba(139, 92, 246, 0.15)',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {activity.department || 'General'}
                    </span>
                  </div>
                  <span style={{ color: '#E2E8F0', fontSize: '14px' }}>{activity.text}</span>
                </div>
                <span style={{ color: '#64748B', fontSize: '12px', flexShrink: 0 }}>{formatTimeAgo(activity.timestamp)}</span>
              </div>
            ))}
            
            {activities.length === 0 && (
              <p style={{ color: '#64748B', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                No recent activity
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <h3 style={{ color: '#E2E8F0', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            Quick Actions
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={action.action}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  color: '#E2E8F0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '14px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(15, 23, 42, 0.5)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <action.icon size={18} style={{ color: action.color }} />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
