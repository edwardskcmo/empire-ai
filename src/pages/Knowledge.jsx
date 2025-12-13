// ==========================================
// EMPIRE AI - KNOWLEDGE PAGE
// Department cards, document management, insights
// ==========================================

import React, { useState } from 'react';
import { 
  Plus, Upload, FileText, MoreVertical, Edit2, Trash2, ArrowLeft,
  Lightbulb, X, Building2, Megaphone, DollarSign, Hammer, Calculator,
  Users, ShieldCheck, Settings
} from 'lucide-react';
import { formatDate, generateId, DEFAULT_DEPARTMENTS } from '../utils';

// Available icons for departments
const AVAILABLE_ICONS = [
  { id: 'Building2', icon: Building2 },
  { id: 'Megaphone', icon: Megaphone },
  { id: 'DollarSign', icon: DollarSign },
  { id: 'Hammer', icon: Hammer },
  { id: 'Calculator', icon: Calculator },
  { id: 'Users', icon: Users },
  { id: 'ShieldCheck', icon: ShieldCheck },
  { id: 'Settings', icon: Settings }
];

// Available colors
const AVAILABLE_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#64748B'
];

export default function Knowledge({ 
  departments, setDepartments, knowledge, setKnowledge,
  logActivity, addToIntelligence, iconMap
}) {
  const [viewingDept, setViewingDept] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [newDept, setNewDept] = useState({ name: '', icon: 'Building2', color: '#3B82F6', description: '', instructions: '' });
  const [newInsight, setNewInsight] = useState({ title: '', content: '', department: '' });
  const [menuOpen, setMenuOpen] = useState(null);

  // Get documents for a department
  const getDeptDocs = (deptId) => knowledge.filter(k => k.department === deptId);

  // Add department
  const addDepartment = () => {
    if (!newDept.name.trim()) return;
    const dept = {
      id: generateId('dept'),
      ...newDept
    };
    setDepartments(prev => [...prev, dept]);
    addToIntelligence('department_change', dept.id, `New Department: ${dept.name}`, dept.description || 'Department created', dept.id, {}, 3);
    logActivity('Department created', dept.name);
    setNewDept({ name: '', icon: 'Building2', color: '#3B82F6', description: '', instructions: '' });
    setShowAddModal(false);
  };

  // Edit department
  const saveDepartmentEdit = () => {
    if (!editingDept) return;
    setDepartments(prev => prev.map(d => d.id === editingDept.id ? editingDept : d));
    addToIntelligence('department_change', editingDept.id, `Updated: ${editingDept.name}`, 'Department settings updated', editingDept.id, {}, 1);
    logActivity('Department updated', editingDept.name);
    setShowEditModal(false);
    setEditingDept(null);
  };

  // Delete department
  const deleteDepartment = (deptId) => {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return;
    if (!window.confirm(`Delete "${dept.name}" and all its documents?`)) return;
    setDepartments(prev => prev.filter(d => d.id !== deptId));
    setKnowledge(prev => prev.filter(k => k.department !== deptId));
    addToIntelligence('department_change', deptId, `Deleted: ${dept.name}`, 'Department and documents removed', 'general', {}, 3);
    logActivity('Department deleted', dept.name);
    setMenuOpen(null);
  };

  // Handle file upload
  const handleFileUpload = (deptId, e) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const doc = {
        id: generateId('doc'),
        type: 'document',
        title: file.name,
        content: `Uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        department: deptId,
        createdAt: new Date().toISOString()
      };
      setKnowledge(prev => [...prev, doc]);
      addToIntelligence('knowledge', doc.id, doc.title, doc.content, deptId, {}, 2);
      addToIntelligence('document_upload', doc.id, `Upload: ${file.name}`, `File uploaded to department`, deptId, { fileType: file.type, fileSize: file.size }, 1);
    });
    logActivity('Documents uploaded', `${files.length} file(s)`);
  };

  // Add insight
  const addInsight = () => {
    if (!newInsight.title.trim() || !newInsight.content.trim()) return;
    const insight = {
      id: generateId('insight'),
      type: 'insight',
      ...newInsight,
      createdAt: new Date().toISOString()
    };
    setKnowledge(prev => [...prev, insight]);
    addToIntelligence('knowledge', insight.id, insight.title, insight.content, insight.department || 'general', {}, 2);
    logActivity('Insight logged', insight.title);
    setNewInsight({ title: '', content: '', department: '' });
    setShowInsightModal(false);
  };

  // Delete knowledge item
  const deleteKnowledge = (id) => {
    setKnowledge(prev => prev.filter(k => k.id !== id));
    logActivity('Knowledge item deleted');
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
    maxWidth: 500,
    maxHeight: '90vh',
    overflowY: 'auto'
  };

  // Viewing specific department documents
  if (viewingDept) {
    const dept = departments.find(d => d.id === viewingDept);
    const docs = getDeptDocs(viewingDept);
    const Icon = iconMap[dept?.icon] || Building2;

    return (
      <div>
        <button
          onClick={() => setViewingDept(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            marginBottom: 16
          }}
        >
          <ArrowLeft size={18} />
          Back to Departments
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: `${dept?.color}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={24} style={{ color: dept?.color }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>{dept?.name}</h1>
            <p style={{ color: '#94A3B8' }}>{docs.length} documents</p>
          </div>
          <label style={{
            padding: '10px 20px',
            background: '#3B82F6',
            borderRadius: 8,
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Upload size={16} />
            Upload
            <input type="file" multiple hidden onChange={e => handleFileUpload(viewingDept, e)} />
          </label>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {docs.map(doc => (
            <div key={doc.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: doc.type === 'insight' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {doc.type === 'insight' ? <Lightbulb size={18} style={{ color: '#F59E0B' }} /> : <FileText size={18} style={{ color: '#8B5CF6' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{doc.title}</div>
                <div style={{ fontSize: 13, color: '#94A3B8' }}>{doc.content?.substring(0, 100)}...</div>
              </div>
              <span style={{ fontSize: 12, color: '#64748B' }}>{formatDate(doc.createdAt)}</span>
              <button
                onClick={() => deleteKnowledge(doc.id)}
                style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 8 }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {docs.length === 0 && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: 48, color: '#64748B' }}>
              <FileText size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <p>No documents yet</p>
              <p style={{ fontSize: 13 }}>Upload files or log insights to get started</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main department grid view
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Knowledge Base</h1>
          <p style={{ color: '#94A3B8' }}>{knowledge.length} total items across {departments.length} departments</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setShowInsightModal(true)}
            style={{
              padding: '10px 20px',
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid #F59E0B',
              borderRadius: 8,
              color: '#F59E0B',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Lightbulb size={16} />
            Log Insight
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
            Add Department
          </button>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {departments.map(dept => {
          const Icon = iconMap[dept.icon] || Building2;
          const docCount = getDeptDocs(dept.id).length;
          
          return (
            <div 
              key={dept.id}
              style={{
                ...cardStyle,
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Menu */}
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <button
                  onClick={() => setMenuOpen(menuOpen === dept.id ? null : dept.id)}
                  style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4 }}
                >
                  <MoreVertical size={18} />
                </button>
                {menuOpen === dept.id && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    background: 'rgba(30, 41, 59, 0.98)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: 4,
                    minWidth: 120,
                    zIndex: 10
                  }}>
                    <button
                      onClick={() => { setEditingDept(dept); setShowEditModal(true); setMenuOpen(null); }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 4,
                        color: '#E2E8F0',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                    <button
                      onClick={() => deleteDepartment(dept.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 4,
                        color: '#EF4444',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: `${dept.color}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16
              }}>
                <Icon size={28} style={{ color: dept.color }} />
              </div>
              
              <div style={{ 
                fontSize: 36, 
                fontWeight: 700, 
                fontFamily: 'Space Mono, monospace',
                color: dept.color,
                marginBottom: 4
              }}>
                {docCount}
              </div>
              
              <div style={{ fontWeight: 600, marginBottom: 12 }}>{dept.name}</div>
              
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: `${dept.color}22`,
                  borderRadius: 6,
                  color: dept.color,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}>
                  Upload
                  <input type="file" multiple hidden onChange={e => handleFileUpload(dept.id, e)} />
                </label>
                <button
                  onClick={() => setViewingDept(dept.id)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    color: '#94A3B8',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Docs
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Department Modal */}
      {showAddModal && (
        <div style={modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Add Department</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Name</label>
                <input
                  value={newDept.name}
                  onChange={e => setNewDept({ ...newDept, name: e.target.value })}
                  placeholder="Department name"
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
                  value={newDept.description}
                  onChange={e => setNewDept({ ...newDept, description: e.target.value })}
                  placeholder="What this department handles..."
                  rows={2}
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

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Icon</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {AVAILABLE_ICONS.map(({ id, icon: IconComp }) => (
                    <button
                      key={id}
                      onClick={() => setNewDept({ ...newDept, icon: id })}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: newDept.icon === id ? newDept.color : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: newDept.icon === id ? 'white' : '#94A3B8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <IconComp size={18} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {AVAILABLE_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewDept({ ...newDept, color })}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: color,
                        border: newDept.color === color ? '2px solid white' : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* AI Instructions */}
              <div style={{
                padding: 16,
                background: 'rgba(249, 115, 22, 0.1)',
                borderRadius: 8,
                border: '1px solid rgba(249, 115, 22, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <FileText size={16} style={{ color: '#F97316' }} />
                  <span style={{ fontWeight: 600, color: '#F97316' }}>Department AI Instructions</span>
                </div>
                <textarea
                  value={newDept.instructions}
                  onChange={e => setNewDept({ ...newDept, instructions: e.target.value })}
                  placeholder="Custom instructions for AI when chatting in this department..."
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
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>
                  These instructions will be applied when chatting in this department.
                </p>
              </div>

              <button
                onClick={addDepartment}
                disabled={!newDept.name.trim()}
                style={{
                  padding: '14px',
                  background: newDept.name.trim() ? '#3B82F6' : 'rgba(59, 130, 246, 0.3)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontWeight: 600,
                  cursor: newDept.name.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Create Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && editingDept && (
        <div style={modalOverlay} onClick={() => { setShowEditModal(false); setEditingDept(null); }}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Edit Department</h2>
              <button onClick={() => { setShowEditModal(false); setEditingDept(null); }} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Name</label>
                <input
                  value={editingDept.name}
                  onChange={e => setEditingDept({ ...editingDept, name: e.target.value })}
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
                  value={editingDept.description || ''}
                  onChange={e => setEditingDept({ ...editingDept, description: e.target.value })}
                  rows={2}
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

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Icon</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {AVAILABLE_ICONS.map(({ id, icon: IconComp }) => (
                    <button
                      key={id}
                      onClick={() => setEditingDept({ ...editingDept, icon: id })}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: editingDept.icon === id ? editingDept.color : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: editingDept.icon === id ? 'white' : '#94A3B8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <IconComp size={18} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {AVAILABLE_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setEditingDept({ ...editingDept, color })}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: color,
                        border: editingDept.color === color ? '2px solid white' : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* AI Instructions */}
              <div style={{
                padding: 16,
                background: 'rgba(249, 115, 22, 0.1)',
                borderRadius: 8,
                border: '1px solid rgba(249, 115, 22, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <FileText size={16} style={{ color: '#F97316' }} />
                  <span style={{ fontWeight: 600, color: '#F97316' }}>Department AI Instructions</span>
                </div>
                <textarea
                  value={editingDept.instructions || ''}
                  onChange={e => setEditingDept({ ...editingDept, instructions: e.target.value })}
                  placeholder="Custom instructions for AI when chatting in this department..."
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
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>
                  These instructions will be applied when chatting in this department.
                </p>
              </div>

              <button
                onClick={saveDepartmentEdit}
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

      {/* Log Insight Modal */}
      {showInsightModal && (
        <div style={modalOverlay} onClick={() => setShowInsightModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Log Insight</h2>
              <button onClick={() => setShowInsightModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Title</label>
                <input
                  value={newInsight.title}
                  onChange={e => setNewInsight({ ...newInsight, title: e.target.value })}
                  placeholder="Insight title"
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
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Content</label>
                <textarea
                  value={newInsight.content}
                  onChange={e => setNewInsight({ ...newInsight, content: e.target.value })}
                  placeholder="What did you learn or want to remember?"
                  rows={4}
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

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94A3B8' }}>Department</label>
                <select
                  value={newInsight.department}
                  onChange={e => setNewInsight({ ...newInsight, department: e.target.value })}
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
                  <option value="">Company-Wide</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={addInsight}
                disabled={!newInsight.title.trim() || !newInsight.content.trim()}
                style={{
                  padding: '14px',
                  background: newInsight.title.trim() && newInsight.content.trim() ? '#F59E0B' : 'rgba(245, 158, 11, 0.3)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontWeight: 600,
                  cursor: newInsight.title.trim() && newInsight.content.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Save Insight
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
