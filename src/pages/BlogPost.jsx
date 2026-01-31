/**
 * Individual Blog Post Page
 */
import { useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bookmark, Calendar, ChevronRight, Home, ListChecks, User } from 'lucide-react';
import CookieConsent from '@/components/CookieConsent';
import Logo from '@/components/branding/Logo';
import BlogPromoBanner from '@/components/BlogPromoBanner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getPostBySlugOrId } from '@/data/developersBlogPosts';

const INSIGHT = 'https://insight.meldra.ai';

export default function BlogPost() {
  const { slugOrId } = useParams();
  const post = getPostBySlugOrId(slugOrId);

  const isNumericId = /^\d+$/.test(String(slugOrId || '').trim());

  if (isNumericId && post?.slug) {
    return <Navigate to={`/developers/blog/${post.slug}`} replace />;
  }

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

  useEffect(() => {
    if (!post?.title) return;
    document.title = `${post.title} | meldra for Developers`;
  }, [post?.title]);

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
            postId={post.id}
            postSlug={post.slug}
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
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children, ...props }) => (
                <h1 className="mt-2 mb-6 text-4xl font-bold tracking-tight text-slate-900" {...props}>
                  {children}
                </h1>
              ),
              h2: ({ children, ...props }) => (
                <h2 className="mt-10 mb-4 flex items-center gap-2 text-2xl font-bold text-slate-900" {...props}>
                  <Bookmark className="h-5 w-5 text-blue-700" />
                  <span>{children}</span>
                </h2>
              ),
              h3: ({ children, ...props }) => (
                <h3 className="mt-8 mb-3 flex items-center gap-2 text-xl font-semibold text-slate-900" {...props}>
                  <ChevronRight className="h-5 w-5 text-slate-700" />
                  <span>{children}</span>
                </h3>
              ),
              ul: ({ children, ...props }) => (
                <ul className="my-4 space-y-2" {...props}>
                  {children}
                </ul>
              ),
              ol: ({ children, ...props }) => (
                <ol className="my-4 space-y-2" {...props}>
                  {children}
                </ol>
              ),
              li: ({ children, ...props }) => (
                <li className="flex items-start gap-2" {...props}>
                  <ListChecks className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-700" />
                  <span className="min-w-0">{children}</span>
                </li>
              ),
              pre: ({ children, ...props }) => (
                <pre className="my-6 overflow-x-auto rounded-xl bg-slate-900 p-4 text-slate-100" {...props}>
                  {children}
                </pre>
              ),
              code: ({ className, children, ...props }) => {
                const isBlock = typeof className === 'string' && className.includes('language-');
                if (isBlock) {
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.95em] text-slate-900" {...props}>
                    {children}
                  </code>
                );
              },
              blockquote: ({ children, ...props }) => (
                <blockquote className="my-6 border-l-4 border-blue-200 bg-blue-50 px-4 py-3 text-slate-700" {...props}>
                  {children}
                </blockquote>
              ),
              p: ({ children, ...props }) => (
                <p className="my-4 leading-relaxed text-slate-700" {...props}>
                  {children}
                </p>
              ),
              a: ({ children, ...props }) => (
                <a className="text-blue-700 underline underline-offset-2 hover:text-blue-800" {...props}>
                  {children}
                </a>
              ),
            }}
          >
            {post.content || ''}
          </ReactMarkdown>
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
