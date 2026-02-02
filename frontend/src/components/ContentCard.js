import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Eye, Heart, MessageCircle, TrendingUp, Bookmark } from 'lucide-react';

export default function ContentCard({ content, showTrend = false }) {
  const {
    id,
    title,
    slug,
    body,
    category_name,
    username,
    view_count,
    like_count,
    comment_count,
    created_at,
    trend_percentage,
    popularity_score,
    is_bookmarked
  } = content;

  // Truncate body for preview
  const preview = body?.length > 200 ? body.substring(0, 200) + '...' : body;

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {category_name && (
            <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
              {category_name}
            </span>
          )}
          {showTrend && trend_percentage > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
              <span>+{trend_percentage.toFixed(0)}%</span>
            </span>
          )}
        </div>
        {is_bookmarked && (
          <Bookmark className="h-5 w-5 text-primary-600 fill-current" />
        )}
      </div>

      {/* Title */}
      <Link href={`/content/${slug || id}`}>
        <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-primary-600 transition-colors line-clamp-2 cursor-pointer">
          {title}
        </h3>
      </Link>

      {/* Preview */}
      <p className="text-gray-600 mb-4 line-clamp-3">{preview}</p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        {/* Author & Date */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-medium text-sm">
              {username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{username}</p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-4 text-gray-500">
          <div className="flex items-center space-x-1">
            <Eye className="h-4 w-4" />
            <span className="text-sm">{view_count || 0}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Heart className="h-4 w-4" />
            <span className="text-sm">{like_count || 0}</span>
          </div>
          {comment_count !== undefined && (
            <div className="flex items-center space-x-1">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">{comment_count}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}