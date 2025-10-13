import { useState } from "react";
import { useTelegramMainButton } from "../hooks/use-telegram-main-button";
import WebApp from "@twa-dev/sdk";

interface CommentFormProps {
  readonly postId: number;
  readonly onSubmit: (content: string) => Promise<void>;
  readonly isSubmitting?: boolean;
}

export default function CommentForm({
  onSubmit,
  isSubmitting,
}: CommentFormProps) {
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

      // Trigger haptic feedback
      WebApp.HapticFeedback.notificationOccurred("success");

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
  const canSubmit = !isSubmitting && content.trim() && !isOverLimit;

  // Use Telegram MainButton
  useTelegramMainButton(
    canSubmit
      ? {
          text: isSubmitting ? "Posting..." : "Post Comment",
          onClick: () => {
            const form = document.getElementById(
              "comment-form",
            ) as HTMLFormElement;
            form?.requestSubmit();
          },
          disabled: !canSubmit,
          loading: isSubmitting,
        }
      : null,
  );

  return (
    <form
      id="comment-form"
      onSubmit={handleSubmit}
      className="border-b border-gray-200 dark:border-gray-700 p-4"
    >
      <div className="space-y-3">
        <textarea
          value={content}
          onChange={handleChange}
          placeholder="Write a comment..."
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
          rows={3}
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-end">
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

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>
    </form>
  );
}
