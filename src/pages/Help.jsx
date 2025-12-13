import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronRight, Book } from 'lucide-react';

export default function Help() {
  const [openSection, setOpenSection] = useState('getting-started');
  const [openQuestions, setOpenQuestions] = useState({});

  const toggleSection = (sectionId) => {
    setOpenSection(openSection === sectionId ? null : sectionId);
  };

  const toggleQuestion = (questionId) => {
    setOpenQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const faqSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      questions: [
        {
          q: 'What is Empire AI?',
          a: 'Empire AI is an Operational Intelligence Platform designed to be the central nervous system for Empire Remodeling. It combines AI-powered chat, knowledge management, issue tracking, and team collaboration in one unified system.'
        },
        {
          q: 'How do I navigate the application?',
          a: 'Use the sidebar on the left to navigate between pages: Dashboard (overview), Systems (settings), Knowledge (documents), Issues (task tracking), and Help (this page). Click on any department to start a conversation specific to that area.'
        },
        {
          q: 'How does the AI learn about our company?',
          a: 'Empire AI learns from multiple sources: documents you upload, insights you log, issues you resolve, and conversations you have. The Central Intelligence System automatically indexes this information and uses it to provide more relevant, company-specific responses.'
        }
      ]
    },
    {
      id: 'chat',
      title: 'Chat & AI Assistant',
      questions: [
        {
          q: 'How do I start a conversation?',
          a: 'Click on any department in the sidebar to open a chat specific to that area. You can also use the Quick Chat box on the Dashboard for general questions. The AI will automatically consider the department context when responding.'
        },
        {
          q: 'What are Custom AI Instructions?',
          a: 'Custom Instructions let you customize how the AI responds. System-wide instructions (in Systems page) apply to ALL conversations. Department-specific instructions (in Knowledge > Edit Department) apply only to that department. Use these to enforce company policies, preferred terminology, or specific behaviors.'
        },
        {
          q: 'How does Voice Mode work?',
          a: 'Click the green Voice Mode button in the sidebar. When the modal opens, tap the microphone and speak your question. The AI will respond both in text and speech. Works best in Chrome or Edge browsers.'
        }
      ]
    },
    {
      id: 'knowledge',
      title: 'Knowledge Base',
      questions: [
        {
          q: 'How do I add documents?',
          a: 'Go to Knowledge page and click the Upload button on any department card. You can upload multiple files at once. Documents are automatically indexed for the AI to reference.'
        },
        {
          q: 'What is "Log Insight"?',
          a: 'Insights are pieces of knowledge you manually add - things the AI should remember. Use this for important decisions, lessons learned, or company policies that aren\'t in a document.'
        },
        {
          q: 'How do I connect Google Docs or Sheets?',
          a: 'Click "Connect Doc" on the Knowledge page. Enter a name, paste the Google Docs/Sheets URL, and select a department. Make sure the document is shared as "Anyone with the link" or published to web. Content syncs automatically every 5 minutes.'
        }
      ]
    },
    {
      id: 'issues',
      title: 'Issues Board',
      questions: [
        {
          q: 'How do I create an issue?',
          a: 'Click "New Issue" on the Issues page. Fill in the title, description, department, priority, and optionally assign it to someone. Issues help track problems, tasks, and follow-ups.'
        },
        {
          q: 'What happens when I resolve an issue?',
          a: 'Resolved issues are automatically added to the Central Intelligence with a high relevance score. This means the AI can reference how similar issues were solved in the future. You can add resolution notes to capture what was done.'
        },
        {
          q: 'What is the Archive?',
          a: 'The Archive stores resolved or closed issues you want to keep for reference but don\'t need in the active view. Click the Archive button to toggle between active and archived issues. You can restore archived issues if needed.'
        }
      ]
    },
    {
      id: 'team',
      title: 'Team Management',
      questions: [
        {
          q: 'How do I invite team members?',
          a: 'Go to Systems page and click "Invite" in the Team Management section. Enter their email and select a role. They\'ll receive an invitation (note: email sending is not yet implemented - this is a preview feature).'
        },
        {
          q: 'What are the different roles?',
          a: 'Owner: Full access. Admin: Manage team and settings. Manager: Manage departments and issues. Member: View and contribute. Viewer: Read-only access.'
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      questions: [
        {
          q: 'The AI says it\'s having trouble connecting',
          a: 'This usually means the API key isn\'t configured. Check Vercel environment variables to ensure ANTHROPIC_API_KEY is set correctly. You may need to redeploy after adding it.'
        },
        {
          q: 'My connected Google Doc isn\'t syncing',
          a: 'Make sure the document is shared as "Anyone with the link" (Viewer) or published to web. Try clicking the refresh icon next to the document. Check that the URL is correct.'
        },
        {
          q: 'Voice mode isn\'t working',
          a: 'Voice mode requires Chrome or Edge browser. Make sure you\'ve allowed microphone access when prompted. Check that your microphone is working in other applications.'
        },
        {
          q: 'My data disappeared',
          a: 'Data is stored in your browser\'s localStorage. If you cleared browser data or switched browsers, the data won\'t carry over. This is a limitation of the current version - a database backend is planned for the future.'
        }
      ]
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <HelpCircle size={32} style={{ color: '#10B981' }} />
          Help & FAQ
        </h1>
        <p style={{ color: '#94A3B8', marginTop: '4px' }}>
          Learn how to use Empire AI effectively
        </p>
      </div>

      {/* Quick Reference */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{ color: '#3B82F6', fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Book size={18} />
          Quick Reference
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '4px' }}>Start a chat</p>
            <p style={{ color: '#E2E8F0', fontSize: '14px', margin: 0 }}>Click any department in sidebar</p>
          </div>
          <div>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '4px' }}>Voice mode</p>
            <p style={{ color: '#E2E8F0', fontSize: '14px', margin: 0 }}>Green mic button in sidebar</p>
          </div>
          <div>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '4px' }}>Upload document</p>
            <p style={{ color: '#E2E8F0', fontSize: '14px', margin: 0 }}>Knowledge → Upload button</p>
          </div>
          <div>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '4px' }}>Create issue</p>
            <p style={{ color: '#E2E8F0', fontSize: '14px', margin: 0 }}>Issues → New Issue button</p>
          </div>
          <div>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '4px' }}>Connect Google Doc</p>
            <p style={{ color: '#E2E8F0', fontSize: '14px', margin: 0 }}>Knowledge → Connect Doc</p>
          </div>
          <div>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '4px' }}>AI Instructions</p>
            <p style={{ color: '#E2E8F0', fontSize: '14px', margin: 0 }}>Systems → AI Instructions panel</p>
          </div>
        </div>
      </div>

      {/* FAQ Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {faqSections.map(section => (
          <div key={section.id} style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden'
          }}>
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'none',
                border: 'none',
                color: '#E2E8F0',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {section.title}
              {openSection === section.id ? (
                <ChevronDown size={20} style={{ color: '#94A3B8' }} />
              ) : (
                <ChevronRight size={20} style={{ color: '#94A3B8' }} />
              )}
            </button>

            {/* Questions */}
            {openSection === section.id && (
              <div style={{ padding: '0 20px 16px' }}>
                {section.questions.map((item, idx) => {
                  const qId = `${section.id}-${idx}`;
                  return (
                    <div key={idx} style={{
                      borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                      paddingTop: idx === 0 ? 0 : '12px',
                      marginTop: idx === 0 ? 0 : '12px'
                    }}>
                      <button
                        onClick={() => toggleQuestion(qId)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          background: 'none',
                          border: 'none',
                          color: '#E2E8F0',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textAlign: 'left',
                          gap: '12px'
                        }}
                      >
                        <span>{item.q}</span>
                        {openQuestions[qId] ? (
                          <ChevronDown size={16} style={{ color: '#94A3B8', flexShrink: 0, marginTop: '2px' }} />
                        ) : (
                          <ChevronRight size={16} style={{ color: '#94A3B8', flexShrink: 0, marginTop: '2px' }} />
                        )}
                      </button>
                      {openQuestions[qId] && (
                        <p style={{
                          color: '#94A3B8',
                          fontSize: '14px',
                          lineHeight: '1.6',
                          margin: '8px 0 0 0',
                          paddingLeft: '16px',
                          borderLeft: '2px solid rgba(59, 130, 246, 0.3)'
                        }}>
                          {item.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '32px',
        padding: '20px',
        background: 'rgba(30, 41, 59, 0.5)',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
          Need more help? Use the chat to ask Empire AI directly, or contact your administrator.
        </p>
      </div>
    </div>
  );
}
