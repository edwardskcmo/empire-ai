// Empire AI - Shared Utilities & Helpers
// Updated with Smart RAG semantic search

// ============================================
// STORAGE KEYS
// ============================================
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
  SYSTEM_INSTRUCTIONS: 'empire_systemInstructions',
  CONNECTED_DOCS: 'empire_connectedDocs',
};

// ============================================
// STORAGE HELPERS
// ============================================
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

// ============================================
// INTELLIGENCE SYSTEM - SEMANTIC SEARCH (RAG)
// ============================================

// Calculate cosine similarity between two embedding vectors
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Legacy keyword extraction (fallback)
export const extractTags = (content) => {
  if (!content) return [];
  const text = content.toLowerCase();
  const patterns = [
    'kitchen', 'bathroom', 'addition', 'deck', 'roofing', 'electrical', 'plumbing', 'hvac',
    'permit', 'schedule', 'budget', 'material', 'subcontractor', 'client', 'payment', 'safety',
    'urgent', 'delayed', 'completed', 'hiring', 'training', 'team'
  ];
  return patterns.filter(p => text.includes(p));
};

// Create an intelligence item (enhanced with embedding placeholder)
export const createIntelligenceItem = (sourceType, sourceId, title, content, department, tags = [], metadata = {}, relevanceBoost = 0, embedding = null) => ({
  id: generateId('intel'),
  sourceType,
  sourceId,
  title,
  content: content?.substring(0, 2000) || '',
  department,
  tags,
  metadata,
  createdAt: new Date().toISOString(),
  relevanceBoost,
  embedding, // NEW: Vector embedding for semantic search
});

// Smart query with hybrid search (semantic + keyword)
export const queryIntelligence = (index, query, department = null, queryEmbedding = null) => {
  if (!index || index.length === 0) return [];
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  const scored = index.map(item => {
    let score = 0;
    
    // === SEMANTIC SCORE (if embeddings available) ===
    if (queryEmbedding && item.embedding) {
      const similarity = cosineSimilarity(queryEmbedding, item.embedding);
      // Similarity ranges from -1 to 1, we scale it to 0-50 points
      score += Math.max(0, similarity * 50);
    }
    
    // === KEYWORD MATCHING (always runs) ===
    const titleLower = (item.title || '').toLowerCase();
    const contentLower = (item.content || '').toLowerCase();
    
    // Title matches (high value)
    queryWords.forEach(word => {
      if (titleLower.includes(word)) score += 10;
    });
    
    // Content matches
    queryWords.forEach(word => {
      if (contentLower.includes(word)) score += 3;
    });
    
    // Tag matches (high value)
    if (item.tags && item.tags.length > 0) {
      queryWords.forEach(word => {
        if (item.tags.some(tag => tag.toLowerCase().includes(word))) {
          score += 8;
        }
      });
    }
    
    // === DEPARTMENT BONUS ===
    if (department && item.department === department) {
      score += 5;
    }
    
    // === RECENCY BONUS ===
    const age = Date.now() - new Date(item.createdAt).getTime();
    const daysOld = age / (1000 * 60 * 60 * 24);
    if (daysOld < 7) score += 5;
    else if (daysOld < 30) score += 2;
    
    // === RELEVANCE BOOST (from source type) ===
    score += (item.relevanceBoost || 0) * 3;
    
    return { ...item, score };
  });
  
  // Filter items with score > 0 and sort by score
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Return top 10 matches
};

// Get display label for intelligence source types
export const getSourceLabel = (sourceType) => {
  const labels = {
    'knowledge': 'Knowledge Base',
    'resolved_issue': 'Resolved Issue',
    'archived_issue': 'Archived Issue',
    'chat_query': 'Chat Conversation',
    'document_upload': 'Document',
    'issue_created': 'Issue Logged',
    'issue_status_change': 'Issue Update',
    'issue_priority_change': 'Priority Change',
    'department_change': 'Org Change',
    'team_change': 'Team Update',
    'voice_session': 'Voice Session',
    'voice_interaction': 'Voice Query',
    'activity_log': 'Activity',
    'google_doc': 'Google Doc',
  };
  return labels[sourceType] || sourceType;
};

// ============================================
// FORMATTING HELPERS
// ============================================
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

export const formatTimestamp = (dateString) => {
  return new Date(dateString).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const generateId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const getStorageUsage = () => {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
    }
  }
  return (total / 1024 / 1024).toFixed(2); // MB
};

// ============================================
// DEFAULT DATA
// ============================================
export const DEFAULT_DEPARTMENTS = [
  { id: 'company', name: 'Company-Wide', icon: 'Building', color: '#3B82F6', description: 'Cross-functional topics and company-wide initiatives', instructions: '' },
  { id: 'marketing', name: 'Marketing & Lead Generation', icon: 'TrendingUp', color: '#8B5CF6', description: 'Lead gen, campaigns, brand awareness', instructions: '' },
  { id: 'sales', name: 'Sales & Estimating', icon: 'DollarSign', color: '#10B981', description: 'Estimates, proposals, closing deals', instructions: '' },
  { id: 'production', name: 'Production & Project Management', icon: 'Wrench', color: '#F59E0B', description: 'Active projects, scheduling, quality', instructions: '' },
  { id: 'financial', name: 'Financial & Bookkeeping', icon: 'Calculator', color: '#10B981', description: 'Budgets, invoicing, cash flow', instructions: '' },
  { id: 'hr', name: 'HR & Training', icon: 'Users', color: '#EC4899', description: 'Hiring, onboarding, team development', instructions: '' },
  { id: 'safety', name: 'Safety & Compliance', icon: 'ShieldCheck', color: '#EF4444', description: 'OSHA, protocols, incident prevention', instructions: '' },
  { id: 'operations', name: 'Operations & Admin', icon: 'ClipboardCheck', color: '#64748B', description: 'Processes, systems, efficiency', instructions: '' },
];

export const DEFAULT_TEAM_MEMBER = {
  id: 'owner_1',
  name: 'Empire Admin',
  email: 'admin@empireremodeling.com',
  role: 'owner',
  status: 'active',
  avatar: 'EA',
  departments: [],
  joinedAt: '2024-01-01T00:00:00.000Z',
};

export const DEFAULT_COLUMNS = [
  { id: 'title', name: 'Issue', width: 200, visible: true },
  { id: 'department', name: 'Department', width: 150, visible: true },
  { id: 'priority', name: 'Priority', width: 100, visible: true },
  { id: 'status', name: 'Status', width: 120, visible: true },
  { id: 'assignee', name: 'Assignee', width: 120, visible: true },
  { id: 'createdAt', name: 'Created', width: 100, visible: true },
  { id: 'actions', name: 'Actions', width: 80, visible: true },
];

export const ROLES = [
  { id: 'owner', name: 'Owner', description: 'Full access to everything', color: '#F59E0B' },
  { id: 'admin', name: 'Admin', description: 'Manage team and settings', color: '#8B5CF6' },
  { id: 'manager', name: 'Manager', description: 'Manage departments and issues', color: '#3B82F6' },
  { id: 'member', name: 'Member', description: 'View and contribute', color: '#10B981' },
  { id: 'viewer', name: 'Viewer', description: 'View only access', color: '#64748B' },
];
