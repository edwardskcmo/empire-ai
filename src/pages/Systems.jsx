// Empire AI - Systems Page
// Version 3.1 - Fixed AI Instructions container overflow

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Database, Users, Brain, Sparkles, Tag, FileText, 
  Mail, Crown, UserCog, Key, UserPlus, ChevronDown, ChevronUp,
  AlertTriangle, Search, Trash2, Check, X, BarChart3, 
  MessageSquare, Mic, ClipboardList, FileCheck, TrendingUp,
  Calendar, HelpCircle, Lightbulb
} from 'lucide-react';
import { 
  formatDate, 
  getStorageUsage, 
  getInitials,
  getTagStats,
  ROLES,
  INTELLIGENCE_CONFIG,
} from '../utils';

export default function Systems({
  activeDepartment,
  departments,
  logActivity,
  intelligenceIndex,
  intelligenceCap,
  setIntelligenceCap,
  teamMembers,
  setTeamMembers,
  pendingInvites,
  setPendingInvites,
  systemInstructions,
  setSystemInstructions,
  connectedDocs,
  knowledgeGaps,
  refreshKnowledgeGaps,
  resolveKnowledgeGap,
  deleteKnowledgeGap,
  clearResolvedGaps,
  getAnalyticsSummary,
  resetAnalytics,
}) {
  // UI State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editingSystemInstructions, setEditingSystemInstructions] = useState(false);
  const [tempSystemInstructions, setTempSystemInstructions] = useState('');
  const [showTagManager, setShowTagManager] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [showKnowledgeGaps, setShowKnowledgeGaps] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'member', departments: [] });
  
  // Analytics data
  const [analytics, setAnalytics] = useState(null);
  
  useEffect(() => {
    setAnalytics(getAnalyticsSummary());
  }, []);

  // Calculate stats
  const storageUsed = getStorageUsage();
  const knowledgeCount = intelligenceIndex.filter(i => i.sourceType === 'knowledge').length;
  const resolvedCount = intelligenceIndex.filter(i => i.sourceType === 'resolved_issue').length;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const addedThisWeek = intelligenceIndex.filter(i => new Date(i.createdAt) > weekAgo).length;
  const capacityPercent = (intelligenceIndex.length / intelligenceCap) * 100;
  const tagStats = getTagStats(intelligenceIndex);
  
  // Knowledge gaps stats
  const unresolvedGaps = knowledgeGaps.filter(g => !g.resolved);
  const frequentGaps = unresolvedGaps.sort((a, b) => b.count - a.count).slice(0, 10);

  // Team functions
  const sendInvite = () => {
    if (!newInvite.email) return;
    const invite = {
      id: `invite_${Date.now()}`,
      ...newInvite,
      status: 'pending',
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    setPendingInvites(prev => [...prev, invite]);
    logActivity(`Invited ${newInvite.email} as ${newInvite.role}`, 'team');
    setShowInviteModal(false);
    setNewInvite({ email: '', role: 'member', departments: [] });
  };

  const updateMemberRole = (memberId, newRole) => {
    setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    logActivity(`Updated role for team member`, 'team');
  };

  const removeMember = (memberId) => {
    setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    logActivity(`Removed team member`, 'team');
  };

  const saveSystemInstructions = () => {
    setSystemInstructions(tempSystemInstructions);
    setEditingSystemInstructions(false);
    logActivity('Updated system-wide AI instructions', 'system');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#E2E8F0', marginBottom: 8 }}>Systems</h1>
        <p style={{ color: '#64748B', fontSize: 14 }}>Platform settings, intelligence, team management, and analytics</p>
      </div>

      {/* Status Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Auto-Sync', value: 'Active', icon: RefreshCw, color: '#10B981' },
          { label: 'Storage', value: `${storageUsed} MB`, icon: Database, color: '#3B82F6' },
          { label: 'API Status', value: 'Connected', icon: Sparkles, color: '#8B5CF6' },
          { label: 'Connected Docs', value: connectedDocs.length, icon: FileText, color: '#F59E0B' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: 16,
            padding: 20,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40,
                background: `${stat.color}20`,
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: stat.color,
              }}>
                <stat.icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 2 }}>{stat.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#E2E8F0' }}>{stat.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System-Wide AI Instructions */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        border: '1px solid rgba(249, 115, 22, 0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40,
              background: 'rgba(249, 115, 22, 0.2)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#F97316',
            }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#E2E8F0', margin: 0 }}>System-Wide AI Instructions</h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Applied to all conversations</p>
            </div>
          </div>
          {!editingSystemInstructions && (
            <button
              onClick={() => { setTempSystemInstructions(systemInstructions); setEditingSystemInstructions(true); }}
              style={{
                padding: '8px 16px',
                background: 'rgba(249, 115, 22, 0.1)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                borderRadius: 8,
                color: '#F97316',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >Edit</button>
          )}
        </div>
        
        {editingSystemInstructions ? (
          <div>
            <textarea
              value={tempSystemInstructions}
              onChange={(e) => setTempSystemInstructions(e.target.value)}
              placeholder="E.g., Always respond professionally. Reference our safety policies. Use Empire Remodeling terminology."
              style={{
                width: '100%',
                minHeight: 120,
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: 12,
                color: '#E2E8F0',
                fontSize: 14,
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={saveSystemInstructions}
                style={{
                  padding: '8px 20px',
                  background: '#F97316',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >Save</button>
              <button
                onClick={() => setEditingSystemInstructions(false)}
                style={{
                  padding: '8px 20px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{
            padding: 16,
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: 8,
            color: systemInstructions ? '#E2E8F0' : '#64748B',
            fontSize: 14,
            fontStyle: systemInstructions ? 'normal' : 'italic',
            whiteSpace: 'pre-wrap',
            maxHeight: 150,
            overflowY: 'auto',
          }}>
            {systemInstructions || 'No system-wide instructions configured. Click Edit to add custom AI behavior.'}
          </div>
        )}
      </div>

      {/* Analytics Dashboard (Item 9) */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        border: '1px solid rgba(59, 130, 246, 0.2)',
      }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => setShowAnalytics(!showAnalytics)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40,
              background: 'rgba(59, 130, 246, 0.2)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#3B82F6',
            }}>
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#E2E8F0', margin: 0 }}>Usage Analytics</h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                {analytics?.allTime?.chatMessages || 0} chats • {analytics?.allTime?.voiceSessions || 0} voice sessions
              </p>
            </div>
          </div>
          {showAnalytics ? <ChevronUp size={20} color="#64748B" /> : <ChevronDown size={20} color="#64748B" />}
        </div>
        
        {showAnalytics && analytics && (
          <div style={{ marginTop: 20 }}>
            {/* Time Period Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Today', data: analytics.today },
                { label: 'This Week', data: analytics.thisWeek },
                { label: 'All Time', data: analytics.allTime },
              ].map((period, i) => (
                <div key={i} style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: 12,
                  padding: 16,
                }}>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: 12, textTransform: 'uppercase' }}>
                    {period.label}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MessageSquare size={14} style={{ color: '#3B82F6' }} />
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: '#E2E8F0' }}>{period.data.chatMessages}</div>
                        <div style={{ fontSize: 10, color: '#64748B' }}>Messages</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Mic size={14} style={{ color: '#10B981' }} />
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: '#E2E8F0' }}>{period.data.voiceSessions}</div>
                        <div style={{ fontSize: 10, color: '#64748B' }}>Voice</div>
                      </div>
                    </div>
                    {period.data.issuesCreated !== undefined && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ClipboardList size={14} style={{ color: '#F59E0B' }} />
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: '#E2E8F0' }}>{period.data.issuesCreated}</div>
                          <div style={{ fontSize: 10, color: '#64748B' }}>Issues</div>
                        </div>
                      </div>
                    )}
                    {period.data.searches !== undefined && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Search size={14} style={{ color: '#8B5CF6' }} />
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: '#E2E8F0' }}>{period.data.searches}</div>
                          <div style={{ fontSize: 10, color: '#64748B' }}>Searches</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Additional Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981' }}>{analytics.allTime.issuesResolved}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Issues Resolved</div>
              </div>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#3B82F6' }}>{analytics.allTime.docsConnected}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Docs Connected</div>
              </div>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#8B5CF6' }}>{analytics.allTime.knowledgeAdded}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Knowledge Added</div>
              </div>
              <div style={{ background: 'rgba(249, 115, 22, 0.1)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#F97316' }}>{analytics.allTime.cacheHitRate}%</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Cache Hit Rate</div>
              </div>
            </div>
            
            {/* Top Departments */}
            {analytics.topDepartments && analytics.topDepartments.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>Most Active Departments</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {analytics.topDepartments.map(([dept, count], i) => (
                    <span key={i} style={{
                      padding: '6px 12px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 16,
                      fontSize: 12,
                      color: '#94A3B8',
                    }}>
                      {dept}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Reset Button */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => {
                  if (confirm('Reset all analytics data? This cannot be undone.')) {
                    resetAnalytics();
                    setAnalytics(getAnalyticsSummary());
                  }
                }}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 8,
                  color: '#EF4444',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                Reset Analytics
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Knowledge Gaps Panel (Item 8) */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        border: '1px solid rgba(245, 158, 11, 0.2)',
      }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => { setShowKnowledgeGaps(!showKnowledgeGaps); refreshKnowledgeGaps(); }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40,
              background: 'rgba(245, 158, 11, 0.2)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#F59E0B',
            }}>
              <Lightbulb size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#E2E8F0', margin: 0 }}>Knowledge Gaps</h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                {unresolvedGaps.length} questions the AI couldn't answer confidently
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {unresolvedGaps.length > 0 && (
              <span style={{
                padding: '4px 10px',
                background: 'rgba(245, 158, 11, 0.2)',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                color: '#F59E0B',
              }}>{unresolvedGaps.length}</span>
            )}
            {showKnowledgeGaps ? <ChevronUp size={20} color="#64748B" /> : <ChevronDown size={20} color="#64748B" />}
          </div>
        </div>
        
        {showKnowledgeGaps && (
          <div style={{ marginTop: 20 }}>
            {unresolvedGaps.length === 0 ? (
              <div style={{
                padding: 24,
                textAlign: 'center',
                color: '#64748B',
              }}>
                <HelpCircle size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
                <p style={{ margin: 0 }}>No knowledge gaps detected yet</p>
                <p style={{ fontSize: 12, margin: '4px 0 0 0' }}>
                  Questions with low relevance scores will appear here
                </p>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                  These questions had low relevance scores. Consider adding documentation to address them.
                </div>
                
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {frequentGaps.map((gap) => (
                    <div key={gap.id} style={{
                      padding: 16,
                      background: gap.resolved ? 'rgba(16, 185, 129, 0.05)' : 'rgba(15, 23, 42, 0.5)',
                      borderRadius: 10,
                      marginBottom: 8,
                      border: gap.resolved ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, color: '#E2E8F0', marginBottom: 6 }}>
                            "{gap.query}"
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748B' }}>
                            <span>Asked {gap.count}x</span>
                            <span>•</span>
                            <span>Dept: {gap.department}</span>
                            <span>•</span>
                            <span>Score: {gap.topScore}</span>
                            <span>•</span>
                            <span>Last: {formatDate(gap.lastAsked)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {!gap.resolved && (
                            <button
                              onClick={() => { resolveKnowledgeGap(gap.id); refreshKnowledgeGaps(); }}
                              title="Mark as addressed"
                              style={{
                                width: 32, height: 32,
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                borderRadius: 8,
                                color: '#10B981',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <Check size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => { deleteKnowledgeGap(gap.id); refreshKnowledgeGaps(); }}
                            title="Dismiss"
                            style={{
                              width: 32, height: 32,
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              borderRadius: 8,
                              color: '#EF4444',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {knowledgeGaps.filter(g => g.resolved).length > 0 && (
                  <button
                    onClick={() => { clearResolvedGaps(); refreshKnowledgeGaps(); }}
                    style={{
                      marginTop: 12,
                      padding: '8px 16px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#94A3B8',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Clear {knowledgeGaps.filter(g => g.resolved).length} resolved gaps
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Central Intelligence Panel */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        border: '1px solid rgba(139, 92, 246, 0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40,
            background: 'rgba(139, 92, 246, 0.2)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#8B5CF6',
          }}>
            <Brain size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#E2E8F0', margin: 0 }}>Central Intelligence</h3>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Learning from every interaction</p>
          </div>
        </div>
        
        {/* Capacity Warning */}
        {capacityPercent >= INTELLIGENCE_CONFIG.WARNING_THRESHOLD * 100 && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 10,
            padding: 14,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <AlertTriangle size={20} style={{ color: '#F59E0B' }} />
            <div>
              <div style={{ fontSize: 13, color: '#F59E0B', fontWeight: 500 }}>Approaching capacity limit</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>
                Oldest items will be removed to make room for new entries. Consider increasing the cap.
              </div>
            </div>
          </div>
        )}
        
        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Intelligence Items', value: `${intelligenceIndex.length} / ${intelligenceCap}`, color: '#8B5CF6' },
            { label: 'Knowledge Docs', value: knowledgeCount, color: '#3B82F6' },
            { label: 'Resolved Issues', value: resolvedCount, color: '#10B981' },
            { label: 'Added This Week', value: addedThisWeek, color: '#F59E0B' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: 10,
              padding: 14,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, fontFamily: 'Space Mono' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
        
        {/* Capacity Slider */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>Intelligence Capacity</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#8B5CF6', fontFamily: 'Space Mono' }}>
              {intelligenceCap}
            </span>
          </div>
          <input
            type="range"
            min={INTELLIGENCE_CONFIG.MIN_CAP}
            max={INTELLIGENCE_CONFIG.MAX_CAP}
            step={100}
            value={intelligenceCap}
            onChange={(e) => setIntelligenceCap(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#8B5CF6' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748B' }}>
            <span>{INTELLIGENCE_CONFIG.MIN_CAP}</span>
            <span>{INTELLIGENCE_CONFIG.MAX_CAP}</span>
          </div>
        </div>
        
        {/* Usage Progress Bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 4 }}>
            <span>Usage</span>
            <span>{Math.round(capacityPercent)}%</span>
          </div>
          <div style={{ height: 6, background: 'rgba(15, 23, 42, 0.8)', borderRadius: 3 }}>
            <div style={{
              height: '100%',
              width: `${Math.min(capacityPercent, 100)}%`,
              background: capacityPercent > 80 ? '#F59E0B' : capacityPercent > 60 ? '#EAB308' : '#10B981',
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
        
        {/* Tag Manager */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.5)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          <div 
            style={{ 
              padding: 14, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer',
              borderBottom: showTagManager ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}
            onClick={() => setShowTagManager(!showTagManager)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Tag size={16} style={{ color: '#10B981' }} />
              <span style={{ fontSize: 13, color: '#E2E8F0' }}>Tag Management</span>
              <span style={{ 
                padding: '2px 8px', 
                background: 'rgba(16, 185, 129, 0.2)', 
                borderRadius: 10,
                fontSize: 11,
                color: '#10B981',
              }}>{tagStats.length} tags</span>
            </div>
            {showTagManager ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
          </div>
          
          {showTagManager && (
            <div style={{ padding: 14 }}>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 8px 8px 32px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    color: '#E2E8F0',
                    fontSize: 13,
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                {tagStats
                  .filter(t => !tagSearch || t.tag.includes(tagSearch.toLowerCase()))
                  .map(({ tag, count }) => (
                    <span key={tag} style={{
                      padding: '4px 10px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: 12,
                      fontSize: 11,
                      color: '#10B981',
                    }}>
                      {tag} ({count})
                    </span>
                  ))
                }
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 12 }}>
                Similar tags are automatically consolidated (e.g., "cost" → "budget")
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team Management Panel */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 16,
        padding: 24,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40,
              background: 'rgba(59, 130, 246, 0.2)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#3B82F6',
            }}>
              <Users size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#E2E8F0', margin: 0 }}>Team Management</h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{teamMembers.length} members</p>
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <UserPlus size={16} />
            Invite
          </button>
        </div>
        
        {/* Team Members List */}
        <div style={{ marginBottom: 20 }}>
          {teamMembers.map(member => (
            <div key={member.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 14,
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: 10,
              marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40,
                  background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 14,
                }}>{getInitials(member.name)}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#E2E8F0' }}>{member.name}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{member.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {member.role === 'owner' ? (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    borderRadius: 6,
                    color: '#F59E0B',
                    fontSize: 12,
                  }}>
                    <Crown size={14} />
                    Owner
                  </span>
                ) : (
                  <select
                    value={member.role}
                    onChange={(e) => updateMemberRole(member.id, e.target.value)}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6,
                      color: '#E2E8F0',
                      fontSize: 12,
                    }}
                  >
                    {ROLES.filter(r => r.id !== 'owner').map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                )}
                {member.role !== 'owner' && (
                  <button
                    onClick={() => removeMember(member.id)}
                    style={{
                      width: 32, height: 32,
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 6,
                      color: '#EF4444',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>Pending Invitations</div>
            {pendingInvites.map(invite => (
              <div key={invite.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 12,
                background: 'rgba(245, 158, 11, 0.1)',
                borderRadius: 8,
                marginBottom: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Mail size={16} style={{ color: '#F59E0B' }} />
                  <span style={{ fontSize: 13, color: '#E2E8F0' }}>{invite.email}</span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>as {invite.role}</span>
                </div>
                <button
                  onClick={() => setPendingInvites(prev => prev.filter(i => i.id !== invite.id))}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    color: '#94A3B8',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >Cancel</button>
              </div>
            ))}
          </div>
        )}
        
        {/* Roles Legend */}
        <div style={{ 
          marginTop: 20, 
          padding: 16, 
          background: 'rgba(15, 23, 42, 0.5)', 
          borderRadius: 10 
        }}>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>Role Permissions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {ROLES.map(role => (
              <div key={role.id} style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: 8, height: 8, 
                  background: role.color, 
                  borderRadius: '50%',
                  margin: '0 auto 6px',
                }} />
                <div style={{ fontSize: 11, color: '#E2E8F0' }}>{role.name}</div>
                <div style={{ fontSize: 9, color: '#64748B' }}>{role.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#1E293B',
            borderRadius: 20,
            padding: 32,
            width: 400,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: '#E2E8F0', marginBottom: 24 }}>
              Invite Team Member
            </h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 8 }}>Email</label>
              <input
                type="email"
                value={newInvite.email}
                onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                placeholder="email@example.com"
                style={{
                  width: '100%',
                  padding: 12,
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: '#E2E8F0',
                  fontSize: 14,
                }}
              />
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 8 }}>Role</label>
              <select
                value={newInvite.role}
                onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: 12,
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: '#E2E8F0',
                  fontSize: 14,
                }}
              >
                {ROLES.filter(r => r.id !== 'owner').map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >Cancel</button>
              <button
                onClick={sendInvite}
                style={{
                  flex: 1,
                  padding: 12,
                  background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  border: 'none',
                  borderRadius: 10,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >Send Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
