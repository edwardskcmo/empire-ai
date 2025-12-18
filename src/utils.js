// Empire AI - Utility Functions
// Version 3.2 - With Chat Logs and SOP Builder Support

// ============ STORAGE KEYS ============
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
  INTELLIGENCE_CAP: 'empire_intelligenceCap',
  EMBEDDING_CACHE: 'empire_embeddingCache',
  KNOWLEDGE_GAPS: 'empire_knowledgeGaps',
  ANALYTICS: 'empire_analytics',
  CHAT_LOGS: 'empire_chatLogs',
  SOPS: 'empire_sops',
};

// ============ INTELLIGENCE CONFIG ============
export const INTELLIGENCE_CONFIG = {
  DEFAULT_CAP: 2000,
  MIN_CAP: 500,
  MAX_CAP: 5000,
  WARNING_THRESHOLD: 0.8,
};

// ============ EMBEDDING CACHE CONFIG ============
export const EMBEDDING_CACHE_CONFIG = {
  MAX_ENTRIES: 100,
  EXPIRATION_HOURS: 24,
  MIN_QUERY_LENGTH: 5,
};

// ============ KNOWLEDGE GAPS CONFIG ============
export const KNOWLEDGE_GAPS_CONFIG = {
  LOW_RELEVANCE_THRESHOLD: 20,
  MAX_GAPS: 50,
  MIN_QUERY_LENGTH: 10,
};

// ============ ANALYTICS CONFIG ============
export const ANALYTICS_CONFIG = {
  RETENTION_DAYS: 90,
};

// ============ CHAT LOGS CONFIG ============
export const CHAT_LOGS_CONFIG = {
  MAX_LOGS: 50,
  MAX_LOGS_PER_DEPT: 20,
};

// ============ SOP CONFIG ============
export const SOP_CONFIG = {
  MAX_SOPS: 100,
  MAX_STEPS_PER_SOP: 20,
};

// ============ TAG SYNONYMS ============
export const TAG_SYNONYMS = {
  'delivery-problem': 'delivery-issue',
  'shipping-issue': 'delivery-issue',
  'shipping-problem': 'delivery-issue',
  'late': 'delayed',
  'behind-schedule': 'delayed',
  'overdue': 'delayed',
  'cost': 'budget',
  'price': 'budget',
  'expense': 'budget',
  'customer': 'client',
  'homeowner': 'client',
  'staff': 'team',
  'employee': 'team',
  'worker': 'team',
  'critical': 'urgent',
  'emergency': 'urgent',
  'asap': 'urgent',
  'fix': 'repair',
  'broken': 'repair',
  'damaged': 'repair',
  'meeting': 'scheduling',
  'appointment': 'scheduling',
  'calendar': 'scheduling',
  'invoice': 'payment',
  'bill': 'payment',
  'money': 'payment',
  'contract': 'agreement',
  'proposal': 'agreement',
  'sub': 'subcontractor',
  'vendor': 'supplier',
  'order': 'materials',
  'supplies': 'materials',
  'permit-issue': 'permit',
  'licensing': 'permit',
  'inspection-issue': 'inspection',
  'code-violation': 'inspection',
};

// ============ STORAGE HELPERS ============
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
    console.error('Storage save failed:', e);
  }
};

// ============ EMBEDDING CACHE ============
export const getCachedEmbedding = (query) => {
  const cache = loadFromStorage(STORAGE_KEYS.EMBEDDING_CACHE, {});
  const normalizedQuery = query.toLowerCase().trim();
  const cached = cache[normalizedQuery];
  
  if (!cached) return null;
  
  const hoursSinceCached = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
  if (hoursSinceCached > EMBEDDING_CACHE_CONFIG.EXPIRATION_HOURS) {
    return null;
  }
  
  return cached.embedding;
};

export const setCachedEmbedding = (query, embedding) => {
  if (query.length < EMBEDDING_CACHE_CONFIG.MIN_QUERY_LENGTH) return;
  
  const cache = loadFromStorage(STORAGE_KEYS.EMBEDDING_CACHE, {});
  const normalizedQuery = query.toLowerCase().trim();
  
  cache[normalizedQuery] = {
    embedding,
    timestamp: Date.now(),
  };
  
  const entries = Object.entries(cache);
  if (entries.length > EMBEDDING_CACHE_CONFIG.MAX_ENTRIES) {
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const newCache = Object.fromEntries(entries.slice(-EMBEDDING_CACHE_CONFIG.MAX_ENTRIES));
    saveToStorage(STORAGE_KEYS.EMBEDDING_CACHE, newCache);
  } else {
    saveToStorage(STORAGE_KEYS.EMBEDDING_CACHE, cache);
  }
};

export const clearExpiredEmbeddings = () => {
  const cache = loadFromStorage(STORAGE_KEYS.EMBEDDING_CACHE, {});
  const now = Date.now();
  const expirationMs = EMBEDDING_CACHE_CONFIG.EXPIRATION_HOURS * 60 * 60 * 1000;
  
  const validCache = {};
  for (const [query, data] of Object.entries(cache)) {
    if (now - data.timestamp < expirationMs) {
      validCache[query] = data;
    }
  }
  
  saveToStorage(STORAGE_KEYS.EMBEDDING_CACHE, validCache);
  return Object.keys(validCache).length;
};

// ============ TAG NORMALIZATION ============
export const normalizeTag = (tag) => {
  const lower = tag.toLowerCase().trim();
  return TAG_SYNONYMS[lower] || lower;
};

export const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  const normalized = tags.map(normalizeTag);
  return [...new Set(normalized)];
};

export const getTagStats = (intelligenceIndex) => {
  const tagCounts = {};
  for (const item of intelligenceIndex) {
    if (item.tags && Array.isArray(item.tags)) {
      for (const tag of item.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
  }
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
};

// ============ DUPLICATE DETECTION ============
export const DUPLICATE_CONFIG = {
  SIMILARITY_THRESHOLD: 0.85,
  TITLE_WEIGHT: 0.4,
  CONTENT_WEIGHT: 0.6,
  COMPARE_CHARS: 300,
};

export const calculateStringSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const words1 = new Set(s1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(s2.split(/\s+/).filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
};

export const checkForDuplicate = (newItem, intelligenceIndex) => {
  const { title, content, sourceType, department } = newItem;
  
  for (const existing of intelligenceIndex) {
    if (existing.sourceType !== sourceType) continue;
    if (existing.department !== department) continue;
    
    const titleSim = calculateStringSimilarity(title, existing.title);
    
    const newContent = (content || '').substring(0, DUPLICATE_CONFIG.COMPARE_CHARS);
    const existingContent = (existing.content || '').substring(0, DUPLICATE_CONFIG.COMPARE_CHARS);
    const contentSim = calculateStringSimilarity(newContent, existingContent);
    
    const totalSim = (titleSim * DUPLICATE_CONFIG.TITLE_WEIGHT) + 
                     (contentSim * DUPLICATE_CONFIG.CONTENT_WEIGHT);
    
    if (totalSim >= DUPLICATE_CONFIG.SIMILARITY_THRESHOLD) {
      return {
        isDuplicate: true,
        existingItem: existing,
        similarity: totalSim,
      };
    }
  }
  
  return { isDuplicate: false };
};

// ============ KNOWLEDGE GAPS ============
export const recordKnowledgeGap = (query, topScore, department) => {
  if (!query || query.length < KNOWLEDGE_GAPS_CONFIG.MIN_QUERY_LENGTH) return;
  if (topScore >= KNOWLEDGE_GAPS_CONFIG.LOW_RELEVANCE_THRESHOLD) return;
  
  const gaps = loadFromStorage(STORAGE_KEYS.KNOWLEDGE_GAPS, []);
  
  const existingIndex = gaps.findIndex(g => 
    calculateStringSimilarity(g.query, query) > 0.7
  );
  
  if (existingIndex >= 0) {
    gaps[existingIndex].count = (gaps[existingIndex].count || 1) + 1;
    gaps[existingIndex].lastAsked = new Date().toISOString();
    gaps[existingIndex].topScore = Math.max(gaps[existingIndex].topScore, topScore);
  } else {
    gaps.unshift({
      id: `gap_${Date.now()}`,
      query: query,
      department: department,
      topScore: topScore,
      count: 1,
      firstAsked: new Date().toISOString(),
      lastAsked: new Date().toISOString(),
      resolved: false,
    });
  }
  
  const trimmedGaps = gaps.slice(0, KNOWLEDGE_GAPS_CONFIG.MAX_GAPS);
  saveToStorage(STORAGE_KEYS.KNOWLEDGE_GAPS, trimmedGaps);
};

export const getKnowledgeGaps = () => {
  return loadFromStorage(STORAGE_KEYS.KNOWLEDGE_GAPS, []);
};

export const resolveKnowledgeGap = (gapId) => {
  const gaps = loadFromStorage(STORAGE_KEYS.KNOWLEDGE_GAPS, []);
  const updated = gaps.map(g => 
    g.id === gapId ? { ...g, resolved: true, resolvedAt: new Date().toISOString() } : g
  );
  saveToStorage(STORAGE_KEYS.KNOWLEDGE_GAPS, updated);
};

export const deleteKnowledgeGap = (gapId) => {
  const gaps = loadFromStorage(STORAGE_KEYS.KNOWLEDGE_GAPS, []);
  const filtered = gaps.filter(g => g.id !== gapId);
  saveToStorage(STORAGE_KEYS.KNOWLEDGE_GAPS, filtered);
};

export const clearResolvedGaps = () => {
  const gaps = loadFromStorage(STORAGE_KEYS.KNOWLEDGE_GAPS, []);
  const unresolved = gaps.filter(g => !g.resolved);
  saveToStorage(STORAGE_KEYS.KNOWLEDGE_GAPS, unresolved);
  return gaps.length - unresolved.length;
};

// ============ ANALYTICS TRACKING ============
const getAnalyticsData = () => {
  return loadFromStorage(STORAGE_KEYS.ANALYTICS, {
    chatMessages: { total: 0, byDepartment: {}, byDate: {} },
    voiceSessions: { total: 0, byDate: {} },
    issuesCreated: { total: 0, byPriority: {}, byDepartment: {}, byDate: {} },
    issuesResolved: { total: 0, byDate: {} },
    docsConnected: { total: 0, byType: {} },
    knowledgeAdded: { total: 0, byDepartment: {}, byDate: {} },
    searches: { total: 0, cacheHits: 0, byDate: {} },
    firstTracked: null,
    lastUpdated: null,
  });
};

const saveAnalyticsData = (data) => {
  data.lastUpdated = new Date().toISOString();
  if (!data.firstTracked) data.firstTracked = data.lastUpdated;
  saveToStorage(STORAGE_KEYS.ANALYTICS, data);
};

const getDateKey = () => {
  return new Date().toISOString().split('T')[0];
};

export const trackChatMessage = (department) => {
  const data = getAnalyticsData();
  const dateKey = getDateKey();
  
  data.chatMessages.total++;
  data.chatMessages.byDepartment[department] = (data.chatMessages.byDepartment[department] || 0) + 1;
  data.chatMessages.byDate[dateKey] = (data.chatMessages.byDate[dateKey] || 0) + 1;
  
  saveAnalyticsData(data);
};

export const trackVoiceSession = () => {
  const data = getAnalyticsData();
  const dateKey = getDateKey();
  
  data.voiceSessions.total++;
  data.voiceSessions.byDate[dateKey] = (data.voiceSessions.byDate[dateKey] || 0) + 1;
  
  saveAnalyticsData(data);
};

export const trackIssueCreated = (priority, department) => {
  const data = getAnalyticsData();
  const dateKey = getDateKey();
  
  data.issuesCreated.total++;
  data.issuesCreated.byPriority[priority] = (data.issuesCreated.byPriority[priority] || 0) + 1;
  data.issuesCreated.byDepartment[department] = (data.issuesCreated.byDepartment[department] || 0) + 1;
  data.issuesCreated.byDate[dateKey] = (data.issuesCreated.byDate[dateKey] || 0) + 1;
  
  saveAnalyticsData(data);
};

export const trackIssueResolved = () => {
  const data = getAnalyticsData();
  const dateKey = getDateKey();
  
  data.issuesResolved.total++;
  data.issuesResolved.byDate[dateKey] = (data.issuesResolved.byDate[dateKey] || 0) + 1;
  
  saveAnalyticsData(data);
};

export const trackDocConnected = (docType) => {
  const data = getAnalyticsData();
  
  data.docsConnected.total++;
  data.docsConnected.byType[docType] = (data.docsConnected.byType[docType] || 0) + 1;
  
  saveAnalyticsData(data);
};

export const trackKnowledgeAdded = (department) => {
  const data = getAnalyticsData();
  const dateKey = getDateKey();
  
  data.knowledgeAdded.total++;
  data.knowledgeAdded.byDepartment[department] = (data.knowledgeAdded.byDepartment[department] || 0) + 1;
  data.knowledgeAdded.byDate[dateKey] = (data.knowledgeAdded.byDate[dateKey] || 0) + 1;
  
  saveAnalyticsData(data);
};

export const trackSearch = (cacheHit) => {
  const data = getAnalyticsData();
  const dateKey = getDateKey();
  
  data.searches.total++;
  if (cacheHit) data.searches.cacheHits++;
  data.searches.byDate[dateKey] = (data.searches.byDate[dateKey] || 0) + 1;
  
  saveAnalyticsData(data);
};

export const getAnalytics = () => {
  return getAnalyticsData();
};

export const getAnalyticsSummary = () => {
  const data = getAnalyticsData();
  const dateKey = getDateKey();
  
  let weekMessages = 0, weekVoice = 0, weekIssues = 0, weekSearches = 0;
  
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    weekMessages += data.chatMessages.byDate[key] || 0;
    weekVoice += data.voiceSessions.byDate[key] || 0;
    weekIssues += data.issuesCreated.byDate[key] || 0;
    weekSearches += data.searches.byDate[key] || 0;
  }
  
  return {
    allTime: {
      chatMessages: data.chatMessages.total,
      voiceSessions: data.voiceSessions.total,
      issuesCreated: data.issuesCreated.total,
      issuesResolved: data.issuesResolved.total,
      docsConnected: data.docsConnected.total,
      knowledgeAdded: data.knowledgeAdded.total,
      searches: data.searches.total,
      cacheHitRate: data.searches.total > 0 
        ? Math.round((data.searches.cacheHits / data.searches.total) * 100) 
        : 0,
    },
    thisWeek: {
      chatMessages: weekMessages,
      voiceSessions: weekVoice,
      issuesCreated: weekIssues,
      searches: weekSearches,
    },
    today: {
      chatMessages: data.chatMessages.byDate[dateKey] || 0,
      voiceSessions: data.voiceSessions.byDate[dateKey] || 0,
      issuesCreated: data.issuesCreated.byDate[dateKey] || 0,
      searches: data.searches.byDate[dateKey] || 0,
    },
    topDepartments: Object.entries(data.chatMessages.byDepartment)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    firstTracked: data.firstTracked,
    lastUpdated: data.lastUpdated,
  };
};

export const resetAnalytics = () => {
  saveToStorage(STORAGE_KEYS.ANALYTICS, null);
};

// ============ CONVERSATION MEMORY ============
export const CONVERSATION_MEMORY_CONFIG = {
  MAX_MESSAGES_PER_DEPT: 20,
  SUMMARY_TRIGGER: 10,
};

export const getConversationSummary = (messages) => {
  if (!messages || messages.length === 0) return null;
  
  const userMessages = messages
    .filter(m => m.role === 'user')
    .slice(-5)
    .map(m => m.content.substring(0, 100));
  
  if (userMessages.length === 0) return null;
  
  return `Recent topics discussed: ${userMessages.join('; ')}`;
};

export const trimConversationHistory = (messages) => {
  if (!messages || messages.length <= CONVERSATION_MEMORY_CONFIG.MAX_MESSAGES_PER_DEPT) {
    return messages;
  }
  return messages.slice(-CONVERSATION_MEMORY_CONFIG.MAX_MESSAGES_PER_DEPT);
};

// ============ INTELLIGENCE HELPERS ============
export const extractTags = (content) => {
  if (!content) return [];
  const lower = content.toLowerCase();
  const tags = [];
  
  const patterns = [
    'kitchen', 'bathroom', 'addition', 'deck', 'roofing', 'electrical', 
    'plumbing', 'hvac', 'permit', 'schedule', 'budget', 'material',
    'subcontractor', 'client', 'payment', 'safety', 'urgent', 'delayed',
    'completed', 'hiring', 'training', 'team', 'inspection', 'warranty',
    'foundation', 'framing', 'drywall', 'paint', 'flooring', 'tile',
    'cabinet', 'countertop', 'appliance', 'fixture', 'demo', 'cleanup',
    'sop', 'procedure', 'process', 'checklist', 'workflow'
  ];
  
  for (const pattern of patterns) {
    if (lower.includes(pattern)) tags.push(pattern);
  }
  
  return normalizeTags(tags);
};

export const createIntelligenceItem = (sourceType, sourceId, title, content, department, tags = [], metadata = {}, boost = 1) => {
  return {
    id: `intel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sourceType,
    sourceId,
    title,
    content,
    department,
    tags: normalizeTags(tags.length > 0 ? tags : extractTags(content)),
    metadata,
    createdAt: new Date().toISOString(),
    relevanceBoost: boost,
  };
};

export const queryIntelligence = (index, query, dept = null, limit = 5) => {
  if (!query || !index.length) return [];
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  const scored = index.map(item => {
    let score = 0;
    const titleLower = (item.title || '').toLowerCase();
    const contentLower = (item.content || '').toLowerCase();
    
    for (const word of queryWords) {
      if (titleLower.includes(word)) score += 10;
      if (contentLower.includes(word)) score += 3;
      if (item.tags?.some(t => t.includes(word))) score += 8;
    }
    
    if (dept && item.department === dept) score += 5;
    
    const daysSinceCreated = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 10 - (daysSinceCreated / 10));
    
    score *= (1 + (item.relevanceBoost || 0) / 3);
    
    return { ...item, score };
  });
  
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

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
    'voice_interaction': 'Voice Chat',
    'activity_log': 'Activity',
    'google_doc': 'Google Doc',
    'sop_created': 'SOP',
  };
  return labels[sourceType] || sourceType;
};

// ============ GENERAL HELPERS ============
export const formatDate = (dateString) => {
  if (!dateString) return '';
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
};

export const formatTimestamp = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const generateId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getInitials = (name) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const getStorageUsage = () => {
  let total = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length * 2;
    }
  }
  return (total / 1024 / 1024).toFixed(2);
};

// ============ DEFAULT DATA ============
export const DEFAULT_DEPARTMENTS = [
  { id: 'company', name: 'Company-Wide', icon: 'Building', color: '#3B82F6', description: 'Cross-functional topics', instructions: '' },
  { id: 'marketing', name: 'Marketing & Lead Generation', icon: 'TrendingUp', color: '#8B5CF6', description: 'Campaigns, leads, brand', instructions: '' },
  { id: 'sales', name: 'Sales & Estimating', icon: 'DollarSign', color: '#10B981', description: 'Proposals, pricing, closing', instructions: '' },
  { id: 'production', name: 'Production & Project Management', icon: 'Wrench', color: '#F59E0B', description: 'Schedules, quality, execution', instructions: '' },
  { id: 'financial', name: 'Financial & Bookkeeping', icon: 'Calculator', color: '#059669', description: 'Budget, payments, P&L', instructions: '' },
  { id: 'hr', name: 'HR & Training', icon: 'Users', color: '#EC4899', description: 'Hiring, development, culture', instructions: '' },
  { id: 'safety', name: 'Safety & Compliance', icon: 'ShieldCheck', color: '#EF4444', description: 'OSHA, protocols, incidents', instructions: '' },
  { id: 'operations', name: 'Operations & Admin', icon: 'ClipboardCheck', color: '#64748B', description: 'Systems, processes, office', instructions: '' },
];

export const DEFAULT_TEAM_MEMBER = {
  id: 'owner_1',
  name: 'Empire Admin',
  email: 'admin@empireremodeling.com',
  role: 'owner',
  status: 'active',
  avatar: 'EA',
  departments: [],
  joinedAt: '2024-01-01',
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
