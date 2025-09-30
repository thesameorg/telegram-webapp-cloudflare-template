import { useState } from 'react';

interface ContactLinksData {
  website?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  telegram?: string;
}

interface ContactLinksProps {
  contactLinks?: ContactLinksData;
  editable?: boolean;
  onChange?: (links: ContactLinksData) => void;
}

const linkIcons = {
  website: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  twitter: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
    </svg>
  ),
  instagram: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987S24.005 18.607 24.005 11.987C24.005 5.367 18.638.001 12.017.001zM8.449 16.988c-2.508 0-4.541-2.033-4.541-4.541s2.033-4.541 4.541-4.541 4.541 2.033 4.541 4.541-2.033 4.541-4.541 4.541zm7.518 0c-2.508 0-4.541-2.033-4.541-4.541s2.033-4.541 4.541-4.541 4.541 2.033 4.541 4.541-2.033 4.541-4.541 4.541z"/>
    </svg>
  ),
  linkedin: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  telegram: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  ),
};

const linkLabels = {
  website: 'Website',
  twitter: 'Twitter',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  telegram: 'Telegram',
};

export function ContactLinks({ contactLinks = {}, editable = false, onChange }: ContactLinksProps) {
  const [editMode, setEditMode] = useState(false);
  const [editableLinks, setEditableLinks] = useState<ContactLinksData>(contactLinks);

  const handleInputChange = (platform: keyof ContactLinksData, value: string) => {
    setEditableLinks(prev => ({
      ...prev,
      [platform]: value.trim() || undefined
    }));
  };

  const handleSave = () => {
    if (onChange) {
      onChange(editableLinks);
    }
    setEditMode(false);
  };

  const handleCancel = () => {
    setEditableLinks(contactLinks);
    setEditMode(false);
  };

  const formatUrl = (platform: keyof ContactLinksData, value: string) => {
    if (platform === 'website') {
      return value.startsWith('http') ? value : `https://${value}`;
    }
    if (platform === 'twitter') {
      return `https://twitter.com/${value.replace('@', '')}`;
    }
    if (platform === 'instagram') {
      return `https://instagram.com/${value.replace('@', '')}`;
    }
    if (platform === 'linkedin') {
      return value.startsWith('http') ? value : `https://linkedin.com/in/${value}`;
    }
    if (platform === 'telegram') {
      return `https://t.me/${value.replace('@', '')}`;
    }
    return value;
  };

  const visibleLinks = Object.entries(contactLinks).filter(([, value]) => value);

  if (!editable && visibleLinks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {!editMode && editable && (
        <button
          onClick={() => setEditMode(true)}
          className="text-sm text-blue-500 hover:text-blue-600 font-medium"
        >
          {visibleLinks.length > 0 ? 'Edit Links' : 'Add Links'}
        </button>
      )}

      {editMode ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact Links</h4>
          {Object.entries(linkLabels).map(([platform, label]) => (
            <div key={platform}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {label}
              </label>
              <input
                type="text"
                value={editableLinks[platform as keyof ContactLinksData] || ''}
                onChange={(e) => handleInputChange(platform as keyof ContactLinksData, e.target.value)}
                placeholder={platform === 'website' ? 'https://example.com' : `@username`}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          ))}
          <div className="flex space-x-2 pt-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
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
              <span>{platform === 'website' ? value : `@${value}`}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}