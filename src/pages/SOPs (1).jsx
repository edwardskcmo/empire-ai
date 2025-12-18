import React, { useState, useRef } from 'react';
import { 
  FileText, Plus, Sparkles, ChevronRight, ChevronDown, Check, 
  Trash2, Edit3, Save, X, GripVertical, Loader, ArrowLeft,
  Search, Filter, BookOpen, Lightbulb, List, PlusCircle, MinusCircle,
  Upload, ClipboardPaste, FileUp, FileSpreadsheet, File
} from 'lucide-react';

export default function SOPs({ 
  departments, 
  knowledge, 
  setKnowledge, 
  sops,
  setSops,
  logActivity, 
  addToIntelligence 
}) {
  // View state
  const [view, setView] = useState('library'); // 'library' | 'builder' | 'editor' | 'import'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  
  // Import state
  const [importMethod, setImportMethod] = useState('paste'); // 'paste' | 'upload'
  const [pasteContent, setPasteContent] = useState('');
  const [importDept, setImportDept] = useState('');
  const [isParsingImport, setIsParsingImport] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileContent, setUploadedFileContent] = useState('');
  const fileInputRef = useRef(null);
  
  // Builder state
  const [builderStage, setBuilderStage] = useState(1); // 1-4
  const [selectedDept, setSelectedDept] = useState('');
  const [sopIdea, setSopIdea] = useState('');
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isGeneratingSOP, setIsGeneratingSOP] = useState(false);
  
  // Current SOP being built/edited
  const [currentSOP, setCurrentSOP] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  
  // Step editing state
  const [expandedSteps, setExpandedSteps] = useState({});
  const [editingStep, setEditingStep] = useState(null);
  const [editingBullet, setEditingBullet] = useState(null);
  
  // Drag and drop state
  const [draggedStep, setDraggedStep] = useState(null);
  const [draggedBullet, setDraggedBullet] = useState(null);
  const [dragOverStep, setDragOverStep] = useState(null);
  const [dragOverBullet, setDragOverBullet] = useState(null);
  
  // Library viewing
  const [expandedSOP, setExpandedSOP] = useState(null);

  // Filter SOPs
  const filteredSOPs = (sops || []).filter(sop => {
    const matchesSearch = sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          sop.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDept === 'all' || sop.departmentId === filterDept;
    return matchesSearch && matchesDept;
  });

  // Generate questions from AI
  const generateQuestions = async () => {
    if (!sopIdea.trim() || !selectedDept) return;
    
    setIsGeneratingQuestions(true);
    try {
      const dept = departments.find(d => d.id === selectedDept);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `I want to create an SOP for: "${sopIdea}"
          
This is for the ${dept?.name || 'general'} department.

Generate 5-7 clarifying questions I should answer to create a comprehensive SOP. Focus on:
- Who performs this task
- What triggers this process
- Key steps and decision points
- Safety or compliance requirements
- Tools or materials needed
- Expected outcomes and quality checks

Return ONLY a JSON array of question objects with this format:
[{"question": "...", "hint": "...", "required": true/false}]

No other text, just the JSON array.`,
          systemPrompt: 'You are an SOP expert. Return only valid JSON arrays.',
          conversationHistory: []
        })
      });
      
      const data = await response.json();
      let parsed = [];
      try {
        const jsonMatch = data.response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {
        parsed = [
          { question: "Who typically performs this procedure?", hint: "Job title or role", required: true },
          { question: "What triggers this process to start?", hint: "Event, schedule, or request", required: true },
          { question: "What tools or materials are needed?", hint: "Equipment, software, supplies", required: false },
          { question: "Are there safety or compliance requirements?", hint: "OSHA, permits, certifications", required: false },
          { question: "How do you know when it's done correctly?", hint: "Quality checks, sign-offs", required: true }
        ];
      }
      
      setQuestions(parsed);
      setBuilderStage(2);
    } catch (error) {
      console.error('Error generating questions:', error);
    }
    setIsGeneratingQuestions(false);
  };

  // Generate SOP from answers
  const generateSOP = async () => {
    setIsGeneratingSOP(true);
    try {
      const dept = departments.find(d => d.id === selectedDept);
      const qaText = questions.map((q, i) => 
        `Q: ${q.question}\nA: ${answers[i] || 'Not provided'}`
      ).join('\n\n');
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Create a detailed SOP based on this information:

Original idea: "${sopIdea}"
Department: ${dept?.name || 'General'}

Questions and Answers:
${qaText}

Return ONLY a JSON object with this exact format:
{
  "title": "Clear SOP title",
  "description": "One paragraph overview",
  "steps": [
    {
      "title": "Step 1 Title",
      "bullets": ["Detail point 1", "Detail point 2", "Detail point 3"]
    }
  ]
}

Create 5-10 steps, each with 2-5 bullet points for details. No other text, just JSON.`,
          systemPrompt: 'You are an SOP expert. Return only valid JSON.',
          conversationHistory: []
        })
      });
      
      const data = await response.json();
      let parsed = null;
      try {
        const jsonMatch = data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {
        parsed = {
          title: sopIdea,
          description: "Standard operating procedure",
          steps: [
            { title: "Initial Setup", bullets: ["Gather required materials", "Review prerequisites", "Notify relevant parties"] },
            { title: "Execute Procedure", bullets: ["Follow established guidelines", "Document progress", "Address issues as they arise"] },
            { title: "Quality Check", bullets: ["Review completed work", "Verify compliance", "Obtain sign-off"] }
          ]
        };
      }
      
      setCurrentSOP({
        id: `sop_${Date.now()}`,
        ...parsed,
        departmentId: selectedDept,
        departmentName: dept?.name || 'General',
        createdAt: new Date().toISOString()
      });
      setBuilderStage(3);
      // Expand all steps initially
      const expanded = {};
      parsed.steps?.forEach((_, i) => expanded[i] = true);
      setExpandedSteps(expanded);
    } catch (error) {
      console.error('Error generating SOP:', error);
    }
    setIsGeneratingSOP(false);
  };

  // Save SOP
  const saveSOP = () => {
    if (!currentSOP) return;
    
    const newSOP = {
      ...currentSOP,
      savedAt: new Date().toISOString()
    };
    
    setSops(prev => [newSOP, ...(prev || [])]);
    
    // Add to knowledge base
    const knowledgeContent = currentSOP.steps.map((step, i) => 
      `Step ${i + 1}: ${step.title}\n${step.bullets.map(b => `  • ${b}`).join('\n')}`
    ).join('\n\n');
    
    const knowledgeItem = {
      id: `kb_${Date.now()}`,
      title: `SOP: ${currentSOP.title}`,
      content: `${currentSOP.description}\n\n${knowledgeContent}`,
      department: currentSOP.departmentId,
      type: 'sop',
      createdAt: new Date().toISOString()
    };
    setKnowledge(prev => [knowledgeItem, ...prev]);
    
    // Add to intelligence
    addToIntelligence({
      sourceType: 'sop_created',
      sourceId: newSOP.id,
      title: newSOP.title,
      content: knowledgeContent,
      department: newSOP.departmentId,
      tags: ['sop', 'procedure', 'process'],
      relevanceBoost: 3
    });
    
    logActivity(`Created SOP: ${currentSOP.title}`, 'sop', currentSOP.departmentName);
    setBuilderStage(4);
  };

  // Edit SOP from library
  const editSOP = (sop) => {
    setCurrentSOP({ ...sop });
    const expanded = {};
    sop.steps?.forEach((_, i) => expanded[i] = true);
    setExpandedSteps(expanded);
    setView('editor');
  };

  // Save edited SOP
  const saveEditedSOP = () => {
    if (!currentSOP) return;
    
    setSops(prev => prev.map(s => 
      s.id === currentSOP.id ? { ...currentSOP, updatedAt: new Date().toISOString() } : s
    ));
    
    logActivity(`Updated SOP: ${currentSOP.title}`, 'sop', currentSOP.departmentName);
    setView('library');
    setCurrentSOP(null);
  };

  // Delete SOP
  const deleteSOP = (sopId) => {
    setSops(prev => prev.filter(s => s.id !== sopId));
    logActivity('Deleted an SOP', 'sop');
    if (expandedSOP === sopId) setExpandedSOP(null);
  };

  // Reset builder
  const resetBuilder = () => {
    setBuilderStage(1);
    setSopIdea('');
    setSelectedDept('');
    setQuestions([]);
    setAnswers({});
    setCurrentSOP(null);
    setExpandedSteps({});
  };

  // Reset import
  const resetImport = () => {
    setPasteContent('');
    setImportDept('');
    setUploadedFileName('');
    setUploadedFileContent('');
    setImportMethod('paste');
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFileName(file.name);
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      if (extension === 'txt' || extension === 'md') {
        // Plain text files
        const text = await file.text();
        setUploadedFileContent(text);
      } else if (extension === 'csv') {
        // CSV files
        const text = await file.text();
        // Convert CSV to readable format
        const lines = text.split('\n');
        const formatted = lines.map(line => {
          const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          return cols.join(' | ');
        }).join('\n');
        setUploadedFileContent(formatted);
      } else if (extension === 'json') {
        // JSON files
        const text = await file.text();
        try {
          const parsed = JSON.parse(text);
          setUploadedFileContent(JSON.stringify(parsed, null, 2));
        } catch {
          setUploadedFileContent(text);
        }
      } else {
        // For other files, try to read as text
        const text = await file.text();
        setUploadedFileContent(text);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      setUploadedFileContent('');
      setUploadedFileName('');
      alert('Could not read file. Please try a different format or paste the content directly.');
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Parse imported content with AI
  const parseImportedContent = async () => {
    const content = importMethod === 'paste' ? pasteContent : uploadedFileContent;
    if (!content.trim() || !importDept) return;
    
    setIsParsingImport(true);
    try {
      const dept = departments.find(d => d.id === importDept);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Convert this existing SOP/procedure content into a structured format.

ORIGINAL CONTENT:
${content}

Analyze this content and convert it into a well-structured SOP. Extract:
1. A clear, concise title
2. A brief description/overview (1-2 sentences)
3. Numbered steps with bullet point details under each step

Return ONLY a JSON object with this exact format:
{
  "title": "Clear SOP title",
  "description": "Brief overview of what this procedure accomplishes",
  "steps": [
    {
      "title": "Step 1 Title (action-oriented)",
      "bullets": ["Specific detail 1", "Specific detail 2", "Specific detail 3"]
    },
    {
      "title": "Step 2 Title",
      "bullets": ["Detail 1", "Detail 2"]
    }
  ]
}

Guidelines:
- Each step title should be a clear action (e.g., "Prepare Materials", "Contact Customer", "Complete Inspection")
- Bullets should be specific, actionable details
- Include 2-5 bullets per step
- Create 3-15 steps depending on complexity
- Preserve all important information from the original
- Clean up formatting and make it professional

Return ONLY the JSON, no other text.`,
          systemPrompt: 'You are an SOP expert. Parse and structure procedures into clean, professional formats. Return only valid JSON.',
          conversationHistory: []
        })
      });
      
      const data = await response.json();
      let parsed = null;
      
      try {
        const jsonMatch = data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fallback structure
        parsed = {
          title: "Imported Procedure",
          description: "Procedure imported from external source",
          steps: [
            { title: "Review imported content", bullets: ["Original content could not be fully parsed", "Please edit manually to organize steps"] }
          ]
        };
      }
      
      // Create the SOP object
      setCurrentSOP({
        id: `sop_${Date.now()}`,
        ...parsed,
        departmentId: importDept,
        departmentName: dept?.name || 'General',
        createdAt: new Date().toISOString(),
        importedFrom: importMethod === 'upload' ? uploadedFileName : 'pasted content'
      });
      
      // Expand all steps
      const expanded = {};
      parsed.steps?.forEach((_, i) => expanded[i] = true);
      setExpandedSteps(expanded);
      
      // Switch to editor view
      setView('editor');
      resetImport();
      
    } catch (error) {
      console.error('Error parsing import:', error);
      alert('Error processing content. Please try again or paste simpler text.');
    }
    setIsParsingImport(false);
  };

  // Step management
  const toggleStepExpand = (index) => {
    setExpandedSteps(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const updateStepTitle = (index, newTitle) => {
    setCurrentSOP(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, title: newTitle } : step
      )
    }));
    setEditingStep(null);
  };

  const addStep = (afterIndex) => {
    setCurrentSOP(prev => {
      const newSteps = [...prev.steps];
      newSteps.splice(afterIndex + 1, 0, { 
        title: 'New Step', 
        bullets: ['Add details here'] 
      });
      return { ...prev, steps: newSteps };
    });
    setExpandedSteps(prev => ({ ...prev, [afterIndex + 1]: true }));
  };

  const deleteStep = (index) => {
    if (currentSOP.steps.length <= 1) return;
    setCurrentSOP(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  // Bullet management
  const updateBullet = (stepIndex, bulletIndex, newText) => {
    setCurrentSOP(prev => ({
      ...prev,
      steps: prev.steps.map((step, si) => 
        si === stepIndex ? {
          ...step,
          bullets: step.bullets.map((b, bi) => bi === bulletIndex ? newText : b)
        } : step
      )
    }));
    setEditingBullet(null);
  };

  const addBullet = (stepIndex, afterIndex) => {
    setCurrentSOP(prev => ({
      ...prev,
      steps: prev.steps.map((step, si) => {
        if (si !== stepIndex) return step;
        const newBullets = [...step.bullets];
        newBullets.splice(afterIndex + 1, 0, 'New detail');
        return { ...step, bullets: newBullets };
      })
    }));
  };

  const deleteBullet = (stepIndex, bulletIndex) => {
    setCurrentSOP(prev => ({
      ...prev,
      steps: prev.steps.map((step, si) => {
        if (si !== stepIndex) return step;
        if (step.bullets.length <= 1) return step;
        return { ...step, bullets: step.bullets.filter((_, bi) => bi !== bulletIndex) };
      })
    }));
  };

  // Drag and drop for steps
  const handleStepDragStart = (e, index) => {
    setDraggedStep(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStepDragOver = (e, index) => {
    e.preventDefault();
    if (draggedStep === null || draggedStep === index) return;
    setDragOverStep(index);
  };

  const handleStepDrop = (e, index) => {
    e.preventDefault();
    if (draggedStep === null || draggedStep === index) return;
    
    setCurrentSOP(prev => {
      const newSteps = [...prev.steps];
      const [removed] = newSteps.splice(draggedStep, 1);
      newSteps.splice(index, 0, removed);
      return { ...prev, steps: newSteps };
    });
    
    setDraggedStep(null);
    setDragOverStep(null);
  };

  const handleStepDragEnd = () => {
    setDraggedStep(null);
    setDragOverStep(null);
  };

  // Drag and drop for bullets
  const handleBulletDragStart = (e, stepIndex, bulletIndex) => {
    setDraggedBullet({ stepIndex, bulletIndex });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleBulletDragOver = (e, stepIndex, bulletIndex) => {
    e.preventDefault();
    if (!draggedBullet || draggedBullet.stepIndex !== stepIndex) return;
    if (draggedBullet.bulletIndex === bulletIndex) return;
    setDragOverBullet({ stepIndex, bulletIndex });
  };

  const handleBulletDrop = (e, stepIndex, bulletIndex) => {
    e.preventDefault();
    if (!draggedBullet || draggedBullet.stepIndex !== stepIndex) return;
    if (draggedBullet.bulletIndex === bulletIndex) return;
    
    setCurrentSOP(prev => ({
      ...prev,
      steps: prev.steps.map((step, si) => {
        if (si !== stepIndex) return step;
        const newBullets = [...step.bullets];
        const [removed] = newBullets.splice(draggedBullet.bulletIndex, 1);
        newBullets.splice(bulletIndex, 0, removed);
        return { ...step, bullets: newBullets };
      })
    }));
    
    setDraggedBullet(null);
    setDragOverBullet(null);
  };

  const handleBulletDragEnd = () => {
    setDraggedBullet(null);
    setDragOverBullet(null);
  };

  // Render step editor component
  const renderStepEditor = (step, stepIndex, isEditable = true) => {
    const isExpanded = expandedSteps[stepIndex];
    const isEditingThisStep = editingStep === stepIndex;
    const isDragOver = dragOverStep === stepIndex;
    
    return (
      <div 
        key={stepIndex}
        draggable={isEditable}
        onDragStart={(e) => handleStepDragStart(e, stepIndex)}
        onDragOver={(e) => handleStepDragOver(e, stepIndex)}
        onDrop={(e) => handleStepDrop(e, stepIndex)}
        onDragEnd={handleStepDragEnd}
        style={{
          background: isDragOver ? 'rgba(139, 92, 246, 0.2)' : 'rgba(30, 41, 59, 0.6)',
          borderRadius: '12px',
          border: isDragOver ? '2px dashed #8B5CF6' : '1px solid rgba(255,255,255,0.1)',
          marginBottom: '12px',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Step Header */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px',
            cursor: 'pointer',
            gap: '12px'
          }}
          onClick={() => toggleStepExpand(stepIndex)}
        >
          {isEditable && (
            <div 
              style={{ cursor: 'grab', color: '#64748B' }}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical size={18} />
            </div>
          )}
          
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '14px',
            color: 'white',
            flexShrink: 0
          }}>
            {stepIndex + 1}
          </div>
          
          {isEditingThisStep ? (
            <input
              type="text"
              value={step.title}
              onChange={(e) => setCurrentSOP(prev => ({
                ...prev,
                steps: prev.steps.map((s, i) => 
                  i === stepIndex ? { ...s, title: e.target.value } : s
                )
              }))}
              onBlur={() => setEditingStep(null)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingStep(null)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              style={{
                flex: 1,
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid #8B5CF6',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600'
              }}
            />
          ) : (
            <span style={{ 
              flex: 1, 
              fontWeight: '600', 
              fontSize: '16px',
              color: '#E2E8F0'
            }}>
              {step.title}
            </span>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditable && !isEditingThisStep && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingStep(stepIndex);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <Edit3 size={16} />
              </button>
            )}
            
            <span style={{ color: '#64748B', fontSize: '13px' }}>
              {step.bullets?.length || 0} details
            </span>
            
            {isExpanded ? <ChevronDown size={20} color="#64748B" /> : <ChevronRight size={20} color="#64748B" />}
          </div>
        </div>
        
        {/* Expanded Bullets */}
        {isExpanded && (
          <div style={{ 
            padding: '0 16px 16px 60px',
            borderTop: '1px solid rgba(255,255,255,0.05)'
          }}>
            {step.bullets?.map((bullet, bulletIndex) => {
              const isEditingThisBullet = editingBullet?.stepIndex === stepIndex && editingBullet?.bulletIndex === bulletIndex;
              const isBulletDragOver = dragOverBullet?.stepIndex === stepIndex && dragOverBullet?.bulletIndex === bulletIndex;
              
              return (
                <div 
                  key={bulletIndex}
                  draggable={isEditable}
                  onDragStart={(e) => handleBulletDragStart(e, stepIndex, bulletIndex)}
                  onDragOver={(e) => handleBulletDragOver(e, stepIndex, bulletIndex)}
                  onDrop={(e) => handleBulletDrop(e, stepIndex, bulletIndex)}
                  onDragEnd={handleBulletDragEnd}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    marginTop: '8px',
                    background: isBulletDragOver ? 'rgba(139, 92, 246, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                    borderRadius: '8px',
                    border: isBulletDragOver ? '1px dashed #8B5CF6' : '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isEditable && (
                    <div style={{ cursor: 'grab', color: '#475569', marginTop: '2px' }}>
                      <GripVertical size={14} />
                    </div>
                  )}
                  
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#8B5CF6',
                    marginTop: '8px',
                    flexShrink: 0
                  }} />
                  
                  {isEditingThisBullet ? (
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => setCurrentSOP(prev => ({
                        ...prev,
                        steps: prev.steps.map((s, si) => 
                          si === stepIndex ? {
                            ...s,
                            bullets: s.bullets.map((b, bi) => 
                              bi === bulletIndex ? e.target.value : b
                            )
                          } : s
                        )
                      }))}
                      onBlur={() => setEditingBullet(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingBullet(null)}
                      autoFocus
                      style={{
                        flex: 1,
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid #8B5CF6',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        color: '#E2E8F0',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <span style={{ flex: 1, color: '#94A3B8', fontSize: '14px', lineHeight: '1.5' }}>
                      {bullet}
                    </span>
                  )}
                  
                  {isEditable && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {!isEditingThisBullet && (
                        <button
                          onClick={() => setEditingBullet({ stepIndex, bulletIndex })}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#475569',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => addBullet(stepIndex, bulletIndex)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#10B981',
                          cursor: 'pointer',
                          padding: '2px'
                        }}
                        title="Add bullet below"
                      >
                        <PlusCircle size={14} />
                      </button>
                      <button
                        onClick={() => deleteBullet(stepIndex, bulletIndex)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '2px',
                          opacity: step.bullets.length <= 1 ? 0.3 : 1
                        }}
                        disabled={step.bullets.length <= 1}
                        title="Delete bullet"
                      >
                        <MinusCircle size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Add step button */}
            {isEditable && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px dashed rgba(255,255,255,0.1)'
              }}>
                <button
                  onClick={() => addStep(stepIndex)}
                  style={{
                    background: 'transparent',
                    border: '1px dashed rgba(139, 92, 246, 0.5)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: '#8B5CF6',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={14} /> Add Step Below
                </button>
                
                {currentSOP.steps.length > 1 && (
                  <button
                    onClick={() => deleteStep(stepIndex)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      color: '#EF4444',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Trash2 size={14} /> Delete Step
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // LIBRARY VIEW
  if (view === 'library') {
    return (
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: '#E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <FileText size={32} color="#8B5CF6" />
              Standard Operating Procedures
            </h1>
            <p style={{ color: '#64748B', marginTop: '4px' }}>
              {filteredSOPs.length} procedure{filteredSOPs.length !== 1 ? 's' : ''} in library
            </p>
          </div>
          
          <button
            onClick={() => { resetImport(); setView('import'); }}
            style={{
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '14px 24px',
              color: '#10B981',
              fontWeight: '600',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Upload size={20} /> Import Existing
          </button>
          
          <button
            onClick={() => { resetBuilder(); setView('builder'); }}
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 24px',
              color: 'white',
              fontWeight: '600',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
            }}
          >
            <Plus size={20} /> Build New SOP
          </button>
        </div>

        {/* Search and Filter */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '24px'
        }}>
          <div style={{ 
            flex: 1,
            position: 'relative'
          }}>
            <Search size={18} style={{ 
              position: 'absolute', 
              left: '14px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#64748B'
            }} />
            <input
              type="text"
              placeholder="Search procedures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '12px 12px 12px 44px',
                color: 'white',
                fontSize: '15px'
              }}
            />
          </div>
          
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '12px 16px',
              color: 'white',
              fontSize: '15px',
              minWidth: '200px',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>

        {/* SOP List */}
        {filteredSOPs.length === 0 ? (
          <div style={{
            background: 'rgba(30, 41, 59, 0.6)',
            borderRadius: '16px',
            padding: '60px',
            textAlign: 'center'
          }}>
            <BookOpen size={48} color="#64748B" style={{ marginBottom: '16px' }} />
            <h3 style={{ color: '#94A3B8', marginBottom: '8px' }}>No SOPs Found</h3>
            <p style={{ color: '#64748B', marginBottom: '24px' }}>
              {searchQuery || filterDept !== 'all' 
                ? 'Try adjusting your search or filter'
                : 'Create your first standard operating procedure'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => { resetImport(); setView('import'); }}
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  color: '#10B981',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Upload size={18} /> Import Existing
              </button>
              <button
                onClick={() => { resetBuilder(); setView('builder'); }}
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Create First SOP
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredSOPs.map(sop => (
              <div 
                key={sop.id}
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  overflow: 'hidden'
                }}
              >
                {/* SOP Header */}
                <div 
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setExpandedSOP(expandedSOP === sop.id ? null : sop.id)}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <List size={24} color="white" />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      color: '#E2E8F0', 
                      fontSize: '18px',
                      fontWeight: '600',
                      marginBottom: '4px'
                    }}>
                      {sop.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{
                        background: 'rgba(139, 92, 246, 0.2)',
                        color: '#A78BFA',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {sop.departmentName}
                      </span>
                      <span style={{ color: '#64748B', fontSize: '13px' }}>
                        {sop.steps?.length || 0} steps
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); editSOP(sop); }}
                      style={{
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        color: '#60A5FA',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSOP(sop.id); }}
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        color: '#F87171',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                    {expandedSOP === sop.id ? <ChevronDown size={20} color="#64748B" /> : <ChevronRight size={20} color="#64748B" />}
                  </div>
                </div>
                
                {/* Expanded View */}
                {expandedSOP === sop.id && (
                  <div style={{ 
                    padding: '0 24px 24px',
                    borderTop: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    {sop.description && (
                      <p style={{ 
                        color: '#94A3B8', 
                        padding: '16px 0',
                        lineHeight: '1.6'
                      }}>
                        {sop.description}
                      </p>
                    )}
                    
                    {sop.steps?.map((step, idx) => renderStepEditor(step, idx, false))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // IMPORT VIEW
  if (view === 'import') {
    return (
      <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <button
            onClick={() => { setView('library'); resetImport(); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '15px'
            }}
          >
            <ArrowLeft size={20} /> Back to Library
          </button>
        </div>

        {/* Import Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Upload size={48} color="#10B981" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#E2E8F0', marginBottom: '8px' }}>
            Import Existing SOP
          </h2>
          <p style={{ color: '#64748B' }}>
            Paste content or upload a file — AI will structure it for you
          </p>
        </div>

        {/* Import Method Toggle */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '24px',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => setImportMethod('paste')}
            style={{
              background: importMethod === 'paste' 
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                : 'rgba(30, 41, 59, 0.8)',
              border: importMethod === 'paste' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '12px 24px',
              color: 'white',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ClipboardPaste size={18} /> Paste Text
          </button>
          <button
            onClick={() => setImportMethod('upload')}
            style={{
              background: importMethod === 'upload' 
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                : 'rgba(30, 41, 59, 0.8)',
              border: importMethod === 'upload' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '12px 24px',
              color: 'white',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FileUp size={18} /> Upload File
          </button>
        </div>

        {/* Import Content Area */}
        <div style={{ 
          background: 'rgba(30, 41, 59, 0.6)',
          borderRadius: '16px',
          padding: '32px'
        }}>
          {/* Department Selector */}
          <label style={{ display: 'block', marginBottom: '8px', color: '#94A3B8', fontSize: '14px' }}>
            Department
          </label>
          <select
            value={importDept}
            onChange={(e) => setImportDept(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '14px 16px',
              color: 'white',
              fontSize: '15px',
              marginBottom: '24px',
              cursor: 'pointer'
            }}
          >
            <option value="">Select a department...</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>

          {/* Paste Method */}
          {importMethod === 'paste' && (
            <>
              <label style={{ display: 'block', marginBottom: '8px', color: '#94A3B8', fontSize: '14px' }}>
                Paste your SOP content
              </label>
              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder={`Paste your existing SOP here...

Example formats that work well:
• Numbered lists (1. First step, 2. Second step)
• Bullet points
• Paragraph descriptions
• Spreadsheet content (copy cells)
• Any text describing a procedure`}
                rows={12}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  color: 'white',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: '1.6'
                }}
              />
              <p style={{ color: '#64748B', fontSize: '13px', marginTop: '8px' }}>
                Tip: Copy directly from Word, Google Docs, Excel, or any other source
              </p>
            </>
          )}

          {/* Upload Method */}
          {importMethod === 'upload' && (
            <>
              <label style={{ display: 'block', marginBottom: '8px', color: '#94A3B8', fontSize: '14px' }}>
                Upload a file
              </label>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.md,.csv,.json"
                style={{ display: 'none' }}
              />
              
              {!uploadedFileName ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed rgba(16, 185, 129, 0.3)',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#10B981'; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)'; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      const fakeEvent = { target: { files: [file] } };
                      handleFileUpload(fakeEvent);
                    }
                  }}
                >
                  <FileUp size={40} color="#10B981" style={{ marginBottom: '12px' }} />
                  <p style={{ color: '#E2E8F0', fontWeight: '500', marginBottom: '4px' }}>
                    Click to upload or drag and drop
                  </p>
                  <p style={{ color: '#64748B', fontSize: '13px' }}>
                    Supports: TXT, MD, CSV, JSON
                  </p>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    {uploadedFileName.endsWith('.csv') ? (
                      <FileSpreadsheet size={24} color="#10B981" />
                    ) : (
                      <File size={24} color="#10B981" />
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ color: '#E2E8F0', fontWeight: '500' }}>{uploadedFileName}</p>
                      <p style={{ color: '#64748B', fontSize: '13px' }}>
                        {uploadedFileContent.length.toLocaleString()} characters
                      </p>
                    </div>
                    <button
                      onClick={() => { setUploadedFileName(''); setUploadedFileContent(''); }}
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        color: '#F87171',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  {/* Preview */}
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    borderRadius: '8px',
                    padding: '12px',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    <pre style={{ 
                      color: '#94A3B8', 
                      fontSize: '12px', 
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                      fontFamily: 'monospace'
                    }}>
                      {uploadedFileContent.substring(0, 1000)}
                      {uploadedFileContent.length > 1000 && '...'}
                    </pre>
                  </div>
                </div>
              )}
              
              <p style={{ color: '#64748B', fontSize: '13px', marginTop: '12px' }}>
                For Word docs (.docx) or Excel (.xlsx): Open the file, copy the content, and use "Paste Text" instead
              </p>
            </>
          )}

          {/* Process Button */}
          <button
            onClick={parseImportedContent}
            disabled={
              !importDept || 
              isParsingImport || 
              (importMethod === 'paste' && !pasteContent.trim()) ||
              (importMethod === 'upload' && !uploadedFileContent)
            }
            style={{
              width: '100%',
              marginTop: '24px',
              background: (!importDept || 
                (importMethod === 'paste' && !pasteContent.trim()) ||
                (importMethod === 'upload' && !uploadedFileContent))
                ? 'rgba(16, 185, 129, 0.3)'
                : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              color: 'white',
              fontWeight: '600',
              fontSize: '16px',
              cursor: (!importDept || 
                (importMethod === 'paste' && !pasteContent.trim()) ||
                (importMethod === 'upload' && !uploadedFileContent))
                ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {isParsingImport ? (
              <>
                <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Processing with AI...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Convert to Structured SOP
              </>
            )}
          </button>
        </div>

        {/* Tips */}
        <div style={{
          marginTop: '24px',
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h4 style={{ color: '#A78BFA', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
            💡 What works best
          </h4>
          <ul style={{ color: '#94A3B8', fontSize: '13px', margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>Any numbered or bulleted list of steps</li>
            <li>Paragraphs describing a process</li>
            <li>Spreadsheet cells copied directly</li>
            <li>Existing SOPs from other systems</li>
            <li>Even rough notes — AI will organize them</li>
          </ul>
        </div>
      </div>
    );
  }

  // EDITOR VIEW (editing existing SOP)
  if (view === 'editor' && currentSOP) {
    return (
      <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <button
            onClick={() => { setView('library'); setCurrentSOP(null); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '15px'
            }}
          >
            <ArrowLeft size={20} /> Back to Library
          </button>
          
          <button
            onClick={saveEditedSOP}
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 24px',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Save size={18} /> Save Changes
          </button>
        </div>

        {/* SOP Title */}
        <div style={{ marginBottom: '24px' }}>
          {editingTitle ? (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '2px solid #8B5CF6',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: '700'
                }}
              />
              <button
                onClick={() => {
                  setCurrentSOP(prev => ({ ...prev, title: tempTitle }));
                  setEditingTitle(false);
                }}
                style={{
                  background: '#10B981',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                <Check size={20} />
              </button>
              <button
                onClick={() => setEditingTitle(false)}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  color: '#F87171',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
              onClick={() => { setTempTitle(currentSOP.title); setEditingTitle(true); }}
            >
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#E2E8F0' }}>
                {currentSOP.title}
              </h1>
              <Edit3 size={20} color="#64748B" />
            </div>
          )}
          
          <span style={{
            display: 'inline-block',
            background: 'rgba(139, 92, 246, 0.2)',
            color: '#A78BFA',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '13px',
            marginTop: '8px'
          }}>
            {currentSOP.departmentName}
          </span>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '32px' }}>
          {editingDescription ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                value={tempDescription}
                onChange={(e) => setTempDescription(e.target.value)}
                autoFocus
                rows={3}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '2px solid #8B5CF6',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  color: 'white',
                  fontSize: '15px',
                  resize: 'vertical'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setCurrentSOP(prev => ({ ...prev, description: tempDescription }));
                    setEditingDescription(false);
                  }}
                  style={{
                    background: '#10B981',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingDescription(false)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: '#F87171',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div 
              style={{ 
                padding: '16px',
                background: 'rgba(30, 41, 59, 0.4)',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
              onClick={() => { setTempDescription(currentSOP.description || ''); setEditingDescription(true); }}
            >
              <p style={{ color: '#94A3B8', flex: 1, lineHeight: '1.6' }}>
                {currentSOP.description || 'Click to add a description...'}
              </p>
              <Edit3 size={16} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
            </div>
          )}
        </div>

        {/* Steps */}
        <div>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#E2E8F0',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <List size={20} color="#8B5CF6" />
            Procedure Steps
            <span style={{ 
              fontSize: '13px', 
              color: '#64748B', 
              fontWeight: '400',
              marginLeft: '8px'
            }}>
              Drag to reorder
            </span>
          </h2>
          
          {currentSOP.steps?.map((step, idx) => renderStepEditor(step, idx, true))}
          
          <button
            onClick={() => addStep(currentSOP.steps.length - 1)}
            style={{
              width: '100%',
              background: 'transparent',
              border: '2px dashed rgba(139, 92, 246, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              color: '#8B5CF6',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '16px'
            }}
          >
            <Plus size={20} /> Add New Step
          </button>
        </div>
      </div>
    );
  }

  // BUILDER VIEW
  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <button
          onClick={() => { setView('library'); resetBuilder(); }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '15px'
          }}
        >
          <ArrowLeft size={20} /> Back to Library
        </button>
        
        {/* Progress Indicator */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {[1, 2, 3, 4].map(stage => (
            <div 
              key={stage}
              style={{
                width: stage === builderStage ? '32px' : '12px',
                height: '12px',
                borderRadius: '6px',
                background: stage <= builderStage 
                  ? 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)' 
                  : 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* Stage 1: Describe */}
      {builderStage === 1 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <Lightbulb size={48} color="#8B5CF6" style={{ marginBottom: '16px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#E2E8F0', marginBottom: '8px' }}>
              Describe Your Procedure
            </h2>
            <p style={{ color: '#64748B' }}>
              Tell us what process you want to document
            </p>
          </div>
          
          <div style={{ 
            background: 'rgba(30, 41, 59, 0.6)',
            borderRadius: '16px',
            padding: '32px'
          }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#94A3B8', fontSize: '14px' }}>
              Department
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '14px 16px',
                color: 'white',
                fontSize: '15px',
                marginBottom: '24px',
                cursor: 'pointer'
              }}
            >
              <option value="">Select a department...</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            
            <label style={{ display: 'block', marginBottom: '8px', color: '#94A3B8', fontSize: '14px' }}>
              What procedure do you want to create?
            </label>
            <textarea
              value={sopIdea}
              onChange={(e) => setSopIdea(e.target.value)}
              placeholder="e.g., How to handle a customer complaint about project delays..."
              rows={4}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '14px 16px',
                color: 'white',
                fontSize: '15px',
                resize: 'vertical',
                marginBottom: '24px'
              }}
            />
            
            <button
              onClick={generateQuestions}
              disabled={!sopIdea.trim() || !selectedDept || isGeneratingQuestions}
              style={{
                width: '100%',
                background: !sopIdea.trim() || !selectedDept 
                  ? 'rgba(139, 92, 246, 0.3)'
                  : 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                color: 'white',
                fontWeight: '600',
                fontSize: '16px',
                cursor: sopIdea.trim() && selectedDept ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {isGeneratingQuestions ? (
                <>
                  <Loader size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Questions
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Stage 2: Answer Questions */}
      {builderStage === 2 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#E2E8F0', marginBottom: '8px' }}>
              Answer a Few Questions
            </h2>
            <p style={{ color: '#64748B' }}>
              This helps create a more detailed and accurate SOP
            </p>
          </div>
          
          <div style={{ 
            background: 'rgba(30, 41, 59, 0.6)',
            borderRadius: '16px',
            padding: '32px'
          }}>
            {questions.map((q, idx) => (
              <div key={idx} style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: '#E2E8F0',
                  fontSize: '15px',
                  fontWeight: '500'
                }}>
                  {q.question}
                  {q.required && <span style={{ color: '#EF4444' }}> *</span>}
                </label>
                {q.hint && (
                  <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '8px' }}>
                    {q.hint}
                  </p>
                )}
                <textarea
                  value={answers[idx] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                  rows={2}
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    color: 'white',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>
            ))}
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button
                onClick={() => setBuilderStage(1)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '14px 24px',
                  color: '#94A3B8',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Back
              </button>
              <button
                onClick={generateSOP}
                disabled={isGeneratingSOP}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                {isGeneratingSOP ? (
                  <>
                    <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    Generating SOP...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Generate SOP
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 3: Review & Edit */}
      {builderStage === 3 && currentSOP && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#E2E8F0', marginBottom: '8px' }}>
              Review & Edit Your SOP
            </h2>
            <p style={{ color: '#64748B' }}>
              Edit any section, drag steps to reorder
            </p>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '24px' }}>
            {editingTitle ? (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '2px solid #8B5CF6',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    color: 'white',
                    fontSize: '24px',
                    fontWeight: '700'
                  }}
                />
                <button
                  onClick={() => {
                    setCurrentSOP(prev => ({ ...prev, title: tempTitle }));
                    setEditingTitle(false);
                  }}
                  style={{
                    background: '#10B981',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <Check size={20} />
                </button>
                <button
                  onClick={() => setEditingTitle(false)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    color: '#F87171',
                    cursor: 'pointer'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                onClick={() => { setTempTitle(currentSOP.title); setEditingTitle(true); }}
              >
                <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#E2E8F0' }}>
                  {currentSOP.title}
                </h1>
                <Edit3 size={20} color="#64748B" />
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: '32px' }}>
            {editingDescription ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <textarea
                  value={tempDescription}
                  onChange={(e) => setTempDescription(e.target.value)}
                  autoFocus
                  rows={3}
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '2px solid #8B5CF6',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    color: 'white',
                    fontSize: '15px',
                    resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setCurrentSOP(prev => ({ ...prev, description: tempDescription }));
                      setEditingDescription(false);
                    }}
                    style={{
                      background: '#10B981',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingDescription(false)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      color: '#F87171',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div 
                style={{ 
                  padding: '16px',
                  background: 'rgba(30, 41, 59, 0.4)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
                onClick={() => { setTempDescription(currentSOP.description || ''); setEditingDescription(true); }}
              >
                <p style={{ color: '#94A3B8', flex: 1, lineHeight: '1.6' }}>
                  {currentSOP.description}
                </p>
                <Edit3 size={16} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
              </div>
            )}
          </div>

          {/* Steps */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#E2E8F0',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <List size={20} color="#8B5CF6" />
              Procedure Steps
            </h2>
            
            {currentSOP.steps?.map((step, idx) => renderStepEditor(step, idx, true))}
            
            <button
              onClick={() => addStep(currentSOP.steps.length - 1)}
              style={{
                width: '100%',
                background: 'transparent',
                border: '2px dashed rgba(139, 92, 246, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                color: '#8B5CF6',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Plus size={20} /> Add New Step
            </button>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setBuilderStage(2)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '10px',
                padding: '14px 24px',
                color: '#94A3B8',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Back
            </button>
            <button
              onClick={saveSOP}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                color: 'white',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <Save size={20} />
              Save to Knowledge Base
            </button>
          </div>
        </div>
      )}

      {/* Stage 4: Success */}
      {builderStage === 4 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <Check size={40} color="white" />
          </div>
          
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#E2E8F0', marginBottom: '12px' }}>
            SOP Created Successfully!
          </h2>
          <p style={{ color: '#64748B', marginBottom: '32px' }}>
            Your procedure has been saved to the Knowledge Base
          </p>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button
              onClick={() => setView('library')}
              style={{
                background: 'rgba(139, 92, 246, 0.2)',
                border: 'none',
                borderRadius: '10px',
                padding: '14px 28px',
                color: '#A78BFA',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              View Library
            </button>
            <button
              onClick={resetBuilder}
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                border: 'none',
                borderRadius: '10px',
                padding: '14px 28px',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={18} /> Create Another
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
