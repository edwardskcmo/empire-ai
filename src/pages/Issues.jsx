// ==========================================
// EMPIRE AI - ISSUES PAGE
// Dynamic table with archive, filters, and column management
// ==========================================

import React, { useState } from 'react';
import { 
  Plus, Archive, ArchiveRestore, Search, Filter, Columns, RotateCcw,
  Edit2, Trash2, X, ChevronDown
} from 'lucide-react';
import { formatDate, generateId, DEFAULT_COLUMNS } from '../utils';

export default function Issues({ 
  departments, issues, setIssues, issueColumns, setIssueColumns,
  logActivity, addToIntelligence
}) {
  const [showArchive, setShowArchive] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    department: '',
    priority: 'Medium',
    assignee: ''
  });

  // Filter issues
  const activeIssues = issues.filter(i => !i.archived);
  const archivedIssues = issues.filter(i => i.archived);
  
  let displayedIssues = showArchive ? archivedIssues : activeIssues;
  
  // Apply filters
  if (filterStatus) displayedIssues = displayedIssues.filter(i => i.status === filterStatus);
  if (filterPriority) displayedIssues = displayedIssues.filter(i => i.priority === filterPriority);
  if (filterDept) displayedIssues = displayedIssues.filter(i => i.department === filterDept);
  if (showArchive && archiveSearch) {
    const search = archiveSearch.toLowerCase();
    displayedIssues = displayedIssues.filter(i => 
      i.title.toLowerCase().includes(search) || 
      i.description?.toLowerCase().includes(search)
    );
  }

  // Add issue
  const addIssue = () => {
    if (!newIssue.title.trim()) return;
    const issue = {
      id: generateId('issue'),
      ...newIssue,
      status: 'Open',
      createdAt: new Date().toISOString(),
      archived: false
    };
    setIssues(prev => [issue, ...prev]);
    
    // Add to intelligence
    const boost = issue.priority === 'High' ? 3 : issue.priority === 'Medium' ? 2 : 1;
    addToIntelligence('issue_created', issue.id, issue.title, issue.description || '', issue.department, { priority: issue.priority, status: 'Open' }, boost);
    
    logActivity('Issue created', issue.title);
    setNewIssue({ title: '', description: '', department: '', priority: 'Medium', assignee: '' });
    setShowAddModal(false);
  };

  // Update issue
  const updateIssue = (id, updates) => {
    const issue = issues.find(i => i.id === id);
    if (!issue) return;

    // Check for status change
    if (updates.status && updates.status !== issue.status) {
      let boost = 1;
      if (updates.status === 'Resolved') {
        boost = 3;
        updates.resolvedAt = new Date().toISOString();
        addToIntelligence('resolved_issue', id, `Resolved: ${issue.title}`, issue.description || '', issue.department, {}, 5);
      }
      addToIntelligence('issue_status_change', id, `${issue.title} → ${updates.status}`, `Status changed from ${issue.status} to ${updates.status}`, issue.department, {}, boost);
    }

    // Check for priority change
    if (updates.priority && updates.priority !== issue.priority) {
      const boost = updates.priority === 'High' ? 2 : 1;
      addToIntelligence('issue_priority_change', id, `${issue.title} priority changed`, `Priority changed from ${issue.priority} to ${updates.priority}`, issue.department, {}, boost);
    }

    setIssues(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    logActivity('Issue updated', issue.title);
  };

  // Archive issue
  const archiveIssue = (id) => {
    const issue = issues.find(i => i.id === id);
    if (!issue) return;
    setIssues(prev => prev.map(i => i.id === id ? { ...i, archived: true, archivedAt: new Date().toISOString() } : i));
    addToIntelligence('archived_issue', id, `Archived: ${issue.title}`, issue.description || '', issue.department, {}, 2);
    logActivity('Issue archived', issue.title);
  };

  // Unarchive issue
  const unarchiveIssue = (id) => {
    const issue = issues.find(i => i.id === id);
    if (!issue) return;
    setIssues(prev => prev.map(i => i.id === id ? { ...i, archived: false, archivedAt: null } : i));
    logActivity('Issue restored', issue.title);
  };

  // Delete issue
  const deleteIssue = (id) => {
    if (!window.confirm('Delete this issue permanently?')) return;
    setIssues(prev => prev.filter(i => i.id !== id));
    logActivity('Issue deleted');
  };

  // Toggle column visibility
  const toggleColumn = (colId) => {
    setIssueColumns(prev => prev.map(c => c.id === colId ? { ...c, visible: !c.visible } : c));
  };

  // Reset columns
  const resetColumns = () => {
    setIssueColumns(DEFAULT_COLUMNS);
    logActivity('Issue columns reset');
  };

  // Get department name
  const getDeptName = (deptId) => {
    const dept = departments.find(d => d.id === deptId);
    return dept?.name || 'General';
  };

  // Priority colors
  const priorityColors = {
    High: '#EF4444',
    Medium: '#F59E0B',
    Low: '#10B981'
  };

  // Status colors
  const statusColors = {
    Open: '#3B82F6',
    'In Progress': '#F59E0B',
    Resolved: '#10B981'
  };

  // Card style
  const cardStyle = {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)'
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Issues Board</h1>
          <p style={{ color: '#94A3B8' }}>
            {showArchive ? `${archivedIssues.length} archived issues` : `${activeIssues.length} active issues`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setShowArchive(!showArchive)}
            style={{
              padding: '10px 16px',
              background: showArchive ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
              border: showArchive ? '1px solid #8B5CF6' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: showArchive ? '#8B5CF6' : '#94A3B8',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Archive size={16} />
            Archive
            {archivedIssues.length > 0 && (
              <span style={{
                background: '#8B5CF6',
                color: 'white',
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 10
              }}>{archivedIssues.length}</span>
            )}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 20px',
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
            <Plus size={16} />
            New Issue
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ ...cardStyle, padding: 16, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {showArchive && (
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
            <input
              value={archiveSearch}
              onChange={e => setArchiveSearch(e.target.value)}
              placeholder="Search archive..."
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#E2E8F0',
                fontSize: 14
              }}
            />
          </div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} style={{ color: '#64748B' }} />
          
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: '#E2E8F0',
              fontSize: 13
            }}
          >
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: '#E2E8F0',
              fontSize: 13
            }}
          >
            <option value="">All Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: '#E2E8F0',
              fontSize: 13
            }}
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              style={{
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Columns size={14} />
              Columns
            </button>
            {showColumnMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: 'rgba(30, 41, 59, 0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: 8,
                minWidth: 160,
                zIndex: 100
              }}>
                {issueColumns.filter(c => c.id !== 'actions').map(col => (
                  <label
                    key={col.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      cursor: 'pointer',
                      borderRadius: 4
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => toggleColumn(col.id)}
                    />
                    <span style={{ color: '#E2E8F0', fontSize: 13 }}>{col.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={resetColumns}
            style={{
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </div>

      {/* Issues Table */}
      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {issueColumns.filter(c => c.visible).map(col => (
                <th
                  key={col.id}
                  style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: 12,
                    color: '#94A3B8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    width: col.width
                  }}
                >
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedIssues.map(issue => (
              <tr 
                key={issue.id}
                style={{ 
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                {issueColumns.filter(c => c.visible).map(col => (
                  <td key={col.id} style={{ padding: '14px 16px' }}>
                    {col.id === 'title' && (
                      <div>
                        <div style={{ fontWeight: 500 }}>{issue.title}</div>
                        {issue.description && (
                          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                            {issue.description.substring(0, 60)}...
                          </div>
                        )}
                      </div>
                    )}
                    {col.id === 'department' && (
                      <span style={{ fontSize: 13, color: '#94A3B8' }}>{getDeptName(issue.department)}</span>
                    )}
                    {col.id === 'priority' && (
                      <span style={{
                        padding: '4px 10px',
                        background: `${priorityColors[issue.priority]}22`,
                        color: priorityColors[issue.priority],
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 500
                      }}>
                        {issue.priority}
                      </span>
                    )}
                    {col.id === 'status' && (
                      <select
                        value={issue.status}
                        onChange={e => updateIssue(issue.id, { status: e.target.value })}
                        style={{
                          padding: '6px 10px',
                          background: `${statusColors[issue.status]}22`,
                          border: 'none',
                          borderRadius: 6,
                          color: statusColors[issue.status],
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    )}
                    {col.id === 'assignee' && (
                      <span style={{ fontSize: 13, color: '#94A3B8' }}>{issue.assignee || '-'}</span>
                    )}
                    {col.id === 'createdAt' && (
                      <span style={{ fontSize: 12, color: '#64748B' }}>{formatDate(issue.createdAt)}</span>
                    )}
                    {col.id === 'actions' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => setEditingIssue(issue)}
                          style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: 6 }}
                        >
                          <Edit2 size={14} />
                        </button>
                        {showArchive ? (
                          <>
                            <button
                              onClick={() => unarchiveIssue(issue.id)}
                              style={{ background: 'transparent', border: 'none', color: '#10B981', cursor: 'pointer', padding: 6 }}
                            >
                              <ArchiveRestore size={14} />
                            </button>
                            <button
                              onClick={() => deleteIssue(issue.id)}
                              style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 6 }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => archiveIssue(issue.id)}
                            style={{ background: 'transparent', border: 'none', color: '#8B5CF6', cursor: 'pointer', padding: 6 }}
                          >
                            <Archive size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {displayedIssues.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748B' }}>
            {showArchive ? 'No archived issues found' : 'No issues found'}
          </div>
        )}
      </div>

      {/* Add Issue Modal */}
      {showAddModal && (
        <div style={modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>New Issue</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Title</label>
                <input
                  value={newIssue.title}
                  onChange={e => setNewIssue({ ...newIssue, title: e.target.value })}
                  placeholder="Issue title"
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
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Description</label>
                <textarea
                  value={newIssue.description}
                  onChange={e => setNewIssue({ ...newIssue, description: e.target.value })}
                  placeholder="Describe the issue..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#E2E8F0',
                    fontSize: 14,
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Department</label>
                  <select
                    value={newIssue.department}
                    onChange={e => setNewIssue({ ...newIssue, department: e.target.value })}
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
                    <option value="">Select department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Priority</label>
                  <select
                    value={newIssue.priority}
                    onChange={e => setNewIssue({ ...newIssue, priority: e.target.value })}
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
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Assignee</label>
                <input
                  value={newIssue.assignee}
                  onChange={e => setNewIssue({ ...newIssue, assignee: e.target.value })}
                  placeholder="Who's responsible?"
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

              <button
                onClick={addIssue}
                disabled={!newIssue.title.trim()}
                style={{
                  padding: '14px',
                  background: newIssue.title.trim() ? '#3B82F6' : 'rgba(59, 130, 246, 0.3)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontWeight: 600,
                  cursor: newIssue.title.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Create Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Issue Modal */}
      {editingIssue && (
        <div style={modalOverlay} onClick={() => setEditingIssue(null)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Edit Issue</h2>
              <button onClick={() => setEditingIssue(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Title</label>
                <input
                  value={editingIssue.title}
                  onChange={e => setEditingIssue({ ...editingIssue, title: e.target.value })}
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
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Description</label>
                <textarea
                  value={editingIssue.description || ''}
                  onChange={e => setEditingIssue({ ...editingIssue, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#E2E8F0',
                    fontSize: 14,
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Priority</label>
                  <select
                    value={editingIssue.priority}
                    onChange={e => setEditingIssue({ ...editingIssue, priority: e.target.value })}
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
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Assignee</label>
                  <input
                    value={editingIssue.assignee || ''}
                    onChange={e => setEditingIssue({ ...editingIssue, assignee: e.target.value })}
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
              </div>

              <button
                onClick={() => {
                  updateIssue(editingIssue.id, editingIssue);
                  setEditingIssue(null);
                }}
                style={{
                  padding: '14px',
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
      )}
    </div>
  );
}
