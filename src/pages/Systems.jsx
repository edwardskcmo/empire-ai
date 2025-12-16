import React, { useState } from 'react';
import { 
  Settings, RefreshCw, Database, Wifi, Brain, Tag, FileText,
  UserPlus, Mail, Crown, Shield, User, Eye, X, Edit2, Trash2,
  AlertTriangle, Sliders
} from 'lucide-react';
import { ROLES, getStorageUsage, INTELLIGENCE_CONFIG } from '../utils';

export default function Systems({
  systemInstructions,
  setSystemInstructions,
  intelligenceIndex,
  intelligenceCap,
  setIntelligenceCap,
  teamMembers,
  setTeamMembers,
  pendingInvites,
  setPendingInvites,
  departments,
  knowledge,
  connectedDocs = [],
  logActivity,
  addToIntelligence
}) {
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [tempInstructions, setTempInstructions] = useState(systemInstructions);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'member', departments: [] });
  const [editingMember, setEditingMember] = useState(null);

  // Calculate stats
  const storageUsed = getStorageUsage();
  const storageMB = (storageUsed / (1024 * 1024)).toFixed(2);
  const knowledgeCount = knowledge.length;
  const docsCount = connectedDocs.filter(d => d.status === 'synced').length;
  
  // Intelligence stats
  const intelligenceCount = intelligenceIndex.length;
  const resolvedIssues = intelligenceIndex.filter(i => i.sourceType === 'resolved_issue').length;
  const thisWeek = intelligenceIndex.filter(i => {
    const days = (Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  }).length;

  // Calculate capacity percentage for warning
  const capacityPercent = (intelligenceCount / intelligenceCap) * 100;
  const showCapacityWarning = capacityPercent >= (INTELLIGENCE_CONFIG.WARNING_THRESHOLD * 100);

  // Top tags
  const tagCounts = {};
  intelligenceIndex.forEach(item => {
    (item.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Save system instructions
  const handleSaveInstructions = () => {
    setSystemInstructions(tempInstructions);
    setEditingInstructions(false);
    logActivity('Updated system-wide AI instructions', 'settings');
  };

  // Handle intelligence cap change
  const handleCapChange = (newCap) => {
    const clampedCap = Math.max(
      INTELLIGENCE_CONFIG.MIN_CAP,
      Math.min(INTELLIGENCE_CONFIG.MAX_CAP, newCap)
    );
    setIntelligenceCap(clampedCap);
    logActivity(`Updated intelligence cap to ${clampedCap} items`, 'settings');
  };

  // Send invite
  const handleSendInvite = () => {
    if (!newInvite.email.trim()) return;
    
    const invite = {
      id: `invite_${Date.now()}`,
      email: newInvite.email.trim(),
      role: newInvite.role,
      departments: newInvite.departments,
      status: 'pending',
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    setPendingInvites(prev => [...prev, invite]);
    logActivity(`Invited ${invite.email} as ${invite.role}`, 'team');
    
    if (addToIntelligence) {
      addToIntelligence({
        sourceType: 'team_change',
        sourceId: invite.id,
        title: `Team Invite: ${invite.email}`,
        content: `Invited as ${invite.role}`,
        department: 'company-wide',
        tags: ['team', 'hiring', 'invite'],
        relevanceBoost: 1
      });
    }
    
    setNewInvite({ email: '', role: 'member', departments: [] });
    setShowInviteModal(false);
  };

  // Cancel invite
  const handleCancelInvite = (inviteId) => {
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    logActivity('Cancelled team invitation', 'team');
  };

  // Update member role
  const handleUpdateRole = (memberId, newRole) => {
    setTeamMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, role: newRole } : m
    ));
    logActivity('Updated team member role', 'team');
  };

  // Remove member
  const handleRemoveMember = (memberId) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (member?.role === 'owner') return;
    
    if (window.confirm(`Remove ${member?.name} from the team?`)) {
      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
      logActivity(`Removed ${member?.name} from team`, 'team');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner': return Crown;
      case 'admin': return Shield;
      case 'manager': return User;
      case 'member': return User;
      case 'viewer': return Eye;
      default: return User;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Settings size={32} style={{ color: '#3B82F6' }} />
          Systems
        </h1>
        <p style={{ color: '#94A3B8', marginTop: '4px' }}>System status and configuration</p>
      </div>

      {/* Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <RefreshCw size={20} style={{ color: '#10B981' }} />
            <span style={{ color: '#94A3B8', fontSize: '14px' }}>Auto-Sync</span>
          </div>
          <p style={{ color: '#10B981', fontSize: '20px', fontWeight: '600', margin: 0 }}>Active</p>
        </div>

        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Database size={20} style={{ color: '#8B5CF6' }} />
            <span style={{ color: '#94A3B8', fontSize: '14px' }}>Storage</span>
          </div>
          <p style={{ color: '#E2E8F0', fontSize: '20px', fontWeight: '600', margin: 0 }}>{storageMB} MB</p>
        </div>

        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Wifi size={20} style={{ color: '#3B82F6' }} />
            <span style={{ color: '#94A3B8', fontSize: '14px' }}>API Status</span>
          </div>
          <p style={{ color: '#10B981', fontSize: '20px', fontWeight: '600', margin: 0 }}>Connected</p>
        </div>

        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Brain size={20} style={{ color: '#F59E0B' }} />
            <span style={{ color: '#94A3B8', fontSize: '14px' }}>Knowledge</span>
          </div>
          <p style={{ color: '#E2E8F0', fontSize: '20px', fontWeight: '600', margin: 0 }}>{knowledgeCount} items</p>
        </div>
      </div>

      {/* System-Wide AI Instructions */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid rgba(249, 115, 22, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ color: '#F97316', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <FileText size={18} />
            System-Wide AI Instructions
          </h3>
          {!editingInstructions && (
            <button
              onClick={() => {
                setTempInstructions(systemInstructions);
                setEditingInstructions(true);
              }}
              style={{
                background: 'rgba(249, 115, 22, 0.2)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                borderRadius: '6px',
                padding: '6px 12px',
                color: '#F97316',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Edit
            </button>
          )}
        </div>

        {editingInstructions ? (
          <div>
            <textarea
              value={tempInstructions}
              onChange={(e) => setTempInstructions(e.target.value)}
              placeholder="Enter instructions that apply to ALL conversations (e.g., 'Always respond professionally', 'Reference our safety policies', 'Use Empire Remodeling terminology')..."
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '12px',
                color: '#E2E8F0',
                fontSize: '14px',
                minHeight: '120px',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingInstructions(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  color: '#94A3B8',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInstructions}
                style={{
                  background: '#F97316',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Save Instructions
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: systemInstructions ? '#E2E8F0' : '#64748B', fontSize: '14px', margin: 0, fontStyle: systemInstructions ? 'normal' : 'italic' }}>
            {systemInstructions || 'No system-wide instructions configured. Click Edit to add instructions that apply to all AI conversations.'}
          </p>
        )}
      </div>

      {/* Central Intelligence Panel */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: showCapacityWarning 
          ? '1px solid rgba(245, 158, 11, 0.5)' 
          : '1px solid rgba(255,255,255,0.06)'
      }}>
        <h3 style={{ color: '#E2E8F0', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Brain size={18} style={{ color: '#8B5CF6' }} />
          Central Intelligence
        </h3>

        {/* Capacity Warning */}
        {showCapacityWarning && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <AlertTriangle size={20} style={{ color: '#F59E0B', flexShrink: 0 }} />
            <div>
              <p style={{ color: '#F59E0B', fontSize: '14px', fontWeight: '600', margin: 0 }}>
                Intelligence storage at {capacityPercent.toFixed(0)}% capacity
              </p>
              <p style={{ color: '#FCD34D', fontSize: '12px', margin: '4px 0 0 0' }}>
                Oldest items will be removed when the limit is reached. Consider increasing the cap below.
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px' }}>
            <p style={{ color: '#64748B', fontSize: '12px', marginBottom: '4px' }}>Intelligence Items</p>
            <p style={{ color: '#E2E8F0', fontSize: '24px', fontWeight: '700', fontFamily: 'Space Mono, monospace', margin: 0 }}>
              {intelligenceCount}
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '400' }}> / {intelligenceCap}</span>
            </p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px' }}>
            <p style={{ color: '#64748B', fontSize: '12px', marginBottom: '4px' }}>Knowledge Docs</p>
            <p style={{ color: '#E2E8F0', fontSize: '24px', fontWeight: '700', fontFamily: 'Space Mono, monospace', margin: 0 }}>
              {knowledgeCount}
            </p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px' }}>
            <p style={{ color: '#64748B', fontSize: '12px', marginBottom: '4px' }}>Resolved Issues</p>
            <p style={{ color: '#E2E8F0', fontSize: '24px', fontWeight: '700', fontFamily: 'Space Mono, monospace', margin: 0 }}>
              {resolvedIssues}
            </p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px' }}>
            <p style={{ color: '#64748B', fontSize: '12px', marginBottom: '4px' }}>Added This Week</p>
            <p style={{ color: '#10B981', fontSize: '24px', fontWeight: '700', fontFamily: 'Space Mono, monospace', margin: 0 }}>
              +{thisWeek}
            </p>
          </div>
        </div>

        {/* Intelligence Cap Slider */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.5)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} style={{ color: '#8B5CF6' }} />
              <span style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: '500' }}>Intelligence Capacity Limit</span>
            </div>
            <span style={{ 
              color: '#8B5CF6', 
              fontSize: '14px', 
              fontWeight: '600',
              fontFamily: 'Space Mono, monospace'
            }}>
              {intelligenceCap.toLocaleString()} items
            </span>
          </div>
          
          {/* Slider */}
          <input
            type="range"
            min={INTELLIGENCE_CONFIG.MIN_CAP}
            max={INTELLIGENCE_CONFIG.MAX_CAP}
            step={100}
            value={intelligenceCap}
            onChange={(e) => handleCapChange(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${((intelligenceCap - INTELLIGENCE_CONFIG.MIN_CAP) / (INTELLIGENCE_CONFIG.MAX_CAP - INTELLIGENCE_CONFIG.MIN_CAP)) * 100}%, rgba(255,255,255,0.1) ${((intelligenceCap - INTELLIGENCE_CONFIG.MIN_CAP) / (INTELLIGENCE_CONFIG.MAX_CAP - INTELLIGENCE_CONFIG.MIN_CAP)) * 100}%, rgba(255,255,255,0.1) 100%)`,
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none'
            }}
          />
          
          {/* Range Labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ color: '#64748B', fontSize: '11px' }}>{INTELLIGENCE_CONFIG.MIN_CAP}</span>
            <span style={{ color: '#64748B', fontSize: '11px' }}>{INTELLIGENCE_CONFIG.MAX_CAP}</span>
          </div>
          
          {/* Capacity Bar */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#64748B', fontSize: '11px' }}>Current Usage</span>
              <span style={{ 
                color: capacityPercent >= 80 ? '#F59E0B' : capacityPercent >= 60 ? '#FCD34D' : '#10B981', 
                fontSize: '11px',
                fontWeight: '600'
              }}>
                {capacityPercent.toFixed(1)}%
              </span>
            </div>
            <div style={{
              height: '4px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, capacityPercent)}%`,
                background: capacityPercent >= 80 ? '#F59E0B' : capacityPercent >= 60 ? '#FCD34D' : '#10B981',
                borderRadius: '2px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </div>

        {/* Top Tags */}
        {topTags.length > 0 && (
          <div>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={14} />
              Top Tags
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {topTags.map(([tag, count]) => (
                <span key={tag} style={{
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  color: '#A78BFA'
                }}>
                  {tag} ({count})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Team Management */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ color: '#E2E8F0', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <UserPlus size={18} style={{ color: '#10B981' }} />
            Team Management
          </h3>
          <button
            onClick={() => setShowInviteModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#10B981',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 14px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <UserPlus size={14} />
            Invite
          </button>
        </div>

        {/* Team Members */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '12px' }}>Active Members ({teamMembers.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {teamMembers.map(member => {
              const RoleIcon = getRoleIcon(member.role);
              const roleInfo = ROLES.find(r => r.id === member.role);
              
              return (
                <div key={member.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: roleInfo?.color || '#64748B',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {member.avatar || member.name?.charAt(0) || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: '500', margin: 0 }}>{member.name}</p>
                    <p style={{ color: '#64748B', fontSize: '12px', margin: '2px 0 0 0' }}>{member.email}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RoleIcon size={14} style={{ color: roleInfo?.color }} />
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                      disabled={member.role === 'owner'}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: roleInfo?.color,
                        fontSize: '12px',
                        cursor: member.role === 'owner' ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {ROLES.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px',
                          cursor: 'pointer',
                          color: '#EF4444'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '12px' }}>Pending Invitations ({pendingInvites.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingInvites.map(invite => (
                <div key={invite.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  border: '1px solid rgba(245, 158, 11, 0.2)'
                }}>
                  <Mail size={20} style={{ color: '#F59E0B' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#E2E8F0', fontSize: '14px', margin: 0 }}>{invite.email}</p>
                    <p style={{ color: '#F59E0B', fontSize: '12px', margin: '2px 0 0 0' }}>
                      Invited as {invite.role} • Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      color: '#94A3B8'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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
          zIndex: 100
        }}>
          <div style={{
            background: '#1E293B',
            borderRadius: '16px',
            padding: '24px',
            width: '400px',
            maxWidth: '90vw'
          }}>
            <h2 style={{ color: '#E2E8F0', fontSize: '20px', marginBottom: '20px' }}>Invite Team Member</h2>
            
            <input
              type="email"
              placeholder="Email address"
              value={newInvite.email}
              onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '12px',
                color: '#E2E8F0',
                marginBottom: '12px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />

            <select
              value={newInvite.role}
              onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '12px',
                color: '#E2E8F0',
                marginBottom: '20px',
                fontSize: '14px'
              }}
            >
              {ROLES.filter(r => r.id !== 'owner').map(role => (
                <option key={role.id} value={role.id}>{role.name} - {role.description}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowInviteModal(false); setNewInvite({ email: '', role: 'member', departments: [] }); }}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  color: '#94A3B8',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvite}
                style={{
                  background: '#10B981',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slider Styles */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #8B5CF6;
          cursor: pointer;
          border: 2px solid #E2E8F0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #8B5CF6;
          cursor: pointer;
          border: 2px solid #E2E8F0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}
