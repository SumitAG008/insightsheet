/**
 * Developers Blog - Separate blog section for API documentation, tutorials, and updates
 * Similar to Amadeus for Developers blog structure
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Calendar, User, ArrowRight, Home } from 'lucide-react';
import CookieConsent from '@/components/CookieConsent';
import Logo from '@/components/branding/Logo';
import BlogPromoBanner from '@/components/BlogPromoBanner';

const INSIGHT = 'https://insight.meldra.ai';

const CATEGORIES = [
  { id: 'all', label: 'All Posts' },
  { id: 'updates', label: 'Updates' },
  { id: 'tutorials', label: 'Tutorials' },
  { id: 'success-stories', label: 'Success Stories' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'api-docs', label: 'API Documentation' },
];

const BLOG_POSTS = [
  {
    id: 1,
    title: 'Getting Started with Meldra API: Your First Document Conversion',
    date: '2025-01-25',
    author: 'Meldra Team',
    category: 'tutorials',
    summary: 'Learn how to convert PDF to DOC, DOC to PDF, and more using the Meldra API. This comprehensive guide walks you through authentication, making your first API call, and handling responses. Perfect for developers new to document conversion APIs.',
    image: '/api-blog-1.jpg',
    readMore: true,
  },
  {
    id: 2,
    title: 'How to Generate and Use Your Meldra API Key',
    date: '2025-01-24',
    author: 'Meldra Team',
    category: 'tutorials',
    summary: 'Step-by-step guide on obtaining your Meldra API key, understanding authentication, and securing your credentials. Learn about rate limits, best practices, and how to integrate the API key into your applications.',
    image: '/api-blog-2.jpg',
    readMore: true,
  },
  {
    id: 3,
    title: 'What Can the Meldra API Do? Complete Feature Overview',
    date: '2025-01-23',
    author: 'Meldra Team',
    category: 'api-docs',
    summary: 'Discover all the capabilities of the Meldra API: document conversion (PDF, DOC, PPT), ZIP file cleaning, and more. Understand use cases, technical specifications, and how each endpoint works in real-world scenarios.',
    image: '/api-blog-3.jpg',
    readMore: true,
  },
  {
    id: 4,
    title: 'API v1.0 Released: Document Conversion and ZIP Cleaning Now Available',
    date: '2025-01-20',
    author: 'Meldra Team',
    category: 'updates',
    summary: 'We\'re excited to announce the launch of Meldra API v1.0! This release includes document conversion endpoints (PDF↔DOC, PPT↔PDF) and ZIP file cleaning. Read about new features, improvements, and what\'s coming next.',
    image: '/api-blog-4.jpg',
    readMore: true,
  },
  {
    id: 5,
    title: 'Building a Document Processing Pipeline with Meldra API',
    date: '2025-01-18',
    author: 'Meldra Team',
    category: 'engineering',
    summary: 'Learn how to build scalable document processing pipelines using the Meldra API. This engineering deep-dive covers batch processing, error handling, retry logic, and performance optimization strategies.',
    image: '/api-blog-5.jpg',
    readMore: true,
  },
  {
    id: 6,
    title: 'How Company X Automated Their Document Workflow with Meldra',
    date: '2025-01-15',
    author: 'Meldra Team',
    category: 'success-stories',
    summary: 'Case study: How a leading enterprise reduced document processing time by 80% using Meldra API. Learn about their implementation, challenges overcome, and the results they achieved.',
    image: '/api-blog-6.jpg',
    readMore: true,
  },
];

export default function DevelopersBlog() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = BLOG_POSTS.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      'tutorials': 'bg-red-100 text-red-800 border-red-200',
      'updates': 'bg-blue-100 text-blue-800 border-blue-200',
      'success-stories': 'bg-green-100 text-green-800 border-green-200',
      'engineering': 'bg-purple-100 text-purple-800 border-purple-200',
      'api-docs': 'bg-amber-100 text-amber-800 border-amber-200',
    };
    return colors[category] || 'bg-slate-100 text-slate-800 border-slate-200';
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
            <Link to="/register">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Register</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600">
                Sign In
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 flex gap-8 max-w-7xl">
        {/* Left Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-28">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Developers Blog</h2>
            <div className="space-y-1 mb-6">
              <div className="border-b border-slate-200 pb-2 mb-2">
                <button className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-1">
                  Categories
                </button>
              </div>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`block w-full text-left py-2 px-3 rounded-lg text-sm transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
            <Home className="w-4 h-4" />
            <span>/</span>
            <Link to="/developers" className="hover:text-blue-600">API Reference</Link>
            <span>/</span>
            <span className="text-slate-900">Developers Blog</span>
          </div>

          {/* Search */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search blog posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Blog Posts */}
          <div className="space-y-8">
            {filteredPosts.map((post) => (
              <div key={post.id} className="space-y-4">
                {/* Promotional Banner */}
                <BlogPromoBanner 
                  title={post.title}
                  postId={post.id}
                  category={post.category}
                />
                
                {/* Post Details Card */}
                <Card className="border border-slate-200 hover:border-blue-300 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getCategoryColor(post.category)}`}>
                          {CATEGORIES.find(c => c.id === post.category)?.label || post.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(post.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>By {post.author}</span>
                        </div>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{post.summary}</p>
                      {post.readMore && (
                        <Link 
                          to={`/developers/blog/${post.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Read more <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-600">No blog posts found.</p>
            </div>
          )}
        </main>
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
