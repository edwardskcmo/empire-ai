import React, { useState } from 'react';
import { 
  ClipboardList, Plus, Search, Filter, Archive, ArchiveRestore,
  Edit2, Trash2, X, ChevronDown
} from 'lucide-react';

export default function Issues({
  issues,
  setIssues,
  issueColumns,
  setIssueColumns,
  departments,
  teamMembers,
  logActivity,
  addToIntelligence
}) {
  const [showArchive, setShowArchive] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterDept, setFilterDept] = useState('all');

  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    department: '',
    priority: 'Medium',
    status: 'Open',
    assignee: ''
  });

  const activeIssues = issues.filter(i => !i.archived);
  const archivedIssues = issues.filter(i => i.archived);

  // Filter issues
  const filteredIssues = (showArchive ? archivedIssues : activeIssues).filter(issue => {
    if (searchTerm && !issue.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus !== 'all' && issue.status !== filterStatus) return false;
    if (filterPriority !== 'all' && issue.priority !== filterPriority) return false;
    if (filterDept !== 'all' && issue.department !== filterDept) return false;
    return true;
  });

  // Clear all issues
  const handleClearAll = () => {
    if (window.confirm('⚠️ DELETE ALL ISSUES?\n\nThis will permanently remove ALL issues (active and archived).\n\nThis cannot be undone!')) {
      setIssues([]);
      logActivity('Cleared all issues', 'issue');
    }
  };

  // Add issue
  const handleAddIssue = () => {
    if (!newIssue.title.trim()) return;

    const issue = {
      id: `issue_${Date.now()}`,
      title: newIssue.title.trim(),
      description: newIssue.description.trim(),
      department: newIssue.department,
      priority: newIssue.priority,
      status: newIssue.status,
      assignee: newIssue.assignee,
      createdAt: new Date().toISOString(),
      archived: false
    };

    setIssues(prev => [issue, ...prev]);
    logActivity(`Created issue: ${issue.title}`, 'issue');

    // Add to intelligence
    const boost = issue.priority === 'High' ? 3 : issue.priority === 'Medium' ? 2 : 1;
    if (addToIntelligence) {
      addToIntelligence({
        sourceType: 'issue_created',
        sourceId: issue.id,
        title: issue.title,
        content: issue.description,
        department: issue.department,
        tags: ['issue', 'open', issue.priority.toLowerCase()],
        relevanceBoost: boost
      });
    }

    setNewIssue({ title: '', description: '', department: '', priority: 'Medium', status: 'Open', assignee: '' });
    setShowAddModal(false);
  };

  // Update issue
  const handleUpdateIssue = () => {
    if (!editingIssue) return;

    const oldIssue = issues.find(i => i.id === editingIssue.id);
    
    setIssues(prev => prev.map(i => 
      i.id === editingIssue.id ? editingIssue : i
    ));

    // Log status change to intelligence
    if (oldIssue?.status !== editingIssue.status && addToIntelligence) {
      const boost = editingIssue.status === 'Resolved' ? 3 : 1;
      addToIntelligence({
        sourceType: editingIssue.status === 'Resolved' ? 'resolved_issue' : 'issue_status_change',
        sourceId: editingIssue.id,
        title: `${editingIssue.title} - ${editingIssue.status}`,
        content: editingIssue.description + (editingIssue.resolutionNotes ? `\n\nResolution: ${editingIssue.resolutionNotes}` : ''),
        department: editingIssue.department,
        tags: ['issue', editingIssue.status.toLowerCase().replace(' ', '-')],
        relevanceBoost: boost
      });
    }

    logActivity(`Updated issue: ${editingIssue.title}`, 'issue');
    setEditingIssue(null);
  };

  // Archive issue
  const handleArchive = (issueId) => {
    setIssues(prev => prev.map(i => 
      i.id === issueId ? { ...i, archived: true, archivedAt: new Date().toISOString() } : i
    ));
    logActivity('Archived issue', 'issue');
  };

  // Unarchive issue
  const handleUnarchive = (issueId) => {
    setIssues(prev => prev.map(i => 
      i.id === issueId ? { ...i, archived: false, archivedAt: null } : i
    ));
    logActivity('Restored issue from archive', 'issue');
  };

  // Delete issue
  const handleDelete = (issueId) => {
    if (window.confirm('Permanently delete this issue?')) {
      setIssues(prev => prev.filter(i => i.id !== issueId));
      logActivity('Deleted issue', 'issue');
    }
  };

  // Quick status update
  const handleStatusChange = (issueId, newStatus) => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    const updatedIssue = { ...issue, status: newStatus };
    if (newStatus === 'Resolved') {
      updatedIssue.resolvedAt = new Date().toISOString();
    }

    setIssues(prev => prev.map(i => i.id === issueId ? updatedIssue : i));
    logActivity(`Changed status to ${newStatus}`, 'issue');

    if (newStatus === 'Resolved' && addToIntelligence) {
      addToIntelligence({
        sourceType: 'resolved_issue',
        sourceId: issueId,
        title: `Resolved: ${issue.title}`,
        content: issue.description,
        department: issue.department,
        tags: ['issue', 'resolved', issue.priority.toLowerCase()],
        relevanceBoost: 5
      });
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#EF4444';
      case 'Medium': return '#F59E0B';
      case 'Low': return '#10B981';
      default: return '#64748B';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return '#3B82F6';
      case 'In Progress': return '#F59E0B';
      case 'Resolved': return '#10B981';
      default: return '#64748B';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ClipboardList size={32} style={{ color: '#F59E0B' }} />
            Issues Board
          </h1>
          <p style={{ color: '#94A3B8', marginTop: '4px' }}>
            {showArchive ? `${archivedIssues.length} archived issues` : `${activeIssues.length} active issues`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Clear All Button */}
          {issues.length > 0 && (
            <button
              onClick={handleClearAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '10px 16px',
                color: '#EF4444',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Trash2 size={16} />
              Clear All
            </button>
          )}
          <button
            onClick={() => setShowArchive(!showArchive)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: showArchive ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.1)',
              border: showArchive ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '10px 16px',
              color: showArchive ? '#A78BFA' : '#94A3B8',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <Archive size={16} />
            Archive ({archivedIssues.length})
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#3B82F6',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <Plus size={16} />
            New Issue
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
          <input
            type="text"
            placeholder="Search issues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '10px 12px 10px 40px',
              color: '#E2E8F0',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '10px 12px',
            color: '#E2E8F0',
            fontSize: '14px'
          }}
        >
          <option value="all">All Status</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '10px 12px',
            color: '#E2E8F0',
            fontSize: '14px'
          }}
        >
          <option value="all">All Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '10px 12px',
            color: '#E2E8F0',
            fontSize: '14px'
          }}
        >
          <option value="all">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Issues Table */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 100px 120px 1fr 100px 100px',
          gap: '12px',
          padding: '12px 16px',
          background: 'rgba(15, 23, 42, 0.5)',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Issue</span>
          <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Department</span>
          <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Priority</span>
          <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Status</span>
          <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Assignee</span>
          <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Created</span>
          <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Actions</span>
        </div>

        {/* Table Body */}
        {filteredIssues.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <ClipboardList size={48} style={{ color: '#64748B', marginBottom: '16px' }} />
            <p style={{ color: '#94A3B8', fontSize: '16px' }}>
              {showArchive ? 'No archived issues' : 'No issues found'}
            </p>
          </div>
        ) : (
          filteredIssues.map(issue => {
            const dept = departments.find(d => d.id === issue.department);
            
            return (
              <div key={issue.id} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 100px 120px 1fr 100px 100px',
                gap: '12px',
                padding: '14px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                alignItems: 'center'
              }}>
                {/* Title */}
                <div>
                  <p style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: '500', margin: 0 }}>{issue.title}</p>
                  {issue.description && (
                    <p style={{ color: '#64748B', fontSize: '12px', margin: '4px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {issue.description}
                    </p>
                  )}
                </div>

                {/* Department */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px' }}>{dept?.icon || '📁'}</span>
                  <span style={{ color: '#94A3B8', fontSize: '13px' }}>{dept?.name || 'Unassigned'}</span>
                </div>

                {/* Priority */}
                <span style={{
                  background: `${getPriorityColor(issue.priority)}20`,
                  color: getPriorityColor(issue.priority),
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '500',
                  textAlign: 'center'
                }}>
                  {issue.priority}
                </span>

                {/* Status */}
                <select
                  value={issue.status}
                  onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                  disabled={issue.archived}
                  style={{
                    background: `${getStatusColor(issue.status)}20`,
                    border: 'none',
                    borderRadius: '20px',
                    padding: '4px 10px',
                    color: getStatusColor(issue.status),
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: issue.archived ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>

                {/* Assignee */}
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>{issue.assignee || '-'}</span>

                {/* Created */}
                <span style={{ color: '#64748B', fontSize: '12px' }}>{formatDate(issue.createdAt)}</span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {!issue.archived ? (
                    <>
                      <button
                        onClick={() => setEditingIssue({ ...issue })}
                        style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px',
                          cursor: 'pointer',
                          color: '#3B82F6'
                        }}
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleArchive(issue.id)}
                        style={{
                          background: 'rgba(139, 92, 246, 0.1)',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px',
                          cursor: 'pointer',
                          color: '#8B5CF6'
                        }}
                        title="Archive"
                      >
                        <Archive size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleUnarchive(issue.id)}
                        style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px',
                          cursor: 'pointer',
                          color: '#10B981'
                        }}
                        title="Restore"
                      >
                        <ArchiveRestore size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(issue.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px',
                          cursor: 'pointer',
                          color: '#EF4444'
                        }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Issue Modal */}
      {showAddModal && (
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
            width: '500px',
            maxWidth: '90vw'
          }}>
            <h2 style={{ color: '#E2E8F0', fontSize: '20px', marginBottom: '20px' }}>New Issue</h2>

            <input
              type="text"
              placeholder="Issue title"
              value={newIssue.title}
              onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
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

            <textarea
              placeholder="Description (optional)"
              value={newIssue.description}
              onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '12px',
                color: '#E2E8F0',
                marginBottom: '12px',
                fontSize: '14px',
                minHeight: '80px',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <select
                value={newIssue.department}
                onChange={(e) => setNewIssue({ ...newIssue, department: e.target.value })}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#E2E8F0',
                  fontSize: '14px'
                }}
              >
                <option value="">Select department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={newIssue.priority}
                onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#E2E8F0',
                  fontSize: '14px'
                }}
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Assignee (optional)"
              value={newIssue.assignee}
              onChange={(e) => setNewIssue({ ...newIssue, assignee: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '12px',
                color: '#E2E8F0',
                marginBottom: '20px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowAddModal(false); setNewIssue({ title: '', description: '', department: '', priority: 'Medium', status: 'Open', assignee: '' }); }}
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
                onClick={handleAddIssue}
                style={{
                  background: '#3B82F6',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  color: 'white',
                  cursor: 'pointer'
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
            width: '500px',
            maxWidth: '90vw'
          }}>
            <h2 style={{ color: '#E2E8F0', fontSize: '20px', marginBottom: '20px' }}>Edit Issue</h2>

            <input
              type="text"
              placeholder="Issue title"
              value={editingIssue.title}
              onChange={(e) => setEditingIssue({ ...editingIssue, title: e.target.value })}
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

            <textarea
              placeholder="Description"
              value={editingIssue.description || ''}
              onChange={(e) => setEditingIssue({ ...editingIssue, description: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '12px',
                color: '#E2E8F0',
                marginBottom: '12px',
                fontSize: '14px',
                minHeight: '80px',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <select
                value={editingIssue.department}
                onChange={(e) => setEditingIssue({ ...editingIssue, department: e.target.value })}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#E2E8F0',
                  fontSize: '14px'
                }}
              >
                <option value="">Select department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={editingIssue.priority}
                onChange={(e) => setEditingIssue({ ...editingIssue, priority: e.target.value })}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#E2E8F0',
                  fontSize: '14px'
                }}
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <select
                value={editingIssue.status}
                onChange={(e) => setEditingIssue({ ...editingIssue, status: e.target.value })}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#E2E8F0',
                  fontSize: '14px'
                }}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>

              <input
                type="text"
                placeholder="Assignee"
                value={editingIssue.assignee || ''}
                onChange={(e) => setEditingIssue({ ...editingIssue, assignee: e.target.value })}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#E2E8F0',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {editingIssue.status === 'Resolved' && (
              <textarea
                placeholder="Resolution notes (optional)"
                value={editingIssue.resolutionNotes || ''}
                onChange={(e) => setEditingIssue({ ...editingIssue, resolutionNotes: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#E2E8F0',
                  marginBottom: '12px',
                  fontSize: '14px',
                  minHeight: '60px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setEditingIssue(null)}
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
                onClick={handleUpdateIssue}
                style={{
                  background: '#3B82F6',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  color: 'white',
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
