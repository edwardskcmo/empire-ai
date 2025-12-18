import React, { useState, useRef } from 'react';
import { 
  FileText, Plus, ChevronDown, ChevronUp, Search, Filter, Trash2, 
  Edit3, Save, X, Loader, CheckCircle, ArrowLeft, ArrowRight,
  Lightbulb, List, BookOpen, ClipboardList, HelpCircle,
  Upload, ClipboardPaste, FileUp, FileSpreadsheet, File, Link, Globe
} from 'lucide-react';
import { SOP_CONFIG } from '../utils';

const SOPs = ({ 
  departments, 
  knowledge, 
  setKnowledge, 
  logActivity, 
  addToIntelligence,
  sops,
  setSops
}) => {
  // View state
  const [view, setView] = useState('library'); // library, import, builder, editor
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [expandedSOP, setExpandedSOP] = useState(null);
  
  // Import state
  const [importMethod, setImportMethod] = useState('paste'); // paste, upload, url
  const [pasteContent, setPasteContent] = useState('');
  const [importDept, setImportDept] = useState('');
  const [isParsingImport, setIsParsingImport] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileContent, setUploadedFileContent] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState('');
  const fileInputRef = useRef(null);
  
  // Builder state
  const [builderStage, setBuilderStage] = useState(1); // 1: describe, 2: answer, 3: review, 4: saved
  const [sopIdea, setSopIdea] = useState('');
  const [sopDept, setSopDept] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isGeneratingSOP, setIsGeneratingSOP] = useState(false);
  
  // Editor state (for both builder result and import result)
  const [editingSOP, setEditingSOP] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);

  // ============ LIBRARY FUNCTIONS ============
  
  const filteredSOPs = (sops || []).filter(sop => {
    const matchesSearch = sop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sop.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === 'all' || sop.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const deleteSOP = (sopId) => {
    if (window.confirm('Delete this SOP? This cannot be undone.')) {
      setSops(prev => prev.filter(s => s.id !== sopId));
      logActivity('Deleted an SOP', 'sop');
    }
  };

  const editExistingSOP = (sop) => {
    setEditingSOP({ ...sop });
    setExpandedStep(null);
    setView('editor');
  };

  // ============ IMPORT FUNCTIONS ============

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const validTypes = ['.txt', '.md', '.csv', '.json'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(ext)) {
      alert('Please upload a TXT, MD, CSV, or JSON file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      let content = event.target.result;
      
      // Convert CSV to readable format
      if (ext === '.csv') {
        const lines = content.split('\n');
        const formatted = lines.map((line, i) => {
          if (i === 0) return `Headers: ${line}`;
          return `Row ${i}: ${line}`;
        }).join('\n');
        content = formatted;
      }
      
      setUploadedFileName(file.name);
      setUploadedFileContent(content);
    };
    reader.readAsText(file);
  };

  const isNotionUrl = (url) => {
    return url.includes('notion.so') || url.includes('notion.site');
  };

  const fetchUrlContent = async () => {
    if (!urlInput.trim()) {
      setUrlError('Please enter a URL');
      return;
    }
    
    // Basic URL validation
    let url = urlInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    setIsFetchingUrl(true);
    setUrlError('');
    
    try {
      // Detect if it's a Notion URL and use appropriate endpoint
      const isNotion = isNotionUrl(url);
      const endpoint = isNotion ? '/api/fetch-notion' : '/api/fetch-doc';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      
      if (data.error) {
        // Special handling for Notion setup required
        if (data.setup_required) {
          setUrlError('Notion integration not set up yet. See setup instructions below.');
        } else {
          setUrlError(data.error);
        }
        setIsFetchingUrl(false);
        return;
      }
      
      if (!data.content || data.content.trim().length < 50) {
        setUrlError('Could not extract enough content from this URL. Try pasting the content directly.');
        setIsFetchingUrl(false);
        return;
      }
      
      // Success - now parse the content
      setIsFetchingUrl(false);
      const source = isNotion ? `Notion: ${data.title || url}` : `Imported from: ${url}`;
      await parseImportedContent(data.content, source);
      
    } catch (error) {
      console.error('URL fetch error:', error);
      setUrlError('Failed to fetch URL. Make sure it\'s publicly accessible.');
      setIsFetchingUrl(false);
    }
  };

  const parseImportedContent = async (content, source = 'Imported content') => {
    if (!importDept) {
      alert('Please select a department first');
      return;
    }
    
    setIsParsingImport(true);
    
    try {
      const parsePrompt = `You are parsing an existing procedure/SOP document into a structured format.

The content below is from: ${source}

CONTENT TO PARSE:
${content.substring(0, 8000)}

Please extract and structure this into an SOP with:
1. A clear, concise title (max 60 characters)
2. A brief description (1-2 sentences)
3. Numbered steps, each with:
   - A step title
   - Bullet points with specific details

Return ONLY valid JSON in this exact format:
{
  "title": "Title here",
  "description": "Description here",
  "steps": [
    {
      "title": "Step 1 title",
      "details": ["Detail 1", "Detail 2", "Detail 3"]
    }
  ]
}

If the content doesn't seem like a procedure, create the best structured version you can.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: parsePrompt,
          systemPrompt: 'You are a helpful assistant that parses documents into structured SOP format. Always return valid JSON only.',
          conversationHistory: []
        })
      });
      
      const data = await response.json();
      
      // Try to parse JSON from response
      let parsed;
      try {
        // Extract JSON from response (may have markdown code blocks)
        const jsonMatch = data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch (e) {
        console.error('Parse error:', e);
        // Fallback structure
        parsed = {
          title: 'Imported Procedure',
          description: 'Imported from external source - please review and edit',
          steps: [
            {
              title: 'Review imported content',
              details: ['The AI could not fully parse this content', 'Please edit manually below', content.substring(0, 200) + '...']
            }
          ]
        };
      }
      
      // Create SOP structure for editor
      const dept = departments.find(d => d.id === importDept);
      setEditingSOP({
        id: 'sop_' + Date.now(),
        title: parsed.title || 'Imported Procedure',
        description: parsed.description || '',
        department: importDept,
        departmentName: dept?.name || 'General',
        steps: (parsed.steps || []).map((step, i) => ({
          id: 'step_' + Date.now() + '_' + i,
          number: i + 1,
          title: step.title || `Step ${i + 1}`,
          details: step.details || [],
          notes: ''
        })),
        createdAt: new Date().toISOString(),
        source: source
      });
      
      setView('editor');
      
    } catch (error) {
      console.error('Parse error:', error);
      alert('Failed to parse content. Please try again or paste in a different format.');
    } finally {
      setIsParsingImport(false);
    }
  };

  const resetImport = () => {
    setImportMethod('paste');
    setPasteContent('');
    setUploadedFileName('');
    setUploadedFileContent('');
    setUrlInput('');
    setUrlError('');
    setImportDept('');
    setView('library');
  };

  // ============ BUILDER FUNCTIONS ============

  const generateQuestions = async () => {
    if (!sopIdea.trim() || !sopDept) {
      alert('Please enter an idea and select a department');
      return;
    }
    
    setIsGeneratingQuestions(true);
    
    try {
      const dept = departments.find(d => d.id === sopDept);
      const prompt = `You are helping create a Standard Operating Procedure (SOP) for a remodeling company.

Department: ${dept?.name || 'General'}
Procedure idea: ${sopIdea}

Generate 5-7 clarifying questions that will help create a comprehensive SOP. These questions should:
1. Clarify the scope and boundaries of the procedure
2. Identify key decision points
3. Understand safety or compliance requirements
4. Clarify roles and responsibilities
5. Identify tools, materials, or systems needed

Return ONLY a JSON array of question objects:
[
  {"id": 1, "question": "Question text here?", "hint": "Brief hint about what kind of answer is helpful", "required": true},
  {"id": 2, "question": "Question text here?", "hint": "Brief hint", "required": false}
]

Make 2-3 questions required (most important) and the rest optional.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          systemPrompt: 'You are an SOP creation assistant. Return only valid JSON arrays.',
          conversationHistory: []
        })
      });
      
      const data = await response.json();
      
      // Parse questions from response
      try {
        const jsonMatch = data.response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setQuestions(parsed);
          setBuilderStage(2);
        } else {
          throw new Error('No JSON array found');
        }
      } catch (e) {
        console.error('Parse error:', e);
        // Fallback questions
        setQuestions([
          { id: 1, question: 'What triggers this procedure to start?', hint: 'Event, request, schedule, etc.', required: true },
          { id: 2, question: 'Who is responsible for performing this procedure?', hint: 'Role or position', required: true },
          { id: 3, question: 'What tools or materials are needed?', hint: 'Equipment, software, forms', required: false },
          { id: 4, question: 'Are there any safety considerations?', hint: 'PPE, hazards, precautions', required: false },
          { id: 5, question: 'How do you know when the procedure is complete?', hint: 'Deliverable, sign-off, checklist', required: true }
        ]);
        setBuilderStage(2);
      }
      
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Failed to generate questions. Please try again.');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const generateSOP = async () => {
    // Check required questions are answered
    const requiredUnanswered = questions.filter(q => q.required && !answers[q.id]?.trim());
    if (requiredUnanswered.length > 0) {
      alert(`Please answer all required questions (marked with *)`);
      return;
    }
    
    setIsGeneratingSOP(true);
    
    try {
      const dept = departments.find(d => d.id === sopDept);
      const qaText = questions.map(q => 
        `Q: ${q.question}\nA: ${answers[q.id] || '(not answered)'}`
      ).join('\n\n');
      
      const prompt = `Create a detailed Standard Operating Procedure (SOP) based on the following:

Department: ${dept?.name || 'General'}
Procedure: ${sopIdea}

Questions and Answers:
${qaText}

Create a professional SOP with:
1. A clear, concise title (max 60 characters)
2. A brief description (1-2 sentences explaining purpose)
3. 5-10 numbered steps, each with:
   - A clear step title
   - 2-4 bullet point details with specific actions

Return ONLY valid JSON:
{
  "title": "Title here",
  "description": "Description here",
  "steps": [
    {
      "title": "Step 1 title",
      "details": ["Specific action 1", "Specific action 2"]
    }
  ]
}`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          systemPrompt: 'You are an SOP creation expert for a remodeling company. Create clear, actionable procedures. Return only valid JSON.',
          conversationHistory: []
        })
      });
      
      const data = await response.json();
      
      // Parse SOP from response
      let parsed;
      try {
        const jsonMatch = data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch (e) {
        console.error('Parse error:', e);
        parsed = {
          title: sopIdea.substring(0, 60),
          description: 'AI-generated procedure - please review and edit',
          steps: [
            { title: 'Step 1', details: ['Please add details'] }
          ]
        };
      }
      
      // Create SOP structure for editor
      setEditingSOP({
        id: 'sop_' + Date.now(),
        title: parsed.title,
        description: parsed.description,
        department: sopDept,
        departmentName: dept?.name || 'General',
        steps: parsed.steps.map((step, i) => ({
          id: 'step_' + Date.now() + '_' + i,
          number: i + 1,
          title: step.title,
          details: step.details || [],
          notes: ''
        })),
        createdAt: new Date().toISOString(),
        source: 'AI Generated'
      });
      
      setBuilderStage(3);
      setView('editor');
      
    } catch (error) {
      console.error('Error generating SOP:', error);
      alert('Failed to generate SOP. Please try again.');
    } finally {
      setIsGeneratingSOP(false);
    }
  };

  const resetBuilder = () => {
    setBuilderStage(1);
    setSopIdea('');
    setSopDept('');
    setQuestions([]);
    setAnswers({});
    setEditingSOP(null);
    setExpandedStep(null);
    setView('library');
  };

  // ============ EDITOR FUNCTIONS ============

  const updateStepTitle = (stepId, newTitle) => {
    setEditingSOP(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === stepId ? { ...s, title: newTitle } : s)
    }));
  };

  const updateStepDetails = (stepId, detailIndex, newDetail) => {
    setEditingSOP(prev => ({
      ...prev,
      steps: prev.steps.map(s => {
        if (s.id === stepId) {
          const newDetails = [...s.details];
          newDetails[detailIndex] = newDetail;
          return { ...s, details: newDetails };
        }
        return s;
      })
    }));
  };

  const addStepDetail = (stepId) => {
    setEditingSOP(prev => ({
      ...prev,
      steps: prev.steps.map(s => {
        if (s.id === stepId) {
          return { ...s, details: [...s.details, 'New detail'] };
        }
        return s;
      })
    }));
  };

  const removeStepDetail = (stepId, detailIndex) => {
    setEditingSOP(prev => ({
      ...prev,
      steps: prev.steps.map(s => {
        if (s.id === stepId) {
          const newDetails = s.details.filter((_, i) => i !== detailIndex);
          return { ...s, details: newDetails };
        }
        return s;
      })
    }));
  };

  const updateStepNotes = (stepId, notes) => {
    setEditingSOP(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === stepId ? { ...s, notes } : s)
    }));
  };

  const addStep = () => {
    const newStep = {
      id: 'step_' + Date.now(),
      number: editingSOP.steps.length + 1,
      title: 'New Step',
      details: ['Add details here'],
      notes: ''
    };
    setEditingSOP(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
    setExpandedStep(newStep.id);
  };

  const removeStep = (stepId) => {
    if (editingSOP.steps.length <= 1) {
      alert('SOP must have at least one step');
      return;
    }
    setEditingSOP(prev => ({
      ...prev,
      steps: prev.steps.filter(s => s.id !== stepId).map((s, i) => ({ ...s, number: i + 1 }))
    }));
  };

  const saveSOP = () => {
    if (!editingSOP.title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (editingSOP.steps.length === 0) {
      alert('Please add at least one step');
      return;
    }
    
    const finalSOP = {
      ...editingSOP,
      updatedAt: new Date().toISOString()
    };
    
    // Check if editing existing or creating new
    const existingIndex = (sops || []).findIndex(s => s.id === finalSOP.id);
    if (existingIndex >= 0) {
      setSops(prev => prev.map((s, i) => i === existingIndex ? finalSOP : s));
    } else {
      setSops(prev => [...(prev || []), finalSOP]);
    }
    
    // Also add to knowledge base
    const knowledgeEntry = {
      id: 'kb_sop_' + finalSOP.id,
      title: `SOP: ${finalSOP.title}`,
      content: `${finalSOP.description}\n\n${finalSOP.steps.map(s => 
        `${s.number}. ${s.title}\n${s.details.map(d => `   • ${d}`).join('\n')}`
      ).join('\n\n')}`,
      department: finalSOP.department,
      type: 'sop',
      createdAt: finalSOP.createdAt
    };
    
    // Update or add to knowledge
    const existingKBIndex = knowledge.findIndex(k => k.id === knowledgeEntry.id);
    if (existingKBIndex >= 0) {
      setKnowledge(prev => prev.map((k, i) => i === existingKBIndex ? knowledgeEntry : k));
    } else {
      setKnowledge(prev => [...prev, knowledgeEntry]);
    }
    
    // Log to intelligence
    addToIntelligence({
      sourceType: 'sop_created',
      sourceId: finalSOP.id,
      title: finalSOP.title,
      content: finalSOP.description,
      department: finalSOP.department,
      tags: ['sop', 'procedure', 'process'],
      relevanceBoost: 3
    });
    
    logActivity(`Created SOP: ${finalSOP.title}`, 'sop', finalSOP.departmentName);
    
    setBuilderStage(4);
  };

  // ============ RENDER HELPERS ============

  const answeredCount = Object.values(answers).filter(a => a?.trim()).length;

  // ============ RENDER ============

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {view !== 'library' && (
            <button
              onClick={() => {
                if (view === 'import') resetImport();
                else if (view === 'builder') resetBuilder();
                else if (view === 'editor') {
                  if (builderStage === 3) setBuilderStage(2);
                  else setView('library');
                }
              }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ArrowLeft size={20} color="#94A3B8" />
            </button>
          )}
          <FileText size={28} color="#8B5CF6" />
          <h1 style={{ margin: 0, color: '#E2E8F0', fontSize: '24px' }}>
            {view === 'library' ? 'Standard Operating Procedures' :
             view === 'import' ? 'Import Existing SOP' :
             view === 'builder' ? 'Build New SOP' :
             'Edit SOP'}
          </h1>
        </div>
        
        {view === 'library' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setView('import')}
              style={{
                background: 'linear-gradient(135deg, #059669, #10B981)',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Upload size={18} />
              Import Existing
            </button>
            <button
              onClick={() => setView('builder')}
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={18} />
              Build New SOP
            </button>
          </div>
        )}
      </div>

      {/* LIBRARY VIEW */}
      {view === 'library' && (
        <>
          {/* Search and Filter */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search SOPs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 40px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#E2E8F0',
                  fontSize: '14px'
                }}
              />
            </div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              style={{
                padding: '10px 16px',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
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
              textAlign: 'center',
              padding: '60px 20px',
              background: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '12px',
              border: '1px dashed rgba(255,255,255,0.1)'
            }}>
              <FileText size={48} color="#64748B" style={{ marginBottom: '16px' }} />
              <h3 style={{ color: '#94A3B8', margin: '0 0 8px' }}>No SOPs Found</h3>
              <p style={{ color: '#64748B', margin: '0 0 20px' }}>
                {searchTerm || filterDept !== 'all' 
                  ? 'Try adjusting your search or filter'
                  : 'Get started by creating your first SOP'}
              </p>
              {!searchTerm && filterDept === 'all' && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => setView('import')}
                    style={{
                      background: 'linear-gradient(135deg, #059669, #10B981)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      color: 'white',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Import Existing
                  </button>
                  <button
                    onClick={() => setView('builder')}
                    style={{
                      background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      color: 'white',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Build New SOP
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredSOPs.map(sop => {
                const isExpanded = expandedSOP === sop.id;
                const dept = departments.find(d => d.id === sop.department);
                return (
                  <div
                    key={sop.id}
                    style={{
                      background: 'rgba(30, 41, 59, 0.8)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Header */}
                    <div
                      onClick={() => setExpandedSOP(isExpanded ? null : sop.id)}
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <ClipboardList size={20} color="#8B5CF6" />
                        <div>
                          <h3 style={{ margin: 0, color: '#E2E8F0', fontSize: '16px' }}>{sop.title}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span style={{
                              background: dept?.color || '#64748B',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: 'white'
                            }}>
                              {dept?.name || 'General'}
                            </span>
                            <span style={{ color: '#64748B', fontSize: '12px' }}>
                              {sop.steps?.length || 0} steps
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); editExistingSOP(sop); }}
                          style={{
                            background: 'rgba(59, 130, 246, 0.2)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={14} color="#3B82F6" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSOP(sop.id); }}
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} color="#EF4444" />
                        </button>
                        {isExpanded ? <ChevronUp size={20} color="#64748B" /> : <ChevronDown size={20} color="#64748B" />}
                      </div>
                    </div>
                    
                    {/* Expanded Content */}
                    {isExpanded && (
                      <div style={{
                        padding: '0 20px 20px',
                        borderTop: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        {sop.description && (
                          <p style={{ color: '#94A3B8', fontSize: '14px', margin: '16px 0' }}>
                            {sop.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {(sop.steps || []).map((step, i) => (
                            <div key={step.id || i} style={{
                              background: 'rgba(15, 23, 42, 0.5)',
                              borderRadius: '8px',
                              padding: '12px 16px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <span style={{
                                  background: '#8B5CF6',
                                  color: 'white',
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: '600'
                                }}>
                                  {step.number || i + 1}
                                </span>
                                <span style={{ color: '#E2E8F0', fontWeight: '500' }}>{step.title}</span>
                              </div>
                              <ul style={{ margin: '0 0 0 34px', padding: 0, listStyle: 'disc' }}>
                                {(step.details || []).map((detail, j) => (
                                  <li key={j} style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '4px' }}>
                                    {detail}
                                  </li>
                                ))}
                              </ul>
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
        </>
      )}

      {/* IMPORT VIEW */}
      {view === 'import' && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '24px'
        }}>
          {/* Import Method Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <button
              onClick={() => setImportMethod('paste')}
              style={{
                flex: 1,
                padding: '12px',
                background: importMethod === 'paste' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                border: importMethod === 'paste' ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: importMethod === 'paste' ? '#10B981' : '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '500'
              }}
            >
              <ClipboardPaste size={18} />
              Paste Text
            </button>
            <button
              onClick={() => setImportMethod('upload')}
              style={{
                flex: 1,
                padding: '12px',
                background: importMethod === 'upload' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                border: importMethod === 'upload' ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: importMethod === 'upload' ? '#3B82F6' : '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '500'
              }}
            >
              <FileUp size={18} />
              Upload File
            </button>
            <button
              onClick={() => setImportMethod('url')}
              style={{
                flex: 1,
                padding: '12px',
                background: importMethod === 'url' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                border: importMethod === 'url' ? '1px solid #8B5CF6' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: importMethod === 'url' ? '#8B5CF6' : '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '500'
              }}
            >
              <Globe size={18} />
              Import from URL
            </button>
          </div>

          {/* Department Selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#94A3B8', fontSize: '14px', marginBottom: '8px' }}>
              Department *
            </label>
            <select
              value={importDept}
              onChange={(e) => setImportDept(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#E2E8F0',
                fontSize: '14px'
              }}
            >
              <option value="">Select department...</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* PASTE METHOD */}
          {importMethod === 'paste' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '14px', marginBottom: '8px' }}>
                  Paste your procedure content
                </label>
                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder="Paste your existing SOP, procedure document, or step-by-step instructions here...

Example:
1. Review work order details
2. Check inventory for required materials
3. Schedule crew assignment
4. Contact customer to confirm appointment..."
                  style={{
                    width: '100%',
                    minHeight: '250px',
                    padding: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <button
                onClick={() => parseImportedContent(pasteContent, 'Pasted content')}
                disabled={!pasteContent.trim() || !importDept || isParsingImport}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: pasteContent.trim() && importDept && !isParsingImport
                    ? 'linear-gradient(135deg, #059669, #10B981)'
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: pasteContent.trim() && importDept && !isParsingImport ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isParsingImport ? (
                  <>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Converting to SOP...
                  </>
                ) : (
                  <>
                    <ArrowRight size={18} />
                    Convert to Structured SOP
                  </>
                )}
              </button>
            </>
          )}

          {/* UPLOAD METHOD */}
          {importMethod === 'upload' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.csv,.json"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files[0]) {
                      handleFileUpload({ target: { files: [e.dataTransfer.files[0]] } });
                    }
                  }}
                  style={{
                    border: '2px dashed rgba(59, 130, 246, 0.3)',
                    borderRadius: '12px',
                    padding: '40px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: uploadedFileName ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  {uploadedFileName ? (
                    <>
                      <FileSpreadsheet size={40} color="#3B82F6" style={{ marginBottom: '12px' }} />
                      <p style={{ color: '#E2E8F0', margin: '0 0 4px', fontWeight: '500' }}>{uploadedFileName}</p>
                      <p style={{ color: '#64748B', margin: 0, fontSize: '13px' }}>Click to change file</p>
                    </>
                  ) : (
                    <>
                      <FileUp size={40} color="#64748B" style={{ marginBottom: '12px' }} />
                      <p style={{ color: '#94A3B8', margin: '0 0 8px' }}>Drag & drop a file here, or click to browse</p>
                      <p style={{ color: '#64748B', margin: 0, fontSize: '13px' }}>Supports: TXT, MD, CSV, JSON</p>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => parseImportedContent(uploadedFileContent, `File: ${uploadedFileName}`)}
                disabled={!uploadedFileContent || !importDept || isParsingImport}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: uploadedFileContent && importDept && !isParsingImport
                    ? 'linear-gradient(135deg, #2563EB, #3B82F6)'
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: uploadedFileContent && importDept && !isParsingImport ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isParsingImport ? (
                  <>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Converting to SOP...
                  </>
                ) : (
                  <>
                    <ArrowRight size={18} />
                    Convert to Structured SOP
                  </>
                )}
              </button>
            </>
          )}

          {/* URL METHOD */}
          {importMethod === 'url' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '14px', marginBottom: '8px' }}>
                  Document URL
                </label>
                <div style={{ position: 'relative' }}>
                  <Link size={18} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => { setUrlInput(e.target.value); setUrlError(''); }}
                    placeholder="https://notion.so/... or https://docs.google.com/..."
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: urlError ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#E2E8F0',
                      fontSize: '14px'
                    }}
                  />
                </div>
                {urlError && (
                  <p style={{ color: '#EF4444', fontSize: '13px', margin: '8px 0 0' }}>{urlError}</p>
                )}
              </div>

              {/* Supported URLs info */}
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px'
              }}>
                <p style={{ color: '#A78BFA', fontSize: '13px', margin: '0 0 8px', fontWeight: '500' }}>
                  ✓ Supported URLs:
                </p>
                <ul style={{ margin: 0, padding: '0 0 0 20px', color: '#94A3B8', fontSize: '13px' }}>
                  <li><strong>Notion pages</strong> — Must be shared with your integration</li>
                  <li><strong>Google Docs</strong> — Must be "anyone with link" viewable</li>
                  <li><strong>Google Sheets</strong> — Will extract text from cells</li>
                  <li><strong>Public webpages</strong> — Any accessible URL</li>
                </ul>
              </div>

              {/* Notion Setup Instructions */}
              <details style={{
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <summary style={{
                  padding: '12px 16px',
                  color: '#94A3B8',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ color: '#F59E0B' }}>📋</span> Notion Setup Instructions (one-time)
                </summary>
                <div style={{ padding: '0 16px 16px', color: '#64748B', fontSize: '13px', lineHeight: '1.6' }}>
                  <ol style={{ margin: '8px 0 0', padding: '0 0 0 20px' }}>
                    <li>Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" style={{ color: '#8B5CF6' }}>notion.so/my-integrations</a></li>
                    <li>Click "New integration" → Name it "Empire AI"</li>
                    <li>Copy the "Internal Integration Secret"</li>
                    <li>Add <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>NOTION_API_KEY</code> to Vercel environment variables</li>
                    <li>In Notion: Open your page → ••• menu → "Connections" → Add "Empire AI"</li>
                  </ol>
                  <p style={{ margin: '12px 0 0', color: '#94A3B8' }}>
                    ⚠️ Each page must be individually shared with your integration.
                  </p>
                </div>
              </details>

              <button
                onClick={fetchUrlContent}
                disabled={!urlInput.trim() || !importDept || isFetchingUrl || isParsingImport}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: urlInput.trim() && importDept && !isFetchingUrl && !isParsingImport
                    ? 'linear-gradient(135deg, #7C3AED, #8B5CF6)'
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: urlInput.trim() && importDept && !isFetchingUrl && !isParsingImport ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isFetchingUrl ? (
                  <>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Fetching document...
                  </>
                ) : isParsingImport ? (
                  <>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Converting to SOP...
                  </>
                ) : (
                  <>
                    <Globe size={18} />
                    Fetch & Convert to SOP
                  </>
                )}
              </button>
            </>
          )}

          {/* Tips */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lightbulb size={14} />
              {importMethod === 'paste' && 'Tip: Works best with numbered lists or clear step-by-step instructions'}
              {importMethod === 'upload' && 'Tip: CSV files from Excel/Sheets work great for procedures with multiple columns'}
              {importMethod === 'url' && 'Tip: For private Google Docs, first set sharing to "Anyone with the link can view"'}
            </p>
          </div>
        </div>
      )}

      {/* BUILDER VIEW */}
      {view === 'builder' && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '24px'
        }}>
          {/* Progress */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            {[1, 2, 3, 4].map(step => (
              <React.Fragment key={step}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: builderStage >= step ? '#8B5CF6' : 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: builderStage >= step ? 'white' : '#64748B',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  {builderStage > step ? <CheckCircle size={18} /> : step}
                </div>
                {step < 4 && (
                  <div style={{
                    flex: 1,
                    height: '2px',
                    background: builderStage > step ? '#8B5CF6' : 'rgba(255,255,255,0.1)',
                    margin: '0 8px'
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Stage 1: Describe */}
          {builderStage === 1 && (
            <>
              <h2 style={{ color: '#E2E8F0', margin: '0 0 8px', fontSize: '18px' }}>
                What procedure do you want to document?
              </h2>
              <p style={{ color: '#64748B', margin: '0 0 20px', fontSize: '14px' }}>
                Describe it in plain language. AI will ask clarifying questions.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '14px', marginBottom: '8px' }}>
                  Department *
                </label>
                <select
                  value={sopDept}
                  onChange={(e) => setSopDept(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select department...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '14px', marginBottom: '8px' }}>
                  Procedure Description *
                </label>
                <textarea
                  value={sopIdea}
                  onChange={(e) => setSopIdea(e.target.value)}
                  placeholder="Example: How to handle a customer complaint about work quality..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button
                onClick={generateQuestions}
                disabled={!sopIdea.trim() || !sopDept || isGeneratingQuestions}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: sopIdea.trim() && sopDept && !isGeneratingQuestions
                    ? 'linear-gradient(135deg, #7C3AED, #8B5CF6)'
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: sopIdea.trim() && sopDept && !isGeneratingQuestions ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isGeneratingQuestions ? (
                  <>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <ArrowRight size={18} />
                    Generate Questions
                  </>
                )}
              </button>
            </>
          )}

          {/* Stage 2: Answer Questions */}
          {builderStage === 2 && (
            <>
              <h2 style={{ color: '#E2E8F0', margin: '0 0 8px', fontSize: '18px' }}>
                Answer these questions
              </h2>
              <p style={{ color: '#64748B', margin: '0 0 20px', fontSize: '14px' }}>
                Your answers help create a more complete SOP. Required questions are marked with *.
              </p>

              <div style={{ marginBottom: '20px' }}>
                {questions.map((q, i) => (
                  <div key={q.id} style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px'
                  }}>
                    <label style={{
                      display: 'block',
                      color: '#E2E8F0',
                      fontSize: '14px',
                      marginBottom: '8px',
                      fontWeight: '500'
                    }}>
                      {q.question} {q.required && <span style={{ color: '#EF4444' }}>*</span>}
                    </label>
                    {q.hint && (
                      <p style={{ color: '#64748B', fontSize: '12px', margin: '0 0 8px' }}>
                        💡 {q.hint}
                      </p>
                    )}
                    <textarea
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Your answer..."
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '10px',
                        background: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: '#E2E8F0',
                        fontSize: '13px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontSize: '14px' }}>
                  {answeredCount} of {questions.length} answered
                </span>
                <button
                  onClick={generateSOP}
                  disabled={isGeneratingSOP}
                  style={{
                    padding: '12px 24px',
                    background: !isGeneratingSOP
                      ? 'linear-gradient(135deg, #7C3AED, #8B5CF6)'
                      : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: !isGeneratingSOP ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isGeneratingSOP ? (
                    <>
                      <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      Generating SOP...
                    </>
                  ) : (
                    <>
                      <ArrowRight size={18} />
                      Generate SOP
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Stage 4: Saved */}
          {builderStage === 4 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <CheckCircle size={64} color="#10B981" style={{ marginBottom: '16px' }} />
              <h2 style={{ color: '#E2E8F0', margin: '0 0 8px' }}>SOP Saved Successfully!</h2>
              <p style={{ color: '#64748B', margin: '0 0 24px' }}>
                Your procedure has been added to the Knowledge Base.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    resetBuilder();
                    setView('library');
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  View Library
                </button>
                <button
                  onClick={resetBuilder}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Create Another SOP
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* EDITOR VIEW */}
      {view === 'editor' && editingSOP && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '24px'
        }}>
          {/* Title & Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#94A3B8', fontSize: '14px', marginBottom: '8px' }}>
              SOP Title
            </label>
            <input
              type="text"
              value={editingSOP.title}
              onChange={(e) => setEditingSOP(prev => ({ ...prev, title: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#E2E8F0',
                fontSize: '16px',
                fontWeight: '500'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#94A3B8', fontSize: '14px', marginBottom: '8px' }}>
              Description
            </label>
            <textarea
              value={editingSOP.description}
              onChange={(e) => setEditingSOP(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this procedure..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#E2E8F0',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Steps */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ color: '#E2E8F0', margin: 0, fontSize: '16px' }}>Steps</h3>
              <button
                onClick={addStep}
                style={{
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  color: '#A78BFA',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={14} />
                Add Step
              </button>
            </div>

            {editingSOP.steps.map((step, i) => (
              <div key={step.id} style={{
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '8px',
                marginBottom: '8px',
                overflow: 'hidden'
              }}>
                {/* Step Header */}
                <div
                  onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <span style={{
                      background: '#8B5CF6',
                      color: 'white',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      flexShrink: 0
                    }}>
                      {step.number}
                    </span>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => updateStepTitle(step.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#E2E8F0',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeStep(step.id); }}
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} color="#EF4444" />
                    </button>
                    {expandedStep === step.id ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedStep === step.id && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ display: 'block', color: '#64748B', fontSize: '12px', marginBottom: '8px' }}>
                        Details (bullet points)
                      </label>
                      {step.details.map((detail, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ color: '#64748B' }}>•</span>
                          <input
                            type="text"
                            value={detail}
                            onChange={(e) => updateStepDetails(step.id, j, e.target.value)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              background: 'rgba(30, 41, 59, 0.8)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '4px',
                              color: '#E2E8F0',
                              fontSize: '13px'
                            }}
                          />
                          <button
                            onClick={() => removeStepDetail(step.id, j)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                          >
                            <X size={14} color="#64748B" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addStepDetail(step.id)}
                        style={{
                          background: 'transparent',
                          border: '1px dashed rgba(255,255,255,0.2)',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          color: '#64748B',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginTop: '4px'
                        }}
                      >
                        + Add bullet point
                      </button>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <label style={{ display: 'block', color: '#64748B', fontSize: '12px', marginBottom: '8px' }}>
                        Notes (optional)
                      </label>
                      <textarea
                        value={step.notes || ''}
                        onChange={(e) => updateStepNotes(step.id, e.target.value)}
                        placeholder="Any additional notes for this step..."
                        style={{
                          width: '100%',
                          minHeight: '60px',
                          padding: '8px',
                          background: 'rgba(30, 41, 59, 0.8)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          color: '#E2E8F0',
                          fontSize: '13px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Save Button */}
          <button
            onClick={saveSOP}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #059669, #10B981)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Save size={18} />
            Save to Knowledge Base
          </button>
        </div>
      )}

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SOPs;
