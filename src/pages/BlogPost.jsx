/**
 * Individual Blog Post Page
 */
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Calendar, User, ArrowLeft } from 'lucide-react';
import CookieConsent from '@/components/CookieConsent';
import Logo from '@/components/branding/Logo';
import BlogPromoBanner from '@/components/BlogPromoBanner';

const INSIGHT = 'https://insight.meldra.ai';

const BLOG_CONTENT = {
  1: {
    title: 'Getting Started with Meldra API: Your First Document Conversion',
    date: '2026-01-25',
    author: 'Meldra Team',
    category: 'tutorials',
    content: `
# Getting Started with Meldra API: Your First Document Conversion

The Meldra API provides powerful document conversion capabilities that let you transform files between different formats programmatically. In this tutorial, we'll walk through making your first API call to convert a PDF to DOCX.

## Prerequisites

- A Meldra API key (get one from support@meldra.ai)
- A file to convert (PDF, DOC, PPT, or ZIP)
- Basic knowledge of HTTP requests

## Step 1: Get Your API Key

Contact support@meldra.ai to obtain your API key. Once you have it, keep it secure and never commit it to version control.

## Step 2: Make Your First Request

Here's a simple example using cURL:

\`\`\`bash
curl -X POST "https://api.developer.meldra.ai/v1/convert/pdf-to-doc" \\
  -H "X-API-Key: your_api_key_here" \\
  -F "file=@document.pdf"
\`\`\`

## Step 3: Handle the Response

The API returns a binary file (DOCX in this case). Save it to disk or process it in your application.

## Next Steps

- Explore other endpoints (DOC→PDF, PPT→PDF, ZIP cleaning)
- Integrate into your application
- Check out our interactive testing console at api.developer.meldra.ai
    `,
  },
  2: {
    title: 'How to Generate and Use Your Meldra API Key',
    date: '2026-01-24',
    author: 'Meldra Team',
    category: 'tutorials',
    content: `
# How to Generate and Use Your Meldra API Key

API keys are required for all Meldra API requests. This guide explains how to obtain, use, and secure your API key.

## Getting Your API Key

### Step 1: Contact Support

Send an email to **support@meldra.ai** with the subject "Meldra API Key Request". Include:
- Your name and company
- Intended use case
- Expected usage volume

### Step 2: Receive Your Key

You'll receive an email containing:
- Your API key (format: \`meldra_xxxxxxxxxxxxx\`)
- Base URL: \`https://api.developer.meldra.ai\`
- Rate limits and quotas
- Documentation links

### Step 3: Store Securely

**Never commit API keys to version control!** Use environment variables:

\`\`\`bash
export MELDRA_API_KEY="meldra_xxxxxxxxxxxxx"
\`\`\`

## Using Your API Key

Include the key in the \`X-API-Key\` header for all requests:

\`\`\`bash
curl -X POST "https://api.developer.meldra.ai/v1/convert/pdf-to-doc" \\
  -H "X-API-Key: meldra_xxxxxxxxxxxxx" \\
  -F "file=@document.pdf"
\`\`\`

## Security Best Practices

1. **Rotate keys regularly** - Contact support to generate new keys
2. **Use environment variables** - Never hardcode keys
3. **Monitor usage** - Check your usage stats regularly
4. **Revoke compromised keys** - Contact support immediately if a key is exposed

## Rate Limits

- **Standard**: 60 requests/minute, 10,000 requests/day
- **Premium**: 120 requests/minute, 50,000 requests/day
- **Enterprise**: Custom limits

## Need Help?

Contact support@meldra.ai for assistance with API keys or usage.
    `,
  },
  3: {
    title: 'What Can the Meldra API Do? Complete Feature Overview',
    date: '2026-01-23',
    author: 'Meldra Team',
    category: 'api-docs',
    content: `
# What Can the Meldra API Do? Complete Feature Overview

The Meldra API provides comprehensive document conversion and file processing capabilities. Here's everything you can do with it.

## Document Conversion

### PDF to DOCX
Convert PDF files to editable Microsoft Word documents while preserving formatting and layout.

**Use Cases:**
- Extract text from PDFs for editing
- Convert scanned documents to editable format
- Process PDF forms into Word documents

### DOC/DOCX to PDF
Transform Word documents into PDF format for distribution and archiving.

**Use Cases:**
- Generate PDF reports from Word templates
- Convert documents for printing
- Create standardized document formats

### PPT/PPTX to PDF
Convert PowerPoint presentations to PDF for sharing and archiving.

**Use Cases:**
- Archive presentations
- Share slides without requiring PowerPoint
- Create print-ready versions

### PDF to PPTX
Transform PDF documents into PowerPoint presentations (one slide per page).

**Use Cases:**
- Convert PDF reports to presentations
- Create slides from document pages
- Transform documents for presentation

## ZIP File Cleaning

Clean and sanitize ZIP file contents by:
- Removing or replacing invalid characters in filenames
- Enforcing length limits
- Standardizing naming conventions
- Handling special characters

**Use Cases:**
- Process user-uploaded ZIP files
- Standardize file naming across systems
- Clean archives before processing
- Ensure cross-platform compatibility

## API Features

### Authentication
- Secure API key-based authentication
- Rate limiting per key
- Usage tracking and analytics

### Reliability
- High availability infrastructure
- Error handling and retry logic
- Status code responses

### Performance
- Fast processing times
- Scalable architecture
- Support for large files

## Integration Examples

### Python
\`\`\`python
import requests

response = requests.post(
    "https://api.developer.meldra.ai/v1/convert/pdf-to-doc",
    headers={"X-API-Key": "your_key"},
    files={"file": open("document.pdf", "rb")}
)
\`\`\`

### JavaScript/Node.js
\`\`\`javascript
const formData = new FormData();
formData.append('file', fileBlob);

fetch('https://api.developer.meldra.ai/v1/convert/pdf-to-doc', {
  method: 'POST',
  headers: { 'X-API-Key': 'your_key' },
  body: formData
});
\`\`\`

## Get Started

Visit api.developer.meldra.ai to explore the API, test endpoints, and view detailed documentation.
    `,
  },
};

export default function BlogPost() {
  const { id } = useParams();
  const post = BLOG_CONTENT[parseInt(id || '0')];

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
          <Link to="/developers/blog">
            <Button>Back to Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="w-full border-b border-slate-200 py-4 px-4 md:px-6 lg:px-8 bg-white sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between max-w-7xl">
          <Logo size="medium" showText={true} className="text-slate-900" lowercaseM tagline="for Developers" />
          <nav className="flex items-center gap-1 md:gap-3">
            <Link to="/developers" className="text-slate-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
              API Reference
            </Link>
            <Link to="/developers/blog" className="text-blue-600 border-b-2 border-blue-600 px-3 py-2 text-sm font-medium">
              Blog
            </Link>
            <a href="mailto:support@meldra.ai" className="text-slate-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
              Support
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
          <Home className="w-4 h-4" />
          <span>/</span>
          <Link to="/developers" className="hover:text-blue-600">API Reference</Link>
          <span>/</span>
          <Link to="/developers/blog" className="hover:text-blue-600">Blog</Link>
          <span>/</span>
          <span className="text-slate-900">{post.title}</span>
        </div>

        {/* Back Button */}
        <Link to="/developers/blog" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        {/* Promotional Banner */}
        <div className="mb-8">
          <BlogPromoBanner 
            title={post.title}
            postId={parseInt(id || '0')}
            category={post.category}
          />
        </div>

        {/* Post Content */}
        <article className="prose prose-slate max-w-none">
          <div className="flex items-center gap-4 text-sm text-slate-600 mb-8">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(post.date)}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>By {post.author}</span>
            </div>
          </div>
          <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </div>
        </article>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 py-8 px-4 mt-auto bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600 mb-4">
            <Link to="/disclaimer" className="text-blue-600 hover:text-blue-700">Legal / Disclaimer</Link>
            <Link to="/privacy" className="text-blue-600 hover:text-blue-700">Privacy</Link>
            <a href="mailto:support@meldra.ai" className="text-blue-600 hover:text-blue-700">Support</a>
            <a href={INSIGHT} className="text-blue-600 hover:text-blue-700">meldra</a>
          </div>
          <p className="text-center text-slate-500 text-sm">© {new Date().getFullYear()} Meldra. All rights reserved.</p>
        </div>
      </footer>

      <CookieConsent privacyUrl={`${INSIGHT}/privacy`} />
    </div>
  );
}
