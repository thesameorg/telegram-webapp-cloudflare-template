interface ContactLinksData {
  website?: string;
  telegram?: string;
}

interface ContactLinksProps {
  contactLinks?: ContactLinksData;
  editable?: boolean;
  onChange?: (links: ContactLinksData) => void;
}

const linkIcons = {
  website: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  ),
  telegram: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  ),
};

const linkLabels = {
  website: "Website",
  telegram: "Telegram",
};

export function ContactLinks({
  contactLinks = {},
  editable = false,
  onChange,
}: ContactLinksProps) {
  const handleInputChange = (
    platform: keyof ContactLinksData,
    value: string,
  ) => {
    if (onChange) {
      onChange({
        ...contactLinks,
        [platform]: value.trim() || undefined,
      });
    }
  };

  const formatUrl = (platform: keyof ContactLinksData, value: string) => {
    if (platform === "website") {
      return value.startsWith("http") ? value : `https://${value}`;
    }
    if (platform === "telegram") {
      return `https://t.me/${value.replace("@", "")}`;
    }
    return value;
  };

  const visibleLinks = Object.entries(contactLinks).filter(
    ([, value]) => value,
  );

  if (!editable && visibleLinks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {editable ? (
        <div className="space-y-3">
          {Object.entries(linkLabels).map(([platform, label]) => (
            <div key={platform}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {label}
              </label>
              <input
                type="text"
                value={contactLinks[platform as keyof ContactLinksData] || ""}
                onChange={(e) =>
                  handleInputChange(
                    platform as keyof ContactLinksData,
                    e.target.value,
                  )
                }
                placeholder={
                  platform === "website" ? "https://example.com" : `@username`
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {visibleLinks.map(([platform, value]) => (
            <a
              key={platform}
              href={formatUrl(platform as keyof ContactLinksData, value)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
            >
              {linkIcons[platform as keyof typeof linkIcons]}
              <span>{platform === "website" ? value : `@${value}`}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
