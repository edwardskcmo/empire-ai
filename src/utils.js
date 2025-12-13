// Empire AI - Shared Utilities

// Storage Keys
export const STORAGE_KEYS = {
  DEPARTMENTS: 'empire_departments',
  CONVERSATIONS: 'empire_conversations',
  KNOWLEDGE: 'empire_knowledge',
  ACTIVITIES: 'empire_activities',
  ISSUES: 'empire_issues',
  ISSUE_COLUMNS: 'empire_issueColumns',
  INTELLIGENCE: 'empire_intelligence',
  TEAM_MEMBERS: 'empire_teamMembers',
  PENDING_INVITES: 'empire_pendingInvites',
  SYSTEM_INSTRUCTIONS: 'empire_systemInstructions',
  CONNECTED_DOCS: 'empire_connectedDocs'  // NEW
};

// Storage helpers
export const loadFromStorage = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
};

// Generate unique IDs
export const generateId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Format date relative
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

// Format timestamp
export const formatTimestamp = (dateString) => {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Get initials
export const getInitials = (name) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

// Calculate storage usage
export const getStorageUsage = () => {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
    }
  }
  return (total / 1024 / 1024).toFixed(2); // MB
};

// Extract tags from content
export const extractTags = (content) => {
  const text = content.toLowerCase();
  const tags = [];
  
  // Project types
  const projectTypes = ['kitchen', 'bathroom', 'addition', 'deck', 'roofing', 'electrical', 'plumbing', 'hvac'];
  projectTypes.forEach(type => {
    if (text.includes(type)) tags.push(type);
  });
  
  // Business terms
  const businessTerms = ['permit', 'schedule', 'budget', 'material', 'subcontractor', 'client', 'payment', 'safety'];
  businessTerms.forEach(term => {
    if (text.includes(term)) tags.push(term);
  });
  
  // Status indicators
  const statusTerms = ['urgent', 'delayed', 'completed'];
  statusTerms.forEach(term => {
    if (text.includes(term)) tags.push(term);
  });
  
  // Team terms
  const teamTerms = ['hiring', 'training', 'team'];
  teamTerms.forEach(term => {
    if (text.includes(term)) tags.push(term);
  });
  
  return [...new Set(tags)];
};

// Query intelligence index
export const queryIntelligence = (index, query, department = null) => {
  if (!query || query.length < 3) return [];
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  const scored = index.map(item => {
    let score = 0;
    const contentLower = (item.content || '').toLowerCase();
    const titleLower = (item.title || '').toLowerCase();
    
    // Title matches (high weight)
    queryWords.forEach(word => {
      if (titleLower.includes(word)) score += 5;
    });
    
    // Content matches
    queryWords.forEach(word => {
      if (contentLower.includes(word)) score += 2;
    });
    
    // Tag matches
    if (item.tags) {
      queryWords.forEach(word => {
        if (item.tags.some(t => t.includes(word))) score += 3;
      });
    }
    
    // Department match bonus
    if (department && item.department === department) score += 2;
    
    // Relevance boost
    score += (item.relevanceBoost || 0);
    
    // Recency bonus (items from last 7 days)
    const itemDate = new Date(item.createdAt);
    const daysSince = (Date.now() - itemDate) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) score += 2;
    if (daysSince < 1) score += 3;
    
    return { ...item, score };
  });
  
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
};

// Get source label for intelligence items
export const getSourceLabel = (sourceType) => {
  const labels = {
    'knowledge': 'Knowledge Base',
    'resolved_issue': 'Resolved Issue',
    'archived_issue': 'Archived Issue',
    'chat_query': 'Chat History',
    'document_upload': 'Document',
    'issue_created': 'Active Issue',
    'issue_status_change': 'Issue Update',
    'issue_priority_change': 'Priority Change',
    'department_change': 'Org Change',
    'team_change': 'Team Update',
    'voice_session': 'Voice Session',
    'voice_interaction': 'Voice Query',
    'google_doc': 'Connected Doc'  // NEW
  };
  return labels[sourceType] || 'Knowledge';
};

// Default departments
export const DEFAULT_DEPARTMENTS = [
  { id: 'dept_company', name: 'Company-Wide', icon: 'Building2', color: '#3B82F6', description: 'Organization-wide information and policies', instructions: '' },
  { id: 'dept_marketing', name: 'Marketing & Lead Generation', icon: 'TrendingUp', color: '#8B5CF6', description: 'Campaigns, lead tracking, brand materials', instructions: '' },
  { id: 'dept_sales', name: 'Sales & Estimating', icon: 'Users', color: '#10B981', description: 'Proposals, pricing, client relationships', instructions: '' },
  { id: 'dept_production', name: 'Production & Project Management', icon: 'Wrench', color: '#F59E0B', description: 'Schedules, job sites, subcontractor coordination', instructions: '' },
  { id: 'dept_financial', name: 'Financial & Bookkeeping', icon: 'DollarSign', color: '#10B981', description: 'Budgets, invoicing, financial reports', instructions: '' },
  { id: 'dept_hr', name: 'HR & Training', icon: 'GraduationCap', color: '#EC4899', description: 'Hiring, onboarding, team development', instructions: '' },
  { id: 'dept_safety', name: 'Safety & Compliance', icon: 'Shield', color: '#EF4444', description: 'OSHA, safety protocols, incident reports', instructions: '' },
  { id: 'dept_operations', name: 'Operations & Admin', icon: 'Briefcase', color: '#64748B', description: 'Process optimization, vendor management', instructions: '' }
];

// Default team member (owner)
export const DEFAULT_TEAM_MEMBER = {
  id: 'owner_1',
  name: 'Empire Admin',
  email: 'admin@empireremodeling.com',
  role: 'owner',
  status: 'active',
  avatar: 'EA',
  departments: [],
  joinedAt: '2024-01-01'
};

// Default columns for issues
export const DEFAULT_COLUMNS = [
  { id: 'title', name: 'Issue', width: 200, visible: true },
  { id: 'department', name: 'Department', width: 150, visible: true },
  { id: 'priority', name: 'Priority', width: 100, visible: true },
  { id: 'status', name: 'Status', width: 120, visible: true },
  { id: 'assignee', name: 'Assignee', width: 120, visible: true },
  { id: 'createdAt', name: 'Created', width: 100, visible: true },
  { id: 'actions', name: 'Actions', width: 80, visible: true }
];

// Team roles
export const ROLES = [
  { id: 'owner', name: 'Owner', description: 'Full access to everything', color: '#F59E0B' },
  { id: 'admin', name: 'Admin', description: 'Manage team and settings', color: '#8B5CF6' },
  { id: 'manager', name: 'Manager', description: 'Manage departments and issues', color: '#3B82F6' },
  { id: 'member', name: 'Member', description: 'View and contribute', color: '#10B981' },
  { id: 'viewer', name: 'Viewer', description: 'View only access', color: '#64748B' }
];
