# Empire AI - Modular Architecture

**Version:** 2.0.0  
**Updated:** December 12, 2025

## Overview

Empire AI is an Operational Intelligence Platform for Empire Remodeling. This version has been restructured into modular components for easier maintenance and development.

## Project Structure

```
empire-ai/
├── api/
│   └── chat.js              # Anthropic API serverless function
├── public/
│   └── favicon.svg          # App icon
├── src/
│   ├── components/
│   │   └── VoiceModal.jsx   # Voice mode interface
│   ├── pages/
│   │   ├── Dashboard.jsx    # Main dashboard
│   │   ├── Chat.jsx         # AI chat interface
│   │   ├── Knowledge.jsx    # Knowledge base management
│   │   ├── Issues.jsx       # Issues board
│   │   ├── Systems.jsx      # Settings, team, instructions
│   │   └── Help.jsx         # FAQ documentation
│   ├── App.jsx              # Main app shell & navigation
│   ├── main.jsx             # React entry point
│   └── utils.js             # Shared utilities & helpers
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## File Responsibilities

| File | Purpose | Lines |
|------|---------|-------|
| `App.jsx` | Navigation, routing, shared state | ~350 |
| `Dashboard.jsx` | Stats, activity, quick actions | ~180 |
| `Chat.jsx` | AI conversations, intelligence context | ~250 |
| `Knowledge.jsx` | Department cards, documents, insights | ~450 |
| `Issues.jsx` | Issues table, archive, filters | ~500 |
| `Systems.jsx` | Status, team, AI instructions | ~450 |
| `Help.jsx` | FAQ sections, documentation | ~250 |
| `VoiceModal.jsx` | Voice mode interface | ~200 |
| `utils.js` | Storage, intelligence, helpers | ~200 |
| `api/chat.js` | Anthropic API endpoint | ~70 |

## Deployment to Vercel

### First Time Setup

1. Create a GitHub repository
2. Upload all files maintaining the folder structure
3. Go to [vercel.com](https://vercel.com) and import the repository
4. Add environment variable:
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your Anthropic API key
5. Deploy

### Updating Individual Files

The modular structure allows you to update single files:

1. Go to GitHub → navigate to the file (e.g., `src/pages/Chat.jsx`)
2. Click the pencil icon to edit
3. Replace the content
4. Commit changes
5. Vercel auto-deploys in ~30 seconds

### Example Update Workflow

**To update just the Chat page:**
```
1. Get updated Chat.jsx from Claude
2. GitHub → src/pages/Chat.jsx → Edit
3. Paste new code → Commit
4. Done!
```

## Features

### Core
- ✅ Department-based architecture
- ✅ Real AI chat (Anthropic Claude)
- ✅ Central Intelligence System
- ✅ Custom AI Instructions (system + per-department)
- ✅ Knowledge Base with auto-tagging
- ✅ Issues Board with archive
- ✅ Team Management
- ✅ Help/FAQ documentation
- ✅ Voice Mode (preview)

### Data Persistence

All data stored in localStorage:

| Key | Data |
|-----|------|
| `empire_conversations` | Chat history by department |
| `empire_knowledge` | Knowledge base items |
| `empire_activities` | Activity feed |
| `empire_issues` | Issues (active + archived) |
| `empire_issueColumns` | Column configuration |
| `empire_departments` | Department list |
| `empire_intelligence` | Intelligence index |
| `empire_teamMembers` | Team members |
| `empire_pendingInvites` | Pending invitations |
| `empire_systemInstructions` | Global AI instructions |

## Development

### Local Development

```bash
npm install
npm run dev
```

Note: API calls require `ANTHROPIC_API_KEY` environment variable.

### Building

```bash
npm run build
```

Output in `dist/` folder.

## Dependencies

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "lucide-react": "^0.263.1",
  "@anthropic-ai/sdk": "^0.39.0"
}
```

## Future Development

### High Priority
- [ ] Google Sheets API integration
- [ ] Gemini Live API for voice mode
- [ ] User authentication
- [ ] Backend database

### Medium Priority
- [ ] Streaming responses
- [ ] Role-based access enforcement
- [ ] Email invitations
- [ ] Mobile improvements

---

*Empire AI v2.0.0 - Modular Architecture*
