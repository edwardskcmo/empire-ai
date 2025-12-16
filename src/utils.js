// Empire AI - Shared Utilities
// Contains storage helpers, intelligence system, and default data

import { 
  Building, TrendingUp, DollarSign, Wrench, Calculator, Users,
  ShieldCheck, ClipboardCheck, Briefcase, Target, Lightbulb, Package,
  Home, PiggyBank, UserCheck, Shield, Clipboard, BarChart, FileText,
  Folder, Star, Heart, Zap, Globe, Smartphone, Palette, BookOpen,
  Settings, LayoutDashboard, HelpCircle, MessageSquare
} from 'lucide-react';

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
  INTELLIGENCE_CAP: 'empire_intelligenceCap',
  EMBEDDING_CACHE: 'empire_embeddingCache',
};

// ============================================
// INTELLIGENCE CONFIGURATION
// ============================================
export const INTELLIGENCE_CONFIG = {
  DEFAULT_CAP: 2000,
  MIN_CAP: 500,
  MAX_CAP: 5000,
  WARNING_THRESHOLD: 0.8,
};

// ============================================
// EMBEDDING CACHE CONFIGURATION
// ============================================
export const EMBEDDING_CACHE_CONFIG = {
  MAX_ENTRIES: 100,           // Maximum cached embeddings
  EXPIRATION_HOURS: 24,       // Cache expiration time
  MIN_QUERY_LENGTH: 5,        // Minimum query length to cache
};

// ============================================
// TAG SYNONYMS MAP (Item 6)
// Maps variant tags to canonical versions
// ============================================
export const TAG_SYNONYMS = {
  // Delivery variations
  'delivery-problem': 'delivery-issue',
  'shipping-issue': 'delivery-issue',
  'shipping-problem': 'delivery-issue',
  'late-delivery': 'delivery-issue',
  
  // Schedule variations
  'late': 'delayed',
  'behind-schedule': 'delayed',
  'running-late': 'delayed',
  'postponed': 'delayed',
  
  // Budget variations
  'cost': 'budget',
  'pricing': 'budget',
  'expense': 'budget',
  'spending': 'budget',
  'financial': 'budget',
  
  // Materials variations
  'supplies': 'materials',
  'inventory': 'materials',
  'stock': 'materials',
  'parts': 'materials',
  
  // Client variations
  'customer': 'client',
  'homeowner': 'client',
  'buyer': 'client',
  
  // Team variations
  'staff': 'team',
  'employee': 'team',
  'worker': 'team',
  'crew': 'team',
  
  // Priority variations
  'critical': 'urgent',
  'emergency': 'urgent',
  'asap': 'urgent',
  'high-priority': 'urgent',
  
  // Completion variations
  'done': 'completed',
  'finished': 'completed',
  'closed': 'completed',
  
  // Safety variations
  'hazard': 'safety',
  'danger': 'safety',
  'risk': 'safety',
  'osha': 'safety',
  
  // Permit variations
  'license': 'permit',
  'approval': 'permit',
  'certification': 'permit',
  
  // Payment variations
  'invoice': 'payment',
  'billing': 'payment',
  'receivable': 'payment',
};

// ============================================
// STORAGE HELPERS
// ============================================
export const loadFromStorage = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
    return defaultValue;
  }
};

export const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
};

// ============================================
// EMBEDDING CACHE HELPERS (Item 4)
// ============================================
export const loadEmbeddingCache = () => {
  return loadFromStorage(STORAGE_KEYS.EMBEDDING_CACHE, {});
};

export const saveEmbeddingCache = (cache) => {
  saveToStorage(STORAGE_KEYS.EMBEDDING_CACHE, cache);
};

export const getCachedEmbedding = (query) => {
  const cache = loadEmbeddingCache();
  const normalizedQuery = query.toLowerCase().trim();
  const entry = cache[normalizedQuery];
  
  if (!entry) return null;
  
  // Check expiration
  const now = Date.now();
  const expirationMs = EMBEDDING_CACHE_CONFIG.EXPIRATION_HOURS * 60 * 60 * 1000;
  
  if (now - entry.timestamp > expirationMs) {
    // Expired - remove from cache
    delete cache[normalizedQuery];
    saveEmbeddingCache(cache);
    return null;
  }
  
  return entry.embedding;
};

export const setCachedEmbedding = (query, embedding) => {
  if (query.length < EMBEDDING_CACHE_CONFIG.MIN_QUERY_LENGTH) return;
  
  const cache = loadEmbeddingCache();
  const normalizedQuery = query.toLowerCase().trim();
  
  // Add new entry
  cache[normalizedQuery] = {
    embedding,
    timestamp: Date.now(),
  };
  
  // Enforce max entries (remove oldest)
  const entries = Object.entries(cache);
  if (entries.length > EMBEDDING_CACHE_CONFIG.MAX_ENTRIES) {
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, entries.length - EMBEDDING_CACHE_CONFIG.MAX_ENTRIES);
    toRemove.forEach(([key]) => delete cache[key]);
  }
  
  saveEmbeddingCache(cache);
};

export const clearExpiredEmbeddings = () => {
  const cache = loadEmbeddingCache();
  const now = Date.now();
  const expirationMs = EMBEDDING_CACHE_CONFIG.EXPIRATION_HOURS * 60 * 60 * 1000;
  
  let cleaned = 0;
  Object.keys(cache).forEach(key => {
    if (now - cache[key].timestamp > expirationMs) {
      delete cache[key];
      cleaned++;
    }
  });
  
  if (cleaned > 0) {
    saveEmbeddingCache(cache);
  }
  
  return cleaned;
};

// ============================================
// TAG NORMALIZATION (Item 6)
// ============================================
export const normalizeTag = (tag) => {
  const lowered = tag.toLowerCase().trim();
  return TAG_SYNONYMS[lowered] || lowered;
};

export const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  
  // Normalize and deduplicate
  const normalized = tags.map(normalizeTag);
  return [...new Set(normalized)];
};

// Get all unique tags with counts from intelligence index
export const getTagStats = (intelligenceIndex) => {
  const tagCounts = {};
  
  intelligenceIndex.forEach(item => {
    if (item.tags && Array.isArray(item.tags)) {
      item.tags.forEach(tag => {
        const normalized = normalizeTag(tag);
        tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
      });
    }
  });
  
  // Sort by count descending
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
};

// ============================================
// KEYWORD EXTRACTION (Fallback)
// ============================================
export const extractTags = (content) => {
  if (!content || typeof content !== 'string') return [];
  
  const text = content.toLowerCase();
  const patterns = {
    // Project types
    projectTypes: ['kitchen', 'bathroom', 'addition', 'deck', 'roofing', 'electrical', 'plumbing', 'hvac', 'basement', 'garage', 'siding', 'window', 'door', 'flooring'],
    // Business operations
    operations: ['permit', 'schedule', 'budget', 'material', 'subcontractor', 'client', 'payment', 'safety', 'inspection', 'contract', 'estimate', 'proposal'],
    // Status
    status: ['urgent', 'delayed', 'completed', 'pending', 'approved', 'denied', 'waiting'],
    // Team
    team: ['hiring', 'training', 'team', 'onboarding', 'meeting'],
  };
  
  const tags = [];
  Object.values(patterns).flat().forEach(keyword => {
    if (text.includes(keyword)) {
      tags.push(normalizeTag(keyword)); // Apply normalization
    }
  });
  
  return [...new Set(tags)];
};

// ============================================
// COSINE SIMILARITY (for embeddings)
// ============================================
export const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// ============================================
// INTELLIGENCE ITEM CREATION
// ============================================
export const createIntelligenceItem = (sourceType, sourceId, title, content, department, tags, metadata = {}, relevanceBoost = 1) => {
  return {
    id: `intel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sourceType,
    sourceId,
    title,
    content: content?.substring(0, 2000) || '',
    department,
    tags: normalizeTags(tags), // Apply normalization on creation
    metadata,
    createdAt: new Date().toISOString(),
    relevanceBoost,
    embedding: null, // Will be populated asynchronously
  };
};

// ============================================
// SEMANTIC SEARCH WITH EMBEDDINGS (Item 4 & 5)
// ============================================
export const semanticSearch = async (index, query, currentDept = null, options = {}) => {
  const {
    searchAllDepartments = false,  // Item 5: Toggle for cross-dept search
    maxResults = 10,
    useEmbeddings = true,
  } = options;
  
  if (!index || index.length === 0) return [];
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  let queryEmbedding = null;
  let embeddingSource = 'none';
  
  // Try to get embedding for query
  if (useEmbeddings) {
    // Check cache first (Item 4)
    const cached = getCachedEmbedding(query);
    if (cached) {
      queryEmbedding = cached;
      embeddingSource = 'cache';
    } else {
      // Generate new embedding
      try {
        const response = await fetch('/api/generate-embedding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: query }),
        });
        
        if (response.ok) {
          const data = await response.json();
          queryEmbedding = data.embedding;
          embeddingSource = 'api';
          
          // Cache for future use (Item 4)
          setCachedEmbedding(query, queryEmbedding);
        }
      } catch (error) {
        console.log('Embedding generation failed, using keyword search:', error);
      }
    }
  }
  
  // Score each item
  const scored = index.map(item => {
    let score = 0;
    
    // 1. Semantic similarity (if embeddings available)
    if (queryEmbedding && item.embedding) {
      const similarity = cosineSimilarity(queryEmbedding, item.embedding);
      score += similarity * 50; // 0-50 points for semantic match
    }
    
    // 2. Title word matches
    const titleLower = (item.title || '').toLowerCase();
    queryWords.forEach(word => {
      if (titleLower.includes(word)) score += 10;
    });
    
    // 3. Content word matches
    const contentLower = (item.content || '').toLowerCase();
    queryWords.forEach(word => {
      if (contentLower.includes(word)) score += 3;
    });
    
    // 4. Tag matches (normalized)
    const normalizedQueryTags = extractTags(query);
    if (item.tags && Array.isArray(item.tags)) {
      normalizedQueryTags.forEach(qTag => {
        if (item.tags.includes(qTag)) score += 8;
      });
    }
    
    // 5. Department bonus (Item 5: can be disabled)
    if (!searchAllDepartments && currentDept && item.department) {
      const deptLower = item.department.toLowerCase();
      const currentLower = currentDept.toLowerCase();
      if (deptLower.includes(currentLower) || currentLower.includes(deptLower)) {
        score += 5;
      }
    }
    
    // 6. Recency scoring (gradual decay instead of hard cutoffs - Item 2)
    const daysOld = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 10 - (daysOld / 10)); // Decays over 100 days
    score += recencyScore;
    
    // 7. Relevance boost multiplier
    score *= (1 + (item.relevanceBoost || 0) * 0.3);
    
    return { ...item, score, embeddingSource };
  });
  
  // Sort and return top results
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
};

// ============================================
// LEGACY QUERY INTELLIGENCE (keyword-based fallback)
// ============================================
export const queryIntelligence = (index, query, currentDept = null) => {
  if (!index || index.length === 0) return [];
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  return index
    .map(item => {
      let score = 0;
      
      // Title matches
      const titleLower = (item.title || '').toLowerCase();
      queryWords.forEach(word => {
        if (titleLower.includes(word)) score += 10;
      });
      
      // Content matches
      const contentLower = (item.content || '').toLowerCase();
      queryWords.forEach(word => {
        if (contentLower.includes(word)) score += 3;
      });
      
      // Tag matches
      if (item.tags && Array.isArray(item.tags)) {
        queryWords.forEach(word => {
          if (item.tags.some(tag => tag.includes(word))) score += 5;
        });
      }
      
      // Department bonus
      if (currentDept && item.department) {
        const deptLower = item.department.toLowerCase();
        const currentLower = currentDept.toLowerCase();
        if (deptLower.includes(currentLower) || currentLower.includes(deptLower)) {
          score += 5;
        }
      }
      
      // Recency bonus (gradual decay)
      const daysOld = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 10 - (daysOld / 10));
      
      // Boost multiplier
      score *= (1 + (item.relevanceBoost || 0) * 0.3);
      
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
};

// ============================================
// SOURCE TYPE LABELS
// ============================================
export const getSourceLabel = (sourceType) => {
  const labels = {
    knowledge: 'Knowledge Base',
    resolved_issue: 'Resolved Issue',
    archived_issue: 'Archived Issue',
    chat_query: 'Chat History',
    document_upload: 'Document',
    issue_created: 'Active Issue',
    issue_status_change: 'Issue Update',
    issue_priority_change: 'Priority Change',
    department_change: 'Org Change',
    team_change: 'Team Update',
    voice_session: 'Voice Session',
    voice_interaction: 'Voice Chat',
    activity_log: 'Activity',
    google_doc: 'Google Doc',
  };
  return labels[sourceType] || 'Knowledge';
};

// ============================================
// DATE/TIME HELPERS
// ============================================
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

// ============================================
// ID & UTILITY HELPERS
// ============================================
export const generateId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getInitials = (name) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const getStorageUsage = () => {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length * 2; // UTF-16
    }
  }
  return (total / 1024 / 1024).toFixed(2);
};

// ============================================
// ICON MAPPING
// ============================================
export const ICON_MAP = {
  Building, TrendingUp, DollarSign, Wrench, Calculator, Users,
  ShieldCheck, ClipboardCheck, Briefcase, Target, Lightbulb, Package,
  Home, PiggyBank, UserCheck, Shield, Clipboard, BarChart, FileText,
  Folder, Star, Heart, Zap, Globe, Smartphone, Palette, BookOpen,
  Settings, LayoutDashboard, HelpCircle, MessageSquare
};

export const renderDeptIcon = (iconName, size = 20, className = '') => {
  if (!iconName) return null;
  
  // Check if it's a Lucide icon name (starts with capital letter)
  if (typeof iconName === 'string' && /^[A-Z]/.test(iconName)) {
    const IconComponent = ICON_MAP[iconName];
    if (IconComponent) {
      return <IconComponent size={size} className={className} />;
    }
  }
  
  // Otherwise treat as emoji
  return <span style={{ fontSize: size }}>{iconName}</span>;
};

// ============================================
// DEFAULT DATA
// ============================================
export const DEFAULT_DEPARTMENTS = [
  { id: 'company', name: 'Company-Wide', icon: 'Building', color: '#3B82F6', description: 'Cross-functional and company-wide topics', instructions: '' },
  { id: 'marketing', name: 'Marketing & Lead Generation', icon: 'TrendingUp', color: '#8B5CF6', description: 'Campaigns, leads, and brand management', instructions: '' },
  { id: 'sales', name: 'Sales & Estimating', icon: 'DollarSign', color: '#10B981', description: 'Proposals, estimates, and client relationships', instructions: '' },
  { id: 'production', name: 'Production & Project Management', icon: 'Wrench', color: '#F59E0B', description: 'Schedules, subcontractors, and job site operations', instructions: '' },
  { id: 'financial', name: 'Financial & Bookkeeping', icon: 'Calculator', color: '#059669', description: 'Budgets, invoicing, and financial reports', instructions: '' },
  { id: 'hr', name: 'HR & Training', icon: 'Users', color: '#EC4899', description: 'Hiring, onboarding, and team development', instructions: '' },
  { id: 'safety', name: 'Safety & Compliance', icon: 'ShieldCheck', color: '#EF4444', description: 'OSHA compliance, safety protocols, and inspections', instructions: '' },
  { id: 'operations', name: 'Operations & Admin', icon: 'ClipboardCheck', color: '#64748B', description: 'Processes, systems, and administrative tasks', instructions: '' },
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
