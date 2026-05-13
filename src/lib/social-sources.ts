// X/Twitter handles the agent watches daily.
// Ingestion goes through Nitter (community-run X mirrors) — see scripts/ingest.ts.
// Add a new handle here as a one-line PR; no other code changes needed.

import type { CategorySlug } from './categories';

export type SocialHandle = {
  handle: string;      // X handle without the @
  name: string;        // Display name used in references and frontmatter
  category: CategorySlug;
};

export const SOCIAL_HANDLES: SocialHandle[] = [
  // Core voices
  { handle: 'karpathy',        name: 'Andrej Karpathy',   category: 'insights' },
  { handle: 'mattpocockuk',    name: 'Matt Pocock',       category: 'guides'   },
  { handle: 'simonw',          name: 'Simon Willison',    category: 'insights' },
  { handle: 'swyx',            name: 'swyx',              category: 'insights' },
  // Lab + research
  { handle: 'lilianweng',      name: 'Lilian Weng',       category: 'research' },
  { handle: 'JackClarkSF',     name: 'Jack Clark',        category: 'insights' },
  { handle: 'soumithchintala', name: 'Soumith Chintala',  category: 'research' },
  { handle: 'awnihannun',      name: 'Awni Hannun',       category: 'research' },
  // Builders & DX
  { handle: 'hwchase17',       name: 'Harrison Chase',    category: 'guides'   },
  { handle: 'amasad',          name: 'Amjad Masad',       category: 'guides'   },
  { handle: 'levelsio',        name: 'Pieter Levels',     category: 'guides'   },
  { handle: 'rauchg',          name: 'Guillermo Rauch',   category: 'guides'   },
];

export const DEFAULT_NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
  'https://nitter.unixfox.eu',
];

export function nitterInstances(): string[] {
  const raw = process.env.NITTER_INSTANCES;
  if (!raw) return DEFAULT_NITTER_INSTANCES;
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}
