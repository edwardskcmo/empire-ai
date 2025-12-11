import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Search, Bell, Settings, MessageSquare, FileText, 
  AlertTriangle, Mic, MicOff, Home, TrendingUp, Users, Wrench, Shield, DollarSign, 
  Folder, CheckCircle, Database, Zap, LayoutGrid, Wifi, HardDrive, Clock, 
  RefreshCw, Server, Activity, Link2, Send, Plus, Upload, X, Trash2,
  BookOpen, Lightbulb, File, Image, MoreVertical, Edit3, Eye, Download,
  ClipboardList, Filter, ChevronDown, Check, Circle, AlertCircle, Phone,
  PhoneOff, Volume2, VolumeX, Square, Building, Briefcase, GripVertical,
  Calculator, GraduationCap, ShieldCheck, ClipboardCheck, Brain, Sparkles, Tag,
  Archive, ArchiveRestore, SearchIcon, UserPlus, Mail, Crown, UserCog, Key,
  HelpCircle, ChevronUp
} from 'lucide-react';

// Default Department Configuration
const defaultDepartments = [
  { id: 'company-wide', name: 'Company-Wide', icon: 'Building', color: '#64748B', description: 'Company-wide documents and policies' },
  { id: 'marketing', name: 'Marketing & Lead Generation', icon: 'TrendingUp', color: '#10B981', description: 'Campaigns, leads, and brand management' },
  { id: 'sales', name: 'Sales & Estimating', icon: 'DollarSign', color: '#F59E0B', description: 'Pipeline, proposals, and client relations' },
  { id: 'production', name: 'Production & Project Management', icon: 'Wrench', color: '#3B82F6', description: 'Project execution and scheduling' },
  { id: 'financial', name: 'Financial & Bookkeeping', icon: 'Calculator', color: '#8B5CF6', description: 'Budgets, invoices, and accounting' },
  { id: 'hr', name: 'HR & Training', icon: 'Users', color: '#EC4899', description: 'Team, hiring, and culture' },
  { id: 'safety', name: 'Safety & Compliance', icon: 'ShieldCheck', color: '#EF4444', description: 'Compliance, training, and protocols' },
  { id: 'admin', name: 'Operations & Admin', icon: 'ClipboardCheck', color: '#06B6D4', description: 'Operations and documentation' },
];

// Icon mapping for departments
const iconMap = {
  Building, Briefcase, TrendingUp, DollarSign, Wrench, Shield, Folder, Users,
  Calculator, GraduationCap, ShieldCheck, ClipboardCheck, Zap, FileText, Database,
  Brain, Sparkles, Tag, Archive
};

const getIconComponent = (iconName) => iconMap[iconName] || Building;

// Local Storage Helpers
const storage = {
  get: (key, defaultValue) => {
    try {
      const item = localStorage.getItem(`empire_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(`empire_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }
};

// Generate unique ID
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============================================
// CENTRAL INTELLIGENCE ENGINE
// ============================================

// Auto-extract tags from text content
const extractTags = (text) => {
  if (!text) return [];
  const lowerText = text.toLowerCase();
  
  // Keyword patterns for contractors
  const patterns = {
    // Project types
    kitchen: /kitchen|cabinet|countertop|appliance/gi,
    bathroom: /bathroom|bath|shower|toilet|vanity|tile/gi,
    addition: /addition|expand|extension|new room/gi,
    deck: /deck|patio|outdoor|pergola/gi,
    roofing: /roof|shingle|gutter|flashing/gi,
    electrical: /electrical|wire|outlet|panel|circuit/gi,
    plumbing: /plumb|pipe|drain|water heater|faucet/gi,
    hvac: /hvac|heating|cooling|ac |furnace|duct/gi,
    
    // Business operations
    permit: /permit|inspection|code|compliance/gi,
    schedule: /schedule|timeline|deadline|delay/gi,
    budget: /budget|cost|price|estimate|quote/gi,
    material: /material|supply|order|delivery/gi,
    subcontractor: /sub|subcontractor|trade partner/gi,
    client: /client|customer|homeowner|owner/gi,
    payment: /payment|invoice|deposit|balance/gi,
    safety: /safety|osha|hazard|incident|injury/gi,
    
    // Status indicators
    urgent: /urgent|asap|emergency|critical|immediately/gi,
    delayed: /delay|behind|late|overdue|waiting/gi,
    completed: /complete|finished|done|resolved|closed/gi,
  };
  
  const tags = [];
  for (const [tag, pattern] of Object.entries(patterns)) {
    if (pattern.test(lowerText)) {
      tags.push(tag);
    }
  }
  return [...new Set(tags)]; // Remove duplicates
};

// Calculate relevance score between query and item
const calculateRelevance = (query, item) => {
  if (!query || !item) return 0;
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  let score = 0;
  const searchText = `${item.title || ''} ${item.content || ''} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
  
  // Exact phrase match
  if (searchText.includes(queryLower)) score += 10;
  
  // Individual word matches
  queryWords.forEach(word => {
    if (searchText.includes(word)) score += 2;
  });
  
  // Tag matches boost score
  if (item.tags) {
    queryWords.forEach(word => {
      if (item.tags.includes(word)) score += 5;
    });
  }
  
  // Recency bonus (items from last 7 days get boost)
  if (item.createdAt) {
    const daysSince = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) score += 3;
    if (daysSince < 1) score += 5;
  }
  
  return score;
};

// Format timestamp
const formatTime = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

export default function EmpireAI() {
  // Navigation State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [activeDept, setActiveDept] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Departments State (editable)
  const [departments, setDepartments] = useState(() => storage.get('departments', defaultDepartments));
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [newDept, setNewDept] = useState({ name: '', icon: 'Building', color: '#3B82F6', description: '' });
  const [draggingDeptId, setDraggingDeptId] = useState(null);
  const [deptCardMenu, setDeptCardMenu] = useState(null);
  const [viewingDeptDocs, setViewingDeptDocs] = useState(null);

  // Chat State
  const [conversations, setConversations] = useState(() => storage.get('conversations', {}));
  const [currentMessage, setCurrentMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false); // NEW: AI thinking state
  const chatEndRef = useRef(null);

  // Knowledge State
  const [knowledge, setKnowledge] = useState(() => storage.get('knowledge', []));
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [newInsight, setNewInsight] = useState({ title: '', content: '', department: '' });
  const [knowledgeFilter, setKnowledgeFilter] = useState('all');
  const [knowledgeSearch, setKnowledgeSearch] = useState('');

  // Activity State
  const [activities, setActivities] = useState(() => storage.get('activities', []));

  // Issues Board State
  const [issues, setIssues] = useState(() => storage.get('issues', []));
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [issueFilters, setIssueFilters] = useState({ status: 'all', priority: 'all', department: 'all' });
  const [showArchivedIssues, setShowArchivedIssues] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [newIssue, setNewIssue] = useState({ 
    title: '', 
    description: '', 
    department: '', 
    priority: 'medium', 
    status: 'open',
    assignee: ''
  });

  // Issues Board Column Configuration
  const defaultColumns = [
    { id: 'title', label: 'Issue', width: 250, visible: true, minWidth: 150 },
    { id: 'department', label: 'Department', width: 120, visible: true, minWidth: 80 },
    { id: 'priority', label: 'Priority', width: 100, visible: true, minWidth: 80 },
    { id: 'status', label: 'Status', width: 120, visible: true, minWidth: 80 },
    { id: 'assignee', label: 'Assignee', width: 120, visible: true, minWidth: 80 },
    { id: 'createdAt', label: 'Created', width: 100, visible: true, minWidth: 80 },
    { id: 'actions', label: 'Actions', width: 100, visible: true, minWidth: 80 }
  ];
  const [issueColumns, setIssueColumns] = useState(() => storage.get('issueColumns', defaultColumns));
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnLabel, setEditingColumnLabel] = useState('');
  const [draggingColumnId, setDraggingColumnId] = useState(null);
  const [resizingColumn, setResizingColumn] = useState(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  
  // Resolution Modal State
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolvingIssue, setResolvingIssue] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Voice Mode State
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('idle'); // idle, listening, processing, speaking
  const [isMuted, setIsMuted] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResponse, setVoiceResponse] = useState('');

  // Connected Sheets (UI only for now)
  const [connectedSheets] = useState([
    { id: 1, name: 'Project Budget Tracker', lastSync: '30 sec ago', status: 'active', rows: 142 },
    { id: 2, name: 'Lead Pipeline', lastSync: '30 sec ago', status: 'active', rows: 87 },
    { id: 3, name: 'Material Costs 2024', lastSync: '30 sec ago', status: 'active', rows: 256 },
  ]);

  // Team Members State
  const [teamMembers, setTeamMembers] = useState(() => storage.get('teamMembers', [
    { id: 'owner_1', name: 'Empire Admin', email: 'admin@empireremodeling.com', role: 'owner', status: 'active', avatar: 'EA', joinedAt: '2024-01-01' },
  ]));
  const [pendingInvites, setPendingInvites] = useState(() => storage.get('pendingInvites', []));
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'member', departments: [] });
  const [editingMember, setEditingMember] = useState(null);

  // Persist team data
  useEffect(() => {
    storage.set('teamMembers', teamMembers);
  }, [teamMembers]);

  useEffect(() => {
    storage.set('pendingInvites', pendingInvites);
  }, [pendingInvites]);

  // Role definitions
  const roles = [
    { id: 'owner', name: 'Owner', description: 'Full access to everything', color: '#F59E0B' },
    { id: 'admin', name: 'Admin', description: 'Manage team and settings', color: '#8B5CF6' },
    { id: 'manager', name: 'Manager', description: 'Manage departments and issues', color: '#3B82F6' },
    { id: 'member', name: 'Member', description: 'View and contribute', color: '#10B981' },
    { id: 'viewer', name: 'Viewer', description: 'View only access', color: '#64748B' },
  ];

  // Team management functions
  const sendInvite = () => {
    if (!newInvite.email.trim() || !newInvite.email.includes('@')) return;
    
    const invite = {
      id: generateId(),
      email: newInvite.email.trim().toLowerCase(),
      role: newInvite.role,
      departments: newInvite.departments,
      status: 'pending',
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    
    setPendingInvites(prev => [...prev, invite]);
    addActivity('insight', `Invitation sent to ${invite.email}`, 'System');
    setNewInvite({ email: '', role: 'member', departments: [] });
    setShowInviteModal(false);
  };

  const cancelInvite = (inviteId) => {
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
  };

  const resendInvite = (invite) => {
    setPendingInvites(prev => prev.map(i => 
      i.id === invite.id 
        ? { ...i, sentAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
        : i
    ));
    addActivity('insight', `Invitation resent to ${invite.email}`, 'System');
  };

  const updateMemberRole = (memberId, newRole) => {
    setTeamMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, role: newRole } : m
    ));
  };

  const removeMember = (memberId) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (member && member.role !== 'owner') {
      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
      addActivity('insight', `${member.name} removed from team`, 'System');
    }
  };

  const updateMemberDepartments = (memberId, deptIds) => {
    setTeamMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, departments: deptIds } : m
    ));
  };

  // ============================================
  // CENTRAL INTELLIGENCE SYSTEM
  // ============================================
  
  // Intelligence index - aggregated from all sources
  const [intelligenceIndex, setIntelligenceIndex] = useState(() => storage.get('intelligence', []));
  
  // Persist intelligence index
  useEffect(() => {
    storage.set('intelligence', intelligenceIndex);
  }, [intelligenceIndex]);

  // Add item to intelligence index
  const addToIntelligence = useCallback((item) => {
    const tags = extractTags(`${item.title || ''} ${item.content || ''} ${item.description || ''}`);
    const intelligenceItem = {
      id: generateId(),
      sourceType: item.sourceType, // 'knowledge', 'issue', 'chat', 'activity'
      sourceId: item.sourceId,
      title: item.title,
      content: item.content || item.description,
      department: item.department,
      tags: [...new Set([...(item.tags || []), ...tags])],
      metadata: item.metadata || {},
      createdAt: new Date().toISOString(),
      relevanceBoost: item.relevanceBoost || 0
    };
    setIntelligenceIndex(prev => [intelligenceItem, ...prev].slice(0, 500)); // Keep last 500 items
    return intelligenceItem;
  }, []);

  // Query intelligence for relevant context
  const queryIntelligence = useCallback((query, options = {}) => {
    const { department, limit = 5, sourceTypes = null, minScore = 1 } = options;
    
    // Combine all searchable sources
    let allItems = [
      // From intelligence index (pre-processed)
      ...intelligenceIndex,
      // From knowledge base
      ...knowledge.map(k => ({
        ...k,
        sourceType: 'knowledge',
        sourceId: k.id,
        tags: k.tags || extractTags(`${k.title} ${k.content}`)
      })),
      // From resolved issues
      ...issues.filter(i => i.status === 'resolved').map(i => ({
        ...i,
        sourceType: 'resolved_issue',
        sourceId: i.id,
        content: i.description,
        tags: i.tags || extractTags(`${i.title} ${i.description}`)
      }))
    ];
    
    // Filter by department if specified
    if (department && department !== 'general') {
      allItems = allItems.filter(item => 
        !item.department || item.department === department || item.department === 'company-wide'
      );
    }
    
    // Filter by source types if specified
    if (sourceTypes) {
      allItems = allItems.filter(item => sourceTypes.includes(item.sourceType));
    }
    
    // Score and sort by relevance
    const scored = allItems.map(item => ({
      ...item,
      score: calculateRelevance(query, item) + (item.relevanceBoost || 0)
    }));
    
    // Filter by minimum score and sort
    return scored
      .filter(item => item.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...item }) => ({ ...item, relevanceScore: score }));
  }, [intelligenceIndex, knowledge, issues]);

  // Get intelligence stats
  const intelligenceStats = {
    totalItems: intelligenceIndex.length,
    knowledgeItems: knowledge.length,
    resolvedIssues: issues.filter(i => i.status === 'resolved').length,
    recentInsights: intelligenceIndex.filter(i => {
      const daysSince = (Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 7;
    }).length,
    topTags: (() => {
      const tagCounts = {};
      [...intelligenceIndex, ...knowledge].forEach(item => {
        (item.tags || []).forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });
      return Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));
    })()
  };

  // Persist to local storage
  useEffect(() => {
    storage.set('conversations', conversations);
  }, [conversations]);

  useEffect(() => {
    storage.set('knowledge', knowledge);
  }, [knowledge]);

  useEffect(() => {
    storage.set('activities', activities);
  }, [activities]);

  // Persist departments
  useEffect(() => {
    storage.set('departments', departments);
  }, [departments]);

  // Persist issues
  useEffect(() => {
    storage.set('issues', issues);
  }, [issues]);

  // Persist issue columns configuration
  useEffect(() => {
    storage.set('issueColumns', issueColumns);
  }, [issueColumns]);

  // Column resize handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!resizingColumn) return;
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(resizingColumn.minWidth, resizeStartWidth + diff);
      setIssueColumns(prev => prev.map(col => 
        col.id === resizingColumn.id ? { ...col, width: newWidth } : col
      ));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth]);

  // Column management functions
  const startColumnResize = (e, column) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(column);
    setResizeStartX(e.clientX);
    setResizeStartWidth(column.width);
  };

  const handleColumnDragStart = (e, columnId) => {
    setDraggingColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e, targetColumnId) => {
    e.preventDefault();
    if (!draggingColumnId || draggingColumnId === targetColumnId) return;
    
    setIssueColumns(prev => {
      const dragIndex = prev.findIndex(c => c.id === draggingColumnId);
      const targetIndex = prev.findIndex(c => c.id === targetColumnId);
      if (dragIndex === -1 || targetIndex === -1) return prev;
      
      const newColumns = [...prev];
      const [draggedCol] = newColumns.splice(dragIndex, 1);
      newColumns.splice(targetIndex, 0, draggedCol);
      return newColumns;
    });
  };

  const handleColumnDragEnd = () => {
    setDraggingColumnId(null);
  };

  const startEditingColumn = (column) => {
    if (column.id === 'actions') return; // Don't allow editing actions column
    setEditingColumnId(column.id);
    setEditingColumnLabel(column.label);
  };

  const saveColumnLabel = () => {
    if (editingColumnId && editingColumnLabel.trim()) {
      setIssueColumns(prev => prev.map(col => 
        col.id === editingColumnId ? { ...col, label: editingColumnLabel.trim() } : col
      ));
    }
    setEditingColumnId(null);
    setEditingColumnLabel('');
  };

  const toggleColumnVisibility = (columnId) => {
    if (columnId === 'title' || columnId === 'actions') return; // Always show title and actions
    setIssueColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const resetColumnsToDefault = () => {
    setIssueColumns(defaultColumns);
  };

  // Click outside to close column settings
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showColumnSettings && !e.target.closest('.column-settings-container')) {
        setShowColumnSettings(false);
      }
      if (deptCardMenu && !e.target.closest('.dept-card-menu')) {
        setDeptCardMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnSettings, deptCardMenu]);

  // Department Management Functions
  const addDepartment = () => {
    if (!newDept.name.trim()) return;
    const dept = {
      id: generateId(),
      name: newDept.name.trim(),
      icon: newDept.icon,
      color: newDept.color,
      description: newDept.description.trim()
    };
    setDepartments(prev => [...prev, dept]);
    addActivity('insight', `New department created: ${dept.name}`, 'System');
    setNewDept({ name: '', icon: 'Building', color: '#3B82F6', description: '' });
    setShowDeptModal(false);
  };

  const updateDepartment = (id, updates) => {
    setDepartments(prev => prev.map(dept => 
      dept.id === id ? { ...dept, ...updates } : dept
    ));
  };

  const deleteDepartment = (id) => {
    const dept = departments.find(d => d.id === id);
    if (dept) {
      setDepartments(prev => prev.filter(d => d.id !== id));
      addActivity('insight', `Department deleted: ${dept.name}`, 'System');
      // Also delete associated knowledge items
      setKnowledge(prev => prev.filter(k => k.department !== id));
    }
    setDeptCardMenu(null);
  };

  const handleDeptDragStart = (e, deptId) => {
    setDraggingDeptId(deptId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDeptDragOver = (e, targetDeptId) => {
    e.preventDefault();
    if (!draggingDeptId || draggingDeptId === targetDeptId) return;
    
    setDepartments(prev => {
      const dragIndex = prev.findIndex(d => d.id === draggingDeptId);
      const targetIndex = prev.findIndex(d => d.id === targetDeptId);
      if (dragIndex === -1 || targetIndex === -1) return prev;
      
      const newDepts = [...prev];
      const [draggedDept] = newDepts.splice(dragIndex, 1);
      newDepts.splice(targetIndex, 0, draggedDept);
      return newDepts;
    });
  };

  const handleDeptDragEnd = () => {
    setDraggingDeptId(null);
  };

  const saveDepartmentEdit = () => {
    if (editingDept && newDept.name.trim()) {
      updateDepartment(editingDept.id, {
        name: newDept.name.trim(),
        icon: newDept.icon,
        color: newDept.color,
        description: newDept.description.trim()
      });
      addActivity('insight', `Department updated: ${newDept.name}`, 'System');
    }
    setEditingDept(null);
    setNewDept({ name: '', icon: 'Building', color: '#3B82F6', description: '' });
    setShowDeptModal(false);
  };

  const openEditDeptModal = (dept) => {
    setEditingDept(dept);
    setNewDept({
      name: dept.name,
      icon: dept.icon,
      color: dept.color,
      description: dept.description || ''
    });
    setShowDeptModal(true);
    setDeptCardMenu(null);
  };

  const getDocsCountForDept = (deptId) => {
    return knowledge.filter(k => k.department === deptId).length;
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeDept, isThinking]);

  // Add activity
  const addActivity = (type, text, dept) => {
    const activity = {
      id: generateId(),
      type,
      text,
      dept,
      time: new Date().toISOString()
    };
    setActivities(prev => [activity, ...prev].slice(0, 50));
  };

  // Get current conversation
  const getCurrentConversation = () => {
    const key = activeDept || 'general';
    return conversations[key] || [];
  };

  // ============================================
  // REAL AI INTEGRATION - ANTHROPIC API
  // ============================================
  
  // Build context from intelligence for AI
  const buildIntelligenceContext = (query, dept) => {
    const relevantContext = queryIntelligence(query, { 
      department: dept, 
      limit: 5,
      minScore: 2
    });
    
    if (relevantContext.length === 0) return '';
    
    let context = '\n\nRelevant company knowledge:\n';
    relevantContext.forEach((item, i) => {
      const source = item.sourceType === 'knowledge' ? 'Knowledge Base' : 
                     item.sourceType === 'resolved_issue' ? 'Resolved Issue' : 'Intelligence';
      context += `${i + 1}. [${source}] ${item.title}: ${(item.content || '').substring(0, 200)}...\n`;
    });
    
    return context;
  };

  // Send message with real AI
  const sendMessage = async () => {
    if (!currentMessage.trim() || isThinking) return;
    
    const key = activeDept || 'general';
    const userMessage = {
      id: generateId(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    // Add user message immediately
    setConversations(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), userMessage]
    }));

    const messageText = currentMessage;
    setCurrentMessage('');
    setIsThinking(true);

    try {
      // Get department info for context
      const deptInfo = activeDept ? departments.find(d => d.id === activeDept) : null;
      const deptName = deptInfo?.name || 'General';
      const deptDescription = deptInfo?.description || 'General company operations';
      
      // Build intelligence context
      const intelligenceContext = buildIntelligenceContext(messageText, activeDept);
      
      // Build system prompt
      const systemPrompt = `You are Empire AI, the operational intelligence assistant for Empire Remodeling, a residential remodeling contractor.

Current Department: ${deptName}
Department Focus: ${deptDescription}

Your role:
- Help with ${deptName.toLowerCase()} questions and tasks
- Provide actionable, practical advice for a remodeling business
- Reference relevant company knowledge when available
- Be concise but thorough
- Use a professional but friendly tone

${intelligenceContext}

Remember: You're helping a busy contractor run their business better. Be direct and helpful.`;

      // Call the API endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          systemPrompt: systemPrompt,
          conversationHistory: getCurrentConversation().slice(-10).map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Add AI response
      const aiResponse = {
        id: generateId(),
        role: 'assistant',
        content: data.response || 'I apologize, but I encountered an issue processing your request. Please try again.',
        timestamp: new Date().toISOString()
      };

      setConversations(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), aiResponse]
      }));

      // Log activity
      addActivity('chat', `Chat in ${deptName}`, deptName);
      
      // Log to intelligence for pattern learning
      if (messageText.length > 10) {
        addToIntelligence({
          sourceType: 'chat_query',
          sourceId: generateId(),
          title: `Query: ${messageText.substring(0, 50)}...`,
          content: messageText,
          department: activeDept || 'general',
          metadata: { hasIntelligenceContext: intelligenceContext.length > 0 }
        });
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      // Fallback to simulated response if API fails
      const fallbackResponse = {
        id: generateId(),
        role: 'assistant',
        content: `I'm having trouble connecting to my AI services right now. Here's what I can tell you based on local knowledge:\n\n${getSimulatedResponse(messageText, activeDept)}`,
        timestamp: new Date().toISOString()
      };

      setConversations(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), fallbackResponse]
      }));
    } finally {
      setIsThinking(false);
    }
  };

  // Simulated AI responses (fallback if API unavailable)
  const getSimulatedResponse = (message, dept) => {
    // Query intelligence for relevant context
    const relevantContext = queryIntelligence(message, { 
      department: dept, 
      limit: 3,
      minScore: 2
    });
    
    // Base responses by department
    const baseResponses = {
      marketing: "I can help with your marketing strategy.",
      sales: "Looking at the sales pipeline for relevant information.",
      production: "I've checked the production systems.",
      safety: "Reviewing safety and compliance data.",
      admin: "I can help with administrative tasks.",
      hr: "Looking at team and HR information.",
      financial: "Reviewing financial records.",
      'company-wide': "Searching company-wide resources."
    };
    
    let response = baseResponses[dept] || "I'm here to help with Empire Remodeling operations.";
    
    // Enhance response with intelligence context
    if (relevantContext.length > 0) {
      const contextSummary = relevantContext.map(item => {
        const source = item.sourceType === 'knowledge' ? '📚' : 
                       item.sourceType === 'resolved_issue' ? '✅' : '💡';
        return `${source} ${item.title}`;
      }).join('\n');
      
      response += `\n\n**Relevant from company knowledge:**\n${contextSummary}`;
      
      // Add specific insight if we have high-relevance match
      const topMatch = relevantContext[0];
      if (topMatch && topMatch.relevanceScore >= 5) {
        response += `\n\n**Most relevant insight:** "${topMatch.title}" - ${(topMatch.content || '').substring(0, 150)}${(topMatch.content || '').length > 150 ? '...' : ''}`;
      }
    } else {
      // Default contextual responses when no intelligence match
      const defaults = {
        marketing: " Based on Empire's current campaigns, I'd suggest focusing on local SEO and customer testimonials. Would you like me to pull up the recent lead data?",
        sales: " I see 12 active proposals. The Johnson project is closest to closing. Want me to summarize the key details for your follow-up?",
        production: " Currently 3 projects are in active build phase. The Martin remodel is on track, but we may need to adjust timing on the Oak Street project due to permit delays.",
        safety: " Safety compliance is at 94% this month. I noticed the weekly toolbox talk hasn't been logged yet. Would you like me to prepare the checklist?",
        admin: " Recent documents include the Q4 budget review and updated vendor contracts. What do you need to access?",
        hr: " Team status: 8 active employees, 2 positions open. The new hire onboarding checklist is ready for review."
      };
      response += defaults[dept] || " You can switch to a specific department for specialized assistance, or ask me anything general about the business.";
    }
    
    return response;
  };

  // Add knowledge item (enhanced with auto-tagging)
  const addKnowledgeItem = (item) => {
    const tags = extractTags(`${item.title} ${item.content}`);
    const newItem = {
      id: generateId(),
      ...item,
      tags: [...new Set([...(item.tags || []), ...tags])],
      createdAt: new Date().toISOString()
    };
    setKnowledge(prev => [newItem, ...prev]);
    addActivity('insight', `New ${item.type}: ${item.title}`, item.department || 'General');
    
    // Add to central intelligence
    addToIntelligence({
      sourceType: 'knowledge',
      sourceId: newItem.id,
      title: newItem.title,
      content: newItem.content,
      department: newItem.department,
      tags: newItem.tags,
      relevanceBoost: item.type === 'insight' ? 2 : 0 // Insights get priority
    });
    
    return newItem;
  };

  // Delete knowledge item
  const deleteKnowledgeItem = (id) => {
    setKnowledge(prev => prev.filter(item => item.id !== id));
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      addKnowledgeItem({
        type: 'document',
        title: file.name,
        content: `Uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        fileType: file.type,
        department: activeDept || 'general'
      });
    });
    setShowUploadModal(false);
  };

  // Save insight
  const saveInsight = () => {
    if (!newInsight.title.trim() || !newInsight.content.trim()) return;
    addKnowledgeItem({
      type: 'insight',
      title: newInsight.title,
      content: newInsight.content,
      department: newInsight.department || activeDept || 'general'
    });
    setNewInsight({ title: '', content: '', department: '' });
    setShowInsightModal(false);
  };

  // Issue Management Functions
  const addIssue = () => {
    if (!newIssue.title.trim()) return;
    const issue = {
      id: generateId(),
      ...newIssue,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setIssues(prev => [issue, ...prev]);
    addActivity('issue', `New issue: ${newIssue.title}`, newIssue.department || 'General');
    setNewIssue({ title: '', description: '', department: '', priority: 'medium', status: 'open', assignee: '' });
    setShowIssueModal(false);
  };

  const updateIssue = (id, updates) => {
    setIssues(prev => prev.map(issue => 
      issue.id === id ? { ...issue, ...updates, updatedAt: new Date().toISOString() } : issue
    ));
  };

  const deleteIssue = (id) => {
    setIssues(prev => prev.filter(issue => issue.id !== id));
  };

  // Archive/Unarchive Issue
  const archiveIssue = (issue) => {
    updateIssue(issue.id, { 
      archived: true, 
      archivedAt: new Date().toISOString() 
    });
    addActivity('issue', `Issue archived: ${issue.title}`, issue.department || 'General');
    
    // Add to intelligence so it's searchable
    addToIntelligence({
      sourceType: 'archived_issue',
      sourceId: issue.id,
      title: `Archived: ${issue.title}`,
      content: issue.description,
      department: issue.department,
      tags: extractTags(`${issue.title} ${issue.description}`).concat(['archived']),
      relevanceBoost: 1,
      metadata: {
        status: issue.status,
        priority: issue.priority,
        assignee: issue.assignee
      }
    });
  };

  const unarchiveIssue = (issue) => {
    updateIssue(issue.id, { 
      archived: false, 
      archivedAt: null 
    });
    addActivity('issue', `Issue restored from archive: ${issue.title}`, issue.department || 'General');
  };

  // Search archived issues
  const searchArchivedIssues = (query) => {
    if (!query.trim()) return issues.filter(i => i.archived);
    
    const queryLower = query.toLowerCase();
    return issues.filter(issue => {
      if (!issue.archived) return false;
      const searchText = `${issue.title} ${issue.description} ${issue.assignee || ''} ${issue.department || ''}`.toLowerCase();
      return searchText.includes(queryLower);
    });
  };

  const resolveIssue = (issue, resolutionNotes = '') => {
    // Update issue status
    const resolution = {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      resolutionNotes: resolutionNotes
    };
    updateIssue(issue.id, resolution);
    
    // Create rich knowledge entry from resolved issue
    const tags = extractTags(`${issue.title} ${issue.description} ${resolutionNotes}`);
    const knowledgeContent = `**Problem:** ${issue.description}\n\n**Resolution:** ${resolutionNotes || 'Issue was resolved.'}\n\n**Priority was:** ${issue.priority}\n**Department:** ${issue.department || 'General'}`;
    
    addKnowledgeItem({
      type: 'insight',
      title: `✅ Resolved: ${issue.title}`,
      content: knowledgeContent,
      department: issue.department || 'general',
      tags: [...tags, 'resolved-issue', issue.priority],
      metadata: {
        sourceIssueId: issue.id,
        originalPriority: issue.priority,
        timeToResolve: issue.createdAt ? 
          Math.round((Date.now() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60)) + ' hours' : 
          'unknown'
      }
    });
    
    // Add to intelligence with high relevance boost (resolved issues are valuable)
    addToIntelligence({
      sourceType: 'resolved_issue',
      sourceId: issue.id,
      title: `Resolved: ${issue.title}`,
      content: knowledgeContent,
      department: issue.department,
      tags: [...tags, 'resolved-issue', 'solution'],
      relevanceBoost: 5, // Resolved issues are highly valuable
      metadata: {
        priority: issue.priority,
        assignee: issue.assignee
      }
    });
    
    addActivity('issue', `Issue resolved: ${issue.title}`, issue.department || 'General');
  };

  // Filter issues (exclude archived unless viewing archive)
  const filteredIssues = issues.filter(issue => {
    // If viewing archive, only show archived issues matching search
    if (showArchivedIssues) {
      if (!issue.archived) return false;
      if (archiveSearch.trim()) {
        const searchText = `${issue.title} ${issue.description} ${issue.assignee || ''} ${issue.department || ''}`.toLowerCase();
        return searchText.includes(archiveSearch.toLowerCase());
      }
      return true;
    }
    
    // Normal view: exclude archived issues
    if (issue.archived) return false;
    
    const matchesStatus = issueFilters.status === 'all' || issue.status === issueFilters.status;
    const matchesPriority = issueFilters.priority === 'all' || issue.priority === issueFilters.priority;
    const matchesDept = issueFilters.department === 'all' || issue.department === issueFilters.department;
    return matchesStatus && matchesPriority && matchesDept;
  });

  // Count archived issues
  const archivedCount = issues.filter(i => i.archived).length;

  // Voice Mode Functions
  const startVoiceSession = () => {
    setVoiceStatus('listening');
    setVoiceTranscript('');
    setVoiceResponse('');
    // Simulate listening
    setTimeout(() => {
      if (voiceStatus === 'listening') {
        setVoiceTranscript('What projects are currently in progress?');
        setVoiceStatus('processing');
        setTimeout(() => {
          setVoiceResponse('Currently there are 3 projects in active build phase. The Martin bathroom remodel is 75% complete, the Johnson kitchen renovation is in the demo phase, and the Oak Street addition is awaiting permits.');
          setVoiceStatus('speaking');
        }, 1500);
      }
    }, 3000);
  };

  const stopVoiceSession = () => {
    setVoiceStatus('idle');
    setVoiceTranscript('');
    setVoiceResponse('');
  };

  // Filter knowledge
  const filteredKnowledge = knowledge.filter(item => {
    const matchesFilter = knowledgeFilter === 'all' || item.type === knowledgeFilter || item.department === knowledgeFilter;
    const matchesSearch = !knowledgeSearch || 
      item.title.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
      item.content.toLowerCase().includes(knowledgeSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Quick stats (enhanced with intelligence)
  const openIssuesCount = issues.filter(i => i.status === 'open').length;
  const quickStats = [
    { label: 'Active Projects', value: '12', change: '+2', icon: Wrench, status: 'up' },
    { label: 'Open Issues', value: openIssuesCount.toString(), change: '', icon: AlertTriangle, status: openIssuesCount > 5 ? 'down' : 'neutral' },
    { label: 'Knowledge Items', value: knowledge.length.toString(), change: '', icon: FileText, status: 'neutral' },
    { label: 'Intelligence Index', value: intelligenceStats.totalItems.toString(), change: `+${intelligenceStats.recentInsights} this week`, icon: Brain, status: 'up' },
  ];

  // Get department info
  const currentDeptInfo = activeDept ? departments.find(d => d.id === activeDept) : null;

  // FAQ Section Component
  const FAQSection = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);
    return (
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden'
      }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '100%',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#E2E8F0'
          }}
        >
          <span style={{ fontSize: '16px', fontWeight: '600' }}>{title}</span>
          <ChevronUp
            size={20}
            style={{
              color: '#64748B',
              transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.2s ease'
            }}
          />
        </button>
        {isOpen && (
          <div style={{ padding: '0 24px 20px' }}>
            {children}
          </div>
        )}
      </div>
    );
  };

  // FAQ Item Component  
  const FAQItem = ({ question, children }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        paddingBottom: '12px',
        marginBottom: '12px'
      }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#E2E8F0',
            textAlign: 'left',
            padding: '8px 0',
            gap: '12px'
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: '500', color: isOpen ? '#3B82F6' : '#E2E8F0' }}>{question}</span>
          <ChevronUp
            size={16}
            style={{
              color: '#64748B',
              transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.2s ease',
              flexShrink: 0,
              marginTop: '2px'
            }}
          />
        </button>
        {isOpen && (
          <div style={{
            padding: '8px 0 0 0',
            fontSize: '14px',
            color: '#94A3B8',
            lineHeight: '1.6'
          }}>
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
      fontFamily: "'DM Sans', sans-serif",
      color: '#E2E8F0',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .sidebar-item {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .sidebar-item:hover {
          background: rgba(255,255,255,0.08);
          transform: translateX(4px);
        }
        
        .stat-card, .knowledge-card {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .stat-card:hover, .knowledge-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        
        .activity-item, .message-item {
          transition: all 0.2s ease;
        }
        .activity-item:hover {
          background: rgba(255,255,255,0.04);
        }
        
        .pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .grid-bg {
          background-image: 
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        
        .btn-primary {
          background: rgba(59,130,246,0.15);
          border: 1px solid rgba(59,130,246,0.3);
          color: #3B82F6;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .btn-primary:hover {
          background: rgba(59,130,246,0.25);
        }
        
        .input-field {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 12px 16px;
          color: #E2E8F0;
          font-size: 14px;
          width: 100%;
          outline: none;
          transition: all 0.2s ease;
        }
        .input-field:focus {
          border-color: rgba(59,130,246,0.5);
          background: rgba(255,255,255,0.08);
        }
        
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        
        .modal-content {
          background: #1E293B;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 24px;
          width: 100%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }

        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .thinking-dots {
          display: inline-flex;
          gap: 4px;
        }
        .thinking-dots span {
          width: 6px;
          height: 6px;
          background: #3B82F6;
          border-radius: 50%;
          animation: thinking 1.4s infinite ease-in-out both;
        }
        .thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
        .thinking-dots span:nth-child(2) { animation-delay: -0.16s; }
        .thinking-dots span:nth-child(3) { animation-delay: 0s; }
        @keyframes thinking {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Ambient Glow Effects */}
      <div style={{
        position: 'absolute',
        top: '-200px',
        right: '-200px',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-300px',
        left: '20%',
        width: '800px',
        height: '800px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '260px' : '72px',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        position: 'relative',
        zIndex: 10,
        flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #3B82F6, #10B981)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Space Mono', monospace",
            fontWeight: '700',
            fontSize: '18px',
            flexShrink: 0
          }}>
            E
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', letterSpacing: '-0.5px' }}>Empire AI</div>
              <div style={{ fontSize: '11px', color: '#64748B', fontFamily: "'Space Mono', monospace" }}>OPERATIONAL INTELLIGENCE</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }} className="scrollbar-thin">
          {/* Dashboard */}
          <div 
            className="sidebar-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '4px',
              background: currentPage === 'dashboard' ? 'rgba(59,130,246,0.15)' : 'transparent',
              borderLeft: currentPage === 'dashboard' ? '3px solid #3B82F6' : '3px solid transparent'
            }}
            onClick={() => { setCurrentPage('dashboard'); setActiveDept(null); }}
          >
            <Home size={20} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span style={{ fontWeight: '500' }}>Dashboard</span>}
          </div>

          {/* Systems */}
          <div 
            className="sidebar-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '4px',
              background: currentPage === 'systems' ? 'rgba(59,130,246,0.15)' : 'transparent',
              borderLeft: currentPage === 'systems' ? '3px solid #3B82F6' : '3px solid transparent'
            }}
            onClick={() => { setCurrentPage('systems'); setActiveDept(null); }}
          >
            <LayoutGrid size={20} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span style={{ fontWeight: '500' }}>Systems</span>}
          </div>

          {/* Knowledge */}
          <div 
            className="sidebar-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '4px',
              background: currentPage === 'knowledge' ? 'rgba(59,130,246,0.15)' : 'transparent',
              borderLeft: currentPage === 'knowledge' ? '3px solid #3B82F6' : '3px solid transparent'
            }}
            onClick={() => { setCurrentPage('knowledge'); setActiveDept(null); }}
          >
            <BookOpen size={20} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span style={{ fontWeight: '500' }}>Knowledge</span>}
          </div>

          {/* Issues Board */}
          <div 
            className="sidebar-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '8px',
              background: currentPage === 'issues' ? 'rgba(59,130,246,0.15)' : 'transparent',
              borderLeft: currentPage === 'issues' ? '3px solid #3B82F6' : '3px solid transparent'
            }}
            onClick={() => { setCurrentPage('issues'); setActiveDept(null); }}
          >
            <ClipboardList size={20} style={{ flexShrink: 0 }} />
            {sidebarOpen && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span style={{ fontWeight: '500' }}>Issues</span>
                {openIssuesCount > 0 && (
                  <span style={{
                    fontSize: '11px',
                    background: 'rgba(239,68,68,0.2)',
                    color: '#EF4444',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontWeight: '600'
                  }}>{openIssuesCount}</span>
                )}
              </div>
            )}
          </div>

          {/* Help / FAQ */}
          <div 
            className="sidebar-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '8px',
              background: currentPage === 'faq' ? 'rgba(59,130,246,0.15)' : 'transparent',
              borderLeft: currentPage === 'faq' ? '3px solid #3B82F6' : '3px solid transparent'
            }}
            onClick={() => { setCurrentPage('faq'); setActiveDept(null); }}
          >
            <HelpCircle size={20} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span style={{ fontWeight: '500' }}>Help / FAQ</span>}
          </div>

          {sidebarOpen && (
            <div style={{ 
              fontSize: '10px', 
              fontWeight: '600', 
              color: '#64748B', 
              padding: '16px 12px 8px',
              letterSpacing: '1px',
              fontFamily: "'Space Mono', monospace"
            }}>
              DEPARTMENTS
            </div>
          )}

          {departments.map((dept) => {
            const IconComponent = getIconComponent(dept.icon);
            return (
              <div
                key={dept.id}
                className="sidebar-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '4px',
                  background: activeDept === dept.id ? 'rgba(255,255,255,0.12)' : 'transparent',
                  borderLeft: activeDept === dept.id ? `3px solid ${dept.color}` : '3px solid transparent'
                }}
                onClick={() => { setActiveDept(dept.id); setCurrentPage('chat'); }}
              >
                <IconComponent size={20} style={{ color: dept.color, flexShrink: 0 }} />
                {sidebarOpen && <span style={{ fontWeight: '500', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.name}</span>}
              </div>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'absolute',
            right: '-14px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '28px',
            height: '28px',
            background: '#1E293B',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#94A3B8',
            zIndex: 20
          }}
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* System Status */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.2)'
        }}>
          {sidebarOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="pulse" style={{
                width: '8px',
                height: '8px',
                background: '#10B981',
                borderRadius: '50%'
              }} />
              <span style={{ fontSize: '12px', color: '#64748B' }}>AI Connected</span>
            </div>
          ) : (
            <div className="pulse" style={{
              width: '8px',
              height: '8px',
              background: '#10B981',
              borderRadius: '50%',
              margin: '0 auto'
            }} />
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }} className="grid-bg">
        {/* Top Bar */}
        <header style={{
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(10px)',
          flexShrink: 0
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: searchFocused ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
            padding: '10px 16px',
            borderRadius: '12px',
            width: '400px',
            transition: 'all 0.2s ease',
            border: searchFocused ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent'
          }}>
            <Search size={18} style={{ color: '#64748B' }} />
            <input
              type="text"
              placeholder="Search departments, knowledge, issues..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#E2E8F0',
                flex: 1,
                fontSize: '14px'
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <span style={{
              fontSize: '11px',
              color: '#64748B',
              background: 'rgba(255,255,255,0.1)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: "'Space Mono', monospace"
            }}>⌘K</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button style={{
              width: '40px',
              height: '40px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94A3B8',
              position: 'relative'
            }}>
              <Bell size={18} />
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '8px',
                height: '8px',
                background: '#EF4444',
                borderRadius: '50%'
              }} />
            </button>
            <button style={{
              width: '40px',
              height: '40px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94A3B8'
            }}>
              <Settings size={18} />
            </button>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              fontSize: '14px',
              marginLeft: '8px',
              cursor: 'pointer'
            }}>
              ER
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: currentPage === 'chat' ? '0' : '32px' }} className="scrollbar-thin">
          
          {/* Dashboard Page */}
          {currentPage === 'dashboard' && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                  Good afternoon, Empire Team
                </h1>
                <p style={{ color: '#64748B', fontSize: '15px' }}>
                  Here's what's happening across your operations today.
                </p>
              </div>

              {/* Dashboard Chat Box */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '20px 24px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <MessageSquare size={22} style={{ color: '#fff' }} />
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Ask Empire AI anything..."
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && currentMessage.trim()) {
                          setActiveDept(null);
                          setCurrentPage('chat');
                          setTimeout(() => sendMessage(), 100);
                        }
                      }}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '16px 60px 16px 20px',
                        color: '#E2E8F0',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(59,130,246,0.5)';
                        e.target.style.background = 'rgba(255,255,255,0.08)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.target.style.background = 'rgba(255,255,255,0.05)';
                      }}
                    />
                    <button
                      onClick={() => {
                        if (currentMessage.trim()) {
                          setActiveDept(null);
                          setCurrentPage('chat');
                          setTimeout(() => sendMessage(), 100);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '40px',
                        height: '40px',
                        background: currentMessage.trim() ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: currentMessage.trim() ? 'pointer' : 'default',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Send size={18} style={{ color: currentMessage.trim() ? '#fff' : '#64748B' }} />
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Try:</span>
                  {['What projects are behind schedule?', 'Show me open issues', 'Summarize today\'s activity'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setCurrentMessage(suggestion);
                      }}
                      style={{
                        fontSize: '12px',
                        color: '#94A3B8',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(59,130,246,0.15)';
                        e.target.style.borderColor = 'rgba(59,130,246,0.3)';
                        e.target.style.color = '#93C5FD';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.05)';
                        e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                        e.target.style.color = '#94A3B8';
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Grid - Activity (2/3) and Quick Actions (1/3) */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Recent Activity */}
                <div style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Recent Activity</h2>
                    <span style={{ fontSize: '12px', color: '#3B82F6', cursor: 'pointer' }}>View all →</span>
                  </div>
                  <div>
                    {activities.length === 0 ? (
                      <div style={{ padding: '40px 24px', textAlign: 'center', color: '#64748B' }}>
                        No activity yet. Start chatting or add knowledge!
                      </div>
                    ) : (
                      activities.slice(0, 6).map((item) => (
                        <div key={item.id} className="activity-item" style={{
                          padding: '16px 24px',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '16px'
                        }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: item.type === 'insight' ? 'rgba(16,185,129,0.15)' :
                                        item.type === 'chat' ? 'rgba(59,130,246,0.15)' :
                                        item.type === 'issue' ? 'rgba(239,68,68,0.15)' :
                                        'rgba(139,92,246,0.15)',
                            flexShrink: 0
                          }}>
                            {item.type === 'insight' && <Zap size={18} style={{ color: '#10B981' }} />}
                            {item.type === 'chat' && <MessageSquare size={18} style={{ color: '#3B82F6' }} />}
                            {item.type === 'issue' && <AlertTriangle size={18} style={{ color: '#EF4444' }} />}
                            {item.type === 'sync' && <Database size={18} style={{ color: '#8B5CF6' }} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '14px', marginBottom: '4px', lineHeight: '1.4' }}>{item.text}</p>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', color: '#64748B' }}>{formatTime(item.time)}</span>
                              <span style={{
                                fontSize: '11px',
                                color: '#94A3B8',
                                background: 'rgba(255,255,255,0.05)',
                                padding: '2px 8px',
                                borderRadius: '4px'
                              }}>{item.dept}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: '24px'
                }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Quick Actions</h2>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                    <button 
                      onClick={() => setShowInsightModal(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        background: 'rgba(16,185,129,0.15)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: '10px',
                        color: '#E2E8F0',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        background: 'rgba(16,185,129,0.2)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Zap size={18} style={{ color: '#10B981' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Log Insight</div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '400' }}>Save to memory</div>
                      </div>
                    </button>

                    <button 
                      onClick={() => setShowUploadModal(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        background: 'rgba(139,92,246,0.15)',
                        border: '1px solid rgba(139,92,246,0.3)',
                        borderRadius: '10px',
                        color: '#E2E8F0',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        background: 'rgba(139,92,246,0.2)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Upload size={18} style={{ color: '#8B5CF6' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Upload Doc</div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '400' }}>Add to knowledge</div>
                      </div>
                    </button>

                    <button 
                      onClick={() => setShowVoiceModal(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        background: 'rgba(245,158,11,0.15)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: '10px',
                        color: '#E2E8F0',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        background: 'rgba(245,158,11,0.2)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Mic size={18} style={{ color: '#F59E0B' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Voice Mode</div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '400' }}>Hands-free</div>
                      </div>
                    </button>

                    <button 
                      onClick={() => setShowIssueModal(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        background: 'rgba(239,68,68,0.15)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '10px',
                        color: '#E2E8F0',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        background: 'rgba(239,68,68,0.2)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <AlertTriangle size={18} style={{ color: '#EF4444' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Report Issue</div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '400' }}>Track problems</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Chat Page */}
          {currentPage === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Chat Header */}
              <div style={{
                padding: '20px 32px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(15, 23, 42, 0.3)'
              }}>
                {currentDeptInfo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: `${currentDeptInfo.color}20`,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {(() => {
                        const IconComp = getIconComponent(currentDeptInfo.icon);
                        return <IconComp size={24} style={{ color: currentDeptInfo.color }} />;
                      })()}
                    </div>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: '600' }}>{currentDeptInfo.name}</h2>
                      <p style={{ fontSize: '13px', color: '#64748B' }}>{currentDeptInfo.description}</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'rgba(59,130,246,0.15)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <MessageSquare size={24} style={{ color: '#3B82F6' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: '600' }}>General Chat</h2>
                      <p style={{ fontSize: '13px', color: '#64748B' }}>Ask anything about Empire Remodeling operations</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }} className="scrollbar-thin">
                {getCurrentConversation().length === 0 && !isThinking ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <MessageSquare size={48} style={{ color: '#64748B', marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Start a conversation</h3>
                    <p style={{ color: '#64748B', maxWidth: '400px', margin: '0 auto' }}>
                      {currentDeptInfo 
                        ? `Ask me anything about ${currentDeptInfo.name.toLowerCase()} operations.`
                        : 'Select a department for specialized help, or ask general questions here.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {getCurrentConversation().map((msg) => (
                      <div key={msg.id} style={{
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        marginBottom: '16px'
                      }}>
                        <div style={{
                          maxWidth: '70%',
                          padding: '14px 18px',
                          borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: msg.role === 'user' 
                            ? 'linear-gradient(135deg, #3B82F6, #2563EB)' 
                            : 'rgba(30, 41, 59, 0.8)',
                          border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)'
                        }}>
                          <p style={{ fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                          <span style={{ fontSize: '11px', color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : '#64748B', marginTop: '8px', display: 'block' }}>
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Thinking Indicator */}
                    {isThinking && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'flex-start',
                        marginBottom: '16px'
                      }}>
                        <div style={{
                          maxWidth: '70%',
                          padding: '14px 18px',
                          borderRadius: '16px 16px 16px 4px',
                          background: 'rgba(30, 41, 59, 0.8)',
                          border: '1px solid rgba(255,255,255,0.06)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '14px', color: '#94A3B8' }}>Empire AI is thinking</span>
                            <div className="thinking-dots">
                              <span></span>
                              <span></span>
                              <span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div style={{
                padding: '20px 32px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(15, 23, 42, 0.5)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '14px',
                  padding: '8px 8px 8px 20px'
                }}>
                  <input
                    type="text"
                    placeholder={currentDeptInfo ? `Ask about ${currentDeptInfo.name.toLowerCase()}...` : 'Ask anything...'}
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    disabled={isThinking}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#E2E8F0',
                      flex: 1,
                      fontSize: '14px',
                      opacity: isThinking ? 0.5 : 1
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!currentMessage.trim() || isThinking}
                    style={{
                      width: '44px',
                      height: '44px',
                      background: currentMessage.trim() && !isThinking ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : 'rgba(255,255,255,0.05)',
                      border: 'none',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: currentMessage.trim() && !isThinking ? 'pointer' : 'not-allowed',
                      color: currentMessage.trim() && !isThinking ? '#fff' : '#64748B'
                    }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Systems Page - keeping existing code but truncating for brevity */}
          {currentPage === 'systems' && (
            <>
              <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                  Systems
                </h1>
                <p style={{ color: '#64748B', fontSize: '15px' }}>
                  Monitor system health, connections, and data synchronization.
                </p>
              </div>

              {/* Status Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                <div style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  borderRadius: '14px',
                  padding: '20px',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'rgba(16,185,129,0.15)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <RefreshCw size={20} style={{ color: '#10B981' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>Auto-Sync</div>
                      <div style={{ fontSize: '18px', fontWeight: '600' }}>Active</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Every 30 seconds</div>
                </div>

                <div style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  borderRadius: '14px',
                  padding: '20px',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'rgba(59,130,246,0.15)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <HardDrive size={20} style={{ color: '#3B82F6' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>Storage</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', fontFamily: "'Space Mono', monospace" }}>
                        {(JSON.stringify(localStorage).length / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Local Storage</div>
                </div>

                <div style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  borderRadius: '14px',
                  padding: '20px',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'rgba(16,185,129,0.15)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Zap size={20} style={{ color: '#10B981' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>AI Status</div>
                      <div style={{ fontSize: '18px', fontWeight: '600' }}>Connected</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Anthropic Claude</div>
                </div>

                <div style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  borderRadius: '14px',
                  padding: '20px',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'rgba(139,92,246,0.15)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Database size={20} style={{ color: '#8B5CF6' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>Knowledge</div>
                      <div style={{ fontSize: '18px', fontWeight: '600' }}>{knowledge.length} items</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>In local storage</div>
                </div>
              </div>

              {/* Connected Sheets */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.06)',
                overflow: 'hidden',
                marginBottom: '24px'
              }}>
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link2 size={18} style={{ color: '#10B981' }} />
                    <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Connected Sheets</h2>
                    <span style={{ fontSize: '12px', color: '#64748B', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>UI Preview</span>
                  </div>
                  <button className="btn-primary">+ Add Sheet</button>
                </div>
                <div>
                  {connectedSheets.map((sheet, i) => (
                    <div key={sheet.id} style={{
                      padding: '16px 24px',
                      borderBottom: i < connectedSheets.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FileText size={18} style={{ color: '#64748B' }} />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '500' }}>{sheet.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{sheet.rows} rows</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>{sheet.lastSync}</span>
                        <div className="pulse" style={{
                          width: '8px',
                          height: '8px',
                          background: '#10B981',
                          borderRadius: '50%'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Intelligence Panel */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.06)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.2))',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Brain size={20} style={{ color: '#8B5CF6' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Central Intelligence</h2>
                      <p style={{ fontSize: '12px', color: '#64748B' }}>What Empire AI has learned from your data</p>
                    </div>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '6px 12px',
                    background: 'rgba(16,185,129,0.15)',
                    borderRadius: '20px'
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} className="pulse" />
                    <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '500' }}>Learning Active</span>
                  </div>
                </div>

                <div style={{ padding: '24px' }}>
                  {/* Stats Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: '12px', 
                      padding: '16px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: "'Space Mono', monospace", color: '#3B82F6' }}>
                        {intelligenceStats.totalItems}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Intelligence Items</div>
                    </div>
                    <div style={{ 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: '12px', 
                      padding: '16px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: "'Space Mono', monospace", color: '#10B981' }}>
                        {intelligenceStats.knowledgeItems}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Knowledge Docs</div>
                    </div>
                    <div style={{ 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: '12px', 
                      padding: '16px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: "'Space Mono', monospace", color: '#F59E0B' }}>
                        {intelligenceStats.resolvedIssues}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Resolved Issues</div>
                    </div>
                    <div style={{ 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: '12px', 
                      padding: '16px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: "'Space Mono', monospace", color: '#EC4899' }}>
                        {intelligenceStats.recentInsights}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Added This Week</div>
                    </div>
                  </div>

                  {/* Top Tags */}
                  <div>
                    <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Tag size={14} />
                      Top Knowledge Tags
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {intelligenceStats.topTags.length > 0 ? (
                        intelligenceStats.topTags.map(({ tag, count }) => (
                          <span key={tag} style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: 'rgba(59,130,246,0.15)',
                            border: '1px solid rgba(59,130,246,0.2)',
                            borderRadius: '20px',
                            fontSize: '13px',
                            color: '#93C5FD'
                          }}>
                            {tag}
                            <span style={{ 
                              background: 'rgba(59,130,246,0.3)', 
                              padding: '2px 6px', 
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontFamily: "'Space Mono', monospace"
                            }}>
                              {count}
                            </span>
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#64748B', fontSize: '13px' }}>
                          No tags yet. Add knowledge items or resolve issues to build intelligence.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Knowledge Page - keeping existing structure */}
          {currentPage === 'knowledge' && !viewingDeptDocs && (
            <>
              <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                    Knowledge Base
                  </h1>
                  <p style={{ color: '#64748B', fontSize: '15px' }}>
                    Manage documents, AI instructions, and company departments.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    width: '250px'
                  }}>
                    <Search size={16} style={{ color: '#64748B' }} />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={knowledgeSearch}
                      onChange={(e) => setKnowledgeSearch(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#E2E8F0',
                        flex: 1,
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <button 
                    onClick={() => { setEditingDept(null); setNewDept({ name: '', icon: 'Building', color: '#3B82F6', description: '' }); setShowDeptModal(true); }}
                    className="btn-primary" 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)', color: '#F59E0B' }}
                  >
                    <Plus size={16} /> New Department
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💡</span> Drag departments to reorder
              </div>

              {/* Department Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                {departments.map((dept) => {
                  const IconComponent = getIconComponent(dept.icon);
                  const docsCount = getDocsCountForDept(dept.id);
                  return (
                    <div
                      key={dept.id}
                      draggable
                      onDragStart={(e) => handleDeptDragStart(e, dept.id)}
                      onDragOver={(e) => handleDeptDragOver(e, dept.id)}
                      onDragEnd={handleDeptDragEnd}
                      style={{
                        background: 'rgba(30, 41, 59, 0.8)',
                        borderRadius: '14px',
                        border: draggingDeptId === dept.id ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.06)',
                        padding: '20px',
                        cursor: 'grab',
                        transition: 'all 0.2s ease',
                        opacity: draggingDeptId === dept.id ? 0.7 : 1
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', lineHeight: '1.3' }}>{dept.name}</h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            background: `${dept.color}20`,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <IconComponent size={16} style={{ color: dept.color }} />
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '36px', fontWeight: '700', fontFamily: "'Space Mono', monospace", color: '#E2E8F0' }}>
                          {docsCount}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>Documents Uploaded</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <button
                          onClick={() => {
                            setActiveDept(dept.id);
                            setShowUploadModal(true);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'transparent',
                            border: 'none',
                            color: '#F59E0B',
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          <Upload size={14} /> UPLOAD
                        </button>
                        <button
                          onClick={() => setViewingDeptDocs(dept)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'transparent',
                            border: 'none',
                            color: '#94A3B8',
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          <FileText size={14} /> Docs
                        </button>
                        <div className="dept-card-menu" style={{ position: 'relative' }}>
                          <button
                            onClick={() => setDeptCardMenu(deptCardMenu === dept.id ? null : dept.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#64748B',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                          >
                            <Settings size={16} />
                          </button>
                          {deptCardMenu === dept.id && (
                            <div style={{
                              position: 'absolute',
                              bottom: '100%',
                              right: 0,
                              marginBottom: '8px',
                              background: '#1E293B',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              padding: '8px 0',
                              minWidth: '140px',
                              zIndex: 50,
                              boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
                            }}>
                              <button
                                onClick={() => openEditDeptModal(dept)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  width: '100%',
                                  padding: '10px 16px',
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#E2E8F0',
                                  fontSize: '13px',
                                  cursor: 'pointer',
                                  textAlign: 'left'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <Edit3 size={14} /> Edit
                              </button>
                              <button
                                onClick={() => deleteDepartment(dept.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  width: '100%',
                                  padding: '10px 16px',
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#EF4444',
                                  fontSize: '13px',
                                  cursor: 'pointer',
                                  textAlign: 'left'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Issues Page placeholder */}
          {currentPage === 'issues' && (
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                Issues Board
              </h1>
              <p style={{ color: '#64748B', fontSize: '15px' }}>
                Track, manage, and resolve project issues across departments.
              </p>
              {/* Issues table would go here - keeping truncated for file size */}
            </div>
          )}

          {/* FAQ Page placeholder */}
          {currentPage === 'faq' && (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                  Help & FAQ
                </h1>
                <p style={{ color: '#64748B', fontSize: '15px' }}>
                  Everything you need to know about using Empire AI.
                </p>
              </div>
              {/* FAQ content would go here */}
            </div>
          )}

        </div>
      </main>

      {/* Modals - Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Upload Document</h2>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{
              border: '2px dashed rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              cursor: 'pointer'
            }}>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="file-upload"
              />
              <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                <Upload size={40} style={{ color: '#64748B', marginBottom: '16px' }} />
                <p style={{ color: '#E2E8F0', marginBottom: '8px' }}>Drop files here or click to upload</p>
                <p style={{ color: '#64748B', fontSize: '13px' }}>PDF, DOC, DOCX, Images supported</p>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Insight Modal */}
      {showInsightModal && (
        <div className="modal-overlay" onClick={() => setShowInsightModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Log Insight</h2>
              <button onClick={() => setShowInsightModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '8px', display: 'block' }}>Title</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Brief title for this insight..."
                  value={newInsight.title}
                  onChange={(e) => setNewInsight({ ...newInsight, title: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '8px', display: 'block' }}>Content</label>
                <textarea
                  className="input-field"
                  placeholder="What did you learn? What should the team remember?"
                  rows={4}
                  value={newInsight.content}
                  onChange={(e) => setNewInsight({ ...newInsight, content: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '8px', display: 'block' }}>Department</label>
                <select
                  className="input-field"
                  value={newInsight.department}
                  onChange={(e) => setNewInsight({ ...newInsight, department: e.target.value })}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">General (All Departments)</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={saveInsight}
                disabled={!newInsight.title.trim() || !newInsight.content.trim()}
                style={{
                  padding: '14px',
                  background: newInsight.title.trim() && newInsight.content.trim() 
                    ? 'linear-gradient(135deg, #10B981, #059669)' 
                    : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '10px',
                  color: newInsight.title.trim() && newInsight.content.trim() ? '#fff' : '#64748B',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: newInsight.title.trim() && newInsight.content.trim() ? 'pointer' : 'not-allowed',
                  marginTop: '8px'
                }}
              >
                Save to Corporate Memory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Modal */}
      {showVoiceModal && (
        <div className="modal-overlay" onClick={() => { setShowVoiceModal(false); stopVoiceSession(); }}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px', textAlign: 'center' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Voice Mode</h2>
              <button onClick={() => { setShowVoiceModal(false); stopVoiceSession(); }} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              margin: '0 auto 32px',
              background: voiceStatus === 'idle' 
                ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))'
                : 'linear-gradient(135deg, rgba(16,185,129,0.4), rgba(59,130,246,0.4))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: voiceStatus !== 'idle' ? '0 0 60px rgba(59,130,246,0.3)' : 'none',
              transition: 'all 0.5s ease'
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Mic size={48} style={{ color: '#fff' }} />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: voiceStatus === 'listening' ? '#10B981' : '#64748B' }}>
                {voiceStatus === 'idle' ? 'Ready to listen' : 'Listening...'}
              </div>
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Voice Mode UI ready — Gemini Live API integration coming soon
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button
                onClick={voiceStatus === 'idle' ? startVoiceSession : stopVoiceSession}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: voiceStatus === 'idle' 
                    ? 'linear-gradient(135deg, #10B981, #059669)'
                    : 'linear-gradient(135deg, #EF4444, #DC2626)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                {voiceStatus === 'idle' ? <Mic size={28} style={{ color: '#fff' }} /> : <Square size={24} style={{ color: '#fff', fill: '#fff' }} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="modal-overlay" onClick={() => { setShowIssueModal(false); setEditingIssue(null); setNewIssue({ title: '', description: '', department: '', priority: 'medium', status: 'open', assignee: '' }); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>{editingIssue ? 'Edit Issue' : 'New Issue'}</h2>
              <button onClick={() => { setShowIssueModal(false); setEditingIssue(null); }} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '8px', display: 'block' }}>Title *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Brief description of the issue..."
                  value={newIssue.title}
                  onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '8px', display: 'block' }}>Description</label>
                <textarea
                  className="input-field"
                  placeholder="Details about the issue..."
                  rows={3}
                  value={newIssue.description}
                  onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '8px', display: 'block' }}>Department</label>
                  <select
                    className="input-field"
                    value={newIssue.department}
                    onChange={(e) => setNewIssue({ ...newIssue, department: e.target.value })}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="">General</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '8px', display: 'block' }}>Priority</label>
                  <select
                    className="input-field"
                    value={newIssue.priority}
                    onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => {
                  if (editingIssue) {
                    updateIssue(editingIssue.id, newIssue);
                    setEditingIssue(null);
                  } else {
                    addIssue();
                  }
                  setShowIssueModal(false);
                  setNewIssue({ title: '', description: '', department: '', priority: 'medium', status: 'open', assignee: '' });
                }}
                disabled={!newIssue.title.trim()}
                style={{
                  padding: '14px',
                  background: newIssue.title.trim() ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '10px',
                  color: newIssue.title.trim() ? '#fff' : '#64748B',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: newIssue.title.trim() ? 'pointer' : 'not-allowed',
                  marginTop: '8px'
                }}
              >
                {editingIssue ? 'Update Issue' : 'Create Issue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Modal */}
      {showDeptModal && (
        <div className="modal-overlay" onClick={() => { setShowDeptModal(false); setEditingDept(null); setNewDept({ name: '', icon: 'Building', color: '#3B82F6', description: '' }); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>{editingDept ? 'Edit Department' : 'New Department'}</h2>
              <button onClick={() => { setShowDeptModal(false); setEditingDept(null); }} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '8px', display: 'block' }}>Department Name *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Marketing & Lead Generation"
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '8px', display: 'block' }}>Description</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Brief description of this department"
                  value={newDept.description}
                  onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '8px', display: 'block' }}>Icon</label>
                  <select
                    className="input-field"
                    value={newDept.icon}
                    onChange={(e) => setNewDept({ ...newDept, icon: e.target.value })}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="Building">Building</option>
                    <option value="Briefcase">Briefcase</option>
                    <option value="TrendingUp">Trending Up</option>
                    <option value="DollarSign">Dollar Sign</option>
                    <option value="Wrench">Wrench</option>
                    <option value="Users">Users</option>
                    <option value="ShieldCheck">Shield Check</option>
                    <option value="ClipboardCheck">Clipboard Check</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '8px', display: 'block' }}>Color</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'].map(color => (
                      <button
                        key={color}
                        onClick={() => setNewDept({ ...newDept, color })}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: color,
                          border: newDept.color === color ? '3px solid #fff' : '2px solid transparent',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={editingDept ? saveDepartmentEdit : addDepartment}
                disabled={!newDept.name.trim()}
                style={{
                  padding: '14px',
                  background: newDept.name.trim() ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '10px',
                  color: newDept.name.trim() ? '#fff' : '#64748B',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: newDept.name.trim() ? 'pointer' : 'not-allowed',
                  marginTop: '8px'
                }}
              >
                {editingDept ? 'Save Changes' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
