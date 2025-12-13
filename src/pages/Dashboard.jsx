// ==========================================
// EMPIRE AI - DASHBOARD PAGE
// Quick stats, activity feed, chat box, quick actions
// ==========================================

import React, { useState } from 'react';
import { 
  FolderKanban, AlertCircle, FileText, Users, MessageSquare, 
  Lightbulb, Upload, Mic, Plus, Send, ArrowRight
} from 'lucide-react';
import { formatDate } from '../utils';

export default function Dashboard({ 
  knowledge, issues, activities, navigateTo, logActivity 
}) {
  const [quickMessage, setQuickMessage] = useState('');

  // Stats
  const activeProjects = 3; // Placeholder - could be dynamic
  const openIssues = issues.filter(i => !i.archived && i.status !== 'Resolved').length;
  const knowledgeCount = knowledge.length;
  const teamOnline = 2; // Placeholder

  // Quick suggestions
  const suggestions = [
    "What's our safety protocol?",
    "Show me open issues",
    "Marketing best practices"
  ];

  // Handle quick chat
  const handleQuickChat = () => {
    if (quickMessage.trim()) {
      navigateTo('chat', null);
    }
  };

  // Card style
  const cardStyle = {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)',
    padding: 20,
    transition: 'transform 0.2s, box-shadow 0.2s'
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: '#94A3B8' }}>Welcome to Empire AI - Your operational intelligence hub</p>
      </div>

      {/* Quick Chat Box */}
      <div style={{ ...cardStyle, marginBottom: 24, background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <MessageSquare size={20} style={{ color: '#3B82F6' }} />
          <span style={{ fontWeight: 600 }}>Quick Chat</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            value={quickMessage}
            onChange={e => setQuickMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickChat()}
            placeholder="Ask Empire AI anything..."
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#E2E8F0',
              fontSize: 14,
              outline: 'none'
            }}
          />
          <button
            onClick={handleQuickChat}
            style={{
              padding: '12px 20px',
              background: '#3B82F6',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Send size={16} />
            Ask
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => { setQuickMessage(s); navigateTo('chat', null); }}
              style={{
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                color: '#94A3B8',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.color = '#E2E8F0'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94A3B8'; }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Active Projects', value: activeProjects, icon: FolderKanban, color: '#3B82F6' },
          { label: 'Open Issues', value: openIssues, icon: AlertCircle, color: openIssues > 0 ? '#F59E0B' : '#10B981' },
          { label: 'Knowledge Items', value: knowledgeCount, icon: FileText, color: '#8B5CF6' },
          { label: 'Team Online', value: teamOnline, icon: Users, color: '#10B981' }
        ].map((stat, i) => (
          <div 
            key={i} 
            style={cardStyle}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#94A3B8', fontSize: 13 }}>{stat.label}</span>
              <stat.icon size={20} style={{ color: stat.color }} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'Space Mono, monospace', color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Activity Feed */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600 }}>Recent Activity</h3>
            <span style={{ color: '#64748B', fontSize: 12 }}>{activities.length} events</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activities.slice(0, 6).map((activity, i) => (
              <div 
                key={activity.id || i}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{activity.action}</div>
                  {activity.details && <div style={{ fontSize: 12, color: '#94A3B8' }}>{activity.details}</div>}
                </div>
                <span style={{ fontSize: 11, color: '#64748B' }}>{formatDate(activity.timestamp)}</span>
              </div>
            ))}
            {activities.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: '#64748B' }}>
                No recent activity
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={cardStyle}>
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Start Chat', icon: MessageSquare, color: '#3B82F6', action: () => navigateTo('chat') },
              { label: 'Log Insight', icon: Lightbulb, color: '#F59E0B', action: () => navigateTo('knowledge') },
              { label: 'Upload Document', icon: Upload, color: '#8B5CF6', action: () => navigateTo('knowledge') },
              { label: 'Report Issue', icon: Plus, color: '#EF4444', action: () => navigateTo('issues') }
            ].map((action, i) => (
              <button
                key={i}
                onClick={action.action}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  color: '#E2E8F0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
                onMouseOver={e => { e.currentTarget.style.background = `${action.color}22`; e.currentTarget.style.borderColor = action.color; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <action.icon size={18} style={{ color: action.color }} />
                <span style={{ flex: 1 }}>{action.label}</span>
                <ArrowRight size={16} style={{ color: '#64748B' }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
