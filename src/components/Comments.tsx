import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';
import { useAuthStore } from '../stores/auth';
import * as api from '../api/client';
import type { Comment } from '../types';

interface CommentsProps {
  targetType: 'bey' | 'part';
  targetId: string;
  category?: string;
}

export function Comments({ targetType, targetId, category }: CommentsProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const data =
        targetType === 'bey'
          ? await api.getBeyComments(targetId)
          : await api.getPartComments(category!, targetId);
      setComments(data.comments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetId, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const data =
        targetType === 'bey'
          ? await api.postBeyComment(targetId, text.trim())
          : await api.postPartComment(category!, targetId, text.trim());
      setComments((prev) => [data.comment, ...prev]);
      setText('');
      if (data.promotion?.promoted) {
        setError(t('comments.promoted'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const canDelete = (comment: Comment) => {
    if (!user) return false;
    if (comment.userId === user.id) return true;
    return user.role === 'Council' || user.role === 'Referee';
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  };

  return (
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">{t('comments.title')}</h2>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {user && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('comments.placeholder')}
            rows={3}
            maxLength={2000}
            className="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--muted)]">{text.length}/2000</span>
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {t('comments.submit')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">{t('errors.loading')}</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t('comments.empty')}</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-lg bg-[var(--bg)] p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text)]">
                  {comment.username ?? comment.userId}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-[var(--text)]">{comment.text}</p>
              {canDelete(comment) && (
                <button
                  type="button"
                  onClick={() => void handleDelete(comment.id)}
                  className="mt-2 text-xs text-red-600 hover:underline dark:text-red-400"
                >
                  {t('comments.delete')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
