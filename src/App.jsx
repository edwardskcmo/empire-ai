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

const iconMap = { Building, Briefcase, TrendingUp, DollarSign, Wrench, Shield, Folder, Users, Calculator, GraduationCap, ShieldCheck, ClipboardCheck, Zap, FileText, Database, Brain, Sparkles, Tag, Archive };
const getIconComponent = (iconName) => iconMap[iconName] || Building;

const storage = {
  get: (key, defaultValue) => { try { const item = localStorage.getItem(`empire_${key}`); return item ? JSON.parse(item) : defaultValue; } catch { return defaultValue; } },
  set: (key, value) => { try { localStorage.setItem(`empire_${key}`, JSON.stringify(value)); } catch (e) { console.error('Storage error:', e); } }
};

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const extractTags = (text) => {
  if (!text) return [];
  const lowerText = text.toLowerCase();
  const patterns = {
    kitchen: /kitchen|cabinet|countertop|appliance/gi, bathroom: /bathroom|bath|shower|toilet|vanity|tile/gi,
    addition: /addition|expand|extension|new room/gi, deck: /deck|patio|outdoor|pergola/gi,
    roofing: /roof|shingle|gutter|flashing/gi, electrical: /electrical|wire|outlet|panel|circuit/gi,
    plumbing: /plumb|pipe|drain|water heater|faucet/gi, hvac: /hvac|heating|cooling|ac |furnace|duct/gi,
    permit: /permit|inspection|code|compliance/gi, schedule: /schedule|timeline|deadline|delay/gi,
    budget: /budget|cost|price|estimate|quote/gi, material: /material|supply|order|delivery/gi,
    subcontractor: /sub|subcontractor|trade partner/gi, client: /client|customer|homeowner|owner/gi,
    payment: /payment|invoice|deposit|balance/gi, safety: /safety|osha|hazard|incident|injury/gi,
    urgent: /urgent|asap|emergency|critical|immediately/gi, delayed: /delay|behind|late|overdue|waiting/gi,
    completed: /complete|finished|done|resolved|closed/gi, hiring: /hiring|recruit|interview|candidate/gi,
    training: /training|onboard|orientation|skill/gi, team: /team|employee|staff|crew|worker/gi,
  };
  const tags = [];
  for (const [tag, pattern] of Object.entries(patterns)) { if (pattern.test(lowerText)) tags.push(tag); }
  return [...new Set(tags)];
};

const calculateRelevance = (query, item) => {
  if (!query || !item) return 0;
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  let score = 0;
  const searchText = `${item.title || ''} ${item.content || ''} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
  if (searchText.includes(queryLower)) score += 10;
  queryWords.forEach(word => { if (searchText.includes(word)) score += 2; });
  if (item.tags) queryWords.forEach(word => { if (item.tags.includes(word)) score += 5; });
  if (item.createdAt) { const daysSince = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24); if (daysSince < 7) score += 3; if (daysSince < 1) score += 5; }
  return score;
};

const formatTime = (date) => {
  const now = new Date(); const diff = now - new Date(date);
  const mins = Math.floor(diff / 60000); const hours = Math.floor(diff / 3600000); const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now'; if (mins < 60) return `${mins}m ago`; if (hours < 24) return `${hours}h ago`; return `${days}d ago`;
};

export default function EmpireAI() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [activeDept, setActiveDept] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [departments, setDepartments] = useState(() => storage.get('departments', defaultDepartments));
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [newDept, setNewDept] = useState({ name: '', icon: 'Building', color: '#3B82F6', description: '' });
  const [draggingDeptId, setDraggingDeptId] = useState(null);
  const [deptCardMenu, setDeptCardMenu] = useState(null);
  const [viewingDeptDocs, setViewingDeptDocs] = useState(null);
  const [conversations, setConversations] = useState(() => storage.get('conversations', {}));
  const [currentMessage, setCurrentMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef(null);
  const [knowledge, setKnowledge] = useState(() => storage.get('knowledge', []));
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [newInsight, setNewInsight] = useState({ title: '', content: '', department: '' });
  const [knowledgeFilter, setKnowledgeFilter] = useState('all');
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [activities, setActivities] = useState(() => storage.get('activities', []));
  const [issues, setIssues] = useState(() => storage.get('issues', []));
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [issueFilters, setIssueFilters] = useState({ status: 'all', priority: 'all', department: 'all' });
  const [showArchivedIssues, setShowArchivedIssues] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [newIssue, setNewIssue] = useState({ title: '', description: '', department: '', priority: 'medium', status: 'open', assignee: '' });
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
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolvingIssue, setResolvingIssue] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResponse, setVoiceResponse] = useState('');
  const [connectedSheets] = useState([
    { id: 1, name: 'Project Budget Tracker', lastSync: '30 sec ago', status: 'active', rows: 142 },
    { id: 2, name: 'Lead Pipeline', lastSync: '30 sec ago', status: 'active', rows: 87 },
    { id: 3, name: 'Material Costs 2024', lastSync: '30 sec ago', status: 'active', rows: 256 },
  ]);
  const [teamMembers, setTeamMembers] = useState(() => storage.get('teamMembers', [
    { id: 'owner_1', name: 'Empire Admin', email: 'admin@empireremodeling.com', role: 'owner', status: 'active', avatar: 'EA', joinedAt: '2024-01-01' },
  ]));
  const [pendingInvites, setPendingInvites] = useState(() => storage.get('pendingInvites', []));
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'member', departments: [] });
  const [editingMember, setEditingMember] = useState(null);
  const [intelligenceIndex, setIntelligenceIndex] = useState(() => storage.get('intelligence', []));
  const [expandedFaqSection, setExpandedFaqSection] = useState('getting-started');
  const [expandedFaqItem, setExpandedFaqItem] = useState(null);

  useEffect(() => { storage.set('teamMembers', teamMembers); }, [teamMembers]);
  useEffect(() => { storage.set('pendingInvites', pendingInvites); }, [pendingInvites]);
  useEffect(() => { storage.set('intelligence', intelligenceIndex); }, [intelligenceIndex]);
  useEffect(() => { storage.set('conversations', conversations); }, [conversations]);
  useEffect(() => { storage.set('knowledge', knowledge); }, [knowledge]);
  useEffect(() => { storage.set('activities', activities); }, [activities]);
  useEffect(() => { storage.set('departments', departments); }, [departments]);
  useEffect(() => { storage.set('issues', issues); }, [issues]);
  useEffect(() => { storage.set('issueColumns', issueColumns); }, [issueColumns]);

  const roles = [
    { id: 'owner', name: 'Owner', description: 'Full access to everything', color: '#F59E0B' },
    { id: 'admin', name: 'Admin', description: 'Manage team and settings', color: '#8B5CF6' },
    { id: 'manager', name: 'Manager', description: 'Manage departments and issues', color: '#3B82F6' },
    { id: 'member', name: 'Member', description: 'View and contribute', color: '#10B981' },
    { id: 'viewer', name: 'Viewer', description: 'View only access', color: '#64748B' },
  ];

  // INTELLIGENCE SYSTEM
  const addToIntelligence = useCallback((item) => {
    const tags = extractTags(`${item.title || ''} ${item.content || ''} ${item.description || ''}`);
    const intelligenceItem = {
      id: generateId(), sourceType: item.sourceType, sourceId: item.sourceId, title: item.title,
      content: item.content || item.description, department: item.department,
      tags: [...new Set([...(item.tags || []), ...tags])], metadata: item.metadata || {},
      createdAt: new Date().toISOString(), relevanceBoost: item.relevanceBoost || 0
    };
    setIntelligenceIndex(prev => [intelligenceItem, ...prev].slice(0, 500));
    return intelligenceItem;
  }, []);

  const queryIntelligence = useCallback((query, options = {}) => {
    const { department, limit = 5, sourceTypes = null, minScore = 1 } = options;
    let allItems = [...intelligenceIndex,
      ...knowledge.map(k => ({ ...k, sourceType: 'knowledge', sourceId: k.id, tags: k.tags || extractTags(`${k.title} ${k.content}`) })),
      ...issues.filter(i => i.status === 'resolved').map(i => ({ ...i, sourceType: 'resolved_issue', sourceId: i.id, content: i.description, tags: i.tags || extractTags(`${i.title} ${i.description}`) }))
    ];
    if (department && department !== 'general') allItems = allItems.filter(item => !item.department || item.department === department || item.department === 'company-wide');
    if (sourceTypes) allItems = allItems.filter(item => sourceTypes.includes(item.sourceType));
    const scored = allItems.map(item => ({ ...item, score: calculateRelevance(query, item) + (item.relevanceBoost || 0) }));
    return scored.filter(item => item.score >= minScore).sort((a, b) => b.score - a.score).slice(0, limit).map(({ score, ...item }) => ({ ...item, relevanceScore: score }));
  }, [intelligenceIndex, knowledge, issues]);

  const intelligenceStats = {
    totalItems: intelligenceIndex.length, knowledgeItems: knowledge.length,
    resolvedIssues: issues.filter(i => i.status === 'resolved').length,
    recentInsights: intelligenceIndex.filter(i => { const daysSince = (Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24); return daysSince < 7; }).length,
    topTags: (() => { const tagCounts = {}; [...intelligenceIndex, ...knowledge].forEach(item => { (item.tags || []).forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; }); }); return Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => ({ tag, count })); })()
  };

  const addActivity = (type, text, dept) => { const activity = { id: generateId(), type, text, dept, time: new Date().toISOString() }; setActivities(prev => [activity, ...prev].slice(0, 50)); };

  // TEAM MANAGEMENT WITH INTELLIGENCE
  const sendInvite = () => {
    if (!newInvite.email.trim() || !newInvite.email.includes('@')) return;
    const invite = { id: generateId(), email: newInvite.email.trim().toLowerCase(), role: newInvite.role, departments: newInvite.departments, status: 'pending', sentAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
    setPendingInvites(prev => [...prev, invite]);
    addActivity('insight', `Invitation sent to ${invite.email}`, 'System');
    addToIntelligence({ sourceType: 'team_change', sourceId: invite.id, title: `Team Invite: ${invite.email}`, content: `Invited ${invite.email} as ${invite.role}. Departments: ${invite.departments.length > 0 ? invite.departments.join(', ') : 'All access'}`, department: 'hr', tags: ['team', 'hiring', 'invite'], relevanceBoost: 1 });
    setNewInvite({ email: '', role: 'member', departments: [] }); setShowInviteModal(false);
  };

  const cancelInvite = (inviteId) => {
    const invite = pendingInvites.find(i => i.id === inviteId);
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    if (invite) addToIntelligence({ sourceType: 'team_change', sourceId: inviteId, title: `Invite Cancelled: ${invite.email}`, content: `Cancelled pending invitation for ${invite.email}`, department: 'hr', tags: ['team', 'invite', 'cancelled'], relevanceBoost: 0 });
  };

  const resendInvite = (invite) => {
    setPendingInvites(prev => prev.map(i => i.id === invite.id ? { ...i, sentAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() } : i));
    addActivity('insight', `Invitation resent to ${invite.email}`, 'System');
  };

  const updateMemberRole = (memberId, newRole) => {
    const member = teamMembers.find(m => m.id === memberId); const oldRole = member?.role;
    setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    if (member && oldRole !== newRole) { addActivity('insight', `${member.name}'s role changed to ${newRole}`, 'System'); addToIntelligence({ sourceType: 'team_change', sourceId: memberId, title: `Role Change: ${member.name}`, content: `${member.name}'s role changed from ${oldRole} to ${newRole}`, department: 'hr', tags: ['team', 'role', 'permission'], relevanceBoost: 2 }); }
  };

  const removeMember = (memberId) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (member && member.role !== 'owner') { setTeamMembers(prev => prev.filter(m => m.id !== memberId)); addActivity('insight', `${member.name} removed from team`, 'System'); addToIntelligence({ sourceType: 'team_change', sourceId: memberId, title: `Team Member Removed: ${member.name}`, content: `${member.name} (${member.email}) was removed from the team. Previous role: ${member.role}`, department: 'hr', tags: ['team', 'removed', 'offboarding'], relevanceBoost: 2 }); }
  };

  const updateMemberDepartments = (memberId, deptIds) => {
    const member = teamMembers.find(m => m.id === memberId);
    setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, departments: deptIds } : m));
    if (member) addToIntelligence({ sourceType: 'team_change', sourceId: memberId, title: `Department Access Updated: ${member.name}`, content: `${member.name}'s department access updated to: ${deptIds.length > 0 ? deptIds.join(', ') : 'All departments'}`, department: 'hr', tags: ['team', 'permission', 'department'], relevanceBoost: 1 });
  };

  // DEPARTMENT MANAGEMENT WITH INTELLIGENCE
  const addDepartment = () => {
    if (!newDept.name.trim()) return;
    const dept = { id: generateId(), name: newDept.name.trim(), icon: newDept.icon, color: newDept.color, description: newDept.description.trim() };
    setDepartments(prev => [...prev, dept]); addActivity('insight', `New department created: ${dept.name}`, 'System');
    addToIntelligence({ sourceType: 'department_change', sourceId: dept.id, title: `New Department: ${dept.name}`, content: `Created new department "${dept.name}". Description: ${dept.description || 'None provided'}`, department: 'admin', tags: ['department', 'organization', 'new'], relevanceBoost: 3 });
    setNewDept({ name: '', icon: 'Building', color: '#3B82F6', description: '' }); setShowDeptModal(false);
  };

  const updateDepartment = (id, updates) => { setDepartments(prev => prev.map(dept => dept.id === id ? { ...dept, ...updates } : dept)); };

  const deleteDepartment = (id) => {
    const dept = departments.find(d => d.id === id);
    if (dept) { setDepartments(prev => prev.filter(d => d.id !== id)); addActivity('insight', `Department deleted: ${dept.name}`, 'System'); setKnowledge(prev => prev.filter(k => k.department !== id)); addToIntelligence({ sourceType: 'department_change', sourceId: id, title: `Department Deleted: ${dept.name}`, content: `Deleted department "${dept.name}". All associated documents were also removed.`, department: 'admin', tags: ['department', 'organization', 'deleted'], relevanceBoost: 3 }); }
    setDeptCardMenu(null);
  };

  const handleDeptDragStart = (e, deptId) => { setDraggingDeptId(deptId); e.dataTransfer.effectAllowed = 'move'; };
  const handleDeptDragOver = (e, targetDeptId) => { e.preventDefault(); if (!draggingDeptId || draggingDeptId === targetDeptId) return; setDepartments(prev => { const dragIndex = prev.findIndex(d => d.id === draggingDeptId); const targetIndex = prev.findIndex(d => d.id === targetDeptId); if (dragIndex === -1 || targetIndex === -1) return prev; const newDepts = [...prev]; const [draggedDept] = newDepts.splice(dragIndex, 1); newDepts.splice(targetIndex, 0, draggedDept); return newDepts; }); };
  const handleDeptDragEnd = () => { setDraggingDeptId(null); };

  const saveDepartmentEdit = () => {
    if (editingDept && newDept.name.trim()) {
      const oldName = editingDept.name;
      updateDepartment(editingDept.id, { name: newDept.name.trim(), icon: newDept.icon, color: newDept.color, description: newDept.description.trim() });
      addActivity('insight', `Department updated: ${newDept.name}`, 'System');
      addToIntelligence({ sourceType: 'department_change', sourceId: editingDept.id, title: `Department Updated: ${newDept.name}`, content: `Updated department from "${oldName}" to "${newDept.name}". New description: ${newDept.description || 'None'}`, department: 'admin', tags: ['department', 'organization', 'updated'], relevanceBoost: 1 });
    }
    setEditingDept(null); setNewDept({ name: '', icon: 'Building', color: '#3B82F6', description: '' }); setShowDeptModal(false);
  };

  const openEditDeptModal = (dept) => { setEditingDept(dept); setNewDept({ name: dept.name, icon: dept.icon, color: dept.color, description: dept.description || '' }); setShowDeptModal(true); setDeptCardMenu(null); };
  const getDocsCountForDept = (deptId) => knowledge.filter(k => k.department === deptId).length;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversations, activeDept, isThinking]);
  useEffect(() => { const handleClickOutside = (e) => { if (deptCardMenu && !e.target.closest('.dept-card-menu')) setDeptCardMenu(null); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [deptCardMenu]);

  const getCurrentConversation = () => { const key = activeDept || 'general'; return conversations[key] || []; };

  // AI INTEGRATION WITH ENHANCED INTELLIGENCE
  const buildIntelligenceContext = (query, dept) => {
    const relevantContext = queryIntelligence(query, { department: dept, limit: 5, minScore: 2 });
    if (relevantContext.length === 0) return '';
    let context = '\n\nRelevant company knowledge:\n';
    relevantContext.forEach((item, i) => {
      const source = item.sourceType === 'knowledge' ? 'Knowledge Base' : item.sourceType === 'resolved_issue' ? 'Resolved Issue' : item.sourceType === 'team_change' ? 'Team Update' : item.sourceType === 'department_change' ? 'Org Change' : item.sourceType === 'issue_created' ? 'Active Issue' : item.sourceType === 'issue_status_change' ? 'Issue Update' : item.sourceType === 'document_upload' ? 'Document' : item.sourceType === 'voice_interaction' ? 'Voice Query' : item.sourceType === 'chat_query' ? 'Previous Chat' : 'Intelligence';
      context += `${i + 1}. [${source}] ${item.title}: ${(item.content || '').substring(0, 200)}...\n`;
    });
    return context;
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isThinking) return;
    const key = activeDept || 'general';
    const userMessage = { id: generateId(), role: 'user', content: currentMessage, timestamp: new Date().toISOString() };
    setConversations(prev => ({ ...prev, [key]: [...(prev[key] || []), userMessage] }));
    const messageText = currentMessage; setCurrentMessage(''); setIsThinking(true);
    try {
      const deptInfo = activeDept ? departments.find(d => d.id === activeDept) : null;
      const deptName = deptInfo?.name || 'General'; const deptDescription = deptInfo?.description || 'General company operations';
      const intelligenceContext = buildIntelligenceContext(messageText, activeDept);
      const systemPrompt = `You are Empire AI, the operational intelligence assistant for Empire Remodeling, a residential remodeling contractor.\n\nCurrent Department: ${deptName}\nDepartment Focus: ${deptDescription}\n\nYour role:\n- Help with ${deptName.toLowerCase()} questions and tasks\n- Provide actionable, practical advice for a remodeling business\n- Reference relevant company knowledge when available\n- Be concise but thorough\n- Use a professional but friendly tone\n${intelligenceContext}\n\nRemember: You're helping a busy contractor run their business better. Be direct and helpful.`;
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: messageText, systemPrompt, conversationHistory: getCurrentConversation().slice(-10).map(m => ({ role: m.role, content: m.content })) }) });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const aiResponse = { id: generateId(), role: 'assistant', content: data.response || 'I apologize, but I encountered an issue processing your request. Please try again.', timestamp: new Date().toISOString() };
      setConversations(prev => ({ ...prev, [key]: [...(prev[key] || []), aiResponse] }));
      addActivity('chat', `Chat in ${deptName}`, deptName);
      if (messageText.length > 10) addToIntelligence({ sourceType: 'chat_query', sourceId: generateId(), title: `Query: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`, content: `Q: ${messageText}\n\nA: ${(data.response || '').substring(0, 500)}${(data.response || '').length > 500 ? '...' : ''}`, department: activeDept || 'general', tags: extractTags(messageText), relevanceBoost: 1, metadata: { hasIntelligenceContext: intelligenceContext.length > 0, department: deptName } });
    } catch (error) {
      console.error('Chat error:', error);
      const fallbackResponse = { id: generateId(), role: 'assistant', content: `I'm having trouble connecting to my AI services right now. Here's what I can tell you based on local knowledge:\n\n${getSimulatedResponse(messageText, activeDept)}`, timestamp: new Date().toISOString() };
      setConversations(prev => ({ ...prev, [key]: [...(prev[key] || []), fallbackResponse] }));
    } finally { setIsThinking(false); }
  };

  const getSimulatedResponse = (message, dept) => {
    const relevantContext = queryIntelligence(message, { department: dept, limit: 3, minScore: 2 });
    const baseResponses = { marketing: "I can help with your marketing strategy.", sales: "Looking at the sales pipeline.", production: "I've checked the production systems.", safety: "Reviewing safety data.", admin: "I can help with admin tasks.", hr: "Looking at team info.", financial: "Reviewing financial records.", 'company-wide': "Searching company-wide resources." };
    let response = baseResponses[dept] || "I'm here to help with Empire Remodeling operations.";
    if (relevantContext.length > 0) { const contextSummary = relevantContext.map(item => { const source = item.sourceType === 'knowledge' ? '📚' : item.sourceType === 'resolved_issue' ? '✅' : '💡'; return `${source} ${item.title}`; }).join('\n'); response += `\n\n**Relevant from company knowledge:**\n${contextSummary}`; }
    return response;
  };

  // KNOWLEDGE MANAGEMENT WITH INTELLIGENCE
  const addKnowledgeItem = (item) => {
    const tags = extractTags(`${item.title} ${item.content}`);
    const newItem = { id: generateId(), ...item, tags: [...new Set([...(item.tags || []), ...tags])], createdAt: new Date().toISOString() };
    setKnowledge(prev => [newItem, ...prev]); addActivity('insight', `New ${item.type}: ${item.title}`, item.department || 'General');
    addToIntelligence({ sourceType: 'knowledge', sourceId: newItem.id, title: newItem.title, content: newItem.content, department: newItem.department, tags: newItem.tags, relevanceBoost: item.type === 'insight' ? 2 : 0 });
    return newItem;
  };

  const deleteKnowledgeItem = (id) => { setKnowledge(prev => prev.filter(item => item.id !== id)); };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const targetDept = activeDept || viewingDeptDocs || 'general';
    const deptName = departments.find(d => d.id === targetDept)?.name || 'General';
    files.forEach(file => {
      addKnowledgeItem({ type: 'document', title: file.name, content: `Uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, fileType: file.type, department: targetDept });
      addToIntelligence({ sourceType: 'document_upload', sourceId: generateId(), title: `Document Uploaded: ${file.name}`, content: `New document "${file.name}" uploaded to ${deptName}. File type: ${file.type || 'unknown'}, Size: ${(file.size / 1024).toFixed(1)} KB`, department: targetDept, tags: ['document', 'upload', file.type?.split('/')[0] || 'file'], relevanceBoost: 1, metadata: { fileName: file.name, fileType: file.type, fileSize: file.size } });
    });
    setShowUploadModal(false);
  };

  const saveInsight = () => {
    if (!newInsight.title.trim() || !newInsight.content.trim()) return;
    addKnowledgeItem({ type: 'insight', title: newInsight.title, content: newInsight.content, department: newInsight.department || viewingDeptDocs || activeDept || 'general' });
    setNewInsight({ title: '', content: '', department: '' }); setShowInsightModal(false);
  };

  // ISSUE MANAGEMENT WITH INTELLIGENCE
  const addIssue = () => {
    if (!newIssue.title.trim()) return;
    const issue = { id: generateId(), ...newIssue, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setIssues(prev => [issue, ...prev]); addActivity('issue', `New issue: ${newIssue.title}`, newIssue.department || 'General');
    addToIntelligence({ sourceType: 'issue_created', sourceId: issue.id, title: `Issue: ${issue.title}`, content: `New ${issue.priority} priority issue created: ${issue.title}. ${issue.description || 'No description provided.'}`, department: issue.department || 'general', tags: ['issue', 'open', issue.priority], relevanceBoost: issue.priority === 'high' ? 3 : issue.priority === 'medium' ? 2 : 1, metadata: { priority: issue.priority, status: issue.status, assignee: issue.assignee } });
    setNewIssue({ title: '', description: '', department: '', priority: 'medium', status: 'open', assignee: '' }); setShowIssueModal(false);
  };

  const updateIssue = (id, updates) => {
    const oldIssue = issues.find(i => i.id === id);
    setIssues(prev => prev.map(issue => issue.id === id ? { ...issue, ...updates, updatedAt: new Date().toISOString() } : issue));
    if (oldIssue) {
      if (updates.status && updates.status !== oldIssue.status) addToIntelligence({ sourceType: 'issue_status_change', sourceId: id, title: `Status Change: ${oldIssue.title}`, content: `Issue "${oldIssue.title}" status changed from ${oldIssue.status} to ${updates.status}`, department: oldIssue.department || 'general', tags: ['issue', 'status-change', updates.status], relevanceBoost: updates.status === 'resolved' ? 3 : 1 });
      if (updates.priority && updates.priority !== oldIssue.priority) addToIntelligence({ sourceType: 'issue_priority_change', sourceId: id, title: `Priority Change: ${oldIssue.title}`, content: `Issue "${oldIssue.title}" priority changed from ${oldIssue.priority} to ${updates.priority}`, department: oldIssue.department || 'general', tags: ['issue', 'priority-change', updates.priority], relevanceBoost: updates.priority === 'high' ? 2 : 1 });
    }
  };

  const deleteIssue = (id) => { setIssues(prev => prev.filter(issue => issue.id !== id)); };

  const archiveIssue = (issue) => {
    updateIssue(issue.id, { archived: true, archivedAt: new Date().toISOString() });
    addActivity('issue', `Issue archived: ${issue.title}`, issue.department || 'General');
    addToIntelligence({ sourceType: 'archived_issue', sourceId: issue.id, title: `Archived: ${issue.title}`, content: issue.description, department: issue.department, tags: extractTags(`${issue.title} ${issue.description}`).concat(['archived']), relevanceBoost: 1, metadata: { status: issue.status, priority: issue.priority, assignee: issue.assignee } });
  };

  const unarchiveIssue = (issue) => { updateIssue(issue.id, { archived: false, archivedAt: null }); addActivity('issue', `Issue restored from archive: ${issue.title}`, issue.department || 'General'); };

  const resolveIssue = (issue, resNotes = '') => {
    updateIssue(issue.id, { status: 'resolved', resolvedAt: new Date().toISOString(), resolutionNotes: resNotes });
    const tags = extractTags(`${issue.title} ${issue.description} ${resNotes}`);
    const knowledgeContent = `**Problem:** ${issue.description}\n\n**Resolution:** ${resNotes || 'Issue was resolved.'}\n\n**Priority was:** ${issue.priority}\n**Department:** ${issue.department || 'General'}`;
    addKnowledgeItem({ type: 'insight', title: `✅ Resolved: ${issue.title}`, content: knowledgeContent, department: issue.department || 'general', tags: [...tags, 'resolved-issue', issue.priority], metadata: { sourceIssueId: issue.id, originalPriority: issue.priority } });
    addToIntelligence({ sourceType: 'resolved_issue', sourceId: issue.id, title: `Resolved: ${issue.title}`, content: knowledgeContent, department: issue.department, tags: [...tags, 'resolved-issue', 'solution'], relevanceBoost: 5, metadata: { priority: issue.priority, assignee: issue.assignee } });
    addActivity('issue', `Issue resolved: ${issue.title}`, issue.department || 'General');
  };

  const filteredIssues = issues.filter(issue => {
    if (showArchivedIssues) { if (!issue.archived) return false; if (archiveSearch.trim()) { const searchText = `${issue.title} ${issue.description} ${issue.assignee || ''} ${issue.department || ''}`.toLowerCase(); return searchText.includes(archiveSearch.toLowerCase()); } return true; }
    if (issue.archived) return false;
    const matchesStatus = issueFilters.status === 'all' || issue.status === issueFilters.status;
    const matchesPriority = issueFilters.priority === 'all' || issue.priority === issueFilters.priority;
    const matchesDept = issueFilters.department === 'all' || issue.department === issueFilters.department;
    return matchesStatus && matchesPriority && matchesDept;
  });

  const archivedCount = issues.filter(i => i.archived).length;

  // VOICE MODE WITH INTELLIGENCE
  const startVoiceSession = () => {
    setVoiceStatus('listening'); setVoiceTranscript(''); setVoiceResponse('');
    addToIntelligence({ sourceType: 'voice_session', sourceId: generateId(), title: 'Voice Session Started', content: `User initiated a voice interaction session in ${activeDept ? departments.find(d => d.id === activeDept)?.name : 'General'}`, department: activeDept || 'general', tags: ['voice', 'interaction'], relevanceBoost: 0 });
    setTimeout(() => {
      if (voiceStatus === 'listening') {
        const transcript = 'What projects are currently in progress?'; setVoiceTranscript(transcript); setVoiceStatus('processing');
        setTimeout(() => {
          const response = 'Currently there are 3 projects in active build phase. The Martin bathroom remodel is 75% complete, the Johnson kitchen renovation is in the demo phase, and the Oak Street addition is awaiting permits.';
          setVoiceResponse(response); setVoiceStatus('speaking');
          addToIntelligence({ sourceType: 'voice_interaction', sourceId: generateId(), title: `Voice: ${transcript.substring(0, 40)}...`, content: `Q: ${transcript}\n\nA: ${response}`, department: activeDept || 'general', tags: ['voice', 'query'], relevanceBoost: 1, metadata: { mode: 'demo' } });
        }, 1500);
      }
    }, 3000);
  };

  const stopVoiceSession = () => { setVoiceStatus('idle'); setVoiceTranscript(''); setVoiceResponse(''); };

  const filteredKnowledge = knowledge.filter(item => {
    const matchesFilter = knowledgeFilter === 'all' || item.type === knowledgeFilter || item.department === knowledgeFilter;
    const matchesSearch = !knowledgeSearch || item.title.toLowerCase().includes(knowledgeSearch.toLowerCase()) || item.content.toLowerCase().includes(knowledgeSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const openIssuesCount = issues.filter(i => i.status === 'open' && !i.archived).length;
  const currentDeptInfo = activeDept ? departments.find(d => d.id === activeDept) : null;

  // FAQ DATA
  const faqSections = [
    { id: 'getting-started', title: 'Getting Started', items: [
      { q: 'What is Empire AI?', a: 'Empire AI is your operational intelligence platform — a central hub for managing knowledge, tracking issues, chatting with AI about your business, and keeping your team aligned. Think of it as your digital command center.' },
      { q: 'How do I navigate the app?', a: 'Use the sidebar on the left. The top section has main pages (Dashboard, Systems, Knowledge, Issues, Help). Below that are your departments. Click any item to navigate there.' },
      { q: 'What are departments?', a: 'Departments organize your business areas (Marketing, Sales, Production, etc.). Each department has its own chat context, documents, and focus. Click a department to enter that context.' }
    ]},
    { id: 'navigation', title: 'Navigation', items: [
      { q: 'What do the main pages do?', a: 'Dashboard: Overview and quick actions. Systems: Technical settings and team management. Knowledge: Your document and insights library. Issues: Track and resolve problems. Help: This FAQ page.' },
      { q: 'How do I switch between departments?', a: 'Click any department name in the sidebar. The app will switch to that department\'s context, affecting chat responses and document filtering.' },
      { q: 'Can I collapse the sidebar?', a: 'Yes! Click the arrow button at the top of the sidebar to collapse or expand it.' }
    ]},
    { id: 'dashboard', title: 'Dashboard', items: [
      { q: 'What\'s the chat box at the top?', a: 'Quick access to AI chat. Type a question and press Enter — you\'ll be taken to the full chat page with your conversation started.' },
      { q: 'What are the quick action buttons?', a: 'Start Chat: Opens the chat page. Log Insight: Save important knowledge. Upload: Add documents. Voice: Open voice mode (demo). Report Issue: Create a new issue.' },
      { q: 'What\'s the activity feed?', a: 'A live log of recent actions in the system — new chats, uploaded documents, created issues, and more. Helps you see what\'s happening across the platform.' }
    ]},
    { id: 'knowledge', title: 'Knowledge Base', items: [
      { q: 'How do I add documents?', a: 'Click the UPLOAD button on any department card, or use the Upload quick action. You can upload PDFs, images, and other files.' },
      { q: 'How do I log an insight?', a: 'Click "Log Insight" from the dashboard or within a department. Add a title and content — this becomes searchable knowledge the AI can reference.' },
      { q: 'How are documents organized?', a: 'Documents belong to departments. Click "Docs" on a department card to see all its documents. The number on each card shows how many documents are in that department.' },
      { q: 'Can I create new departments?', a: 'Yes! Click the "+ Add" button in the Knowledge page to create a custom department with your own name, icon, and color.' }
    ]},
    { id: 'issues', title: 'Issues Board', items: [
      { q: 'How do I create an issue?', a: 'Click "+ New Issue" button on the Issues page, or use "Report Issue" from the dashboard. Fill in the title, description, priority, and other details.' },
      { q: 'What do the statuses mean?', a: 'Open: New issue, not started. In Progress: Being worked on. Resolved: Fixed and closed. Resolved issues automatically become knowledge items!' },
      { q: 'How do I resolve an issue?', a: 'Change the status dropdown to "Resolved" or click the checkmark icon. You\'ll be prompted to add resolution notes — these become part of your knowledge base.' },
      { q: 'What\'s the archive?', a: 'Click the purple Archive button to see resolved/archived issues. These are kept for reference but hidden from the main view. You can restore archived issues if needed.' },
      { q: 'Can I customize the columns?', a: 'Yes! Drag column headers to reorder. Drag column edges to resize. Double-click a header to rename. Use the "Columns" button to show/hide columns.' }
    ]},
    { id: 'chat', title: 'Chat / AI Assistant', items: [
      { q: 'How does the AI know about my business?', a: 'The AI pulls context from your Knowledge Base and resolved issues. The more you document, the smarter it gets about your specific operations.' },
      { q: 'What\'s department context?', a: 'When you\'re in a department (like Marketing), the AI focuses on that area and references relevant department documents first.' },
      { q: 'Can I chat about general topics?', a: 'Yes! Click "General" in the sidebar or start from the dashboard. General chat isn\'t limited to any department context.' },
      { q: 'What if the AI gives wrong information?', a: 'Log correct information as an insight! The AI learns from your knowledge base, so adding accurate data improves future responses.' }
    ]},
    { id: 'voice', title: 'Voice Mode', items: [
      { q: 'How do I use voice mode?', a: 'Click the Voice quick action on the dashboard or the mic icon. Currently this is a demo mode showing how the feature will work.' },
      { q: 'When will real voice be available?', a: 'Voice mode is planned for integration with Gemini Live API. The current demo shows the interface and flow that will be used.' }
    ]},
    { id: 'systems', title: 'Systems & Team Management', items: [
      { q: 'What\'s on the Systems page?', a: 'System status cards, connected Google Sheets (coming soon), the Central Intelligence panel showing AI learning stats, and Team Management.' },
      { q: 'How do I invite team members?', a: 'Go to Systems > Team Management > click "Invite Member". Enter their email, select a role, and optionally limit their department access.' },
      { q: 'What are the team roles?', a: 'Owner: Full access. Admin: Manage team and settings. Manager: Manage departments and issues. Member: View and contribute. Viewer: View only.' },
      { q: 'What\'s Central Intelligence?', a: 'The AI\'s learning system. It shows how many items the AI has learned from, recent insights, and top tags. Every action you take feeds this system.' }
    ]},
    { id: 'troubleshooting', title: 'Troubleshooting', items: [
      { q: 'My data disappeared!', a: 'Data is stored in your browser\'s local storage. If you cleared browser data or switched browsers, data may be lost. Future versions will have cloud backup.' },
      { q: 'The AI isn\'t responding', a: 'Check your internet connection. If issues persist, the app will fall back to offline mode using local knowledge only.' },
      { q: 'Something looks broken', a: 'Try refreshing the page. If the issue persists, clear your browser cache and reload. Report persistent bugs to your administrator.' }
    ]},
    { id: 'tips', title: 'Tips for Success', items: [
      { q: 'How do I get the most out of Empire AI?', a: '1) Log insights regularly — everything you teach it makes it smarter. 2) Resolve issues with detailed notes. 3) Organize documents by department. 4) Use the chat to ask questions about your own data.' },
      { q: 'Best practices for the Knowledge Base?', a: 'Use clear, descriptive titles. Include relevant details in content. Assign to the right department. Add insights from successful projects and resolved issues.' },
      { q: 'How should I use departments?', a: 'Match your actual business structure. Keep documents in relevant departments. Use department chat for focused conversations. Create custom departments for special projects.' }
    ]}
  ];

  // RENDER
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#E2E8F0', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes thinking { 0%, 80%, 100% { transform: scale(0); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }
        .thinking-dots span { display: inline-block; width: 8px; height: 8px; margin: 0 2px; background: #3B82F6; border-radius: 50%; animation: thinking 1.4s infinite ease-in-out both; }
        .thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
        .thinking-dots span:nth-child(2) { animation-delay: -0.16s; }
        input, textarea, select { font-family: inherit; }
      `}</style>

      {/* SIDEBAR */}
      <div style={{ width: sidebarOpen ? 260 : 70, transition: 'width 0.3s', background: 'rgba(15, 23, 42, 0.95)', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 40 }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {sidebarOpen && <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>E</div><span style={{ fontWeight: 600, fontSize: '18px' }}>Empire AI</span></div>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#94A3B8' }}>{sidebarOpen ? <ChevronLeft size={18}/> : <ChevronRight size={18}/>}</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
          {[
            { id: 'dashboard', icon: Home, label: 'Dashboard' },
            { id: 'systems', icon: LayoutGrid, label: 'Systems' },
            { id: 'knowledge', icon: BookOpen, label: 'Knowledge' },
            { id: 'issues', icon: ClipboardList, label: 'Issues', badge: openIssuesCount },
            { id: 'help', icon: HelpCircle, label: 'Help / FAQ' },
          ].map(item => (
            <button key={item.id} onClick={() => { setCurrentPage(item.id); setActiveDept(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: currentPage === item.id && !activeDept ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: 'none', borderRadius: '10px', color: currentPage === item.id && !activeDept ? '#3B82F6' : '#94A3B8', cursor: 'pointer', marginBottom: '4px', justifyContent: sidebarOpen ? 'flex-start' : 'center', position: 'relative' }}>
              <item.icon size={20}/>
              {sidebarOpen && <span style={{ fontWeight: 500 }}>{item.label}</span>}
              {item.badge > 0 && <span style={{ position: 'absolute', right: sidebarOpen ? 12 : 4, top: sidebarOpen ? '50%' : 4, transform: sidebarOpen ? 'translateY(-50%)' : 'none', background: '#EF4444', color: 'white', fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '10px', minWidth: '20px', textAlign: 'center' }}>{item.badge}</span>}
            </button>
          ))}

          {sidebarOpen && <div style={{ padding: '16px 8px 8px', color: '#64748B', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Departments</div>}
          {departments.map(dept => {
            const IconComp = getIconComponent(dept.icon);
            return (
              <button key={dept.id} onClick={() => { setActiveDept(dept.id); setCurrentPage('chat'); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: activeDept === dept.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: 'none', borderRadius: '10px', color: activeDept === dept.id ? '#3B82F6' : '#94A3B8', cursor: 'pointer', marginBottom: '2px', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '8px', background: `${dept.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconComp size={16} style={{ color: dept.color }}/></div>
                {sidebarOpen && <span style={{ fontWeight: 500, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dept.name}</span>}
              </button>
            );
          })}
        </div>

        {sidebarOpen && (
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #10B981, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>EA</div>
              <div><div style={{ fontWeight: 500, fontSize: '14px' }}>Empire Admin</div><div style={{ color: '#64748B', fontSize: '12px' }}>Owner</div></div>
            </div>
          </div>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* TOP BAR */}
        <div style={{ height: 64, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)' }}>
          <div style={{ position: 'relative', width: 320 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}/>
            <input value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setTimeout(() => setSearchFocused(false), 200)} placeholder="Search everything..." style={{ width: '100%', padding: '10px 12px 10px 40px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#E2E8F0', fontSize: '14px', outline: 'none' }}/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setShowVoiceModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', border: 'none', borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: 500 }}><Mic size={18}/> Voice</button>
            <button style={{ position: 'relative', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', padding: '10px', cursor: 'pointer', color: '#94A3B8' }}><Bell size={20}/><span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: '#EF4444', borderRadius: '50%' }}/></button>
            <button style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', padding: '10px', cursor: 'pointer', color: '#94A3B8' }}><Settings size={20}/></button>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)' }}>
          
          {/* DASHBOARD */}
          {currentPage === 'dashboard' && !activeDept && (
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}</h1>
              <p style={{ color: '#94A3B8', marginBottom: '24px' }}>Here's what's happening at Empire Remodeling</p>

              {/* CHAT BOX */}
              <div style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && currentMessage.trim()) { setCurrentPage('chat'); setTimeout(() => sendMessage(), 100); } }} placeholder="Ask Empire AI anything..." style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#E2E8F0', fontSize: '15px', outline: 'none' }}/>
                  </div>
                  <button onClick={() => { if (currentMessage.trim()) { setCurrentPage('chat'); setTimeout(() => sendMessage(), 100); } }} style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}><Send size={18}/></button>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {['What projects need attention?', 'Show me today\'s schedule', 'Any urgent issues?'].map((suggestion, i) => (
                    <button key={i} onClick={() => { setCurrentMessage(suggestion); setCurrentPage('chat'); setTimeout(() => sendMessage(), 100); }} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94A3B8', fontSize: '13px', cursor: 'pointer' }}>{suggestion}</button>
                  ))}
                </div>
              </div>

              {/* STATS AND ACTIVITY */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                <div style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>Recent Activity</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activities.slice(0, 6).map(activity => (
                      <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: activity.type === 'chat' ? 'rgba(59, 130, 246, 0.2)' : activity.type === 'issue' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {activity.type === 'chat' ? <MessageSquare size={16} style={{ color: '#3B82F6' }}/> : activity.type === 'issue' ? <AlertTriangle size={16} style={{ color: '#EF4444' }}/> : <Lightbulb size={16} style={{ color: '#10B981' }}/>}
                        </div>
                        <div style={{ flex: 1 }}><div style={{ fontSize: '14px' }}>{activity.text}</div><div style={{ fontSize: '12px', color: '#64748B' }}>{formatTime(activity.time)}</div></div>
                      </div>
                    ))}
                    {activities.length === 0 && <div style={{ textAlign: 'center', color: '#64748B', padding: '20px' }}>No recent activity</div>}
                  </div>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { icon: MessageSquare, label: 'Start Chat', color: '#3B82F6', action: () => setCurrentPage('chat') },
                      { icon: Lightbulb, label: 'Log Insight', color: '#10B981', action: () => setShowInsightModal(true) },
                      { icon: Upload, label: 'Upload', color: '#8B5CF6', action: () => setShowUploadModal(true) },
                      { icon: Mic, label: 'Voice', color: '#F59E0B', action: () => setShowVoiceModal(true) },
                      { icon: AlertTriangle, label: 'Report Issue', color: '#EF4444', action: () => { setCurrentPage('issues'); setShowIssueModal(true); } },
                    ].map((action, i) => (
                      <button key={i} onClick={action.action} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', cursor: 'pointer', color: '#E2E8F0', width: '100%' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '8px', background: `${action.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><action.icon size={16} style={{ color: action.color }}/></div>
                        <span style={{ fontWeight: 500, fontSize: '14px' }}>{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SYSTEMS PAGE */}
          {currentPage === 'systems' && !activeDept && (
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '24px' }}>Systems</h1>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                  { icon: RefreshCw, label: 'Auto-Sync', value: 'Active', color: '#10B981' },
                  { icon: HardDrive, label: 'Storage', value: `${(JSON.stringify(localStorage).length / 1024).toFixed(1)} KB`, color: '#3B82F6' },
                  { icon: Wifi, label: 'API Status', value: 'Online', color: '#10B981' },
                  { icon: Database, label: 'Knowledge', value: `${knowledge.length} items`, color: '#8B5CF6' },
                ].map((stat, i) => (
                  <div key={i} style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${stat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><stat.icon size={20} style={{ color: stat.color }}/></div>
                      <span style={{ color: '#94A3B8', fontSize: '14px' }}>{stat.label}</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* GOOGLE SHEETS */}
              <div style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Link2 size={20}/> Connected Google Sheets</h3>
                  <button style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#10B981', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>+ Connect Sheet</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {connectedSheets.map(sheet => (
                    <div key={sheet.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={16} style={{ color: '#10B981' }}/></div>
                        <div><div style={{ fontWeight: 500 }}>{sheet.name}</div><div style={{ fontSize: '12px', color: '#64748B' }}>{sheet.rows} rows</div></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '12px', color: '#64748B' }}>{sheet.lastSync}</span><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}/></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* INTELLIGENCE PANEL */}
              <div style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Brain size={20} style={{ color: '#8B5CF6' }}/></div>
                  <div><h3 style={{ fontWeight: 600 }}>Central Intelligence</h3><p style={{ fontSize: '12px', color: '#64748B' }}>AI learning from your operations</p></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 700, color: '#8B5CF6' }}>{intelligenceStats.totalItems}</div><div style={{ fontSize: '11px', color: '#64748B' }}>Intelligence Items</div></div>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 700, color: '#3B82F6' }}>{intelligenceStats.knowledgeItems}</div><div style={{ fontSize: '11px', color: '#64748B' }}>Knowledge Docs</div></div>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 700, color: '#10B981' }}>{intelligenceStats.resolvedIssues}</div><div style={{ fontSize: '11px', color: '#64748B' }}>Resolved Issues</div></div>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 700, color: '#F59E0B' }}>{intelligenceStats.recentInsights}</div><div style={{ fontSize: '11px', color: '#64748B' }}>Added This Week</div></div>
                </div>
                {intelligenceStats.topTags.length > 0 && (
                  <div><div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>Top Tags</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{intelligenceStats.topTags.map((t, i) => (<span key={i} style={{ padding: '4px 10px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '12px', fontSize: '12px', color: '#A78BFA' }}>{t.tag} ({t.count})</span>))}</div></div>
                )}
              </div>

              {/* TEAM MANAGEMENT */}
              <div style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={20}/> Team Management</h3>
                  <button onClick={() => setShowInviteModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: '#3B82F6', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}><UserPlus size={16}/> Invite Member</button>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>Active Members ({teamMembers.length})</div>
                  {teamMembers.map(member => (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${roles.find(r => r.id === member.role)?.color || '#3B82F6'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '14px' }}>{member.avatar || member.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                        <div><div style={{ fontWeight: 500 }}>{member.name}</div><div style={{ fontSize: '12px', color: '#64748B' }}>{member.email}</div></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {member.role === 'owner' ? <span style={{ padding: '4px 12px', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#F59E0B', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}><Crown size={12}/> Owner</span> : (
                          <select value={member.role} onChange={(e) => updateMemberRole(member.id, e.target.value)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#E2E8F0', fontSize: '12px' }}>
                            {roles.filter(r => r.id !== 'owner').map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                          </select>
                        )}
                        {member.role !== 'owner' && <button onClick={() => setEditingMember(member)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#94A3B8' }}><Settings size={14}/></button>}
                      </div>
                    </div>
                  ))}
                </div>

                {pendingInvites.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>Pending Invitations ({pendingInvites.length})</div>
                    {pendingInvites.map(invite => (
                      <div key={invite.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Mail size={16} style={{ color: '#F59E0B' }}/></div>
                          <div><div style={{ fontWeight: 500 }}>{invite.email}</div><div style={{ fontSize: '12px', color: '#64748B' }}>Invited as {invite.role} • Expires {formatTime(invite.expiresAt)}</div></div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => resendInvite(invite)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#94A3B8', cursor: 'pointer', fontSize: '12px' }}>Resend</button>
                          <button onClick={() => cancelInvite(invite.id)} style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#EF4444', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>Role Permissions</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {roles.map(role => <span key={role.id} style={{ padding: '4px 10px', background: `${role.color}20`, borderRadius: '6px', fontSize: '11px', color: role.color }}>{role.name}: {role.description}</span>)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KNOWLEDGE PAGE */}
          {currentPage === 'knowledge' && !activeDept && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Knowledge Base</h1>
                <button onClick={() => { setEditingDept(null); setNewDept({ name: '', icon: 'Building', color: '#3B82F6', description: '' }); setShowDeptModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', color: '#3B82F6', cursor: 'pointer', fontWeight: 500 }}><Plus size={18}/> Add Department</button>
              </div>

              {viewingDeptDocs ? (
                <div>
                  <button onClick={() => setViewingDeptDocs(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: '#94A3B8', cursor: 'pointer', marginBottom: '16px' }}><ChevronLeft size={18}/> Back to Departments</button>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{departments.find(d => d.id === viewingDeptDocs)?.name} Documents</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setShowUploadModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: '#3B82F6', cursor: 'pointer', fontSize: '13px' }}><Upload size={16}/> Upload</button>
                      <button onClick={() => setShowInsightModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#10B981', cursor: 'pointer', fontSize: '13px' }}><Lightbulb size={16}/> Log Insight</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {knowledge.filter(k => k.department === viewingDeptDocs).map(item => (
                      <div key={item.id} style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '8px', background: item.type === 'insight' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.type === 'insight' ? <Lightbulb size={16} style={{ color: '#10B981' }}/> : <File size={16} style={{ color: '#3B82F6' }}/>}</div>
                          <button onClick={() => deleteKnowledgeItem(item.id)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}><Trash2 size={14}/></button>
                        </div>
                        <h4 style={{ fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>{item.title}</h4>
                        <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: 1.5 }}>{item.content?.substring(0, 100)}{item.content?.length > 100 ? '...' : ''}</p>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px' }}>{formatTime(item.createdAt)}</div>
                      </div>
                    ))}
                    {knowledge.filter(k => k.department === viewingDeptDocs).length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748B', padding: '40px' }}>No documents in this department yet</div>}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  {departments.map(dept => {
                    const IconComp = getIconComponent(dept.icon);
                    const docCount = getDocsCountForDept(dept.id);
                    return (
                      <div key={dept.id} draggable onDragStart={(e) => handleDeptDragStart(e, dept.id)} onDragOver={(e) => handleDeptDragOver(e, dept.id)} onDragEnd={handleDeptDragEnd} style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', border: draggingDeptId === dept.id ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.06)', cursor: 'grab', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 12, right: 12 }}>
                          <button onClick={(e) => { e.stopPropagation(); setDeptCardMenu(deptCardMenu === dept.id ? null : dept.id); }} className="dept-card-menu" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#94A3B8' }}><MoreVertical size={16}/></button>
                          {deptCardMenu === dept.id && (
                            <div className="dept-card-menu" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'rgba(30, 41, 59, 0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px', minWidth: '120px', zIndex: 50 }}>
                              <button onClick={() => openEditDeptModal(dept)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', borderRadius: '6px', color: '#E2E8F0', cursor: 'pointer', fontSize: '13px' }}><Edit3 size={14}/> Edit</button>
                              <button onClick={() => deleteDepartment(dept.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', borderRadius: '6px', color: '#EF4444', cursor: 'pointer', fontSize: '13px' }}><Trash2 size={14}/> Delete</button>
                            </div>
                          )}
                        </div>
                        <div style={{ width: 48, height: 48, borderRadius: '12px', background: `${dept.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}><IconComp size={24} style={{ color: dept.color }}/></div>
                        <div style={{ fontSize: '48px', fontWeight: 700, color: dept.color, fontFamily: "'Space Mono', monospace", marginBottom: '4px' }}>{docCount}</div>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{dept.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>{docCount === 1 ? 'document' : 'documents'}</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => { setViewingDeptDocs(dept.id); }} style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94A3B8', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>Docs</button>
                          <button onClick={() => { setViewingDeptDocs(dept.id); setShowUploadModal(true); }} style={{ flex: 1, padding: '8px', background: `${dept.color}20`, border: `1px solid ${dept.color}40`, borderRadius: '8px', color: dept.color, cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>Upload</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ISSUES PAGE */}
          {currentPage === 'issues' && !activeDept && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Issues Board</h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setShowArchivedIssues(!showArchivedIssues)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: showArchivedIssues ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '10px', color: '#A78BFA', cursor: 'pointer', fontWeight: 500 }}><Archive size={18}/> Archive {archivedCount > 0 && `(${archivedCount})`}</button>
                  {!showArchivedIssues && <button onClick={() => setShowIssueModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', color: '#3B82F6', cursor: 'pointer', fontWeight: 500 }}><Plus size={18}/> New Issue</button>}
                </div>
              </div>

              {showArchivedIssues ? (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <input value={archiveSearch} onChange={(e) => setArchiveSearch(e.target.value)} placeholder="Search archived issues..." style={{ width: '300px', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', fontSize: '14px' }}/>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredIssues.map(issue => (
                      <div key={issue.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(30, 41, 59, 0.8)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div>
                          <div style={{ fontWeight: 500, marginBottom: '4px' }}>{issue.title}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>Archived {formatTime(issue.archivedAt)} • {issue.priority} priority</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => unarchiveIssue(issue)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', color: '#10B981', cursor: 'pointer', fontSize: '12px' }}><ArchiveRestore size={14}/> Restore</button>
                          <button onClick={() => deleteIssue(issue.id)} style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#EF4444', cursor: 'pointer', fontSize: '12px' }}><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ))}
                    {filteredIssues.length === 0 && <div style={{ textAlign: 'center', color: '#64748B', padding: '40px' }}>No archived issues found</div>}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <select value={issueFilters.status} onChange={(e) => setIssueFilters(f => ({ ...f, status: e.target.value }))} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', fontSize: '13px' }}>
                      <option value="all">All Status</option><option value="open">Open</option><option value="in-progress">In Progress</option><option value="resolved">Resolved</option>
                    </select>
                    <select value={issueFilters.priority} onChange={(e) => setIssueFilters(f => ({ ...f, priority: e.target.value }))} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', fontSize: '13px' }}>
                      <option value="all">All Priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                    </select>
                    <select value={issueFilters.department} onChange={(e) => setIssueFilters(f => ({ ...f, department: e.target.value }))} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', fontSize: '13px' }}>
                      <option value="all">All Departments</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>

                  <div style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {issueColumns.filter(c => c.visible).map(col => (
                        <div key={col.id} style={{ width: col.width, minWidth: col.minWidth, padding: '12px 16px', fontWeight: 600, fontSize: '12px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col.label}</div>
                      ))}
                    </div>
                    {filteredIssues.map(issue => (
                      <div key={issue.id} style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        {issueColumns.filter(c => c.visible).map(col => (
                          <div key={col.id} style={{ width: col.width, minWidth: col.minWidth, padding: '12px 16px', fontSize: '14px' }}>
                            {col.id === 'title' && <span style={{ fontWeight: 500 }}>{issue.title}</span>}
                            {col.id === 'department' && <span style={{ color: '#94A3B8' }}>{departments.find(d => d.id === issue.department)?.name || '-'}</span>}
                            {col.id === 'priority' && <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, background: issue.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : issue.priority === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: issue.priority === 'high' ? '#EF4444' : issue.priority === 'medium' ? '#F59E0B' : '#94A3B8' }}>{issue.priority}</span>}
                            {col.id === 'status' && (
                              <select value={issue.status} onChange={(e) => { if (e.target.value === 'resolved' && issue.status !== 'resolved') { setResolvingIssue(issue); setResolutionNotes(''); setShowResolveModal(true); } else { updateIssue(issue.id, { status: e.target.value }); } }} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#E2E8F0', fontSize: '12px' }}>
                                <option value="open">Open</option><option value="in-progress">In Progress</option><option value="resolved">Resolved</option>
                              </select>
                            )}
                            {col.id === 'assignee' && <span style={{ color: '#94A3B8' }}>{issue.assignee || '-'}</span>}
                            {col.id === 'createdAt' && <span style={{ color: '#64748B', fontSize: '12px' }}>{formatTime(issue.createdAt)}</span>}
                            {col.id === 'actions' && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {issue.status !== 'resolved' && <button onClick={() => { setResolvingIssue(issue); setResolutionNotes(''); setShowResolveModal(true); }} style={{ padding: '4px', background: 'rgba(16, 185, 129, 0.2)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#10B981' }}><Check size={14}/></button>}
                                {issue.status === 'resolved' && <button onClick={() => archiveIssue(issue)} style={{ padding: '4px', background: 'rgba(139, 92, 246, 0.2)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#A78BFA' }}><Archive size={14}/></button>}
                                <button onClick={() => deleteIssue(issue.id)} style={{ padding: '4px', background: 'rgba(239, 68, 68, 0.2)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={14}/></button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                    {filteredIssues.length === 0 && <div style={{ textAlign: 'center', color: '#64748B', padding: '40px' }}>No issues found</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HELP / FAQ PAGE */}
          {currentPage === 'help' && !activeDept && (
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Help & FAQ</h1>
              <p style={{ color: '#94A3B8', marginBottom: '24px' }}>Learn how to get the most out of Empire AI</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {faqSections.map(section => (
                  <div key={section.id} style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <button onClick={() => setExpandedFaqSection(expandedFaqSection === section.id ? null : section.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', color: '#E2E8F0', cursor: 'pointer' }}>
                      <span style={{ fontWeight: 600, fontSize: '16px' }}>{section.title}</span>
                      {expandedFaqSection === section.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                    </button>
                    {expandedFaqSection === section.id && (
                      <div style={{ padding: '0 20px 16px' }}>
                        {section.items.map((item, i) => (
                          <div key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '12px' }}>
                            <button onClick={() => setExpandedFaqItem(expandedFaqItem === `${section.id}-${i}` ? null : `${section.id}-${i}`)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', color: '#E2E8F0', cursor: 'pointer', textAlign: 'left' }}>
                              <span style={{ fontWeight: 500 }}>{item.q}</span>
                              {expandedFaqItem === `${section.id}-${i}` ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                            </button>
                            {expandedFaqItem === `${section.id}-${i}` && <p style={{ color: '#94A3B8', marginTop: '8px', fontSize: '14px', lineHeight: 1.6 }}>{item.a}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHAT PAGE */}
          {(currentPage === 'chat' || activeDept) && (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)' }}>
              <div style={{ padding: '16px 20px', background: 'rgba(30, 41, 59, 0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {currentDeptInfo ? (
                  <>
                    <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${currentDeptInfo.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{React.createElement(getIconComponent(currentDeptInfo.icon), { size: 20, style: { color: currentDeptInfo.color } })}</div>
                    <div><div style={{ fontWeight: 600 }}>{currentDeptInfo.name}</div><div style={{ fontSize: '12px', color: '#64748B' }}>{currentDeptInfo.description}</div></div>
                  </>
                ) : (
                  <>
                    <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageSquare size={20}/></div>
                    <div><div style={{ fontWeight: 600 }}>General Chat</div><div style={{ fontSize: '12px', color: '#64748B' }}>Ask anything about Empire Remodeling</div></div>
                  </>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {getCurrentConversation().length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                    <MessageSquare size={48} style={{ marginBottom: '16px', opacity: 0.5 }}/>
                    <p>Start a conversation with Empire AI</p>
                  </div>
                )}
                {getCurrentConversation().map(msg => (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
                    <div style={{ maxWidth: '70%', padding: '14px 18px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' : 'rgba(30, 41, 59, 0.8)', border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                      <div style={{ fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                      <div style={{ fontSize: '11px', color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : '#64748B', marginTop: '6px' }}>{formatTime(msg.timestamp)}</div>
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ maxWidth: '70%', padding: '14px 18px', borderRadius: '18px 18px 18px 4px', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '14px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Empire AI is thinking
                        <span className="thinking-dots"><span></span><span></span><span></span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}/>
              </div>

              <div style={{ padding: '16px 20px', background: 'rgba(30, 41, 59, 0.6)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} disabled={isThinking} placeholder={isThinking ? "Waiting for response..." : "Type your message..."} style={{ flex: 1, padding: '14px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#E2E8F0', fontSize: '14px', outline: 'none', opacity: isThinking ? 0.5 : 1 }}/>
                  <button onClick={sendMessage} disabled={isThinking || !currentMessage.trim()} style={{ padding: '14px 20px', background: isThinking ? 'rgba(59, 130, 246, 0.3)' : 'linear-gradient(135deg, #3B82F6, #8B5CF6)', border: 'none', borderRadius: '12px', color: 'white', cursor: isThinking ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><Send size={18}/></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VOICE MODAL */}
      {showVoiceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)', borderRadius: '24px', padding: '40px', width: '90%', maxWidth: '500px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={() => { setShowVoiceModal(false); stopVoiceSession(); }} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={24}/></button>
            
            <div style={{ width: 160, height: 160, margin: '0 auto 24px', borderRadius: '50%', background: voiceStatus === 'idle' ? 'rgba(59, 130, 246, 0.2)' : voiceStatus === 'listening' ? 'rgba(16, 185, 129, 0.3)' : voiceStatus === 'processing' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(139, 92, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: voiceStatus !== 'idle' ? 'pulse 2s infinite' : 'none', boxShadow: voiceStatus !== 'idle' ? `0 0 60px ${voiceStatus === 'listening' ? 'rgba(16, 185, 129, 0.4)' : voiceStatus === 'processing' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(139, 92, 246, 0.4)'}` : 'none' }}>
              <div style={{ width: 120, height: 120, borderRadius: '50%', background: voiceStatus === 'idle' ? 'rgba(59, 130, 246, 0.3)' : voiceStatus === 'listening' ? 'rgba(16, 185, 129, 0.4)' : voiceStatus === 'processing' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(139, 92, 246, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {voiceStatus === 'idle' && <Mic size={48} style={{ color: '#3B82F6' }}/>}
                {voiceStatus === 'listening' && <Mic size={48} style={{ color: '#10B981' }}/>}
                {voiceStatus === 'processing' && <div style={{ width: 24, height: 24, border: '3px solid #F59E0B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>}
                {voiceStatus === 'speaking' && <Volume2 size={48} style={{ color: '#8B5CF6' }}/>}
              </div>
            </div>

            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{voiceStatus === 'idle' ? 'Ready to Listen' : voiceStatus === 'listening' ? 'Listening...' : voiceStatus === 'processing' ? 'Processing...' : 'Speaking...'}</div>
            <div style={{ color: '#64748B', marginBottom: '24px', fontSize: '14px' }}>{voiceStatus === 'idle' ? 'Tap the button to start' : 'Speak naturally'}</div>

            {voiceTranscript && <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'left' }}><div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>You said:</div><div style={{ fontSize: '14px' }}>{voiceTranscript}</div></div>}
            {voiceResponse && <div style={{ background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'left', border: '1px solid rgba(139, 92, 246, 0.2)' }}><div style={{ fontSize: '11px', color: '#A78BFA', marginBottom: '4px' }}>Empire AI:</div><div style={{ fontSize: '14px' }}>{voiceResponse}</div></div>}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              {voiceStatus === 'idle' ? (
                <button onClick={startVoiceSession} style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Mic size={28} style={{ color: 'white' }}/></button>
              ) : (
                <button onClick={stopVoiceSession} style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #EF4444, #DC2626)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Square size={28} style={{ color: 'white' }}/></button>
              )}
              <button onClick={() => setIsMuted(!isMuted)} style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>{isMuted ? <VolumeX size={20} style={{ color: '#94A3B8' }}/> : <Volume2 size={20} style={{ color: '#94A3B8' }}/>}</button>
            </div>
            <div style={{ marginTop: '24px', fontSize: '12px', color: '#64748B' }}>Demo Mode — Gemini Live API coming soon</div>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'linear-gradient(135deg, #1E293B, #0F172A)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}><h3 style={{ fontWeight: 600 }}>Upload Document</h3><button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={20}/></button></div>
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '12px', cursor: 'pointer' }}>
              <Upload size={40} style={{ color: '#64748B', marginBottom: '12px' }}/>
              <span style={{ color: '#94A3B8' }}>Click to upload or drag files</span>
              <span style={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}>PDF, DOC, Images</span>
              <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }}/>
            </label>
          </div>
        </div>
      )}

      {/* INSIGHT MODAL */}
      {showInsightModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'linear-gradient(135deg, #1E293B, #0F172A)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}><h3 style={{ fontWeight: 600 }}>Log Insight</h3><button onClick={() => setShowInsightModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={20}/></button></div>
            <input value={newInsight.title} onChange={(e) => setNewInsight({ ...newInsight, title: e.target.value })} placeholder="Insight title..." style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', marginBottom: '12px', fontSize: '14px' }}/>
            <textarea value={newInsight.content} onChange={(e) => setNewInsight({ ...newInsight, content: e.target.value })} placeholder="What did you learn or discover?..." style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', marginBottom: '12px', fontSize: '14px', minHeight: '120px', resize: 'vertical' }}/>
            <select value={newInsight.department} onChange={(e) => setNewInsight({ ...newInsight, department: e.target.value })} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', marginBottom: '16px', fontSize: '14px' }}>
              <option value="">Select Department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <button onClick={saveInsight} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 500, cursor: 'pointer' }}>Save Insight</button>
          </div>
        </div>
      )}

      {/* ISSUE MODAL */}
      {showIssueModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'linear-gradient(135deg, #1E293B, #0F172A)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}><h3 style={{ fontWeight: 600 }}>Report Issue</h3><button onClick={() => setShowIssueModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={20}/></button></div>
            <input value={newIssue.title} onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })} placeholder="Issue title..." style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', marginBottom: '12px', fontSize: '14px' }}/>
            <textarea value={newIssue.description} onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })} placeholder="Describe the issue..." style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', marginBottom: '12px', fontSize: '14px', minHeight: '100px', resize: 'vertical' }}/>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <select value={newIssue.department} onChange={(e) => setNewIssue({ ...newIssue, department: e.target.value })} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', fontSize: '14px' }}>
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select value={newIssue.priority} onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', fontSize: '14px' }}>
                <option value="low">Low Priority</option><option value="medium">Medium Priority</option><option value="high">High Priority</option>
              </select>
            </div>
            <input value={newIssue.assignee} onChange={(e) => setNewIssue({ ...newIssue, assignee: e.target.value })} placeholder="Assignee (optional)" style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', marginBottom: '16px', fontSize: '14px' }}/>
            <button onClick={addIssue} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 500, cursor: 'pointer' }}>Create Issue</button>
          </div>
        </div>
      )}

      {/* RESOLVE ISSUE MODAL */}
      {showResolveModal && resolvingIssue && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'linear-gradient(135deg, #1E293B, #0F172A)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}><h3 style={{ fontWeight: 600 }}>Resolve Issue</h3><button onClick={() => { setShowResolveModal(false); setResolvingIssue(null); setResolutionNotes(''); }} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={20}/></button></div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}><div style={{ fontWeight: 500, marginBottom: '4px' }}>{resolvingIssue.title}</div><div style={{ fontSize: '13px', color: '#94A3B8' }}>{resolvingIssue.description}</div></div>
            <textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="How was this resolved? (This will be saved to Knowledge Base)" style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', marginBottom: '16px', fontSize: '14px', minHeight: '120px', resize: 'vertical' }}/>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowResolveModal(false); setResolvingIssue(null); setResolutionNotes(''); }} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94A3B8', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { resolveIssue(resolvingIssue, resolutionNotes); setShowResolveModal(false); setResolvingIssue(null); setResolutionNotes(''); }} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 500, cursor: 'pointer' }}>Resolve & Save</button>
            </div>
          </div>
        </div>
      )}

      {/* DEPARTMENT MODAL */}
      {showDeptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'linear-gradient(135deg, #1E293B, #0F172A)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}><h3 style={{ fontWeight: 600 }}>{editingDept ? 'Edit Department' : 'Add Department'}</h3><button onClick={() => { setShowDeptModal(false); setEditingDept(null); setNewDept({ name: '', icon: 'Building', color: '#3B82F6', description: '' }); }} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={20}/></button></div>
            <input value={newDept.name} onChange={(e) => setNewDept({ ...newDept, name: e.target.value })} placeholder="Department name..." style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', marginBottom: '12px', fontSize: '14px' }}/>
            <textarea value={newDept.description} onChange={(e) => setNewDept({ ...newDept, description: e.target.value })} placeholder="Description (optional)..." style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', marginBottom: '12px', fontSize: '14px', minHeight: '60px', resize: 'vertical' }}/>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <select value={newDept.icon} onChange={(e) => setNewDept({ ...newDept, icon: e.target.value })} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', fontSize: '14px' }}>
                {Object.keys(iconMap).map(icon => <option key={icon} value={icon}>{icon}</option>)}
              </select>
              <input type="color" value={newDept.color} onChange={(e) => setNewDept({ ...newDept, color: e.target.value })} style={{ width: '50px', height: '44px', padding: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer' }}/>
            </div>
            <button onClick={editingDept ? saveDepartmentEdit : addDepartment} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 500, cursor: 'pointer' }}>{editingDept ? 'Save Changes' : 'Add Department'}</button>
          </div>
        </div>
      )}

      {/* INVITE MODAL */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'linear-gradient(135deg, #1E293B, #0F172A)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '450px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}><h3 style={{ fontWeight: 600 }}>Invite Team Member</h3><button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={20}/></button></div>
            <input value={newInvite.email} onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })} placeholder="Email address..." type="email" style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', marginBottom: '12px', fontSize: '14px' }}/>
            <select value={newInvite.role} onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0', marginBottom: '12px', fontSize: '14px' }}>
              {roles.filter(r => r.id !== 'owner').map(role => <option key={role.id} value={role.id}>{role.name} — {role.description}</option>)}
            </select>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '8px' }}>Department Access (leave empty for all)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {departments.map(dept => (
                  <button key={dept.id} onClick={() => { const depts = newInvite.departments.includes(dept.id) ? newInvite.departments.filter(d => d !== dept.id) : [...newInvite.departments, dept.id]; setNewInvite({ ...newInvite, departments: depts }); }} style={{ padding: '6px 12px', background: newInvite.departments.includes(dept.id) ? `${dept.color}30` : 'rgba(255,255,255,0.05)', border: `1px solid ${newInvite.departments.includes(dept.id) ? dept.color : 'rgba(255,255,255,0.1)'}`, borderRadius: '6px', color: newInvite.departments.includes(dept.id) ? dept.color : '#94A3B8', cursor: 'pointer', fontSize: '12px' }}>{dept.name}</button>
                ))}
              </div>
            </div>
            <button onClick={sendInvite} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 500, cursor: 'pointer' }}>Send Invitation</button>
          </div>
        </div>
      )}

      {/* EDIT MEMBER MODAL */}
      {editingMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'linear-gradient(135deg, #1E293B, #0F172A)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '450px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}><h3 style={{ fontWeight: 600 }}>Edit Team Member</h3><button onClick={() => setEditingMember(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={20}/></button></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${roles.find(r => r.id === editingMember.role)?.color || '#3B82F6'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{editingMember.avatar || editingMember.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
              <div><div style={{ fontWeight: 500 }}>{editingMember.name}</div><div style={{ fontSize: '12px', color: '#64748B' }}>{editingMember.email}</div></div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '8px' }}>Department Access</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {departments.map(dept => {
                  const hasAccess = !editingMember.departments || editingMember.departments.length === 0 || editingMember.departments.includes(dept.id);
                  return (
                    <button key={dept.id} onClick={() => { const current = editingMember.departments || []; const newDepts = current.includes(dept.id) ? current.filter(d => d !== dept.id) : [...current, dept.id]; updateMemberDepartments(editingMember.id, newDepts); setEditingMember({ ...editingMember, departments: newDepts }); }} style={{ padding: '6px 12px', background: hasAccess ? `${dept.color}30` : 'rgba(255,255,255,0.05)', border: `1px solid ${hasAccess ? dept.color : 'rgba(255,255,255,0.1)'}`, borderRadius: '6px', color: hasAccess ? dept.color : '#64748B', cursor: 'pointer', fontSize: '12px' }}>{dept.name}</button>
                  );
                })}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px' }}>No selection = access to all departments</div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { removeMember(editingMember.id); setEditingMember(null); }} style={{ flex: 1, padding: '12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#EF4444', cursor: 'pointer' }}>Remove from Team</button>
              <button onClick={() => setEditingMember(null)} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 500, cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
