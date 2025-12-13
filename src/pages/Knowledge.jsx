import React, { useState } from 'react';
import { 
  BookOpen, Plus, Upload, Lightbulb, MoreVertical, Trash2, Edit2, X,
  FileText, Link, RefreshCw, ExternalLink, CheckCircle, AlertCircle, Clock,
  ChevronLeft, GripVertical
} from 'lucide-react';
import { generateId, extractTags, formatDate } from '../utils';

export default function Knowledge({ 
  departments, 
  setDepartments,
  knowledge, 
  setKnowledge,
  connectedDocs,
  setConnectedDocs,
  refreshAllDocs,
  fetchConnectedDoc,
  logActivity,
  addToIntelligence,
  getDeptIcon
}) {
  const [selectedDept, setSelectedDept] = useState(null);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showEditDeptModal, setShowEditDeptModal] = useState(false);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // New doc form state
  const [newDoc, setNewDoc] = useState({ name: '', url: '', department: '' });
  
  // New department form
  const [newDept, setNewDept] = useState({
    name: '', description: '', icon: 'Building2', color: '#3B82F6', instructions: ''
  });
  
  // New insight form
  const [newInsight, setNewInsight] = useState({ title: '', content: '', department: '' });

  const iconOptions = ['Building2', 'TrendingUp', 'Users', 'Wrench', 'DollarSign', 'GraduationCap', 'Shield', 'Briefcase'];
  const colorOptions = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#64748B'];

  // Get docs for current department
  const getDeptDocs = (deptId) => knowledge.filter(k => k.department === deptId);
  
  // Get connected docs for department
  const getDeptConnectedDocs = (deptId) => connectedDocs.filter(d => d.department === deptId);

  // Add new connected doc
  const addConnectedDoc = async () => {
    if (!newDoc.name || !newDoc.url || !newDoc.department) return;
    
    const doc = {
      id: generateId('doc'),
      name: newDoc.name,
      url: newDoc.url,
      department: newDoc.department,
      status: 'syncing',
      content: null,
      lastFetched: null,
      createdAt: new Date().toISOString()
    };
    
    setConnectedDocs(prev => [...prev, doc]);
    setNewDoc({ name: '', url: '', department: '' });
    setShowDocModal(false);
    
    logActivity('Doc connected', `Added "${doc.name}" to knowledge base`);
    
    // Fetch content immediately
    const updatedDoc = await fetchConnectedDoc(doc);
    setConnectedDocs(prev => prev.map(d => d.id === doc.id ? updatedDoc : d));
    
    // Add to knowledge base if successful
    if (updatedDoc.status === 'synced' && updatedDoc.content) {
      const knowledgeItem = {
        id: generateId('know'),
        type: 'google-doc',
        title: updatedDoc.name,
        content: updatedDoc.content.substring(0, 5000),
        department: updatedDoc.department,
        linkedDocId: updatedDoc.id,
        linkedDocUrl: updatedDoc.url,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setKnowledge(prev => [knowledgeItem, ...prev]);
      
      addToIntelligence({
        id: generateId('intel'),
        sourceType: 'google_doc',
        sourceId: updatedDoc.id,
        title: updatedDoc.name,
        content: updatedDoc.content.substring(0, 1000),
        department: updatedDoc.department,
        tags: extractTags(updatedDoc.content),
        metadata: { url: updatedDoc.url },
        createdAt: new Date().toISOString(),
        relevanceBoost: 2
      });
    }
  };

  // Remove connected doc
  const removeConnectedDoc = (docId) => {
    setConnectedDocs(prev => prev.filter(d => d.id !== docId));
    // Also remove from knowledge
    setKnowledge(prev => prev.filter(k => k.linkedDocId !== docId));
    logActivity('Doc disconnected', 'Removed connected document');
  };

  // Refresh single doc
  const refreshSingleDoc = async (doc) => {
    const updated = await fetchConnectedDoc({ ...doc, status: 'syncing' });
    setConnectedDocs(prev => prev.map(d => d.id === doc.id ? updated : d));
    
    // Update knowledge if successful
    if (updated.status === 'synced' && updated.content) {
      setKnowledge(prev => prev.map(k => 
        k.linkedDocId === doc.id 
          ? { ...k, content: updated.content.substring(0, 5000), updatedAt: new Date().toISOString() }
          : k
      ));
    }
  };

  // Refresh all docs
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await refreshAllDocs();
    setIsRefreshing(false);
  };

  // Add department
  const addDepartment = () => {
    if (!newDept.name) return;
    const dept = {
      id: generateId('dept'),
      ...newDept
    };
    setDepartments(prev => [...prev, dept]);
    setNewDept({ name: '', description: '', icon: 'Building2', color: '#3B82F6', instructions: '' });
    setShowAddDeptModal(false);
    logActivity('Department created', dept.name);
    
    addToIntelligence({
      id: generateId('intel'),
      sourceType: 'department_change',
      sourceId: dept.id,
      title: `New Department: ${dept.name}`,
      content: dept.description || 'New department created',
      department: dept.id,
      tags: ['department', 'organization', 'new'],
      metadata: {},
      createdAt: new Date().toISOString(),
      relevanceBoost: 3
    });
  };

  // Save department edit
  const saveDepartmentEdit = () => {
    if (!editingDept) return;
    setDepartments(prev => prev.map(d => d.id === editingDept.id ? editingDept : d));
    setShowEditDeptModal(false);
    setEditingDept(null);
    logActivity('Department updated', editingDept.name);
  };

  // Delete department
  const deleteDepartment = (deptId) => {
    const dept = departments.find(d => d.id === deptId);
    setDepartments(prev => prev.filter(d => d.id !== deptId));
    setKnowledge(prev => prev.filter(k => k.department !== deptId));
    setConnectedDocs(prev => prev.filter(d => d.department !== deptId));
    setMenuOpen(null);
    logActivity('Department deleted', dept?.name);
  };

  // Add insight
  const addInsight = () => {
    if (!newInsight.title || !newInsight.content) return;
    const insight = {
      id: generateId('know'),
      type: 'insight',
      ...newInsight,
      createdAt: new Date().toISOString()
    };
    setKnowledge(prev => [insight, ...prev]);
    setNewInsight({ title: '', content: '', department: selectedDept?.id || '' });
    setShowInsightModal(false);
    logActivity('Insight logged', insight.title);
    
    addToIntelligence({
      id: generateId('intel'),
      sourceType: 'knowledge',
      sourceId: insight.id,
      title: insight.title,
      content: insight.content,
      department: insight.department,
      tags: extractTags(insight.content),
      metadata: {},
      createdAt: new Date().toISOString(),
      relevanceBoost: 2
    });
  };

  // Handle file upload
  const handleFileUpload = (deptId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const doc = {
        id: generateId('know'),
        type: 'document',
        title: file.name,
        content: `File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        department: deptId,
        fileType: file.type,
        createdAt: new Date().toISOString()
      };
      setKnowledge(prev => [doc, ...prev]);
      logActivity('Document uploaded', file.name);
      
      addToIntelligence({
        id: generateId('intel'),
        sourceType: 'document_upload',
        sourceId: doc.id,
        title: file.name,
        content: `Uploaded document: ${file.name}`,
        department: deptId,
        tags: ['document', 'upload', file.type?.split('/')[1] || 'file'],
        metadata: { fileType: file.type, size: file.size },
        createdAt: new Date().toISOString(),
        relevanceBoost: 1
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Delete knowledge item
  const deleteKnowledge = (id) => {
    setKnowledge(prev => prev.filter(k => k.id !== id));
    logActivity('Item deleted', 'Knowledge item removed');
  };

  // Status icon for connected docs
  const StatusIcon = ({ status }) => {
    if (status === 'synced') return <CheckCircle size={14} style={{ color: '#10B981' }} />;
    if (status === 'error') return <AlertCircle size={14} style={{ color: '#EF4444' }} />;
    if (status === 'syncing') return <RefreshCw size={14} style={{ color: '#F59E0B', animation: 'spin 1s linear infinite' }} />;
    return <Clock size={14} style={{ color: '#64748B' }} />;
  };

  // Department docs view
  if (selectedDept) {
    const deptDocs = getDeptDocs(selectedDept.id);
    const deptConnectedDocs = getDeptConnectedDocs(selectedDept.id);
    const DeptIcon = getDeptIcon(selectedDept.icon);
    
    return (
      <div style={{ padding: '32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <button
            onClick={() => setSelectedDept(null)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{
            width: '48px',
            height: '48px',
            background: `${selectedDept.color}20`,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DeptIcon size={24} style={{ color: selectedDept.color }} />
          </div>
          <div>
            <h1 style={{ color: '#E2E8F0', fontSize: '24px', fontWeight: '600' }}>{selectedDept.name}</h1>
            <p style={{ color: '#64748B', fontSize: '14px' }}>{deptDocs.length} documents • {deptConnectedDocs.length} connected docs</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#3B82F6',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <Upload size={16} />
              Upload
              <input type="file" hidden onChange={(e) => handleFileUpload(selectedDept.id, e)} />
            </label>
            <button
              onClick={() => { setNewInsight({ ...newInsight, department: selectedDept.id }); setShowInsightModal(true); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#8B5CF6',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <Lightbulb size={16} />
              Log Insight
            </button>
          </div>
        </div>

        {/* Connected Docs for this dept */}
        {deptConnectedDocs.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#94A3B8', fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>CONNECTED GOOGLE DOCS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {deptConnectedDocs.map(doc => (
                <div key={doc.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <Link size={16} style={{ color: '#3B82F6' }} />
                  <span style={{ color: '#E2E8F0', fontSize: '14px', flex: 1 }}>{doc.name}</span>
                  <StatusIcon status={doc.status} />
                  <span style={{ color: '#64748B', fontSize: '12px' }}>
                    {doc.lastFetched ? formatDate(doc.lastFetched) : 'Never synced'}
                  </span>
                  <button
                    onClick={() => refreshSingleDoc(doc)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
                  >
                    <RefreshCw size={14} />
                  </button>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: '#64748B', padding: '4px' }}>
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {deptDocs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              color: '#64748B',
              background: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '12px',
              border: '1px dashed rgba(255,255,255,0.1)'
            }}>
              <BookOpen size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>No documents yet</p>
              <p style={{ fontSize: '14px' }}>Upload files or log insights to build this department's knowledge</p>
            </div>
          ) : (
            deptDocs.map(doc => (
              <div key={doc.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: doc.type === 'insight' ? 'rgba(139, 92, 246, 0.2)' : doc.type === 'google-doc' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {doc.type === 'insight' ? <Lightbulb size={18} style={{ color: '#8B5CF6' }} /> :
                   doc.type === 'google-doc' ? <Link size={18} style={{ color: '#3B82F6' }} /> :
                   <FileText size={18} style={{ color: '#3B82F6' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>{doc.title}</h4>
                  <p style={{ color: '#64748B', fontSize: '13px' }}>
                    {doc.type === 'google-doc' ? 'Connected Doc' : doc.type === 'insight' ? 'Insight' : 'Document'} • {formatDate(doc.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => deleteKnowledge(doc.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748B',
                    padding: '8px'
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

  // Main Knowledge view - Department cards + Connected Docs panel
  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ color: '#E2E8F0', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>Knowledge Base</h1>
          <p style={{ color: '#64748B' }}>Manage documents and insights by department</p>
        </div>
        <button
          onClick={() => setShowAddDeptModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <Plus size={18} />
          Add Department
        </button>
      </div>

      {/* Connected Google Docs Panel */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Link size={20} style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <h2 style={{ color: '#E2E8F0', fontSize: '18px', fontWeight: '600' }}>Connected Google Docs</h2>
              <p style={{ color: '#64748B', fontSize: '13px' }}>{connectedDocs.length} document(s) syncing automatically</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshing || connectedDocs.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                cursor: connectedDocs.length === 0 ? 'not-allowed' : 'pointer',
                color: '#94A3B8',
                fontSize: '14px',
                opacity: connectedDocs.length === 0 ? 0.5 : 1
              }}
            >
              <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
              Refresh All
            </button>
            <button
              onClick={() => setShowDocModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#3B82F6',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <Plus size={16} />
              Connect Doc
            </button>
          </div>
        </div>

        {/* Connected Docs List */}
        {connectedDocs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#64748B',
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: '10px',
            border: '1px dashed rgba(255,255,255,0.1)'
          }}>
            <Link size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ fontSize: '14px', marginBottom: '8px' }}>No Google Docs connected yet</p>
            <p style={{ fontSize: '13px' }}>Connect a published Google Doc to sync its content automatically</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {connectedDocs.map(doc => {
              const dept = departments.find(d => d.id === doc.department);
              return (
                <div key={doc.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.04)'
                }}>
                  <FileText size={18} style={{ color: '#3B82F6' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: '500' }}>{doc.name}</div>
                    <div style={{ color: '#64748B', fontSize: '12px' }}>
                      {dept?.name || 'No department'} • {doc.lastFetched ? `Synced ${formatDate(doc.lastFetched)}` : 'Never synced'}
                    </div>
                    {doc.error && <div style={{ color: '#EF4444', fontSize: '12px' }}>{doc.error}</div>}
                  </div>
                  <StatusIcon status={doc.status} />
                  <button
                    onClick={() => refreshSingleDoc(doc)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '6px' }}
                    title="Refresh"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <a 
                    href={doc.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ color: '#64748B', padding: '6px' }}
                    title="Open in Google Docs"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    onClick={() => removeConnectedDoc(doc.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '6px' }}
                    title="Disconnect"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Instructions */}
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#94A3B8'
        }}>
          <strong style={{ color: '#3B82F6' }}>How to connect:</strong> Open your Google Doc → File → Share → Publish to web → Copy the link and paste it here. Content syncs automatically every 5 minutes.
        </div>
      </div>

      {/* Department Cards Grid */}
      <h3 style={{ color: '#94A3B8', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>DEPARTMENTS</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {departments.map(dept => {
          const DeptIcon = getDeptIcon(dept.icon);
          const docCount = getDeptDocs(dept.id).length;
          const connectedCount = getDeptConnectedDocs(dept.id).length;
          
          return (
            <div
              key={dept.id}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '24px',
                position: 'relative'
              }}
            >
              {/* Menu */}
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === dept.id ? null : dept.id); }}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                  padding: '4px'
                }}
              >
                <MoreVertical size={18} />
              </button>
              
              {menuOpen === dept.id && (
                <div style={{
                  position: 'absolute',
                  top: '44px',
                  right: '16px',
                  background: 'rgba(15, 23, 42, 0.98)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  zIndex: 10,
                  minWidth: '140px'
                }}>
                  <button
                    onClick={() => { setEditingDept(dept); setShowEditDeptModal(true); setMenuOpen(null); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '10px 14px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#E2E8F0',
                      fontSize: '13px'
                    }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => deleteDepartment(dept.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '10px 14px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#EF4444',
                      fontSize: '13px'
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}

              {/* Icon & Count */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  background: `${dept.color}20`,
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <DeptIcon size={28} style={{ color: dept.color }} />
                </div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: '700',
                  color: '#E2E8F0',
                  fontFamily: "'Space Mono', monospace"
                }}>
                  {docCount}
                </div>
              </div>

              {/* Name */}
              <h3 style={{ color: '#E2E8F0', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>{dept.name}</h3>
              <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '20px' }}>
                {docCount} document{docCount !== 1 ? 's' : ''} • {connectedCount} connected
              </p>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px',
                  background: `${dept.color}20`,
                  border: `1px solid ${dept.color}40`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: dept.color,
                  fontSize: '13px',
                  fontWeight: '500'
                }}>
                  <Upload size={14} />
                  Upload
                  <input type="file" hidden onChange={(e) => handleFileUpload(dept.id, e)} />
                </label>
                <button
                  onClick={() => setSelectedDept(dept)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    fontSize: '13px'
                  }}
                >
                  <BookOpen size={14} />
                  Docs
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Department Modal */}
      {showAddDeptModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1E293B, #0F172A)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '32px',
            width: '100%',
            maxWidth: '480px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#E2E8F0', fontSize: '20px', fontWeight: '600' }}>Add Department</h2>
              <button onClick={() => setShowAddDeptModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Name</label>
                <input
                  type="text"
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  placeholder="Department name"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Description</label>
                <textarea
                  value={newDept.description}
                  onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                  placeholder="What does this department handle?"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Icon</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {iconOptions.map(icon => {
                      const IconComp = getDeptIcon(icon);
                      return (
                        <button
                          key={icon}
                          onClick={() => setNewDept({ ...newDept, icon })}
                          style={{
                            width: '40px',
                            height: '40px',
                            background: newDept.icon === icon ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                            border: newDept.icon === icon ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <IconComp size={18} style={{ color: '#94A3B8' }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Color</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewDept({ ...newDept, color })}
                        style={{
                          width: '32px',
                          height: '32px',
                          background: color,
                          border: newDept.color === color ? '3px solid white' : 'none',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <button
                onClick={addDepartment}
                disabled={!newDept.name}
                style={{
                  padding: '14px',
                  background: newDept.name ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: newDept.name ? 'pointer' : 'not-allowed',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Create Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditDeptModal && editingDept && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1E293B, #0F172A)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '32px',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#E2E8F0', fontSize: '20px', fontWeight: '600' }}>Edit Department</h2>
              <button onClick={() => { setShowEditDeptModal(false); setEditingDept(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Name</label>
                <input
                  type="text"
                  value={editingDept.name}
                  onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Description</label>
                <textarea
                  value={editingDept.description || ''}
                  onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Icon</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {iconOptions.map(icon => {
                      const IconComp = getDeptIcon(icon);
                      return (
                        <button
                          key={icon}
                          onClick={() => setEditingDept({ ...editingDept, icon })}
                          style={{
                            width: '40px',
                            height: '40px',
                            background: editingDept.icon === icon ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                            border: editingDept.icon === icon ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <IconComp size={18} style={{ color: '#94A3B8' }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Color</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={() => setEditingDept({ ...editingDept, color })}
                        style={{
                          width: '32px',
                          height: '32px',
                          background: color,
                          border: editingDept.color === color ? '3px solid white' : 'none',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Department AI Instructions */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '10px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <FileText size={16} style={{ color: '#F59E0B' }} />
                  <span style={{ color: '#F59E0B', fontSize: '14px', fontWeight: '500' }}>Department AI Instructions</span>
                </div>
                <textarea
                  value={editingDept.instructions || ''}
                  onChange={(e) => setEditingDept({ ...editingDept, instructions: e.target.value })}
                  placeholder="Custom instructions for AI when chatting in this department..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
                <p style={{ color: '#64748B', fontSize: '12px', marginTop: '8px' }}>
                  These instructions are applied in addition to system-wide instructions when chatting in this department.
                </p>
              </div>
              
              <button
                onClick={saveDepartmentEdit}
                style={{
                  padding: '14px',
                  background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Insight Modal */}
      {showInsightModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1E293B, #0F172A)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '32px',
            width: '100%',
            maxWidth: '480px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#E2E8F0', fontSize: '20px', fontWeight: '600' }}>Log Insight</h2>
              <button onClick={() => setShowInsightModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Title</label>
                <input
                  type="text"
                  value={newInsight.title}
                  onChange={(e) => setNewInsight({ ...newInsight, title: e.target.value })}
                  placeholder="Brief title for this insight"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Content</label>
                <textarea
                  value={newInsight.content}
                  onChange={(e) => setNewInsight({ ...newInsight, content: e.target.value })}
                  placeholder="Detailed information, learnings, or notes..."
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Department</label>
                <select
                  value={newInsight.department}
                  onChange={(e) => setNewInsight({ ...newInsight, department: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="">Select department...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={addInsight}
                disabled={!newInsight.title || !newInsight.content}
                style={{
                  padding: '14px',
                  background: (newInsight.title && newInsight.content) ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: (newInsight.title && newInsight.content) ? 'pointer' : 'not-allowed',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Save Insight
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Google Doc Modal */}
      {showDocModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1E293B, #0F172A)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '32px',
            width: '100%',
            maxWidth: '520px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Link size={20} style={{ color: '#3B82F6' }} />
                </div>
                <h2 style={{ color: '#E2E8F0', fontSize: '20px', fontWeight: '600' }}>Connect Google Doc</h2>
              </div>
              <button onClick={() => setShowDocModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Document Name</label>
                <input
                  type="text"
                  value={newDoc.name}
                  onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                  placeholder="e.g., Sales Playbook, Safety Procedures"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Published URL</label>
                <input
                  type="url"
                  value={newDoc.url}
                  onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })}
                  placeholder="https://docs.google.com/document/d/..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <p style={{ color: '#64748B', fontSize: '12px', marginTop: '8px' }}>
                  Get this from: Google Doc → File → Share → Publish to web → Copy link
                </p>
              </div>
              
              <div>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>Department</label>
                <select
                  value={newDoc.department}
                  onChange={(e) => setNewDoc({ ...newDoc, department: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="">Select department...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{
                padding: '12px 16px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#94A3B8'
              }}>
                <strong style={{ color: '#3B82F6' }}>Tip:</strong> You can connect docs from any Google account. Just make sure the doc is published to web.
              </div>
              
              <button
                onClick={addConnectedDoc}
                disabled={!newDoc.name || !newDoc.url || !newDoc.department}
                style={{
                  padding: '14px',
                  background: (newDoc.name && newDoc.url && newDoc.department) ? 'linear-gradient(135deg, #3B82F6, #06B6D4)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: (newDoc.name && newDoc.url && newDoc.department) ? 'pointer' : 'not-allowed',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Connect Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
