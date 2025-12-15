import React, { useState } from 'react';
import { 
  BookOpen, Plus, Upload, Lightbulb, MoreVertical, Edit2, Trash2,
  FileText, Link, ExternalLink, RefreshCw, X, CheckCircle, AlertCircle,
  Loader, Building, TrendingUp, DollarSign, Wrench, Calculator, Users,
  ShieldCheck, ClipboardCheck, Briefcase, Target, Package, Home, PiggyBank,
  UserCheck, Shield, Clipboard, BarChart, Folder, Star, Heart, Zap, Globe,
  Smartphone, Palette, Settings, LayoutDashboard, HelpCircle, MessageSquare
} from 'lucide-react';

// Icon mapping for string-to-component conversion
const ICON_MAP = {
  Building, TrendingUp, DollarSign, Wrench, Calculator, Users,
  ShieldCheck, ClipboardCheck, Briefcase, Target, Lightbulb, Package,
  Home, PiggyBank, UserCheck, Shield, Clipboard, BarChart, FileText,
  Folder, Star, Heart, Zap, Globe, Smartphone, Palette, BookOpen,
  Settings, LayoutDashboard, HelpCircle, MessageSquare
};

// Helper to render department icon (handles both emoji and Lucide icon names)
const renderDeptIcon = (icon, size = 24, color = 'white') => {
  if (!icon) return <Folder size={size} color={color} />;
  
  // Check if it's a Lucide icon name (string starting with capital letter, no emoji)
  if (typeof icon === 'string' && /^[A-Z][a-zA-Z]+$/.test(icon)) {
    const IconComponent = ICON_MAP[icon];
    if (IconComponent) {
      return <IconComponent size={size} color={color} />;
    }
  }
  
  // Otherwise treat as emoji
  return <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>{icon}</span>;
};

export default function Knowledge({
  departments,
  setDepartments,
  knowledge,
  setKnowledge,
  logActivity,
  addToIntelligence,
  connectedDocs = [],
  setConnectedDocs = () => {},
  fetchConnectedDoc = async () => {},
  refreshAllDocs = async () => {}
}) {
  const [selectedDept, setSelectedDept] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [showConnectDocModal, setShowConnectDocModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [newDept, setNewDept] = useState({ name: '', description: '', icon: '📁', color: '#3B82F6', instructions: '' });
  const [newInsight, setNewInsight] = useState({ title: '', content: '', department: '' });
  const [newDoc, setNewDoc] = useState({ name: '', url: '', department: '' });

  const iconOptions = ['📁', '💼', '📊', '🎯', '💡', '🔧', '📋', '🏠', '💰', '👥', '🛡️', '📦', '🎨', '📱', '🌐'];
  const colorOptions = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#6366F1'];

  // Get knowledge for a department
  const getDeptKnowledge = (deptId) => {
    return knowledge.filter(k => k.department === deptId);
  };

  // Add new department
  const handleAddDept = () => {
    if (!newDept.name.trim()) return;
    
    const dept = {
      id: `dept_${Date.now()}`,
      name: newDept.name.trim(),
      description: newDept.description.trim(),
      icon: newDept.icon,
      color: newDept.color,
      instructions: newDept.instructions.trim()
    };
    
    setDepartments(prev => [...prev, dept]);
    logActivity(`Created department: ${dept.name}`, 'department');
    
    if (addToIntelligence) {
      addToIntelligence({
        sourceType: 'department_change',
        sourceId: dept.id,
        title: `New Department: ${dept.name}`,
        content: dept.description,
        department: dept.id,
        tags: ['department', 'organization', 'new'],
        relevanceBoost: 3
      });
    }
    
    setNewDept({ name: '', description: '', icon: '📁', color: '#3B82F6', instructions: '' });
    setShowAddModal(false);
  };

  // Edit department
  const handleEditDept = () => {
    if (!editingDept || !editingDept.name.trim()) return;
    
    setDepartments(prev => prev.map(d => 
      d.id === editingDept.id ? editingDept : d
    ));
    logActivity(`Updated department: ${editingDept.name}`, 'department');
    setShowEditModal(false);
    setEditingDept(null);
  };

  // Delete department
  const handleDeleteDept = (deptId) => {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return;
    
    if (window.confirm(`Delete "${dept.name}" and all its documents?`)) {
      setDepartments(prev => prev.filter(d => d.id !== deptId));
      setKnowledge(prev => prev.filter(k => k.department !== deptId));
      logActivity(`Deleted department: ${dept.name}`, 'department');
      setMenuOpen(null);
    }
  };

  // Add insight
  const handleAddInsight = () => {
    if (!newInsight.title.trim() || !newInsight.content.trim() || !newInsight.department) return;
    
    const insight = {
      id: `knowledge_${Date.now()}`,
      title: newInsight.title.trim(),
      content: newInsight.content.trim(),
      department: newInsight.department,
      type: 'insight',
      createdAt: new Date().toISOString()
    };
    
    setKnowledge(prev => [insight, ...prev]);
    logActivity(`Added insight: ${insight.title}`, 'knowledge');
    
    if (addToIntelligence) {
      addToIntelligence({
        sourceType: 'knowledge',
        sourceId: insight.id,
        title: insight.title,
        content: insight.content,
        department: insight.department,
        relevanceBoost: 2
      });
    }
    
    setNewInsight({ title: '', content: '', department: '' });
    setShowInsightModal(false);
  };

  // Handle file upload
  const handleFileUpload = (e, deptId) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const doc = {
        id: `knowledge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: file.name,
        content: `Uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        department: deptId,
        type: 'document',
        fileType: file.type,
        fileSize: file.size,
        createdAt: new Date().toISOString()
      };
      
      setKnowledge(prev => [doc, ...prev]);
      logActivity(`Uploaded: ${file.name}`, 'upload');
      
      if (addToIntelligence) {
        addToIntelligence({
          sourceType: 'document_upload',
          sourceId: doc.id,
          title: file.name,
          content: `Document uploaded to ${departments.find(d => d.id === deptId)?.name || 'Unknown'}`,
          department: deptId,
          tags: ['document', 'upload', file.type.split('/')[1] || 'file'],
          relevanceBoost: 1
        });
      }
    });
    
    e.target.value = '';
  };

  // Delete knowledge item
  const handleDeleteKnowledge = (itemId) => {
    if (window.confirm('Delete this item?')) {
      setKnowledge(prev => prev.filter(k => k.id !== itemId));
      logActivity('Deleted knowledge item', 'knowledge');
    }
  };

  // Connect Google Doc/Sheet
  const handleConnectDoc = async () => {
    if (!newDoc.name.trim() || !newDoc.url.trim() || !newDoc.department) return;
    
    const doc = {
      id: `gdoc_${Date.now()}`,
      name: newDoc.name.trim(),
      url: newDoc.url.trim(),
      department: newDoc.department,
      status: 'syncing',
      content: null,
      error: null,
      createdAt: new Date().toISOString(),
      lastFetched: null
    };
    
    setConnectedDocs(prev => [...prev, doc]);
    setShowConnectDocModal(false);
    setNewDoc({ name: '', url: '', department: '' });
    
    // Fetch the doc
    const updated = await fetchConnectedDoc(doc);
    setConnectedDocs(prev => prev.map(d => d.id === doc.id ? updated : d));
    
    if (updated.status === 'synced') {
      logActivity(`Connected: ${doc.name}`, 'google_doc');
      
      // Add to knowledge
      const knowledgeItem = {
        id: `knowledge_${doc.id}`,
        title: doc.name,
        content: updated.content?.substring(0, 500) + '...',
        department: doc.department,
        type: 'google_doc',
        linkedDocId: doc.id,
        createdAt: new Date().toISOString()
      };
      setKnowledge(prev => [knowledgeItem, ...prev]);
      
      if (addToIntelligence) {
        addToIntelligence({
          sourceType: 'google_doc',
          sourceId: doc.id,
          title: doc.name,
          content: updated.content,
          department: doc.department,
          relevanceBoost: 2
        });
      }
    }
  };

  // Refresh single doc
  const handleRefreshDoc = async (doc) => {
    setConnectedDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'syncing' } : d));
    const updated = await fetchConnectedDoc(doc);
    setConnectedDocs(prev => prev.map(d => d.id === doc.id ? updated : d));
  };

  // Refresh all docs
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await refreshAllDocs();
    setIsRefreshing(false);
  };

  // Remove connected doc
  const handleRemoveDoc = (docId) => {
    if (window.confirm('Disconnect this document?')) {
      setConnectedDocs(prev => prev.filter(d => d.id !== docId));
      setKnowledge(prev => prev.filter(k => k.linkedDocId !== docId));
      logActivity('Disconnected Google Doc', 'google_doc');
    }
  };

  // View department documents
  if (selectedDept) {
    const dept = departments.find(d => d.id === selectedDept);
    const deptKnowledge = getDeptKnowledge(selectedDept);
    
    return (
      <div style={{ padding: '24px' }}>
        {/* Back button */}
        <button
          onClick={() => setSelectedDept(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            marginBottom: '20px',
            fontSize: '14px'
          }}
        >
          ← Back to Departments
        </button>

        {/* Department header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: dept?.color || '#3B82F6',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {renderDeptIcon(dept?.icon, 28, 'white')}
          </div>
          <div>
            <h1 style={{ color: '#E2E8F0', fontSize: '24px', fontWeight: '700', margin: 0 }}>
              {dept?.name || 'Department'}
            </h1>
            <p style={{ color: '#94A3B8', margin: '4px 0 0 0' }}>{deptKnowledge.length} items</p>
          </div>
          
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#8B5CF6',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              <Upload size={16} />
              Upload
              <input
                type="file"
                multiple
                onChange={(e) => handleFileUpload(e, selectedDept)}
                style={{ display: 'none' }}
              />
            </label>
            <button
              onClick={() => {
                setNewInsight({ ...newInsight, department: selectedDept });
                setShowInsightModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#F59E0B',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Lightbulb size={16} />
              Log Insight
            </button>
          </div>
        </div>

        {/* Knowledge items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {deptKnowledge.length === 0 ? (
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              padding: '60px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <BookOpen size={48} style={{ color: '#64748B', marginBottom: '16px' }} />
              <p style={{ color: '#94A3B8', fontSize: '16px' }}>No documents yet</p>
              <p style={{ color: '#64748B', fontSize: '14px' }}>Upload files or log insights to build this department's knowledge</p>
            </div>
          ) : (
            deptKnowledge.map(item => (
              <div key={item.id} style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '10px',
                padding: '16px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <FileText size={20} style={{ color: item.type === 'insight' ? '#F59E0B' : '#3B82F6' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: '500', margin: 0 }}>{item.title}</p>
                  <p style={{ color: '#64748B', fontSize: '12px', margin: '4px 0 0 0' }}>
                    {item.type === 'insight' ? 'Insight' : 'Document'} • {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteKnowledge(item.id)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px',
                    cursor: 'pointer',
                    color: '#EF4444'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Main department grid view
  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BookOpen size={32} style={{ color: '#8B5CF6' }} />
            Knowledge Base
          </h1>
          <p style={{ color: '#94A3B8', marginTop: '4px' }}>Manage documents and insights by department</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowConnectDocModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '10px 16px',
              color: '#10B981',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <Link size={16} />
            Connect Doc
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
            Add Department
          </button>
        </div>
      </div>

      {/* Connected Google Docs/Sheets */}
      {connectedDocs.length > 0 && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ color: '#E2E8F0', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Link size={18} style={{ color: '#10B981' }} />
              Connected Google Docs/Sheets
            </h3>
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
              Refresh All
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {connectedDocs.map(doc => (
              <div key={doc.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                {doc.status === 'synced' && <CheckCircle size={16} style={{ color: '#10B981' }} />}
                {doc.status === 'error' && <AlertCircle size={16} style={{ color: '#EF4444' }} />}
                {doc.status === 'syncing' && <Loader size={16} style={{ color: '#F59E0B', animation: 'spin 1s linear infinite' }} />}
                
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#E2E8F0', fontSize: '14px', margin: 0 }}>{doc.name}</p>
                  <p style={{ color: '#64748B', fontSize: '12px', margin: '2px 0 0 0' }}>
                    {doc.status === 'synced' && `Synced ${doc.lastFetched ? new Date(doc.lastFetched).toLocaleTimeString() : ''}`}
                    {doc.status === 'error' && (doc.error || 'Failed to sync')}
                    {doc.status === 'syncing' && 'Syncing...'}
                  </p>
                </div>
                
                <button
                  onClick={() => handleRefreshDoc(doc)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    color: '#94A3B8'
                  }}
                  title="Refresh"
                >
                  <RefreshCw size={14} />
                </button>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#94A3B8', padding: '6px' }}
                  title="Open in Google"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => handleRemoveDoc(doc.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    color: '#EF4444'
                  }}
                  title="Disconnect"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Department Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px'
      }}>
        {departments.map(dept => {
          const count = getDeptKnowledge(dept.id).length;
          
          return (
            <div key={dept.id} style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.06)',
              position: 'relative'
            }}>
              {/* Menu button */}
              <button
                onClick={() => setMenuOpen(menuOpen === dept.id ? null : dept.id)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <MoreVertical size={18} />
              </button>
              
              {/* Dropdown menu */}
              {menuOpen === dept.id && (
                <div style={{
                  position: 'absolute',
                  top: '40px',
                  right: '12px',
                  background: '#1E293B',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                  zIndex: 10
                }}>
                  <button
                    onClick={() => {
                      setEditingDept({ ...dept });
                      setShowEditModal(true);
                      setMenuOpen(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '10px 16px',
                      background: 'none',
                      border: 'none',
                      color: '#E2E8F0',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteDept(dept.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '10px 16px',
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}

              {/* Department icon */}
              <div style={{
                width: '48px',
                height: '48px',
                background: dept.color,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                {renderDeptIcon(dept.icon, 24, 'white')}
              </div>

              {/* Count */}
              <p style={{
                color: '#E2E8F0',
                fontSize: '32px',
                fontWeight: '700',
                fontFamily: 'Space Mono, monospace',
                margin: '0 0 4px 0'
              }}>
                {count}
              </p>

              {/* Name */}
              <p style={{ color: '#94A3B8', fontSize: '14px', margin: '0 0 16px 0' }}>{dept.name}</p>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: dept.color,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}>
                  <Upload size={14} />
                  Upload
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileUpload(e, dept.id)}
                    style={{ display: 'none' }}
                  />
                </label>
                <button
                  onClick={() => setSelectedDept(dept.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px',
                    color: '#E2E8F0',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  <FileText size={14} />
                  Docs
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Department Modal */}
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
            width: '450px',
            maxWidth: '90vw'
          }}>
            <h2 style={{ color: '#E2E8F0', fontSize: '20px', marginBottom: '20px' }}>Add Department</h2>
            
            <input
              type="text"
              placeholder="Department name"
              value={newDept.name}
              onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
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
              value={newDept.description}
              onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
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

            <div style={{ marginBottom: '12px' }}>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Icon</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {iconOptions.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setNewDept({ ...newDept, icon })}
                    style={{
                      width: '40px',
                      height: '40px',
                      background: newDept.icon === icon ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                      border: newDept.icon === icon ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontSize: '20px',
                      cursor: 'pointer'
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Color</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {colorOptions.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewDept({ ...newDept, color })}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: color,
                      border: newDept.color === color ? '3px solid white' : 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
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
                onClick={handleAddDept}
                style={{
                  background: '#3B82F6',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Add Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && editingDept && (
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
            width: '450px',
            maxWidth: '90vw'
          }}>
            <h2 style={{ color: '#E2E8F0', fontSize: '20px', marginBottom: '20px' }}>Edit Department</h2>
            
            <input
              type="text"
              placeholder="Department name"
              value={editingDept.name}
              onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
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
              value={editingDept.description || ''}
              onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
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

            {/* Department AI Instructions */}
            <div style={{
              background: 'rgba(249, 115, 22, 0.1)',
              border: '1px solid rgba(249, 115, 22, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px'
            }}>
              <p style={{ color: '#F97316', fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} />
                Department AI Instructions
              </p>
              <textarea
                placeholder="e.g., Focus on lead conversion strategies, mention our 5-year warranty..."
                value={editingDept.instructions || ''}
                onChange={(e) => setEditingDept({ ...editingDept, instructions: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '10px',
                  color: '#E2E8F0',
                  fontSize: '13px',
                  minHeight: '80px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ color: '#94A3B8', fontSize: '11px', marginTop: '6px' }}>
                These instructions apply only when chatting in this department
              </p>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Icon</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {iconOptions.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setEditingDept({ ...editingDept, icon })}
                    style={{
                      width: '40px',
                      height: '40px',
                      background: editingDept.icon === icon ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                      border: editingDept.icon === icon ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontSize: '20px',
                      cursor: 'pointer'
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Color</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {colorOptions.map(color => (
                  <button
                    key={color}
                    onClick={() => setEditingDept({ ...editingDept, color })}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: color,
                      border: editingDept.color === color ? '3px solid white' : 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowEditModal(false); setEditingDept(null); }}
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
                onClick={handleEditDept}
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

      {/* Log Insight Modal */}
      {showInsightModal && (
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
            width: '450px',
            maxWidth: '90vw'
          }}>
            <h2 style={{ color: '#E2E8F0', fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Lightbulb size={24} style={{ color: '#F59E0B' }} />
              Log Insight
            </h2>
            
            <input
              type="text"
              placeholder="Insight title"
              value={newInsight.title}
              onChange={(e) => setNewInsight({ ...newInsight, title: e.target.value })}
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
              placeholder="What did you learn? What's important to remember?"
              value={newInsight.content}
              onChange={(e) => setNewInsight({ ...newInsight, content: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '12px',
                color: '#E2E8F0',
                marginBottom: '12px',
                fontSize: '14px',
                minHeight: '120px',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />

            <select
              value={newInsight.department}
              onChange={(e) => setNewInsight({ ...newInsight, department: e.target.value })}
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
              <option value="">Select department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowInsightModal(false); setNewInsight({ title: '', content: '', department: '' }); }}
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
                onClick={handleAddInsight}
                style={{
                  background: '#F59E0B',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Save Insight
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Google Doc Modal */}
      {showConnectDocModal && (
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
            <h2 style={{ color: '#E2E8F0', fontSize: '20px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link size={24} style={{ color: '#10B981' }} />
              Connect Google Doc or Sheet
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '20px' }}>
              Connect a published Google Doc or Sheet to sync its content into Empire AI.
            </p>
            
            <input
              type="text"
              placeholder="Document name (e.g., Project Schedule)"
              value={newDoc.name}
              onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
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
            
            <input
              type="text"
              placeholder="Google Docs/Sheets URL"
              value={newDoc.url}
              onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })}
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
              value={newDoc.department}
              onChange={(e) => setNewDoc({ ...newDoc, department: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '12px',
                color: '#E2E8F0',
                marginBottom: '16px',
                fontSize: '14px'
              }}
            >
              <option value="">Select department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>
                <strong style={{ color: '#E2E8F0' }}>Tip:</strong> Make sure your document is shared as "Anyone with the link" or published to web. The document will sync automatically every 5 minutes.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowConnectDocModal(false); setNewDoc({ name: '', url: '', department: '' }); }}
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
                onClick={handleConnectDoc}
                disabled={!newDoc.name.trim() || !newDoc.url.trim() || !newDoc.department}
                style={{
                  background: newDoc.name.trim() && newDoc.url.trim() && newDoc.department ? '#10B981' : 'rgba(16, 185, 129, 0.3)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  color: 'white',
                  cursor: newDoc.name.trim() && newDoc.url.trim() && newDoc.department ? 'pointer' : 'not-allowed'
                }}
              >
                Connect Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spin animation for refresh */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
