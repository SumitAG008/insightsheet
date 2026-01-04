// pages/Reviews.jsx - Customer Reviews Page
import React, { useState, useEffect } from 'react';
import { meldraAi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Star, ThumbsUp, MessageSquare, TrendingUp, 
  CheckCircle, AlertCircle, Send
} from 'lucide-react';
import { toast } from 'sonner';
import Logo from '@/components/branding/Logo';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Review form state
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [featureRated, setFeatureRated] = useState('');
  
  // Filter state
  const [filterFeature, setFilterFeature] = useState('all');

  useEffect(() => {
    loadReviews();
    loadStats();
  }, [filterFeature]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const featureParam = filterFeature !== 'all' ? `&feature=${filterFeature}` : '';
      const response = await fetch(
        `${API_URL}/api/reviews?approved_only=true&limit=50${featureParam}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to load reviews: ${response.status}`);
      }
      
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error(error.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/reviews/stats`);
      
      if (!response.ok) {
        throw new Error(`Failed to load stats: ${response.status}`);
      }
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    if (!comment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    try {
      setSubmitting(true);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please login to submit a review');
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating,
          title: title.trim() || null,
          comment: comment.trim(),
          feature_rated: featureRated || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to submit review');
      }

      toast.success('Review submitted! It will be published after moderation.');
      setShowForm(false);
      setRating(0);
      setTitle('');
      setComment('');
      setFeatureRated('');
      loadReviews();
      loadStats();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkHelpful = async (reviewId) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please login to mark reviews as helpful');
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Marked as helpful!');
        loadReviews();
      }
    } catch (error) {
      console.error('Error marking helpful:', error);
    }
  };

  const features = [
    { value: 'all', label: 'All Features' },
    { value: 'Excel to PPT', label: 'Excel to PPT' },
    { value: 'P&L Builder', label: 'P&L Builder' },
    { value: 'Excel Builder', label: 'Excel Builder' },
    { value: 'File Analyzer', label: 'File Analyzer' },
    { value: 'DB Schema', label: 'DB Schema Creator' },
    { value: 'ZIP Processor', label: 'ZIP Processor' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Customer Reviews
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            See what our users are saying about Meldra
          </p>
        </div>

        {/* Stats Section */}
        {stats && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {stats.average_rating?.toFixed(1) || '0.0'}
                </div>
                <div className="flex justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(stats.average_rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Average Rating
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {stats.total_reviews || 0}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Reviews
                </p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">
                    {stats.rating_distribution?.[5] || 0}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  5-Star Reviews
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filter & Submit Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="feature-filter" className="text-slate-700 dark:text-slate-300">
              Filter by Feature:
            </Label>
            <select
              id="feature-filter"
              value={filterFeature}
              onChange={(e) => setFilterFeature(e.target.value)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              {features.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Write a Review
          </Button>
        </div>

        {/* Review Form */}
        {showForm && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">
              Write Your Review
            </h2>
            <form onSubmit={handleSubmitReview}>
              <div className="mb-4">
                <Label className="text-slate-700 dark:text-slate-300 mb-2 block">
                  Rating *
                </Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="feature" className="text-slate-700 dark:text-slate-300 mb-2 block">
                  Feature (Optional)
                </Label>
                <select
                  id="feature"
                  value={featureRated}
                  onChange={(e) => setFeatureRated(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">Select a feature</option>
                  {features.slice(1).map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <Label htmlFor="title" className="text-slate-700 dark:text-slate-300 mb-2 block">
                  Title (Optional)
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief summary of your review"
                  className="w-full"
                />
              </div>

              <div className="mb-4">
                <Label htmlFor="comment" className="text-slate-700 dark:text-slate-300 mb-2 block">
                  Your Review *
                </Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience with Meldra..."
                  rows={5}
                  className="w-full"
                  required
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setRating(0);
                    setTitle('');
                    setComment('');
                    setFeatureRated('');
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Reviews List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-lg shadow-md">
            <MessageSquare className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        {review.user_name || review.user_email}
                      </h3>
                      {review.verified_purchase && (
                        <CheckCircle className="w-4 h-4 text-blue-600" title="Verified User" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                      {review.feature_rated && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                          • {review.feature_rated}
                        </span>
                      )}
                    </div>
                    {review.title && (
                      <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2">
                        {review.title}
                      </h4>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(review.created_date).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  {review.comment}
                </p>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleMarkHelpful(review.id)}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm">Helpful ({review.helpful_count || 0})</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
