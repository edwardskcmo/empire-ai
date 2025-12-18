// Empire AI - SOP Builder Page
// AI-powered Standard Operating Procedure creation with question-driven approach

import React, { useState } from 'react';
import { 
  FileText, Plus, ArrowLeft, ArrowRight, Check, Trash2, Edit3, 
  ChevronDown, ChevronUp, Search, Filter, Sparkles, ListOrdered,
  Save, X, GripVertical, AlertCircle, CheckCircle, Loader
} from 'lucide-react';

export default function SOPs({ 
  departments, 
  sops, 
  setSops, 
  knowledge, 
  setKnowledge,
  logActivity,
  addToIntelligence 
}) {
  // View state
  const [view, setView] = useState('library'); // 'library' or 'builder'
  
  // Builder state
  const [stage, setStage] = useState(1); // 1: Describe, 2: Answer, 3: Review, 4: Saved
  const [selectedDept, setSelectedDept] = useState('');
  const [sopDescription, setSopDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [generatedSOP, setGeneratedSOP] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Library state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [expandedSOP, setExpandedSOP] = useState(null);
  
  // Edit state for review stage
  const [editingStep, setEditingStep] = useState(null);

  // Start new SOP
  const startNewSOP = () => {
    setView('builder');
    setStage(1);
    setSelectedDept('');
    setSopDescription('');
    setQuestions([]);
    setAnswers({});
    setGeneratedSOP(null);
    setError('');
  };

  // Generate questions from description
  const generateQuestions = async () => {
    if (!sopDescription.trim() || !selectedDept) {
      setError('Please select a department and describe the procedure.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    const dept = departments.find(d => d.id === selectedDept);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `I need to create an SOP (Standard Operating Procedure) for: "${sopDescription}"

This is for the ${dept?.name || 'General'} department.

Generate 5-7 clarifying questions that will help create a comprehensive, step-by-step procedure. Focus on:
- Key steps and their order
- Required tools, materials, or resources
- Safety considerations
- Common mistakes to avoid
- Quality checkpoints
- Who is responsible for each part

Format your response as a JSON array of question objects:
[
  {"id": 1, "question": "...", "hint": "Brief hint about what info is needed", "required": true},
  {"id": 2, "question": "...", "hint": "...", "required": false}
]

Return ONLY the JSON array, no other text.`,
          systemPrompt: 'You are an SOP creation assistant. Generate clear, specific questions to gather information needed for a detailed standard operating procedure. Return only valid JSON.',
          conversationHistory: []
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate questions');
      
      const data = await response.json();
      let parsedQuestions;
      
      try {
        // Try to parse the response as JSON
        const jsonMatch = data.response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedQuestions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch {
        // Fallback questions if parsing fails
        parsedQuestions = [
          { id: 1, question: "What are the main steps in this procedure?", hint: "List the key actions in order", required: true },
          { id: 2, question: "What tools or materials are needed?", hint: "Equipment, supplies, software, etc.", required: true },
          { id: 3, question: "Are there any safety considerations?", hint: "PPE, hazards, precautions", required: false },
          { id: 4, question: "What are common mistakes to avoid?", hint: "Things that often go wrong", required: false },
          { id: 5, question: "How do you verify the work is complete?", hint: "Quality checks, sign-offs", required: true },
        ];
      }
      
      setQuestions(parsedQuestions);
      setStage(2);
      
    } catch (err) {
      console.error('Question generation error:', err);
      setError('Failed to generate questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate SOP from answers
  const generateSOP = async () => {
    const requiredUnanswered = questions
      .filter(q => q.required && (!answers[q.id] || !answers[q.id].trim()))
      .length;
    
    if (requiredUnanswered > 0) {
      setError(`Please answer all required questions (${requiredUnanswered} remaining)`);
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    const dept = departments.find(d => d.id === selectedDept);
    
    // Format Q&A for the prompt
    const qaText = questions
      .map(q => `Q: ${q.question}\nA: ${answers[q.id] || 'Not provided'}`)
      .join('\n\n');
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Create a detailed Standard Operating Procedure (SOP) based on:

PROCEDURE DESCRIPTION:
${sopDescription}

DEPARTMENT: ${dept?.name || 'General'}

INFORMATION GATHERED:
${qaText}

Generate a complete SOP with:
1. A clear, descriptive title
2. A brief description/purpose statement
3. 5-10 detailed steps, each with:
   - Step number
   - Action title
   - Detailed instructions
   - Any notes or warnings

Format as JSON:
{
  "title": "SOP Title",
  "description": "Brief purpose statement",
  "steps": [
    {
      "number": 1,
      "title": "Step Title",
      "instructions": "Detailed instructions for this step",
      "notes": "Optional notes, warnings, or tips"
    }
  ]
}

Return ONLY the JSON, no other text.`,
          systemPrompt: 'You are an SOP creation expert. Create clear, actionable procedures that anyone can follow. Return only valid JSON.',
          conversationHistory: []
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate SOP');
      
      const data = await response.json();
      let parsedSOP;
      
      try {
        const jsonMatch = data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedSOP = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch {
        // Fallback structure
        parsedSOP = {
          title: `SOP: ${sopDescription.substring(0, 50)}`,
          description: sopDescription,
          steps: [
            { number: 1, title: "Step 1", instructions: "Instructions generated from your answers", notes: "" }
          ]
        };
      }
      
      setGeneratedSOP(parsedSOP);
      setStage(3);
      
    } catch (err) {
      console.error('SOP generation error:', err);
      setError('Failed to generate SOP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save SOP
  const saveSOP = async () => {
    if (!generatedSOP) return;
    
    const dept = departments.find(d => d.id === selectedDept);
    
    const newSOP = {
      id: `sop_${Date.now()}`,
      title: generatedSOP.title,
      description: generatedSOP.description,
      department: selectedDept,
      departmentName: dept?.name || 'General',
      steps: generatedSOP.steps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Add to SOPs
    setSops(prev => [newSOP, ...prev]);
    
    // Add to Knowledge Base
    const sopContent = generatedSOP.steps
      .map(s => `${s.number}. ${s.title}: ${s.instructions}${s.notes ? ` (Note: ${s.notes})` : ''}`)
      .join('\n');
    
    const knowledgeItem = {
      id: `kb_${Date.now()}`,
      title: generatedSOP.title,
      content: `${generatedSOP.description}\n\nSTEPS:\n${sopContent}`,
      department: selectedDept,
      type: 'sop',
      createdAt: new Date().toISOString(),
    };
    
    setKnowledge(prev => [knowledgeItem, ...prev]);
    
    // Add to Intelligence
    if (addToIntelligence) {
      await addToIntelligence({
        sourceType: 'sop_created',
        sourceId: newSOP.id,
        title: generatedSOP.title,
        content: sopContent,
        department: selectedDept,
        tags: ['sop', 'procedure', 'process'],
        metadata: { stepCount: generatedSOP.steps.length },
        relevanceBoost: 3,
      });
    }
    
    // Log activity
    if (logActivity) {
      logActivity(`Created SOP: ${generatedSOP.title}`, 'sop', dept?.name);
    }
    
    setStage(4);
  };

  // Delete SOP
  const deleteSOP = (sopId) => {
    if (!confirm('Delete this SOP?')) return;
    setSops(prev => prev.filter(s => s.id !== sopId));
    if (logActivity) logActivity('Deleted an SOP', 'sop');
  };

  // Update step in review
  const updateStep = (index, field, value) => {
    setGeneratedSOP(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => 
        i === index ? { ...s, [field]: value } : s
      )
    }));
  };

  // Add new step
  const addStep = () => {
    setGeneratedSOP(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          number: prev.steps.length + 1,
          title: 'New Step',
          instructions: '',
          notes: ''
        }
      ]
    }));
  };

  // Remove step
  const removeStep = (index) => {
    setGeneratedSOP(prev => ({
      ...prev,
      steps: prev.steps
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, number: i + 1 }))
    }));
  };

  // Filter SOPs for library
  const filteredSOPs = sops.filter(sop => {
    const matchesSearch = !searchTerm || 
      sop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sop.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !filterDept || sop.department === filterDept;
    return matchesSearch && matchesDept;
  });

  // Answered count
  const answeredCount = questions.filter(q => answers[q.id]?.trim()).length;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            color: '#E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <FileText size={28} style={{ color: '#8B5CF6' }} />
            {view === 'library' ? 'SOP Library' : 'SOP Builder'}
          </h1>
          <p style={{ color: '#64748B', marginTop: '4px' }}>
            {view === 'library' 
              ? 'Browse and manage your standard operating procedures'
              : 'Create AI-powered procedures step by step'}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {view === 'builder' && stage !== 4 && (
            <button
              onClick={() => setView('library')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'rgba(100, 116, 139, 0.3)',
                border: '1px solid rgba(100, 116, 139, 0.3)',
                borderRadius: '8px',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              <X size={16} />
              Cancel
            </button>
          )}
          
          {view === 'library' && (
            <button
              onClick={startNewSOP}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              <Plus size={18} />
              Build New SOP
            </button>
          )}
        </div>
      </div>

      {/* Library View */}
      {view === 'library' && (
        <div>
          {/* Search and Filter */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <div style={{ 
              flex: '1', 
              minWidth: '200px',
              position: 'relative' 
            }}>
              <Search 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: '#64748B' 
                }} 
              />
              <input
                type="text"
                placeholder="Search SOPs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#E2E8F0',
                  fontSize: '14px',
                }}
              />
            </div>
            
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              style={{
                padding: '10px 12px',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#E2E8F0',
                fontSize: '14px',
                minWidth: '180px',
              }}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* SOP List */}
          {filteredSOPs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <FileText size={48} style={{ color: '#64748B', marginBottom: '16px' }} />
              <h3 style={{ color: '#94A3B8', marginBottom: '8px' }}>No SOPs Found</h3>
              <p style={{ color: '#64748B', marginBottom: '20px' }}>
                {searchTerm || filterDept 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first standard operating procedure'}
              </p>
              {!searchTerm && !filterDept && (
                <button
                  onClick={startNewSOP}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Create First SOP
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredSOPs.map(sop => (
                <div
                  key={sop.id}
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                  }}
                >
                  {/* SOP Header */}
                  <div
                    onClick={() => setExpandedSOP(expandedSOP === sop.id ? null : sop.id)}
                    style={{
                      padding: '16px 20px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <h3 style={{ color: '#E2E8F0', fontSize: '16px', fontWeight: '500' }}>
                          {sop.title}
                        </h3>
                        <span style={{
                          padding: '2px 8px',
                          background: 'rgba(139, 92, 246, 0.2)',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: '#A78BFA',
                        }}>
                          {sop.steps?.length || 0} steps
                        </span>
                      </div>
                      <p style={{ color: '#64748B', fontSize: '13px' }}>
                        {sop.departmentName} • Created {new Date(sop.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSOP(sop.id); }}
                        style={{
                          padding: '6px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#EF4444',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                      {expandedSOP === sop.id ? <ChevronUp size={20} color="#64748B" /> : <ChevronDown size={20} color="#64748B" />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedSOP === sop.id && (
                    <div style={{ 
                      padding: '0 20px 20px',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <p style={{ color: '#94A3B8', fontSize: '14px', margin: '16px 0' }}>
                        {sop.description}
                      </p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {sop.steps?.map((step, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '12px 16px',
                              background: 'rgba(15, 23, 42, 0.5)',
                              borderRadius: '8px',
                              borderLeft: '3px solid #8B5CF6',
                            }}
                          >
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              marginBottom: '6px'
                            }}>
                              <span style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: 'rgba(139, 92, 246, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                color: '#A78BFA',
                                fontWeight: '600',
                              }}>
                                {step.number}
                              </span>
                              <span style={{ color: '#E2E8F0', fontWeight: '500' }}>
                                {step.title}
                              </span>
                            </div>
                            <p style={{ color: '#94A3B8', fontSize: '13px', marginLeft: '32px' }}>
                              {step.instructions}
                            </p>
                            {step.notes && (
                              <p style={{ 
                                color: '#F59E0B', 
                                fontSize: '12px', 
                                marginLeft: '32px',
                                marginTop: '6px',
                                fontStyle: 'italic'
                              }}>
                                ⚠️ {step.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Builder View */}
      {view === 'builder' && (
        <div>
          {/* Progress Indicator */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            marginBottom: '32px',
          }}>
            {[
              { num: 1, label: 'Describe' },
              { num: 2, label: 'Answer' },
              { num: 3, label: 'Review' },
              { num: 4, label: 'Saved' },
            ].map((s, idx) => (
              <div 
                key={s.num}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: stage >= s.num 
                    ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' 
                    : 'rgba(100, 116, 139, 0.3)',
                  color: stage >= s.num ? 'white' : '#64748B',
                  fontWeight: '600',
                  fontSize: '14px',
                }}>
                  {stage > s.num ? <Check size={18} /> : s.num}
                </div>
                <span style={{ 
                  marginLeft: '8px', 
                  color: stage >= s.num ? '#E2E8F0' : '#64748B',
                  fontSize: '13px',
                }}>
                  {s.label}
                </span>
                {idx < 3 && (
                  <div style={{
                    width: '60px',
                    height: '2px',
                    background: stage > s.num ? '#8B5CF6' : 'rgba(100, 116, 139, 0.3)',
                    margin: '0 12px',
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#EF4444',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Stage 1: Describe */}
          {stage === 1 && (
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <h2 style={{ color: '#E2E8F0', marginBottom: '20px', fontSize: '18px' }}>
                <Sparkles size={20} style={{ marginRight: '8px', color: '#8B5CF6' }} />
                Describe Your Procedure
              </h2>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#94A3B8', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                  Department *
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Select department...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ color: '#94A3B8', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                  What procedure do you want to document? *
                </label>
                <textarea
                  value={sopDescription}
                  onChange={(e) => setSopDescription(e.target.value)}
                  placeholder="e.g., How to conduct a pre-job site inspection, How to process a change order, How to onboard a new subcontractor..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    minHeight: '120px',
                    resize: 'vertical',
                  }}
                />
                <p style={{ color: '#64748B', fontSize: '12px', marginTop: '8px' }}>
                  Be specific about what the procedure accomplishes and who performs it.
                </p>
              </div>

              <button
                onClick={generateQuestions}
                disabled={isLoading || !sopDescription.trim() || !selectedDept}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '14px',
                  background: isLoading || !sopDescription.trim() || !selectedDept
                    ? 'rgba(100, 116, 139, 0.3)'
                    : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: isLoading || !sopDescription.trim() || !selectedDept ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  fontWeight: '500',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    Generate Questions
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Stage 2: Answer Questions */}
          {stage === 2 && (
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#E2E8F0', fontSize: '18px' }}>
                  <ListOrdered size={20} style={{ marginRight: '8px', color: '#8B5CF6' }} />
                  Answer These Questions
                </h2>
                <span style={{ color: '#64748B', fontSize: '13px' }}>
                  {answeredCount} / {questions.length} answered
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                {questions.map((q, idx) => (
                  <div key={q.id}>
                    <label style={{ 
                      color: '#E2E8F0', 
                      fontSize: '14px', 
                      display: 'block', 
                      marginBottom: '8px' 
                    }}>
                      {idx + 1}. {q.question}
                      {q.required && <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>}
                    </label>
                    {q.hint && (
                      <p style={{ color: '#64748B', fontSize: '12px', marginBottom: '8px' }}>
                        💡 {q.hint}
                      </p>
                    )}
                    <textarea
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Type your answer..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: `1px solid ${answers[q.id]?.trim() ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '8px',
                        color: '#E2E8F0',
                        fontSize: '14px',
                        minHeight: '80px',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setStage(1)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: 'rgba(100, 116, 139, 0.3)',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '8px',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                
                <button
                  onClick={generateSOP}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    background: isLoading ? 'rgba(100, 116, 139, 0.3)' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '15px',
                    fontWeight: '500',
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      Generating SOP...
                    </>
                  ) : (
                    <>
                      Generate SOP
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Stage 3: Review */}
          {stage === 3 && generatedSOP && (
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <h2 style={{ color: '#E2E8F0', marginBottom: '20px', fontSize: '18px' }}>
                <Edit3 size={20} style={{ marginRight: '8px', color: '#8B5CF6' }} />
                Review & Edit Your SOP
              </h2>

              {/* Title */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                  Title
                </label>
                <input
                  type="text"
                  value={generatedSOP.title}
                  onChange={(e) => setGeneratedSOP(prev => ({ ...prev, title: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '16px',
                    fontWeight: '500',
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  value={generatedSOP.description}
                  onChange={(e) => setGeneratedSOP(prev => ({ ...prev, description: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    minHeight: '60px',
                  }}
                />
              </div>

              {/* Steps */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ color: '#94A3B8', fontSize: '12px' }}>
                    Steps ({generatedSOP.steps.length})
                  </label>
                  <button
                    onClick={addStep}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#A78BFA',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    <Plus size={14} />
                    Add Step
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {generatedSOP.steps.map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px',
                        background: 'rgba(15, 23, 42, 0.5)',
                        borderRadius: '8px',
                        border: editingStep === idx ? '1px solid #8B5CF6' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <span style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'rgba(139, 92, 246, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          color: '#A78BFA',
                          fontWeight: '600',
                        }}>
                          {step.number}
                        </span>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => updateStep(idx, 'title', e.target.value)}
                          placeholder="Step title"
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: 'rgba(30, 41, 59, 0.5)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            color: '#E2E8F0',
                            fontSize: '14px',
                            fontWeight: '500',
                          }}
                        />
                        <button
                          onClick={() => removeStep(idx)}
                          disabled={generatedSOP.steps.length <= 1}
                          style={{
                            padding: '6px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: 'none',
                            borderRadius: '6px',
                            color: generatedSOP.steps.length <= 1 ? '#64748B' : '#EF4444',
                            cursor: generatedSOP.steps.length <= 1 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <textarea
                        value={step.instructions}
                        onChange={(e) => updateStep(idx, 'instructions', e.target.value)}
                        placeholder="Instructions for this step..."
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(30, 41, 59, 0.5)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          color: '#E2E8F0',
                          fontSize: '13px',
                          minHeight: '60px',
                          marginBottom: '8px',
                          resize: 'vertical',
                        }}
                      />
                      
                      <input
                        type="text"
                        value={step.notes || ''}
                        onChange={(e) => updateStep(idx, 'notes', e.target.value)}
                        placeholder="Notes, warnings, or tips (optional)"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          borderRadius: '6px',
                          color: '#F59E0B',
                          fontSize: '12px',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setStage(2)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: 'rgba(100, 116, 139, 0.3)',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '8px',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                
                <button
                  onClick={saveSOP}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '500',
                  }}
                >
                  <Save size={18} />
                  Save to Knowledge Base
                </button>
              </div>
            </div>
          )}

          {/* Stage 4: Saved */}
          {stage === 4 && (
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              padding: '40px',
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <CheckCircle size={32} color="white" />
              </div>
              
              <h2 style={{ color: '#E2E8F0', marginBottom: '8px' }}>
                SOP Created Successfully!
              </h2>
              <p style={{ color: '#64748B', marginBottom: '24px' }}>
                Your procedure has been saved to the Knowledge Base and is ready to use.
              </p>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => setView('library')}
                  style={{
                    padding: '12px 24px',
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '8px',
                    color: '#A78BFA',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  View Library
                </button>
                <button
                  onClick={startNewSOP}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Create Another SOP
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
