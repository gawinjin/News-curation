export const CATEGORIES = {
  'model-releases': {
    label: 'Model Releases',
    blurb: 'New AI models and what they actually change for you.',
  },
  research: {
    label: 'Research & Papers',
    blurb: 'Notable findings, translated for normal humans.',
  },
  insights: {
    label: 'Insights from Leaders',
    blurb: 'What the people building this stuff are saying.',
  },
  guides: {
    label: 'Practical Guides',
    blurb: 'Step-by-step how-tos and tool roundups.',
  },
} as const;

export type CategorySlug = keyof typeof CATEGORIES;

export const CATEGORY_ORDER: CategorySlug[] = [
  'model-releases',
  'research',
  'insights',
  'guides',
];
