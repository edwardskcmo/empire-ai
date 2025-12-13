// ==========================================
// EMPIRE AI - SYSTEMS PAGE
// Status, intelligence, team management, AI instructions
// ==========================================

import React, { useState } from 'react';
import { 
  RefreshCw, Database, Wifi, BookOpen, Brain, Tag, FileText, Edit2,
  UserPlus, Mail, Crown, UserCog, X, Check, Trash2
} from 'lucide-react';
import { getStorageUsage, formatDate, generateId, ROLES, getInitials } from '../utils';

export default function Systems({ 
  departments, knowledge, intelligenceIndex, 
  teamMembers, setTeamMembers, pendingInvites, setPendingInvites,
  systemInstructions, setSystemInstructions,
  logActivity, addToIntelligence
}) {
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [tempInstructions, setTempInstructions] = useState(systemInstructions);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'member', departments: [] });

  // Stats
  const storageUsage = getStorageUsage();
  const recentIntelligence = intelligenceIndex.filter(i => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return new Date(i.createdAt).getTime() > weekAgo;
  }).length;

  // Get top tags
  const tagCounts = {};
  intelligenceIndex.forEach(item => {
    item.tags?.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Save system instructions
  const saveInstructions = () => {
    setSystemInstructions(tempInstructions);
    setEditingInstructions(false);
    logActivity('System instructions updated');
  };

  // Send invite
  const sendInvite = () => {
    if (!newInvite.email.trim()) return;
    const invite = {
      id: generateId('invite'),
      ...newInvite,
      status: 'pending',
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    setPendingInvites(prev => [...prev, invite]);
    addToIntelligence('team_change', invite.id, `Invite sent: ${invite.email}`, `Role: ${invite.role}`, 'general', {}, 1);
    logActivity('Team invite sent', invite.email);
    setNewInvite({ email: '', role: 'member', departments: [] });
    setShowInviteModal(false);
  };

  // Cancel invite
  const cancelInvite = (id) => {
    setPendingInvites(prev => prev.filter(i => i.id !== id));
    logActivity('Invite cancelled');
  };

  // Update member role
  const updateMemberRole = (memberId, newRole) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member || member.role === 'owner') return;
    setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    addToIntelligence('team_change', memberId, `Role changed: ${member.name}`, `${member.role} → ${newRole}`, 'general', {}, 2);
    logActivity('Member role updated', `${member.name} → ${newRole}`);
  };

  // Remove member
  const removeMember = (memberId) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member || member.role === 'owner') return;
    if (!window.confirm(`Remove ${member.name} from the team?`)) return;
    setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    addToIntelligence('team_change', memberId, `Member removed: ${member.name}`, `Previous role: ${member.role}`, 'general', {}, 2);
    logActivity('Team member removed', member.name);
    setShowEditMemberModal(false);
    setEditingMember(null);
  };

  // Card style
  const cardStyle = {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)',
    padding: 20
  };

  // Modal style
  const modalOverlay = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const modalContent = {
    background: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.1)',
    padding: 24,
    width: '100%',
    maxWidth: 500
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Systems</h1>
        <p style={{ color: '#94A3B8' }}>Monitor and configure Empire AI</p>
      </div>

      {/* Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Auto-Sync', value: 'Active', icon: RefreshCw, color: '#10B981', sub: '30s interval' },
          { label: 'Storage', value: `${storageUsage} MB`, icon: Database, color: '#3B82F6', sub: 'localStorage' },
          { label: 'API Status', value: 'Connected', icon: Wifi, color: '#10B981', sub: 'Anthropic' },
          { label: 'Knowledge', value: knowledge.length, icon: BookOpen, color: '#8B5CF6', sub: 'items' }
        ].map((stat, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#94A3B8', fontSize: 13 }}>{stat.label}</span>
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Space Mono, monospace', color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* System-Wide AI Instructions */}
      <div style={{ 
        ...cardStyle, 
        marginBottom: 24,
        borderColor: 'rgba(249, 115, 22, 0.3)',
        background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.05), rgba(30, 41, 59, 0.8))'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20} style={{ color: '#F97316' }} />
            <h3 style={{ fontWeight: 600 }}>System-Wide AI Instructions</h3>
          </div>
          {!editingInstructions && (
            <button
              onClick={() => { setTempInstructions(systemInstructions); setEditingInstructions(true); }}
              style={{
                padding: '6px 12px',
                background: 'rgba(249, 115, 22, 0.2)',
                border: 'none',
                borderRadius: 6,
                color: '#F97316',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Edit2 size={14} />
              Edit
            </button>
          )}
        </div>

        {editingInstructions ? (
          <div>
            <textarea
              value={tempInstructions}
              onChange={e => setTempInstructions(e.target.value)}
              placeholder="Enter custom instructions for Empire AI. These apply to ALL conversations across every department.

Examples:
• Always respond in a professional but friendly tone
• Reference our safety policies when discussing job sites
• Prioritize customer satisfaction in all recommendations"
              rows={6}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#E2E8F0',
                fontSize: 14,
                resize: 'vertical',
                minHeight: 150
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => setEditingInstructions(false)}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#94A3B8',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveInstructions}
                style={{
                  padding: '10px 20px',
                  background: '#F97316',
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
                <Check size={16} />
                Save Instructions
              </button>
            </div>
          </div>
        ) : (
          <div style={{ 
            color: systemInstructions ? '#E2E8F0' : '#64748B', 
            fontStyle: systemInstructions ? 'normal' : 'italic', 
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {systemInstructions || 'No system-wide instructions configured. Click Edit to add custom behavior for the AI.'}
          </div>
        )}
      </div>

      {/* Intelligence Panel */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Brain size={20} style={{ color: '#8B5CF6' }} />
          <h3 style={{ fontWeight: 600 }}>Central Intelligence</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Items', value: intelligenceIndex.length },
            { label: 'Knowledge Docs', value: intelligenceIndex.filter(i => i.sourceType === 'knowledge').length },
            { label: 'Resolved Issues', value: intelligenceIndex.filter(i => i.sourceType === 'resolved_issue').length },
            { label: 'Added This Week', value: recentIntelligence }
          ].map((stat, i) => (
            <div key={i} style={{ 
              padding: 16, 
              background: 'rgba(139, 92, 246, 0.1)', 
              borderRadius: 8,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#8B5CF6', fontFamily: 'Space Mono, monospace' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Top Tags */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Tag size={16} style={{ color: '#64748B' }} />
            <span style={{ fontSize: 13, color: '#94A3B8' }}>Top Tags</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {topTags.map(([tag, count]) => (
              <span
                key={tag}
                style={{
                  padding: '4px 10px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  borderRadius: 12,
                  fontSize: 12,
                  color: '#A78BFA'
                }}
              >
                {tag} ({count})
              </span>
            ))}
            {topTags.length === 0 && (
              <span style={{ color: '#64748B', fontSize: 13 }}>No tags yet - they'll appear as you add content</span>
            )}
          </div>
        </div>
      </div>

      {/* Team Management */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserCog size={20} style={{ color: '#10B981' }} />
            <h3 style={{ fontWeight: 600 }}>Team Management</h3>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            style={{
              padding: '8px 16px',
              background: '#10B981',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13
            }}
          >
            <UserPlus size={14} />
            Invite
          </button>
        </div>

        {/* Team Members */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>Active Members ({teamMembers.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teamMembers.map(member => {
              const role = ROLES.find(r => r.id === member.role);
              return (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: 8
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: role?.color || '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: 12
                  }}>
                    {member.avatar || getInitials(member.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {member.name}
                      {member.role === 'owner' && <Crown size={14} style={{ color: '#F59E0B' }} />}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{member.email}</div>
                  </div>
                  {member.role !== 'owner' ? (
                    <>
                      <select
                        value={member.role}
                        onChange={e => updateMemberRole(member.id, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          background: `${role?.color}22`,
                          border: 'none',
                          borderRadius: 6,
                          color: role?.color,
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        {ROLES.filter(r => r.id !== 'owner').map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => { setEditingMember(member); setShowEditMemberModal(true); }}
                        style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4 }}
                      >
                        <Edit2 size={14} />
                      </button>
                    </>
                  ) : (
                    <span style={{ padding: '6px 10px', background: 'rgba(245, 158, 11, 0.2)', borderRadius: 6, color: '#F59E0B', fontSize: 12 }}>
                      Owner
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>Pending Invites ({pendingInvites.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingInvites.map(invite => (
                <div
                  key={invite.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    borderRadius: 8,
                    border: '1px dashed rgba(245, 158, 11, 0.3)'
                  }}
                >
                  <Mail size={18} style={{ color: '#F59E0B' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{invite.email}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      {ROLES.find(r => r.id === invite.role)?.name} • Expires {formatDate(invite.expiresAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => cancelInvite(invite.id)}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: 'none',
                      borderRadius: 6,
                      color: '#EF4444',
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roles Legend */}
        <div style={{ marginTop: 20, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>Role Permissions</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {ROLES.map(role => (
              <div key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: role.color }} />
                <span style={{ fontSize: 12, color: '#94A3B8' }}>{role.name}</span>
                <span style={{ fontSize: 11, color: '#64748B' }}>- {role.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={modalOverlay} onClick={() => setShowInviteModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Invite Team Member</h2>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Email Address</label>
                <input
                  type="email"
                  value={newInvite.email}
                  onChange={e => setNewInvite({ ...newInvite, email: e.target.value })}
                  placeholder="team@company.com"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#E2E8F0',
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Role</label>
                <select
                  value={newInvite.role}
                  onChange={e => setNewInvite({ ...newInvite, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#E2E8F0',
                    fontSize: 14
                  }}
                >
                  {ROLES.filter(r => r.id !== 'owner').map(role => (
                    <option key={role.id} value={role.id}>{role.name} - {role.description}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Department Access</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {departments.map(dept => (
                    <label
                      key={dept.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        background: newInvite.departments.includes(dept.id) ? `${dept.color}22` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${newInvite.departments.includes(dept.id) ? dept.color : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 13
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={newInvite.departments.includes(dept.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setNewInvite({ ...newInvite, departments: [...newInvite.departments, dept.id] });
                          } else {
                            setNewInvite({ ...newInvite, departments: newInvite.departments.filter(d => d !== dept.id) });
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      {dept.name}
                    </label>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>Leave empty for access to all departments</p>
              </div>

              <button
                onClick={sendInvite}
                disabled={!newInvite.email.trim()}
                style={{
                  padding: '14px',
                  background: newInvite.email.trim() ? '#10B981' : 'rgba(16, 185, 129, 0.3)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontWeight: 600,
                  cursor: newInvite.email.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <Mail size={16} />
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditMemberModal && editingMember && (
        <div style={modalOverlay} onClick={() => { setShowEditMemberModal(false); setEditingMember(null); }}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Edit Team Member</h2>
              <button onClick={() => { setShowEditMemberModal(false); setEditingMember(null); }} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: ROLES.find(r => r.id === editingMember.role)?.color || '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600
                }}>
                  {editingMember.avatar || getInitials(editingMember.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 18 }}>{editingMember.name}</div>
                  <div style={{ color: '#64748B' }}>{editingMember.email}</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Department Access</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {departments.map(dept => (
                    <label
                      key={dept.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        background: (editingMember.departments?.length === 0 || editingMember.departments?.includes(dept.id)) ? `${dept.color}22` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${(editingMember.departments?.length === 0 || editingMember.departments?.includes(dept.id)) ? dept.color : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 13
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editingMember.departments?.length === 0 || editingMember.departments?.includes(dept.id)}
                        onChange={e => {
                          const depts = editingMember.departments || [];
                          if (e.target.checked) {
                            setEditingMember({ ...editingMember, departments: [...depts, dept.id] });
                          } else {
                            setEditingMember({ ...editingMember, departments: depts.filter(d => d !== dept.id) });
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      {dept.name}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  onClick={() => removeMember(editingMember.id)}
                  style={{
                    padding: '12px 20px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid #EF4444',
                    borderRadius: 8,
                    color: '#EF4444',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Trash2 size={16} />
                  Remove
                </button>
                <button
                  onClick={() => {
                    setTeamMembers(prev => prev.map(m => m.id === editingMember.id ? editingMember : m));
                    setShowEditMemberModal(false);
                    setEditingMember(null);
                    logActivity('Member updated', editingMember.name);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    background: '#3B82F6',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
