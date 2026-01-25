/**
 * Blog Promotional Banner Component
 * Similar to Amadeus for Developers promotional banners
 */
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BlogPromoBanner({ title, postId, category = 'tutorials' }) {
  const categoryColors = {
    'tutorials': 'from-blue-600 to-blue-800',
    'updates': 'from-green-600 to-green-800',
    'success-stories': 'from-purple-600 to-purple-800',
    'engineering': 'from-amber-600 to-amber-800',
    'api-docs': 'from-indigo-600 to-indigo-800',
  };

  const gradient = categoryColors[category] || 'from-blue-600 to-blue-800';

  return (
    <div className={`relative w-full h-48 rounded-xl overflow-hidden bg-gradient-to-br ${gradient} shadow-lg`}>
      {/* Geometric Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* Additional geometric shapes */}
          <circle cx="20%" cy="30%" r="60" fill="white" opacity="0.05" />
          <circle cx="80%" cy="70%" r="80" fill="white" opacity="0.05" />
          <rect x="60%" y="20%" width="100" height="100" fill="white" opacity="0.05" transform="rotate(45 60% 20%)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-6 text-white">
        {/* Branding */}
        <div className="text-sm font-medium opacity-90">
          meldra for Developers
        </div>

        {/* Title */}
        <div className="flex-1 flex items-center">
          <h2 className="text-2xl md:text-3xl font-bold leading-tight max-w-3xl">
            {title}
          </h2>
        </div>

        {/* CTA Button */}
        <div className="mt-4">
          <Link to={`/developers/blog/${postId}`}>
            <Button 
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-6 py-2 rounded-full shadow-md hover:shadow-lg transition-all"
            >
              Learn More
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
