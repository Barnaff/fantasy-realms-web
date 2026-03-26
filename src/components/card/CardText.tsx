import { type ReactNode } from 'react';
import { ALL_TAGS, TAG_COLORS, type Tag } from '../../types/card.ts';

/**
 * Keywords that should be rendered bold (case-insensitive match).
 * These are game-mechanic keywords, not tag names.
 */
const BOLD_KEYWORDS = ['blank', 'blanks', 'blanked', 'discard', 'penalty', 'bonus', 'clears'];

/**
 * Build a single regex that matches tag names and bold keywords.
 * Tags are matched first (longer names first to avoid partial matches).
 * Word-boundary (\b) ensures we don't match inside other words.
 */
const sortedTags = [...ALL_TAGS].sort((a, b) => b.length - a.length);
const allTerms = [...sortedTags, ...BOLD_KEYWORDS];
const PATTERN = new RegExp(`\\b(${allTerms.join('|')})\\b`, 'gi');

/**
 * Takes a plain-text card description and returns rich JSX with:
 * - Tag names colored in their tag color + bold
 * - Keywords (blank, discard, etc.) in bold
 */
export function formatCardText(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  PATTERN.lastIndex = 0;

  while ((match = PATTERN.exec(text)) !== null) {
    const word = match[0];
    const index = match.index;

    // Push preceding plain text
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    // Check if it's a tag name
    const tagMatch = ALL_TAGS.find(t => t.toLowerCase() === word.toLowerCase());

    if (tagMatch) {
      parts.push(
        <span
          key={`${index}-${word}`}
          className="font-bold"
          style={{ color: TAG_COLORS[tagMatch as Tag] }}
        >
          {word}
        </span>
      );
    } else {
      // It's a keyword — render bold
      parts.push(
        <strong key={`${index}-${word}`}>
          {word}
        </strong>
      );
    }

    lastIndex = index + word.length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
