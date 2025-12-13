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
  CONNECTED_DOCS: 'empire_connectedDocs'
};

// Storage helpers
export const loadFromStorage = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (e) {
    console.error(`Error loading ${key}:`, e);
    return defaultValue;
  }
};

export const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key}:`, e);
  }
};

// Default departments
export const DEFAULT_DEPARTMENTS = [
  { id: 'company-wide', name: 'Company-Wide', icon: '🏢', color: '#3B82F6', description: 'Cross-functional topics and company announcements', instructions: '' },
  { id: 'marketing', name: 'Marketing & Lead Generation', icon: '📣', color: '#8B5CF6', description: 'Campaigns, leads, and brand management', instructions: '' },
  { id: 'sales', name: 'Sales & Estimating', icon: '💰', color: '#10B981', description: 'Proposals, estimates, and client relationships', instructions: '' },
  { id: 'production', name: 'Production & Project Management', icon: '🔨', color: '#F59E0B', description: 'Job scheduling, crews, and project execution', instructions: '' },
  { id: 'financial', name: 'Financial & Bookkeeping', icon: '📊', color: '#06B6D4', description: 'Budgets, invoicing, and financial tracking', instructions: '' },
  { id: 'hr', name: 'HR & Training', icon: '👥', color: '#EC4899', description: 'Hiring, onboarding, and team development', instructions: '' },
  { id: 'safety', name: 'Safety & Compliance', icon: '🛡️', color: '#EF4444', description: 'OSHA compliance, safety protocols, and inspections', instructions: '' },
  { id: 'operations', name: 'Operations & Admin', icon: '⚙️', color: '#64748B', description: 'Day-to-day operations and administrative tasks', instructions: '' }
];

// Default team member
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

// Default issue columns
export const DEFAULT_COLUMNS = [
  { id: 'title', label: 'Issue', width: 250, visible: true },
  { id: 'department', label: 'Department', width: 150, visible: true },
  { id: 'priority', label: 'Priority', width: 100, visible: true },
  { id: 'status', label: 'Status', width: 120, visible: true },
  { id: 'assignee', label: 'Assignee', width: 130, visible: true },
  { id: 'createdAt', label: 'Created', width: 100, visible: true },
  { id: 'actions', label: 'Actions', width: 80, visible: true }
];

// Team roles
export const ROLES = [
  { id: 'owner', name: 'Owner', description: 'Full access to everything', color: '#F59E0B' },
  { id: 'admin', name: 'Admin', description: 'Manage team and settings', color: '#8B5CF6' },
  { id: 'manager', name: 'Manager', description: 'Manage departments and issues', color: '#3B82F6' },
  { id: 'member', name: 'Member', description: 'View and contribute', color: '#10B981' },
  { id: 'viewer', name: 'Viewer', description: 'View only access', color: '#64748B' }
];

// Extract tags from content
export const extractTags = (content) => {
  if (!content) return [];
  
  const text = content.toLowerCase();
  const tags = [];
  
  // Project types
  const projectTypes = ['kitchen', 'bathroom', 'addition', 'deck', 'roofing', 'electrical', 'plumbing', 'hvac', 'basement', 'garage'];
  projectTypes.forEach(type => {
    if (text.includes(type)) tags.push(type);
  });
  
  // Business terms
  const businessTerms = ['permit', 'schedule', 'budget', 'material', 'subcontractor', 'client', 'payment', 'safety', 'inspection', 'contract'];
  businessTerms.forEach(term => {
    if (text.includes(term)) tags.push(term);
  });
  
  // Status indicators
  const statusTerms = ['urgent', 'delayed', 'completed', 'pending', 'approved', 'rejected'];
  statusTerms.forEach(term => {
    if (text.includes(term)) tags.push(term);
  });
  
  // Team terms
  const teamTerms = ['hiring', 'training', 'team', 'meeting', 'review'];
  teamTerms.forEach(term => {
    if (text.includes(term)) tags.push(term);
  });
  
  return [...new Set(tags)].slice(0, 10);
};

// Query intelligence index
export const queryIntelligence = (index, query, department) => {
  if (!index || !query) return [];
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  const scored = index.map(item => {
    let score = 0;
    
    // Title match
    if (item.title?.toLowerCase().includes(queryLower)) {
      score += 10;
    }
    
    // Content match
    if (item.content?.toLowerCase().includes(queryLower)) {
      score += 5;
    }
    
    // Word matches
    queryWords.forEach(word => {
      if (item.title?.toLowerCase().includes(word)) score += 3;
      if (item.content?.toLowerCase().includes(word)) score += 2;
      if (item.tags?.some(t => t.toLowerCase().includes(word))) score += 4;
    });
    
    // Department match bonus
    if (department && item.department === department) {
      score += 5;
    }
    
    // Relevance boost
    score += (item.relevanceBoost || 0);
    
    // Recency bonus (items from last 7 days get boost)
    const daysSince = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) {
      score += Math.max(0, 3 - daysSince / 2);
    }
    
    return { ...item, score };
  });
  
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
};

// Get source label for intelligence items
export const getSourceLabel = (sourceType) => {
  const labels = {
    knowledge: 'Knowledge',
    resolved_issue: 'Resolved Issue',
    archived_issue: 'Archived Issue',
    chat_query: 'Chat',
    document_upload: 'Document',
    issue_created: 'Issue',
    issue_status_change: 'Issue Update',
    issue_priority_change: 'Priority Change',
    department_change: 'Org Change',
    team_change: 'Team Update',
    voice_session: 'Voice',
    voice_interaction: 'Voice Chat',
    google_doc: 'Connected Doc'
  };
  return labels[sourceType] || 'Info';
};

// Format date helper
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};

// Format timestamp helper
export const formatTimestamp = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Generate unique ID
export const generateId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Calculate storage usage
export const getStorageUsage = () => {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length * 2; // UTF-16 uses 2 bytes per character
    }
  }
  return total;
};
