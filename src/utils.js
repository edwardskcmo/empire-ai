// ==========================================
// EMPIRE AI - UTILITIES
// Shared functions for intelligence, storage, and helpers
// ==========================================

// ==========================================
// LOCAL STORAGE HELPERS
// ==========================================

export const STORAGE_KEYS = {
  CONVERSATIONS: 'empire_conversations',
  KNOWLEDGE: 'empire_knowledge',
  ACTIVITIES: 'empire_activities',
  ISSUES: 'empire_issues',
  ISSUE_COLUMNS: 'empire_issueColumns',
  DEPARTMENTS: 'empire_departments',
  INTELLIGENCE: 'empire_intelligence',
  TEAM_MEMBERS: 'empire_teamMembers',
  PENDING_INVITES: 'empire_pendingInvites',
  SYSTEM_INSTRUCTIONS: 'empire_systemInstructions'
};

export function loadFromStorage(key, defaultValue) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (e) {
    console.error(`Error loading ${key}:`, e);
    return defaultValue;
  }
}

export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key}:`, e);
  }
}

// ==========================================
// DEFAULT DATA
// ==========================================

export const DEFAULT_DEPARTMENTS = [
  { id: 'dept_1', name: 'Company-Wide', icon: 'Building2', color: '#3B82F6', description: 'Organization-wide information and policies', instructions: '' },
  { id: 'dept_2', name: 'Marketing & Lead Generation', icon: 'Megaphone', color: '#8B5CF6', description: 'Lead gen, advertising, and brand management', instructions: '' },
  { id: 'dept_3', name: 'Sales & Estimating', icon: 'DollarSign', color: '#10B981', description: 'Sales process, estimates, and proposals', instructions: '' },
  { id: 'dept_4', name: 'Production & Project Management', icon: 'Hammer', color: '#F59E0B', description: 'Project execution and scheduling', instructions: '' },
  { id: 'dept_5', name: 'Financial & Bookkeeping', icon: 'Calculator', color: '#10B981', description: 'Invoicing, payments, and financial tracking', instructions: '' },
  { id: 'dept_6', name: 'HR & Training', icon: 'Users', color: '#EC4899', description: 'Hiring, onboarding, and team development', instructions: '' },
  { id: 'dept_7', name: 'Safety & Compliance', icon: 'ShieldCheck', color: '#EF4444', description: 'Safety protocols and regulatory compliance', instructions: '' },
  { id: 'dept_8', name: 'Operations & Admin', icon: 'Settings', color: '#64748B', description: 'Day-to-day operations and administration', instructions: '' }
];

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

export const DEFAULT_COLUMNS = [
  { id: 'title', name: 'Issue', width: 200, visible: true },
  { id: 'department', name: 'Department', width: 150, visible: true },
  { id: 'priority', name: 'Priority', width: 100, visible: true },
  { id: 'status', name: 'Status', width: 120, visible: true },
  { id: 'assignee', name: 'Assignee', width: 120, visible: true },
  { id: 'createdAt', name: 'Created', width: 100, visible: true },
  { id: 'actions', name: 'Actions', width: 80, visible: true }
];

export const ROLES = [
  { id: 'owner', name: 'Owner', description: 'Full access to everything', color: '#F59E0B' },
  { id: 'admin', name: 'Admin', description: 'Manage team and settings', color: '#8B5CF6' },
  { id: 'manager', name: 'Manager', description: 'Manage departments and issues', color: '#3B82F6' },
  { id: 'member', name: 'Member', description: 'View and contribute', color: '#10B981' },
  { id: 'viewer', name: 'Viewer', description: 'View only access', color: '#64748B' }
];

// ==========================================
// INTELLIGENCE SYSTEM
// ==========================================

export function extractTags(content) {
  const text = content.toLowerCase();
  const tags = [];
  
  // Project types
  const projectTypes = ['kitchen', 'bathroom', 'addition', 'deck', 'roofing', 'electrical', 'plumbing', 'hvac', 'basement', 'garage'];
  projectTypes.forEach(type => { if (text.includes(type)) tags.push(type); });
  
  // Business operations
  const operations = ['permit', 'schedule', 'budget', 'material', 'subcontractor', 'client', 'payment', 'safety', 'inspection', 'warranty'];
  operations.forEach(op => { if (text.includes(op)) tags.push(op); });
  
  // Status indicators
  const statuses = ['urgent', 'delayed', 'completed', 'pending', 'approved', 'rejected'];
  statuses.forEach(status => { if (text.includes(status)) tags.push(status); });
  
  // Team/HR
  const team = ['hiring', 'training', 'team', 'employee', 'contractor'];
  team.forEach(t => { if (text.includes(t)) tags.push(t); });
  
  return [...new Set(tags)];
}

export function createIntelligenceItem(sourceType, sourceId, title, content, department, metadata = {}, relevanceBoost = 1) {
  return {
    id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sourceType,
    sourceId,
    title,
    content,
    department,
    tags: extractTags(title + ' ' + content),
    metadata,
    createdAt: new Date().toISOString(),
    relevanceBoost
  };
}

export function queryIntelligence(intelligenceIndex, query, department = null, maxResults = 5) {
  if (!query || query.length < 3) return [];
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  const queryTags = extractTags(query);
  
  const scored = intelligenceIndex.map(item => {
    let score = 0;
    const itemText = (item.title + ' ' + item.content).toLowerCase();
    
    // Word matching
    queryWords.forEach(word => {
      if (itemText.includes(word)) score += 2;
      if (item.title.toLowerCase().includes(word)) score += 3;
    });
    
    // Tag matching
    queryTags.forEach(tag => {
      if (item.tags.includes(tag)) score += 4;
    });
    
    // Department bonus
    if (department && item.department === department) score += 2;
    
    // Recency bonus (items from last 7 days)
    const daysSince = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) score += 1;
    
    // Apply relevance boost
    score *= (1 + item.relevanceBoost * 0.2);
    
    return { ...item, score };
  });
  
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

export function getSourceLabel(sourceType) {
  const labels = {
    knowledge: 'Knowledge Base',
    resolved_issue: 'Resolved Issue',
    archived_issue: 'Archived Issue',
    chat_query: 'Chat History',
    document_upload: 'Document',
    issue_created: 'Active Issue',
    issue_status_change: 'Issue Update',
    issue_priority_change: 'Issue Update',
    department_change: 'Org Change',
    team_change: 'Team Update',
    voice_session: 'Voice Session',
    voice_interaction: 'Voice Query'
  };
  return labels[sourceType] || 'Reference';
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function formatTimestamp(dateString) {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getStorageUsage() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
    }
  }
  return (total / 1024 / 1024).toFixed(2); // MB
}
