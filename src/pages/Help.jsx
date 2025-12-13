// ==========================================
// EMPIRE AI - HELP PAGE
// FAQ and documentation for team training
// ==========================================

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, BookOpen } from 'lucide-react';

const FAQ_DATA = [
  {
    section: 'Getting Started',
    defaultOpen: true,
    items: [
      {
        q: 'What is Empire AI?',
        a: 'Empire AI is your operational intelligence platform - a central hub that connects all your business knowledge, tracks issues, and provides AI-powered assistance specific to each department.'
      },
      {
        q: 'How do I start using it?',
        a: 'Start by exploring the Dashboard for an overview, then click on any department in the sidebar to begin chatting with AI about that specific area. Upload documents to the Knowledge Base to help the AI learn about your company.'
      },
      {
        q: 'Is my data secure?',
        a: 'Yes. Your data is stored locally in your browser and our AI conversations use secure, encrypted connections. We do not share your business data with third parties.'
      }
    ]
  },
  {
    section: 'Navigation',
    items: [
      {
        q: 'What are the main sections?',
        a: 'Dashboard (overview), Systems (settings & team), Knowledge (documents & insights), Issues (problem tracking), Help (this page), and Departments (AI chat by area).'
      },
      {
        q: 'How do I switch departments?',
        a: 'Click any department name in the sidebar under "Departments" to open a chat focused on that area. The AI will adjust its responses based on the department context.'
      }
    ]
  },
  {
    section: 'Dashboard',
    items: [
      {
        q: 'What do the dashboard stats show?',
        a: 'Active Projects (current work), Open Issues (unresolved problems), Knowledge Items (documents & insights stored), and Team Online (active users).'
      },
      {
        q: 'How do I use Quick Chat?',
        a: 'Type a question in the chat box at the top of the dashboard and press Enter or click Ask. You\'ll be taken to the chat page with your question ready.'
      }
    ]
  },
  {
    section: 'Knowledge Base',
    items: [
      {
        q: 'How do I add documents?',
        a: 'Go to Knowledge, find the department card, and click "Upload". You can upload PDFs, images, documents, and more. The AI will learn from these files.'
      },
      {
        q: 'What is an "Insight"?',
        a: 'Insights are manually logged pieces of knowledge - lessons learned, decisions made, or important information you want the AI to remember. Click "Log Insight" to add one.'
      },
      {
        q: 'How do I organize departments?',
        a: 'Click the menu (three dots) on any department card to Edit or Delete it. Click "+ Add Department" to create new ones with custom names, icons, and colors.'
      }
    ]
  },
  {
    section: 'Issues Board',
    items: [
      {
        q: 'How do I create an issue?',
        a: 'Click "New Issue" button, fill in the title, description, department, priority, and assignee, then click Create.'
      },
      {
        q: 'What happens when I resolve an issue?',
        a: 'Change the status to "Resolved" using the dropdown. The issue becomes part of the AI\'s knowledge - it learns from how problems were solved.'
      },
      {
        q: 'How do I archive issues?',
        a: 'Click the archive icon on any issue row. View archived issues by clicking the "Archive" button. You can restore or permanently delete from there.'
      }
    ]
  },
  {
    section: 'Chat / AI Assistant',
    items: [
      {
        q: 'How does the AI know about my company?',
        a: 'The AI learns from: documents you upload, insights you log, issues you resolve, and conversations you have. The more you use it, the smarter it gets.'
      },
      {
        q: 'What are Custom Instructions?',
        a: 'You can set system-wide instructions (Systems page) that apply everywhere, or department-specific instructions (edit any department) for targeted behavior.'
      },
      {
        q: 'Why does it say "Thinking..."?',
        a: 'The AI is processing your question and searching through your company knowledge to give you the best answer. Complex questions may take a few seconds.'
      }
    ]
  },
  {
    section: 'Voice Mode',
    items: [
      {
        q: 'How do I use Voice Mode?',
        a: 'Click the green "Voice Mode" button at the bottom of the sidebar. This opens a hands-free interface where you can speak to the AI.'
      },
      {
        q: 'Is Voice Mode fully functional?',
        a: 'Voice Mode is currently in demo/preview. The visual interface is complete, but full voice API integration is coming soon.'
      }
    ]
  },
  {
    section: 'Systems & Team',
    items: [
      {
        q: 'How do I invite team members?',
        a: 'Go to Systems > Team Management > Click "Invite". Enter their email, select a role, and optionally limit department access.'
      },
      {
        q: 'What are the different roles?',
        a: 'Owner (full access), Admin (manage team & settings), Manager (manage departments & issues), Member (view & contribute), Viewer (read-only).'
      },
      {
        q: 'What is Central Intelligence?',
        a: 'The Intelligence panel shows how much the AI has learned. It tracks all knowledge items, resolved issues, and extracts key topics (tags) automatically.'
      }
    ]
  },
  {
    section: 'Troubleshooting',
    items: [
      {
        q: 'The AI seems slow or unresponsive',
        a: 'Check your internet connection. If the API is unavailable, the system will fall back to basic responses. Try refreshing the page.'
      },
      {
        q: 'I lost my data',
        a: 'Data is stored in your browser\'s localStorage. Clearing browser data or using incognito mode will reset everything. We recommend regular backups.'
      },
      {
        q: 'Chat history is gone',
        a: 'Each department maintains its own chat history. Make sure you\'re in the correct department. History persists until you clear browser data.'
      }
    ]
  },
  {
    section: 'Tips for Success',
    items: [
      {
        q: 'How can I get better AI responses?',
        a: 'Upload relevant documents, log insights regularly, resolve issues with detailed notes, and set clear Custom Instructions for each department.'
      },
      {
        q: 'Best practices for the Knowledge Base?',
        a: 'Organize documents by department, use clear file names, log insights after important meetings or decisions, and keep information up to date.'
      },
      {
        q: 'How should my team use this?',
        a: 'Start each day on the Dashboard, use department chats for specific questions, log issues immediately when they arise, and share knowledge through insights.'
      }
    ]
  }
];

export default function Help() {
  const [openSections, setOpenSections] = useState(['Getting Started']);
  const [openItems, setOpenItems] = useState({});

  const toggleSection = (section) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleItem = (sectionIndex, itemIndex) => {
    const key = `${sectionIndex}-${itemIndex}`;
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const cardStyle = {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)'
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <HelpCircle size={32} style={{ color: '#3B82F6' }} />
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Help & FAQ</h1>
        </div>
        <p style={{ color: '#94A3B8' }}>Everything you need to know about using Empire AI</p>
      </div>

      {/* Quick Reference Card */}
      <div style={{ ...cardStyle, padding: 20, marginBottom: 24, background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <BookOpen size={18} style={{ color: '#3B82F6' }} />
          <h3 style={{ fontWeight: 600 }}>Quick Reference</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, fontSize: 13 }}>
          <div>
            <div style={{ color: '#64748B', marginBottom: 4 }}>Start Chat</div>
            <div style={{ color: '#E2E8F0' }}>Click any department in sidebar</div>
          </div>
          <div>
            <div style={{ color: '#64748B', marginBottom: 4 }}>Upload Files</div>
            <div style={{ color: '#E2E8F0' }}>Knowledge → Department → Upload</div>
          </div>
          <div>
            <div style={{ color: '#64748B', marginBottom: 4 }}>Report Issue</div>
            <div style={{ color: '#E2E8F0' }}>Issues → New Issue button</div>
          </div>
          <div>
            <div style={{ color: '#64748B', marginBottom: 4 }}>Voice Mode</div>
            <div style={{ color: '#E2E8F0' }}>Green button at bottom of sidebar</div>
          </div>
          <div>
            <div style={{ color: '#64748B', marginBottom: 4 }}>Invite Team</div>
            <div style={{ color: '#E2E8F0' }}>Systems → Team → Invite</div>
          </div>
          <div>
            <div style={{ color: '#64748B', marginBottom: 4 }}>AI Instructions</div>
            <div style={{ color: '#E2E8F0' }}>Systems → Edit Instructions</div>
          </div>
        </div>
      </div>

      {/* FAQ Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {FAQ_DATA.map((section, sectionIndex) => (
          <div key={section.section} style={cardStyle}>
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.section)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                background: 'transparent',
                border: 'none',
                color: '#E2E8F0',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 16 }}>{section.section}</span>
              {openSections.includes(section.section) ? (
                <ChevronDown size={20} style={{ color: '#64748B' }} />
              ) : (
                <ChevronRight size={20} style={{ color: '#64748B' }} />
              )}
            </button>

            {/* Section Items */}
            {openSections.includes(section.section) && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {section.items.map((item, itemIndex) => {
                  const key = `${sectionIndex}-${itemIndex}`;
                  const isOpen = openItems[key];
                  
                  return (
                    <div key={itemIndex} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <button
                        onClick={() => toggleItem(sectionIndex, itemIndex)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '14px 16px',
                          background: 'transparent',
                          border: 'none',
                          color: '#CBD5E1',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        {isOpen ? (
                          <ChevronDown size={16} style={{ color: '#3B82F6', flexShrink: 0 }} />
                        ) : (
                          <ChevronRight size={16} style={{ color: '#64748B', flexShrink: 0 }} />
                        )}
                        <span style={{ fontWeight: 500 }}>{item.q}</span>
                      </button>
                      {isOpen && (
                        <div style={{
                          padding: '0 16px 14px 44px',
                          color: '#94A3B8',
                          lineHeight: 1.6,
                          fontSize: 14
                        }}>
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Support Footer */}
      <div style={{ marginTop: 32, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
        <p>Need more help? Contact your system administrator or reach out to support.</p>
      </div>
    </div>
  );
}
