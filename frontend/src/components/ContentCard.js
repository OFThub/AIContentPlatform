import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Eye, Heart, MessageCircle, TrendingUp, Bookmark } from 'lucide-react';

/**
 * date-fns throws RangeError on an invalid date. With no error boundary in the
 * app that used to take down the whole page, so one bad row is contained here.
 */
const relativeTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true });
};

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
    is_bookmarked,
  } = content;

  const preview = body && body.length > 200 ? body.substring(0, 200) + '...' : body;
  const when = relativeTime(created_at);
  const trend = Number(trend_percentage);

  return (
    <div className="bg-surface rounded-lg border border-edge hover:border-primary-300 hover:shadow-lg transition-all p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {category_name && <span className="chip">{category_name}</span>}
          {showTrend && trend > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
              <span>+{trend.toFixed(0)}%</span>
            </span>
          )}
        </div>
        {is_bookmarked && <Bookmark className="h-5 w-5 text-primary-600 fill-current" />}
      </div>

      <Link href={'/content/' + (slug || id)}>
        <h3 className="text-xl font-bold text-ink mb-2 hover:text-primary-600 transition-colors line-clamp-2 cursor-pointer">
          {title}
        </h3>
      </Link>

      <p className="text-muted mb-4 line-clamp-3">{preview}</p>

      <div className="flex items-center justify-between pt-4 border-t border-edge">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-medium text-sm">
              {username && username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-ink">{username}</p>
            {when && <p className="text-xs text-muted">{when}</p>}
          </div>
        </div>

        <div className="flex items-center space-x-4 text-muted">
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
