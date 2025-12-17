import React, { useState, useEffect } from 'react';
import { 
  FileText, Sparkles, ChevronRight, ChevronDown, Plus, Save, 
  MessageSquare, CheckCircle, Edit3, Trash2, GripVertical,
  Building, AlertCircle, BookOpen, RefreshCw, X, Clock,
  ChevronUp, Eye, Search, Filter
} from 'lucide-react';
import { STORAGE_KEYS, loadFromStorage, saveToStorage, SOP_CONFIG, generateId, formatDate } from '../utils';

export default function SOPs({ 
  departments, 
  knowledge,
  setKnowledge,
  logActivity, 
  addToIntelligence 
}) {
  // View mode: 'builder' or 'library'
  const [viewMode, setViewMode] = useState('library');
  
  // Builder state
  const [stage, setStage] = useState('input'); // input, questions, generating, review
  const [idea, setIdea] = useState('');
  const [selectedDept, setSelectedDept] = useState(departments[0]?.id || '');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [generatedSOP, setGeneratedSOP] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});
  const [stepNotes, setStepNotes] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  
  // Library state
  const [savedSOPs, setSavedSOPs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [expandedSOP, setExpandedSOP] = useState(null);
  
  // Load saved SOPs from localStorage
  useEffect(() => {
    const stored = loadFromStorage(STORAGE_KEYS.SOPS, []);
    setSavedSOPs(stored);
  }, []);
  
  // Save SOPs to localStorage when changed
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SOPS, savedSOPs);
  }, [savedSOPs]);

  // Generate questions based on the idea
  const generateQuestions = async () => {
    if (!idea.trim()) return;
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Based on this SOP idea, generate 5-7 clarifying questions that will help create a detailed, actionable standard operating procedure. Return ONLY a JSON array of objects with "question" and "hint" fields. No other text.

SOP Idea: "${idea}"

Example format:
[
  {"question": "Who is responsible for this process?", "hint": "e.g., Project Manager, Lead Carpenter"},
  {"question": "What triggers this process?", "hint": "e.g., New contract signed, material delivery"}
]`,
          systemPrompt: 'You are an SOP expert. Return only valid JSON array with question objects. No markdown, no explanation.',
          conversationHistory: []
        })
      });
      
      const data = await response.json();
      let parsed;
      
      try {
        // Try to parse the response as JSON
        const jsonMatch = data.response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch {
        // Fallback to default questions
        parsed = getDefaultQuestions();
      }
      
      setQuestions(parsed.map((q, i) => ({ id: i + 1, ...q })));
      setStage('questions');
    } catch (error) {
      console.error('Error generating questions:', error);
      // Use default questions on error
      setQuestions(getDefaultQuestions().map((q, i) => ({ id: i + 1, ...q })));
      setStage('questions');
    }
    
    setIsGenerating(false);
  };
  
  const getDefaultQuestions = () => [
    { question: "Who is the primary person responsible for this process?", hint: "e.g., Project Manager, Lead Carpenter, Office Admin" },
    { question: "What triggers this process to start?", hint: "e.g., New project signed, material delivery, customer complaint" },
    { question: "What tools, materials, or systems are needed?", hint: "e.g., Software, equipment, forms, safety gear" },
    { question: "Are there any safety considerations or compliance requirements?", hint: "e.g., OSHA rules, permits, inspections" },
    { question: "What does successful completion look like?", hint: "e.g., Signed off by customer, uploaded to system, inspection passed" },
    { question: "How long should this process typically take?", hint: "e.g., 30 minutes, 2 hours, 1 day" },
    { question: "What are common mistakes or issues to avoid?", hint: "e.g., Missing signatures, wrong materials, skipped steps" },
  ];

  // Generate the SOP based on idea and answers
  const generateSOP = async () => {
    setStage('generating');
    setIsGenerating(true);
    
    const answersText = questions.map(q => 
      `Q: ${q.question}\nA: ${answers[q.id] || 'Not provided'}`
    ).join('\n\n');
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Create a detailed Standard Operating Procedure (SOP) based on the following information. Return ONLY a JSON object with the structure shown below. No other text.

SOP IDEA: "${idea}"

ANSWERS TO CLARIFYING QUESTIONS:
${answersText}

Return this exact JSON structure:
{
  "title": "Clear, descriptive title",
  "description": "One paragraph summary of the procedure's purpose",
  "steps": [
    {
      "id": 1,
      "title": "Step title",
      "description": "Detailed description of what to do",
      "duration": "Estimated time",
      "responsible": "Who does this step"
    }
  ]
}

Create 5-10 logical steps that are clear and actionable.`,
          systemPrompt: 'You are an SOP expert for a remodeling contractor. Return only valid JSON. No markdown, no explanation. Make steps practical and specific to construction/remodeling context.',
          conversationHistory: []
        })
      });
      
      const data = await response.json();
      let parsed;
      
      try {
        const jsonMatch = data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch {
        // Fallback SOP
        parsed = {
          title: idea.substring(0, 50),
          description: `Standard operating procedure for: ${idea}`,
          steps: [
            { id: 1, title: "Initial Assessment", description: "Review requirements and gather necessary information.", duration: "15-30 min", responsible: "Assigned Team Member" },
            { id: 2, title: "Preparation", description: "Prepare materials, tools, and documentation needed.", duration: "30 min", responsible: "Assigned Team Member" },
            { id: 3, title: "Execution", description: "Complete the main task following established guidelines.", duration: "Varies", responsible: "Assigned Team Member" },
            { id: 4, title: "Quality Check", description: "Review work for completeness and quality standards.", duration: "15 min", responsible: "Supervisor" },
            { id: 5, title: "Documentation", description: "Record completion and any relevant notes.", duration: "10 min", responsible: "Assigned Team Member" },
          ]
        };
      }
      
      // Ensure steps have IDs
      parsed.steps = parsed.steps.map((step, i) => ({
        ...step,
        id: step.id || i + 1
      }));
      
      setGeneratedSOP(parsed);
      setStage('review');
    } catch (error) {
      console.error('Error generating SOP:', error);
      setStage('questions');
    }
    
    setIsGenerating(false);
  };

  // Save SOP to knowledge base
  const saveSOP = () => {
    const dept = departments.find(d => d.id === selectedDept);
    
    // Build full SOP content
    const stepsContent = generatedSOP.steps.map((step, i) => {
      let content = `Step ${i + 1}: ${step.title}\n`;
      content += `Description: ${step.description}\n`;
      content += `Duration: ${step.duration}\n`;
      content += `Responsible: ${step.responsible}`;
      if (stepNotes[step.id]) {
        content += `\nNotes: ${stepNotes[step.id]}`;
      }
      return content;
    }).join('\n\n');
    
    const fullContent = `${generatedSOP.description}\n\n${stepsContent}`;
    
    // Create SOP object for dedicated storage
    const sopItem = {
      id: generateId('sop'),
      title: generatedSOP.title,
      description: generatedSOP.description,
      steps: generatedSOP.steps.map(step => ({
        ...step,
        notes: stepNotes[step.id] || ''
      })),
      department: selectedDept,
      departmentName: dept?.name || 'General',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };
    
    // Save to dedicated SOP storage
    setSavedSOPs(prev => {
      const updated = [sopItem, ...prev];
      if (updated.length > SOP_CONFIG.MAX_SOPS) {
        return updated.slice(0, SOP_CONFIG.MAX_SOPS);
      }
      return updated;
    });
    
    // Also add to knowledge base
    const knowledgeItem = {
      id: generateId('kb'),
      title: `SOP: ${generatedSOP.title}`,
      content: fullContent,
      department: selectedDept,
      type: 'sop',
      sopId: sopItem.id,
      createdAt: new Date().toISOString()
    };
    
    setKnowledge(prev => [knowledgeItem, ...prev]);
    
    // Log activity
    logActivity(`Created SOP: ${generatedSOP.title}`, 'sop', dept?.name || 'General');
    
    // Add to intelligence
    addToIntelligence({
      sourceType: 'sop_created',
      sourceId: sopItem.id,
      title: generatedSOP.title,
      content: fullContent.substring(0, 500),
      department: selectedDept,
      tags: ['sop', 'procedure', dept?.name?.toLowerCase()].filter(Boolean),
      relevanceBoost: 3
    });
    
    // Reset and go to library
    resetBuilder();
    setViewMode('library');
  };

  // Reset builder state
  const resetBuilder = () => {
    setStage('input');
    setIdea('');
    setQuestions([]);
    setAnswers({});
    setGeneratedSOP(null);
    setExpandedSteps({});
    setStepNotes({});
    setEditingTitle(false);
    setEditingDescription(false);
  };

  // Delete SOP
  const deleteSOP = (sopId) => {
    if (!confirm('Delete this SOP? This cannot be undone.')) return;
    
    const sop = savedSOPs.find(s => s.id === sopId);
    setSavedSOPs(prev => prev.filter(s => s.id !== sopId));
    
    // Also remove from knowledge base
    setKnowledge(prev => prev.filter(k => k.sopId !== sopId));
    
    logActivity(`Deleted SOP: ${sop?.title || 'Unknown'}`, 'sop');
  };

  // Toggle step expansion
  const toggleStep = (stepId) => {
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  // Add custom step
  const addCustomStep = () => {
    if (!generatedSOP) return;
    const newStep = {
      id: generatedSOP.steps.length + 1,
      title: 'New Step',
      description: 'Describe what should be done in this step.',
      duration: 'TBD',
      responsible: 'TBD'
    };
    setGeneratedSOP(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
    setExpandedSteps(prev => ({ ...prev, [newStep.id]: true }));
  };

  // Delete step
  const deleteStep = (stepId) => {
    setGeneratedSOP(prev => ({
      ...prev,
      steps: prev.steps.filter(s => s.id !== stepId).map((s, i) => ({ ...s, id: i + 1 }))
    }));
  };

  // Filter SOPs for library view
  const filteredSOPs = savedSOPs.filter(sop => {
    const matchesSearch = !searchQuery || 
      sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sop.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDept === 'all' || sop.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const answeredCount = Object.values(answers).filter(a => a?.trim()).length;
  const selectedDeptObj = departments.find(d => d.id === selectedDept);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={24} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#E2E8F0' }}>SOP Builder</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#94A3B8' }}>AI-powered procedure generation</p>
          </div>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode('library')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: viewMode === 'library' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              border: '1px solid',
              borderColor: viewMode === 'library' ? '#8B5CF6' : 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: viewMode === 'library' ? '#A78BFA' : '#94A3B8',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <BookOpen size={16} />
            Library ({savedSOPs.length})
          </button>
          <button
            onClick={() => { setViewMode('builder'); resetBuilder(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: viewMode === 'builder' ? 'linear-gradient(135deg, #8B5CF6, #6366F1)' : 'transparent',
              border: viewMode === 'builder' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: viewMode === 'builder' ? '600' : '400',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            Create New
          </button>
        </div>
      </div>

      {/* Library View */}
      {viewMode === 'library' && (
        <div>
          {/* Search and Filter */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px',
              padding: '0 12px'
            }}>
              <Search size={18} color="#64748B" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SOPs..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  padding: '12px 0',
                  color: '#E2E8F0',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                padding: '0 12px',
                color: '#E2E8F0',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* SOP List */}
          {filteredSOPs.length === 0 ? (
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '16px',
              padding: '64px 32px',
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center'
            }}>
              <FileText size={48} color="#64748B" style={{ marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#E2E8F0' }}>
                {savedSOPs.length === 0 ? 'No SOPs yet' : 'No matching SOPs'}
              </h3>
              <p style={{ margin: '0 0 24px 0', color: '#94A3B8' }}>
                {savedSOPs.length === 0 
                  ? 'Create your first standard operating procedure'
                  : 'Try adjusting your search or filter'}
              </p>
              {savedSOPs.length === 0 && (
                <button
                  onClick={() => { setViewMode('builder'); resetBuilder(); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={18} />
                  Create First SOP
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredSOPs.map(sop => {
                const dept = departments.find(d => d.id === sop.department);
                const isExpanded = expandedSOP === sop.id;
                
                return (
                  <div key={sop.id} style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    overflow: 'hidden'
                  }}>
                    {/* SOP Header */}
                    <div
                      onClick={() => setExpandedSOP(isExpanded ? null : sop.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '20px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <FileText size={22} color="white" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#E2E8F0' }}>
                          {sop.title}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            background: `${dept?.color || '#64748B'}20`,
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: dept?.color || '#64748B'
                          }}>
                            <Building size={12} />
                            {sop.departmentName}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>
                            {sop.steps?.length || 0} steps
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>
                            Created {formatDate(sop.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSOP(sop.id); }}
                          style={{
                            padding: '8px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#64748B',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                        {isExpanded ? <ChevronUp size={20} color="#64748B" /> : <ChevronDown size={20} color="#64748B" />}
                      </div>
                    </div>

                    {/* Expanded SOP Content */}
                    {isExpanded && (
                      <div style={{
                        padding: '0 20px 20px 20px',
                        borderTop: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        <p style={{ margin: '16px 0', color: '#94A3B8', fontSize: '14px', lineHeight: '1.6' }}>
                          {sop.description}
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {sop.steps?.map((step, i) => (
                            <div key={step.id} style={{
                              background: 'rgba(15, 23, 42, 0.6)',
                              borderRadius: '8px',
                              padding: '16px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '13px',
                                  fontWeight: '700',
                                  color: 'white',
                                  flexShrink: 0
                                }}>
                                  {i + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '600', color: '#E2E8F0' }}>
                                    {step.title}
                                  </h4>
                                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#94A3B8', lineHeight: '1.5' }}>
                                    {step.description}
                                  </p>
                                  <div style={{ display: 'flex', gap: '12px' }}>
                                    <span style={{ fontSize: '12px', color: '#64748B' }}>⏱ {step.duration}</span>
                                    <span style={{ fontSize: '12px', color: '#64748B' }}>👤 {step.responsible}</span>
                                  </div>
                                  {step.notes && (
                                    <div style={{
                                      marginTop: '8px',
                                      padding: '8px 12px',
                                      background: 'rgba(139, 92, 246, 0.1)',
                                      borderRadius: '6px',
                                      fontSize: '13px',
                                      color: '#A78BFA'
                                    }}>
                                      📝 {step.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Builder View */}
      {viewMode === 'builder' && (
        <div>
          {/* Progress Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '32px',
            padding: '16px',
            background: 'rgba(30, 41, 59, 0.5)',
            borderRadius: '12px'
          }}>
            {['Enter Idea', 'Answer Questions', 'Review SOP', 'Save'].map((step, i) => {
              const stages = ['input', 'questions', 'review', 'saved'];
              const currentIndex = stages.indexOf(stage === 'generating' ? 'review' : stage);
              const isComplete = i < currentIndex;
              const isCurrent = i === currentIndex;
              
              return (
                <React.Fragment key={step}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: isComplete || isCurrent ? 1 : 0.4
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isComplete ? '#10B981' : isCurrent ? '#8B5CF6' : 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'white'
                    }}>
                      {isComplete ? <CheckCircle size={16} /> : i + 1}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: isCurrent ? '600' : '400', color: '#E2E8F0' }}>{step}</span>
                  </div>
                  {i < 3 && (
                    <div style={{
                      flex: 1,
                      height: '2px',
                      background: isComplete ? '#10B981' : 'rgba(255,255,255,0.1)',
                      borderRadius: '1px'
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Stage: Input */}
          {stage === 'input' && (
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              {/* Department Selector */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94A3B8' }}>
                  Department
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '300px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <Sparkles size={24} color="#8B5CF6" />
                <h2 style={{ margin: 0, fontSize: '20px', color: '#E2E8F0' }}>What procedure do you want to create?</h2>
              </div>
              
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder={`Describe your SOP idea in plain language...

Example: "I need a process for what happens when we sign a new project. It should cover everything from contract signing to the first day on the job site."`}
                style={{
                  width: '100%',
                  minHeight: '160px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  color: '#E2E8F0',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '20px'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#94A3B8' }}>
                  💡 Be specific about who's involved and what triggers the process
                </p>
                <button
                  onClick={generateQuestions}
                  disabled={!idea.trim() || isGenerating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: idea.trim() && !isGenerating ? 'linear-gradient(135deg, #8B5CF6, #6366F1)' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: idea.trim() && !isGenerating ? 'pointer' : 'not-allowed',
                    opacity: idea.trim() && !isGenerating ? 1 : 0.5
                  }}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Generate Questions
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Stage: Questions */}
          {stage === 'questions' && (
            <div>
              {/* Idea Summary */}
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <BookOpen size={16} color="#8B5CF6" />
                  <span style={{ fontSize: '13px', color: '#8B5CF6', fontWeight: '600' }}>YOUR IDEA</span>
                </div>
                <p style={{ margin: 0, fontSize: '15px', color: '#E2E8F0' }}>{idea}</p>
              </div>

              {/* Questions */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '16px',
                padding: '32px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <MessageSquare size={24} color="#10B981" />
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#E2E8F0' }}>Help me understand the details</h2>
                </div>
                <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#94A3B8' }}>
                  Answer these questions to create a more accurate SOP. Skip any that don't apply.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {questions.map((q, i) => (
                    <div key={q.id} style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: '12px',
                      padding: '20px',
                      border: answers[q.id]?.trim() ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.06)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: answers[q.id]?.trim() ? '#10B981' : 'rgba(139, 92, 246, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: '600',
                          flexShrink: 0,
                          color: 'white'
                        }}>
                          {answers[q.id]?.trim() ? <CheckCircle size={14} /> : i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '500', color: '#E2E8F0' }}>{q.question}</p>
                          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748B' }}>{q.hint}</p>
                          <textarea
                            value={answers[q.id] || ''}
                            onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder="Type your answer..."
                            style={{
                              width: '100%',
                              minHeight: '80px',
                              background: 'rgba(15, 23, 42, 0.8)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              padding: '12px',
                              color: '#E2E8F0',
                              fontSize: '14px',
                              resize: 'vertical',
                              fontFamily: 'inherit'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '24px',
                  paddingTop: '24px',
                  borderTop: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color={answeredCount >= 3 ? '#10B981' : '#64748B'} />
                    <span style={{ fontSize: '14px', color: '#94A3B8' }}>
                      {answeredCount} of {questions.length} questions answered
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setStage('input')}
                      style={{
                        padding: '12px 20px',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '10px',
                        color: '#94A3B8',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      ← Back
                    </button>
                    <button
                      onClick={generateSOP}
                      disabled={isGenerating}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        border: 'none',
                        borderRadius: '10px',
                        color: 'white',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: isGenerating ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Sparkles size={18} />
                      Generate SOP
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stage: Generating */}
          {stage === 'generating' && (
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '16px',
              padding: '64px 32px',
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 2s infinite'
              }}>
                <Sparkles size={36} color="white" />
              </div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#E2E8F0' }}>Building Your SOP...</h2>
              <p style={{ margin: 0, color: '#94A3B8', fontSize: '15px' }}>
                Analyzing your answers and creating a detailed procedure
              </p>
              <style>{`
                @keyframes pulse {
                  0%, 100% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.05); opacity: 0.8; }
                }
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}

          {/* Stage: Review */}
          {stage === 'review' && generatedSOP && (
            <div>
              {/* SOP Header */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: `${selectedDeptObj?.color || '#64748B'}20`,
                      borderRadius: '6px',
                      marginBottom: '12px'
                    }}>
                      <Building size={14} color={selectedDeptObj?.color || '#64748B'} />
                      <span style={{ fontSize: '12px', color: selectedDeptObj?.color || '#64748B', fontWeight: '600' }}>
                        {selectedDeptObj?.name || 'General'}
                      </span>
                    </div>
                    
                    {editingTitle ? (
                      <input
                        type="text"
                        value={generatedSOP.title}
                        onChange={(e) => setGeneratedSOP(prev => ({ ...prev, title: e.target.value }))}
                        onBlur={() => setEditingTitle(false)}
                        autoFocus
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid #8B5CF6',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          color: '#E2E8F0',
                          fontSize: '24px',
                          fontWeight: '600',
                          marginBottom: '8px'
                        }}
                      />
                    ) : (
                      <h2 
                        onClick={() => setEditingTitle(true)}
                        style={{ 
                          margin: '0 0 8px 0', 
                          fontSize: '24px', 
                          color: '#E2E8F0',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        {generatedSOP.title}
                        <Edit3 size={16} color="#64748B" />
                      </h2>
                    )}
                    
                    {editingDescription ? (
                      <textarea
                        value={generatedSOP.description}
                        onChange={(e) => setGeneratedSOP(prev => ({ ...prev, description: e.target.value }))}
                        onBlur={() => setEditingDescription(false)}
                        autoFocus
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid #8B5CF6',
                          borderRadius: '8px',
                          padding: '12px',
                          color: '#94A3B8',
                          fontSize: '15px',
                          resize: 'vertical'
                        }}
                      />
                    ) : (
                      <p 
                        onClick={() => setEditingDescription(true)}
                        style={{ 
                          margin: 0, 
                          color: '#94A3B8', 
                          fontSize: '15px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px'
                        }}
                      >
                        {generatedSOP.description}
                        <Edit3 size={14} color="#64748B" style={{ flexShrink: 0, marginTop: '3px' }} />
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                    <button 
                      onClick={() => setStage('questions')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: '#94A3B8',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      <RefreshCw size={16} />
                      Regenerate
                    </button>
                    <button
                      onClick={saveSOP}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      <Save size={16} />
                      Save to Knowledge Base
                    </button>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {generatedSOP.steps.map((step, i) => (
                  <div key={step.id} style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    overflow: 'hidden'
                  }}>
                    {/* Step Header */}
                    <div
                      onClick={() => toggleStep(step.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '20px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: '700',
                        flexShrink: 0,
                        color: 'white'
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#E2E8F0' }}>{step.title}</h3>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                          <span style={{ fontSize: '13px', color: '#64748B' }}>⏱ {step.duration}</span>
                          <span style={{ fontSize: '13px', color: '#64748B' }}>👤 {step.responsible}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {stepNotes[step.id] && (
                          <span style={{
                            padding: '4px 8px',
                            background: 'rgba(139, 92, 246, 0.2)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#A78BFA'
                          }}>
                            Has Notes
                          </span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }}
                          style={{
                            padding: '6px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#64748B',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                        {expandedSteps[step.id] ? <ChevronDown size={20} color="#64748B" /> : <ChevronRight size={20} color="#64748B" />}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedSteps[step.id] && (
                      <div style={{
                        padding: '0 20px 20px 72px',
                        borderTop: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        <p style={{ margin: '16px 0', color: '#94A3B8', fontSize: '14px', lineHeight: '1.6' }}>
                          {step.description}
                        </p>
                        
                        {/* Notes Section */}
                        <div style={{
                          background: 'rgba(15, 23, 42, 0.6)',
                          borderRadius: '8px',
                          padding: '16px',
                          marginTop: '16px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <Edit3 size={14} color="#8B5CF6" />
                            <span style={{ fontSize: '13px', color: '#8B5CF6', fontWeight: '600' }}>NOTES</span>
                          </div>
                          <textarea
                            value={stepNotes[step.id] || ''}
                            onChange={(e) => setStepNotes(prev => ({ ...prev, [step.id]: e.target.value }))}
                            placeholder="Add notes, tips, or details specific to your company..."
                            style={{
                              width: '100%',
                              minHeight: '80px',
                              background: 'transparent',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '6px',
                              padding: '12px',
                              color: '#E2E8F0',
                              fontSize: '14px',
                              resize: 'vertical',
                              fontFamily: 'inherit'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Step Button */}
              <button 
                onClick={addCustomStep}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '16px',
                  marginTop: '16px',
                  background: 'transparent',
                  border: '2px dashed rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#64748B',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={18} />
                Add Custom Step
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
