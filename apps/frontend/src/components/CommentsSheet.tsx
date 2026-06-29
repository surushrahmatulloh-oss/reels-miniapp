import { useState, useRef } from 'react';
import type { Comment } from '@/types';
import { addComment, getComments, likeComment } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconHeart } from '@/components/icons/InstagramIcons';
import { useAuthStore } from '@/store';

interface CommentsSheetProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
}

function renderText(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="font-semibold text-ig-link">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1}d`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}соат`;
  return `${Math.floor(hrs / 24)}р`;
}

export function CommentsSheet({ videoId, isOpen, onClose }: CommentsSheetProps) {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', videoId],
    queryFn: () => getComments(videoId),
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: (payload: { text: string; parentId?: string }) =>
      addComment(videoId, payload.text, payload.parentId),
    onSuccess: () => {
      setText('');
      setReplyTo(null);
      void queryClient.invalidateQueries({ queryKey: ['comments', videoId] });
    },
  });

  const likeMutation = useMutation({
    mutationFn: (commentId: string) => likeComment(videoId, commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', videoId] });
    },
  });

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    mutation.mutate({ text: trimmed, parentId: replyTo?.id });
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  };

  const insertMention = (username: string) => {
    setText((prev) => (prev ? `${prev} @${username} ` : `@${username} `));
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative flex max-h-[80vh] flex-col rounded-t-2xl bg-black border-t border-ig-border">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20" />
        <div className="flex items-center justify-center border-b border-ig-border px-4 py-3">
          <h3 className="text-sm font-semibold">Комментарийҳо</h3>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {isLoading && (
            <p className="py-8 text-center text-sm text-ig-muted">Бор шуда истодааст...</p>
          )}
          {!isLoading && comments.length === 0 && (
            <p className="py-12 text-center text-sm text-ig-muted">
              Аввалин комментарийро нависед
            </p>
          )}
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              onReply={() => {
                setReplyTo(comment);
                if (comment.user?.username) insertMention(comment.user.username);
              }}
              onLike={() => likeMutation.mutate(comment.id)}
            />
          ))}
        </div>

        {replyTo && (
          <div className="flex items-center justify-between border-t border-ig-border px-4 py-2 text-xs text-ig-muted">
            <span>Ҷавоб ба @{replyTo.user?.username ?? 'user'}</span>
            <button type="button" onClick={() => setReplyTo(null)}>
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-ig-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <img
            src={me?.avatarUrl || 'https://i.pravatar.cc/40'}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={replyTo ? 'Ҷавоб нависед...' : 'Комментарий... (@username)'}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-ig-muted"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || mutation.isPending}
            className={`text-sm font-semibold ${text.trim() ? 'text-ig-accent' : 'text-ig-muted'} disabled:opacity-40`}
          >
            Фиристодан
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  onReply,
  onLike,
}: {
  comment: Comment;
  onReply: () => void;
  onLike: () => void;
}) {
  return (
    <div className="py-3">
      <div className="flex gap-3">
        <img
          src={comment.user?.avatarUrl || 'https://i.pravatar.cc/40'}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="mr-2 font-semibold">{comment.user?.username ?? 'user'}</span>
            {renderText(comment.text)}
          </p>
          <div className="mt-1 flex items-center gap-4 text-xs text-ig-muted">
            <span>{timeAgo(comment.createdAt)}</span>
            {comment.likes > 0 && <span>{comment.likes} лайк</span>}
            <button type="button" onClick={onReply}>
              Ҷавоб
            </button>
          </div>
          {comment.replies?.map((reply) => (
            <div key={reply.id} className="mt-3 flex gap-3 pl-2">
              <img
                src={reply.user?.avatarUrl || 'https://i.pravatar.cc/40'}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full object-cover"
              />
              <div>
                <p className="text-sm">
                  <span className="mr-2 font-semibold">{reply.user?.username ?? 'user'}</span>
                  {renderText(reply.text)}
                </p>
                <span className="text-xs text-ig-muted">{timeAgo(reply.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={onLike} className="shrink-0 pt-1">
          <IconHeart className={`h-3 w-3 ${comment.isLiked ? 'text-ig-accent' : 'text-ig-muted'}`} filled={comment.isLiked} />
        </button>
      </div>
    </div>
  );
}
