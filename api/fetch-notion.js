// api/fetch-notion.js
// Fetches content from Notion pages using their API

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Check for API key
  const notionKey = process.env.NOTION_API_KEY;
  if (!notionKey) {
    return res.status(401).json({ 
      error: 'Notion API key not configured. Add NOTION_API_KEY to Vercel environment variables.',
      setup_required: true
    });
  }

  try {
    // Extract page ID from various Notion URL formats
    const pageId = extractNotionPageId(url);
    
    if (!pageId) {
      return res.status(400).json({ 
        error: 'Could not extract page ID from URL. Make sure it\'s a valid Notion page URL.' 
      });
    }

    // Fetch page metadata first
    const pageResponse = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${notionKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    if (!pageResponse.ok) {
      const errorData = await pageResponse.json();
      
      if (pageResponse.status === 404) {
        return res.status(404).json({ 
          error: 'Page not found. Make sure the page is shared with your Notion integration.' 
        });
      }
      if (pageResponse.status === 401) {
        return res.status(401).json({ 
          error: 'Unauthorized. Check your Notion API key.' 
        });
      }
      
      return res.status(pageResponse.status).json({ 
        error: errorData.message || 'Failed to fetch Notion page' 
      });
    }

    const pageData = await pageResponse.json();
    
    // Get page title
    let pageTitle = 'Untitled';
    if (pageData.properties?.title?.title?.[0]?.plain_text) {
      pageTitle = pageData.properties.title.title[0].plain_text;
    } else if (pageData.properties?.Name?.title?.[0]?.plain_text) {
      pageTitle = pageData.properties.Name.title[0].plain_text;
    }

    // Fetch all blocks (content) from the page
    const blocks = await fetchAllBlocks(pageId, notionKey);
    
    // Convert blocks to readable text
    const content = blocksToText(blocks, pageTitle);

    return res.status(200).json({
      content,
      title: pageTitle,
      type: 'notion',
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Notion fetch error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch Notion page. ' + (error.message || '') 
    });
  }
}

// Extract page ID from various Notion URL formats
function extractNotionPageId(url) {
  // Format 1: https://www.notion.so/workspace/Page-Title-abc123def456
  // Format 2: https://www.notion.so/Page-Title-abc123def456
  // Format 3: https://www.notion.so/abc123def456
  // Format 4: https://notion.so/workspace/Page-Title-abc123def456?v=xxx
  
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Remove leading slash and split
    const parts = pathname.replace(/^\//, '').split('/');
    
    // Get the last part (which contains the page ID)
    let lastPart = parts[parts.length - 1];
    
    // Remove query params if any
    lastPart = lastPart.split('?')[0];
    
    // The page ID is either:
    // 1. The entire last part (if it's just an ID)
    // 2. The last 32 characters after the last hyphen (if it includes title)
    
    // Check if it's a UUID format (with or without hyphens)
    const uuidRegex = /([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
    const match = lastPart.match(uuidRegex);
    
    if (match) {
      // Remove hyphens and format as Notion expects
      return match[1].replace(/-/g, '');
    }
    
    // Try extracting from the end after last hyphen
    const lastHyphenIndex = lastPart.lastIndexOf('-');
    if (lastHyphenIndex !== -1) {
      const potentialId = lastPart.substring(lastHyphenIndex + 1);
      if (potentialId.length === 32 && /^[a-f0-9]+$/i.test(potentialId)) {
        return potentialId;
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

// Fetch all blocks from a page (handles pagination)
async function fetchAllBlocks(pageId, notionKey) {
  let allBlocks = [];
  let cursor = undefined;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.notion.com/v1/blocks/${pageId}/children${cursor ? `?start_cursor=${cursor}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${notionKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      break;
    }

    const data = await response.json();
    allBlocks = allBlocks.concat(data.results || []);
    
    hasMore = data.has_more;
    cursor = data.next_cursor;
    
    // Safety limit
    if (allBlocks.length > 500) break;
  }

  // Recursively fetch children for blocks that have them
  for (let i = 0; i < allBlocks.length; i++) {
    if (allBlocks[i].has_children) {
      const children = await fetchAllBlocks(allBlocks[i].id, notionKey);
      allBlocks[i].children = children;
    }
  }

  return allBlocks;
}

// Convert Notion blocks to readable text
function blocksToText(blocks, pageTitle) {
  let text = `# ${pageTitle}\n\n`;
  
  for (const block of blocks) {
    text += blockToText(block, 0);
  }
  
  return text;
}

function blockToText(block, indent) {
  const prefix = '  '.repeat(indent);
  let text = '';
  
  switch (block.type) {
    case 'paragraph':
      text = prefix + richTextToPlain(block.paragraph?.rich_text) + '\n\n';
      break;
      
    case 'heading_1':
      text = `\n${prefix}# ${richTextToPlain(block.heading_1?.rich_text)}\n\n`;
      break;
      
    case 'heading_2':
      text = `\n${prefix}## ${richTextToPlain(block.heading_2?.rich_text)}\n\n`;
      break;
      
    case 'heading_3':
      text = `\n${prefix}### ${richTextToPlain(block.heading_3?.rich_text)}\n\n`;
      break;
      
    case 'bulleted_list_item':
      text = `${prefix}• ${richTextToPlain(block.bulleted_list_item?.rich_text)}\n`;
      break;
      
    case 'numbered_list_item':
      text = `${prefix}1. ${richTextToPlain(block.numbered_list_item?.rich_text)}\n`;
      break;
      
    case 'to_do':
      const checked = block.to_do?.checked ? '✓' : '○';
      text = `${prefix}${checked} ${richTextToPlain(block.to_do?.rich_text)}\n`;
      break;
      
    case 'toggle':
      text = `${prefix}▸ ${richTextToPlain(block.toggle?.rich_text)}\n`;
      break;
      
    case 'quote':
      text = `${prefix}> ${richTextToPlain(block.quote?.rich_text)}\n\n`;
      break;
      
    case 'callout':
      const emoji = block.callout?.icon?.emoji || '💡';
      text = `${prefix}${emoji} ${richTextToPlain(block.callout?.rich_text)}\n\n`;
      break;
      
    case 'code':
      text = `${prefix}\`\`\`\n${prefix}${richTextToPlain(block.code?.rich_text)}\n${prefix}\`\`\`\n\n`;
      break;
      
    case 'divider':
      text = `${prefix}---\n\n`;
      break;
      
    case 'table_row':
      const cells = block.table_row?.cells || [];
      text = `${prefix}| ${cells.map(cell => richTextToPlain(cell)).join(' | ')} |\n`;
      break;
      
    case 'child_page':
      text = `${prefix}📄 [Subpage: ${block.child_page?.title}]\n\n`;
      break;
      
    case 'child_database':
      text = `${prefix}📊 [Database: ${block.child_database?.title}]\n\n`;
      break;
      
    default:
      // For unsupported blocks, try to extract any text
      if (block[block.type]?.rich_text) {
        text = prefix + richTextToPlain(block[block.type].rich_text) + '\n';
      }
  }
  
  // Handle children
  if (block.children && block.children.length > 0) {
    for (const child of block.children) {
      text += blockToText(child, indent + 1);
    }
  }
  
  return text;
}

// Convert rich text array to plain text
function richTextToPlain(richTextArray) {
  if (!richTextArray || !Array.isArray(richTextArray)) {
    return '';
  }
  
  return richTextArray.map(rt => rt.plain_text || '').join('');
}
