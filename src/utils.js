// ============================================
// ADDITIONS TO utils.js FOR SOP BUILDER
// ============================================
// Add these to your existing utils.js file
// ============================================

// 1. ADD TO STORAGE_KEYS object:
// --------------------------------
// SOPS: 'empire_sops',

// 2. ADD NEW CONFIG (after existing configs):
// -------------------------------------------
export const SOP_CONFIG = {
  MAX_SOPS: 100,           // Maximum SOPs stored
  MAX_STEPS_PER_SOP: 20,   // Maximum steps per SOP
};

// 3. ADD TO getSourceLabel function:
// ----------------------------------
// case 'sop_created': return 'SOP';

// ============================================
// FULL STORAGE_KEYS SHOULD NOW LOOK LIKE:
// ============================================
/*
export const STORAGE_KEYS = {
  CONVERSATIONS: 'empire_conversations',
  KNOWLEDGE: 'empire_knowledge',
  ACTIVITIES: 'empire_activities',
  ISSUES: 'empire_issues',
  ISSUE_COLUMNS: 'empire_issueColumns',
  DEPARTMENTS: 'empire_departments',
  INTELLIGENCE: 'empire_intelligence',
  INTELLIGENCE_CAP: 'empire_intelligenceCap',
  TEAM_MEMBERS: 'empire_teamMembers',
  PENDING_INVITES: 'empire_pendingInvites',
  SYSTEM_INSTRUCTIONS: 'empire_systemInstructions',
  CONNECTED_DOCS: 'empire_connectedDocs',
  EMBEDDING_CACHE: 'empire_embeddingCache',
  KNOWLEDGE_GAPS: 'empire_knowledgeGaps',
  ANALYTICS: 'empire_analytics',
  CHAT_LOGS: 'empire_chatLogs',
  SOPS: 'empire_sops',  // <-- ADD THIS LINE
};
*/

// ============================================
// For quick reference, here's the updated 
// getSourceLabel function with SOP support:
// ============================================
/*
export const getSourceLabel = (sourceType) => {
  const labels = {
    knowledge: 'Knowledge Base',
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
    voice_interaction: 'Voice',
    activity_log: 'Activity',
    google_doc: 'Google Doc',
    sop_created: 'SOP',  // <-- ADD THIS LINE
  };
  return labels[sourceType] || sourceType;
};
*/
