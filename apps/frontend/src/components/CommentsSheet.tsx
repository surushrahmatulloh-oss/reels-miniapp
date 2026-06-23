import { useState } from 'react';
import type { Comment } from '@/types';
import { addComment, getComments } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CommentsSheetProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsSheet({ videoId, isOpen, onClose }: CommentsSheetProps) {
  const [text, setText] = useState('');
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', videoId],
    queryFn: () => getComments(videoId),
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: (commentText: string) => addComment(videoId, commentText),
    onSuccess: () => {
      setText('');
      void queryClient.invalidateQueries({ queryKey: ['comments', videoId] });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative max-h-[70vh] rounded-t-2xl bg-zinc-900">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="font-semibold">Комментарийҳо</h3>
          <button onClick={onClose} className="text-white/60">
            ✕
          </button>
        </div>

        <div className="max-h-[45vh] overflow-y-auto px-4 py-2">
          {isLoading && <p className="py-4 text-center text-sm text-white/50">Бор шуда истодааст...</p>}
          {!isLoading && comments.length === 0 && (
            <p className="py-8 text-center text-sm text-white/50">Комментарий нест</p>
          )}
          {comments.map((comment: Comment) => (
            <div key={comment.id} className="flex gap-3 py-3">
              <img
                src={comment.user?.avatarUrl || 'https://i.pravatar.cc/40'}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-medium">{comment.user?.username ?? 'user'}</p>
                <p className="text-sm text-white/80">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Комментарий нависед..."
            className="flex-1 rounded-full bg-white/10 px-4 py-2 text-sm outline-none placeholder:text-white/40"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim()) {
                mutation.mutate(text.trim());
              }
            }}
          />
          <button
            onClick={() => text.trim() && mutation.mutate(text.trim())}
            disabled={!text.trim() || mutation.isPending}
            className="rounded-full bg-tg-button px-4 py-2 text-sm font-medium text-tg-button-text disabled:opacity-50"
          >
            Фиристодан
          </button>
        </div>
      </div>
    </div>
  );
}
