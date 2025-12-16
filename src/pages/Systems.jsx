// Empire AI - Systems Page
// Status cards, AI instructions, intelligence panel, tag management, team management

import React, { useState } from 'react';
import { 
  RefreshCw, Database, Brain, Wifi, FileText, Sparkles, 
  UserPlus, Mail, Crown, Edit2, Trash2, X, Check, Users,
  AlertTriangle, Tag, Merge, ChevronDown, ChevronRight, Search
} from 'lucide-react';
import { 
  formatDate, getStorageUsage, ROLES, getInitials,
  INTELLIGENCE_CONFIG, loadEmbeddingCache, clearExpiredEmbeddings,
  getTagStats, TAG_SYNONYMS
} from '../utils';

export default function Systems({
  intelligenceIndex,
  intelligenceCap,
  setIntelligenceCap,
  teamMembers,
  setTeamMembers,
  pendingInvites,
  setPendingInvites,
  systemInstructions,
  setSystemInstructions,
  departments,
  logActivity,
}) {
  // System Instructions state
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [tempInstructions, setTempInstructions] = useState(systemInstructions);
  
  // Team Management state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'member', departments: [] });
  const [editingMember, setEditingMember] = useState(null);
  
  // Tag Management state (Item 6)
  const [showTagManager, setShowTagManager] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  
  // Get stats
  const storageUsage = getStorageUsage();
  const embeddingCache = loadEmbeddingCache();
  const embeddingCacheSize = Object.keys(embeddingCache).length;
  const tagStats = getTagStats(intelligenceIndex);
  const capacityPercent = (intelligenceIndex.length / intelligenceCap) * 100;
  
  // Save system instructions
  const saveInstructions = () => {
    setSystemInstructions(tempInstructions);
    setEditingInstructions(false);
    logActivity('Updated system-wide AI instructions', 'settings');
  };
  
  // Handle intelligence cap change
  const handleCapChange = (newCap) => {
    setIntelligenceCap(newCap);
    logActivity(`Changed intelligence cap to ${newCap}`, 'settings');
  };
  
  // Clear expired embeddings
  const handleClearCache = () => {
    const cleared = clearExpiredEmbeddings();
    logActivity(`Cleared ${cleared} expired embeddings from cache`, 'settings');
  };
  
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
    setPendingInvites([...pendingInvites, invite]);
    setShowInviteModal(false);
    setNewInvite({ email: '', role: 'member', departments: [] });
    logActivity(`Sent team invite to ${invite.email}`, 'team');
  };
  
  const cancelInvite = (id) => {
    setPendingInvites(pendingInvites.filter(i => i.id !== id));
  };
  
  const updateMemberRole = (memberId, newRole) => {
    if (memberId === 'owner_1') return;
    setTeamMembers(teamMembers.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    logActivity(`Updated team member role`, 'team');
  };
  
  const removeMember = (memberId) => {
    if (memberId === 'owner_1') return;
    setTeamMembers(teamMembers.filter(m => m.id !== memberId));
    setEditingMember(null);
    logActivity(`Removed team member`, 'team');
  };
  
  // Filtered tags for search
  const filteredTags = tagSearch 
    ? tagStats.filter(t => t.tag.toLowerCase().includes(tagSearch.toLowerCase()))
    : tagStats;
  
  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#E2E8F0', marginBottom: 8 }}>
          Systems & Settings
        </h1>
        <p style={{ color: '#64748B' }}>Manage AI behavior, intelligence, and team settings</p>
      </div>
      
      {/* Status Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        <StatusCard 
          icon={<RefreshCw size={20} />}
          label="Auto-Sync"
          value="Active"
          color="#10B981"
        />
        <StatusCard 
          icon={<Database size={20} />}
          label="Storage"
          value={`${storageUsage} MB`}
          color="#3B82F6"
        />
        <StatusCard 
          icon={<Wifi size={20} />}
          label="API Status"
          value="Connected"
          color="#10B981"
        />
        <StatusCard 
          icon={<Brain size={20} />}
          label="Intelligence"
          value={`${intelligenceIndex.length} / ${intelligenceCap}`}
          color="#8B5CF6"
        />
      </div>
      
      {/* System-Wide AI Instructions */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 12,
        border: '1px solid rgba(249, 115, 22, 0.3)',
        padding: 20,
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(249, 115, 22, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileText size={20} style={{ color: '#FB923C' }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#E2E8F0' }}>System-Wide AI Instructions</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>Applied to all conversations</div>
            </div>
          </div>
          {!editingInstructions && (
            <button
              onClick={() => { setTempInstructions(systemInstructions); setEditingInstructions(true); }}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#E2E8F0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Edit2 size={14} /> Edit
            </button>
          )}
        </div>
        
        {editingInstructions ? (
          <>
            <textarea
              value={tempInstructions}
              onChange={(e) => setTempInstructions(e.target.value)}
              placeholder="Enter instructions that will guide the AI's behavior across all departments..."
              style={{
                width: '100%',
                minHeight: 150,
                padding: 12,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#E2E8F0',
                fontSize: 14,
                resize: 'vertical',
                marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setEditingInstructions(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveInstructions}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#F59E0B',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Save Instructions
              </button>
            </div>
          </>
        ) : (
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: 'rgba(15, 23, 42, 0.4)',
            color: systemInstructions ? '#E2E8F0' : '#64748B',
            fontStyle: systemInstructions ? 'normal' : 'italic',
            whiteSpace: 'pre-wrap',
          }}>
            {systemInstructions || 'No system-wide instructions configured. Click Edit to add custom AI behavior rules.'}
          </div>
        )}
      </div>
      
      {/* Central Intelligence Panel */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 12,
        border: '1px solid rgba(139, 92, 246, 0.3)',
        padding: 20,
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(139, 92, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Brain size={20} style={{ color: '#A78BFA' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#E2E8F0' }}>Central Intelligence</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>AI learning from all interactions</div>
          </div>
        </div>
        
        {/* Capacity Warning */}
        {capacityPercent >= INTELLIGENCE_CONFIG.WARNING_THRESHOLD * 100 && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: 'rgba(245, 158, 11, 0.2)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}>
            <AlertTriangle size={20} style={{ color: '#F59E0B' }} />
            <div>
              <div style={{ color: '#FBBF24', fontWeight: 500 }}>Intelligence at {capacityPercent.toFixed(0)}% capacity</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>Oldest items will be removed when full. Consider increasing the cap.</div>
            </div>
          </div>
        )}
        
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(15,23,42,0.4)', borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#A78BFA' }}>{intelligenceIndex.length}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>Total Items</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(15,23,42,0.4)', borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#10B981' }}>
              {intelligenceIndex.filter(i => i.sourceType === 'knowledge' || i.sourceType === 'document_upload').length}
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>Documents</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(15,23,42,0.4)', borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#3B82F6' }}>
              {intelligenceIndex.filter(i => i.sourceType === 'resolved_issue' || i.sourceType === 'archived_issue').length}
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>Resolved Issues</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(15,23,42,0.4)', borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#F59E0B' }}>{embeddingCacheSize}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>Cached Queries</div>
          </div>
        </div>
        
        {/* Capacity Progress Bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>Capacity Used</span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>{capacityPercent.toFixed(1)}%</span>
          </div>
          <div style={{
            height: 8,
            borderRadius: 4,
            background: 'rgba(15, 23, 42, 0.6)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(capacityPercent, 100)}%`,
              borderRadius: 4,
              background: capacityPercent > 80 ? '#F59E0B' : capacityPercent > 60 ? '#EAB308' : '#10B981',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
        
        {/* Intelligence Cap Slider */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#E2E8F0' }}>Intelligence Cap</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#A78BFA', fontFamily: 'monospace' }}>{intelligenceCap}</span>
          </div>
          <input
            type="range"
            min={INTELLIGENCE_CONFIG.MIN_CAP}
            max={INTELLIGENCE_CONFIG.MAX_CAP}
            step={100}
            value={intelligenceCap}
            onChange={(e) => handleCapChange(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: 6,
              borderRadius: 3,
              appearance: 'none',
              background: 'rgba(139, 92, 246, 0.3)',
              cursor: 'pointer',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: '#64748B' }}>{INTELLIGENCE_CONFIG.MIN_CAP}</span>
            <span style={{ fontSize: 10, color: '#64748B' }}>{INTELLIGENCE_CONFIG.MAX_CAP}</span>
          </div>
        </div>
        
        {/* Cache Management */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(15,23,42,0.4)',
          borderRadius: 8,
        }}>
          <div>
            <div style={{ fontSize: 13, color: '#E2E8F0' }}>Embedding Cache (Item 4)</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>{embeddingCacheSize} queries cached • 24hr expiration</div>
          </div>
          <button
            onClick={handleClearCache}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: '#94A3B8',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Clear Expired
          </button>
        </div>
      </div>
      
      {/* Tag Management Panel (Item 6) */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 12,
        border: '1px solid rgba(16, 185, 129, 0.3)',
        padding: 20,
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Tag size={20} style={{ color: '#34D399' }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#E2E8F0' }}>Tag Management</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{tagStats.length} unique tags • Auto-normalized</div>
            </div>
          </div>
          <button
            onClick={() => setShowTagManager(!showTagManager)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: showTagManager ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
              color: showTagManager ? '#34D399' : '#E2E8F0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {showTagManager ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {showTagManager ? 'Hide' : 'View Tags'}
          </button>
        </div>
        
        {showTagManager && (
          <>
            {/* Tag Synonyms Info */}
            <div style={{
              padding: '12px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.1)',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <Merge size={16} style={{ color: '#34D399' }} />
              <div style={{ fontSize: 12, color: '#94A3B8' }}>
                <strong style={{ color: '#34D399' }}>{Object.keys(TAG_SYNONYMS).length} tag synonyms</strong> configured for automatic consolidation.
                Similar tags like "cost" → "budget" are merged automatically.
              </div>
            </div>
            
            {/* Tag Search */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Search tags..."
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#E2E8F0',
                  fontSize: 14,
                }}
              />
            </div>
            
            {/* Tag List */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              maxHeight: 200,
              overflowY: 'auto',
              padding: 4,
            }}>
              {filteredTags.slice(0, 50).map(({ tag, count }) => (
                <div
                  key={tag}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 20,
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <span style={{ color: '#34D399', fontSize: 13 }}>{tag}</span>
                  <span style={{ 
                    background: 'rgba(16, 185, 129, 0.3)',
                    padding: '2px 6px',
                    borderRadius: 10,
                    fontSize: 11,
                    color: '#10B981',
                    fontWeight: 600,
                  }}>
                    {count}
                  </span>
                </div>
              ))}
              {filteredTags.length === 0 && (
                <div style={{ color: '#64748B', fontSize: 13, padding: 12 }}>
                  No tags found matching "{tagSearch}"
                </div>
              )}
            </div>
            
            {filteredTags.length > 50 && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#64748B', textAlign: 'center' }}>
                Showing 50 of {filteredTags.length} tags
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Team Management */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)',
        padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Users size={20} style={{ color: '#60A5FA' }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#E2E8F0' }}>Team Management</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{teamMembers.length} members • {pendingInvites.length} pending</div>
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#3B82F6',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <UserPlus size={16} /> Invite
          </button>
        </div>
        
        {/* Team Members List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {teamMembers.map(member => (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 12,
                borderRadius: 8,
                background: 'rgba(15, 23, 42, 0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: ROLES.find(r => r.id === member.role)?.color || '#3B82F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  {getInitials(member.name)}
                </div>
                <div>
                  <div style={{ color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {member.name}
                    {member.role === 'owner' && <Crown size={14} style={{ color: '#F59E0B' }} />}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{member.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={member.role}
                  onChange={(e) => updateMemberRole(member.id, e.target.value)}
                  disabled={member.id === 'owner_1'}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#E2E8F0',
                    fontSize: 12,
                    cursor: member.id === 'owner_1' ? 'not-allowed' : 'pointer',
                  }}
                >
                  {ROLES.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
                {member.id !== 'owner_1' && (
                  <button
                    onClick={() => setEditingMember(member)}
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'transparent',
                      color: '#64748B',
                      cursor: 'pointer',
                    }}
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8 }}>Pending Invitations</div>
            {pendingInvites.map(invite => (
              <div
                key={invite.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Mail size={16} style={{ color: '#F59E0B' }} />
                  <div>
                    <div style={{ color: '#E2E8F0' }}>{invite.email}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      {ROLES.find(r => r.id === invite.role)?.name} • Sent {formatDate(invite.sentAt)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => cancelInvite(invite.id)}
                  style={{
                    padding: 6,
                    borderRadius: 6,
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'transparent',
                    color: '#EF4444',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Roles Legend */}
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(15,23,42,0.4)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>Role Permissions</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ROLES.map(role => (
              <div
                key={role.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  borderRadius: 4,
                  background: `${role.color}20`,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: role.color }} />
                <span style={{ fontSize: 11, color: '#E2E8F0' }}>{role.name}</span>
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
            borderRadius: 16,
            padding: 24,
            width: 400,
            maxWidth: '90vw',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#E2E8F0', fontSize: 18 }}>Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: 13, marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={newInvite.email}
                onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                placeholder="colleague@company.com"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#E2E8F0',
                  fontSize: 14,
                }}
              />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: 13, marginBottom: 6 }}>Role</label>
              <select
                value={newInvite.role}
                onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#E2E8F0',
                  fontSize: 14,
                }}
              >
                {ROLES.filter(r => r.id !== 'owner').map(role => (
                  <option key={role.id} value={role.id}>{role.name} - {role.description}</option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: 13, marginBottom: 6 }}>Department Access</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {departments.map(dept => (
                  <button
                    key={dept.id}
                    onClick={() => {
                      const depts = newInvite.departments.includes(dept.id)
                        ? newInvite.departments.filter(d => d !== dept.id)
                        : [...newInvite.departments, dept.id];
                      setNewInvite({ ...newInvite, departments: depts });
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: newInvite.departments.includes(dept.id) ? dept.color : 'rgba(255,255,255,0.1)',
                      background: newInvite.departments.includes(dept.id) ? `${dept.color}20` : 'transparent',
                      color: newInvite.departments.includes(dept.id) ? dept.color : '#94A3B8',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {dept.name}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>
                Leave empty for access to all departments
              </div>
            </div>
            
            <button
              onClick={sendInvite}
              disabled={!newInvite.email}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                border: 'none',
                background: newInvite.email ? '#3B82F6' : 'rgba(255,255,255,0.1)',
                color: newInvite.email ? 'white' : '#64748B',
                cursor: newInvite.email ? 'pointer' : 'not-allowed',
                fontWeight: 500,
              }}
            >
              Send Invitation
            </button>
          </div>
        </div>
      )}
      
      {/* Edit Member Modal */}
      {editingMember && (
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
            borderRadius: 16,
            padding: 24,
            width: 400,
            maxWidth: '90vw',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#E2E8F0', fontSize: 18 }}>Edit Member</h3>
              <button onClick={() => setEditingMember(null)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#E2E8F0', marginBottom: 4 }}>{editingMember.name}</div>
              <div style={{ fontSize: 13, color: '#64748B' }}>{editingMember.email}</div>
            </div>
            
            <button
              onClick={() => removeMember(editingMember.id)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Trash2 size={16} /> Remove from Team
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Status Card Component
function StatusCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.8)',
      borderRadius: 12,
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: `${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#E2E8F0' }}>{value}</div>
        <div style={{ fontSize: 12, color: '#64748B' }}>{label}</div>
      </div>
    </div>
  );
}
