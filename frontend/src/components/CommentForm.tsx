import { useState } from "react";

interface CommentFormProps {
  postId: number;
  onSubmit: (content: string) => Promise<void>;
  isSubmitting?: boolean;
}

export default function CommentForm({ postId, onSubmit, isSubmitting }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError("Comment cannot be empty");
      return;
    }

    if (trimmedContent.length > 280) {
      setError("Comment cannot exceed 280 characters");
      return;
    }

    try {
      setError(null);
      await onSubmit(trimmedContent);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (newContent.length <= 280) {
      setError(null);
    }
  };

  const characterCount = content.length;
  const isOverLimit = characterCount > 280;

  return (
    <form onSubmit={handleSubmit} className="border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="space-y-3">
        <textarea
          value={content}
          onChange={handleChange}
          placeholder="Write a comment..."
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
          rows={3}
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span
              className={`text-sm ${
                isOverLimit
                  ? "text-red-500 dark:text-red-400 font-semibold"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {characterCount}/280
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !content.trim() || isOverLimit}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Posting..." : "Post Comment"}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>
    </form>
  );
}
