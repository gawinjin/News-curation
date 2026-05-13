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
  // General AI explainers and high-signal curators
  { handle: 'karpathy',        name: 'Andrej Karpathy',     category: 'insights' },
  { handle: 'simonw',          name: 'Simon Willison',      category: 'insights' },
  { handle: 'swyx',            name: 'swyx',                category: 'insights' },
  { handle: 'trq212',          name: 'Thariq Shihipar',     category: 'guides'   },
  { handle: 'chipro',          name: 'Chip Huyen',          category: 'guides'   },
  { handle: 'eugeneyan',       name: 'Eugene Yan',          category: 'guides'   },
  { handle: 'jeremyphoward',   name: 'Jeremy Howard',       category: 'guides'   },
  { handle: 'rasbt',           name: 'Sebastian Raschka',   category: 'guides'   },
  { handle: '_akhaliq',        name: 'AK',                  category: 'research' },

  // Frontier research, model behavior, and reasoning
  { handle: 'AndrewYNg',       name: 'Andrew Ng',           category: 'insights' },
  { handle: 'ylecun',          name: 'Yann LeCun',          category: 'research' },
  { handle: 'drfeifei',        name: 'Fei-Fei Li',          category: 'research' },
  { handle: 'fchollet',        name: 'Francois Chollet',    category: 'research' },
  { handle: 'DrJimFan',        name: 'Jim Fan',             category: 'research' },
  { handle: 'lilianweng',      name: 'Lilian Weng',         category: 'research' },
  { handle: 'natolambert',     name: 'Nathan Lambert',      category: 'research' },
  { handle: 'sarahookr',       name: 'Sara Hooker',         category: 'research' },
  { handle: 'percyliang',      name: 'Percy Liang',         category: 'research' },
  { handle: 'polynoamial',     name: 'Noam Brown',          category: 'research' },
  { handle: 'johnschulman2',   name: 'John Schulman',       category: 'research' },
  { handle: 'hardmaru',        name: 'David Ha',            category: 'research' },
  { handle: 'yoavgo',          name: 'Yoav Goldberg',       category: 'research' },
  { handle: 'chelseabfinn',    name: 'Chelsea Finn',        category: 'research' },
  { handle: 'pabbeel',         name: 'Pieter Abbeel',       category: 'research' },

  // Open models, platforms, and AI infrastructure
  { handle: 'ClementDelangue', name: 'Clement Delangue',    category: 'insights' },
  { handle: 'Thom_Wolf',       name: 'Thomas Wolf',         category: 'research' },
  { handle: 'soumithchintala', name: 'Soumith Chintala',    category: 'research' },
  { handle: 'awnihannun',      name: 'Awni Hannun',         category: 'research' },
  { handle: 'osanseviero',     name: 'Omar Sanseviero',     category: 'guides'   },
  { handle: 'reach_vb',        name: 'Vaibhav Srivastav',   category: 'guides'   },

  // Agents, evals, and production AI engineering
  { handle: 'HamelHusain',     name: 'Hamel Husain',        category: 'guides'   },
  { handle: 'sh_reya',         name: 'Shreya Shankar',      category: 'guides'   },
  { handle: 'hwchase17',       name: 'Harrison Chase',      category: 'guides'   },
  { handle: 'mattpocockuk',    name: 'Matt Pocock',         category: 'guides'   },
  { handle: 'amasad',          name: 'Amjad Masad',         category: 'guides'   },
  { handle: 'rauchg',          name: 'Guillermo Rauch',     category: 'guides'   },
  { handle: 'levelsio',        name: 'Pieter Levels',       category: 'guides'   },
  { handle: 'bentossell',      name: 'Ben Tossell',         category: 'guides'   },

  // Safety, policy, and AI-world analysis
  { handle: 'JackClarkSF',     name: 'Jack Clark',          category: 'insights' },
  { handle: 'Miles_Brundage',  name: 'Miles Brundage',      category: 'insights' },
  { handle: 'helenoner',       name: 'Helen Toner',         category: 'insights' },
  { handle: 'alexalbert__',    name: 'Alex Albert',         category: 'insights' },
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
