import { useState, ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        <svg
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
}
