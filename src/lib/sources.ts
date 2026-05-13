// Allowed sources for Signal. Only RSS-published or otherwise-licensed-for-redistribution
// feeds belong here. User-supplied social posts are handled separately (per-article
// `social` frontmatter, with the source URL and ≤25-word verbatim quote rule).

export type Source = {
  id: string;
  name: string;
  url: string;        // human-facing URL
  feed: string;       // RSS / Atom feed URL
  bucket: 'lab' | 'voice';
  category: 'model-releases' | 'research' | 'insights' | 'guides';
};

export const SOURCES: Source[] = [
  // Major labs (official blogs / news feeds)
  {
    id: 'anthropic',
    name: 'Anthropic',
    url: 'https://www.anthropic.com/news',
    feed: 'https://www.anthropic.com/news/rss.xml',
    bucket: 'lab',
    category: 'model-releases',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    url: 'https://openai.com/news/',
    feed: 'https://openai.com/news/rss.xml',
    bucket: 'lab',
    category: 'model-releases',
  },
  {
    id: 'deepmind',
    name: 'Google DeepMind',
    url: 'https://deepmind.google/discover/blog/',
    feed: 'https://deepmind.google/blog/rss.xml',
    bucket: 'lab',
    category: 'research',
  },
  {
    id: 'meta-ai',
    name: 'Meta AI',
    url: 'https://ai.meta.com/blog/',
    feed: 'https://ai.meta.com/blog/rss/',
    bucket: 'lab',
    category: 'model-releases',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    url: 'https://mistral.ai/news/',
    feed: 'https://mistral.ai/news/rss.xml',
    bucket: 'lab',
    category: 'model-releases',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    url: 'https://huggingface.co/blog',
    feed: 'https://huggingface.co/blog/feed.xml',
    bucket: 'lab',
    category: 'guides',
  },

  // Voices
  {
    id: 'karpathy',
    name: 'Andrej Karpathy',
    url: 'https://karpathy.github.io/',
    feed: 'https://karpathy.github.io/feed.xml',
    bucket: 'voice',
    category: 'insights',
  },
  {
    id: 'simonwillison',
    name: 'Simon Willison',
    url: 'https://simonwillison.net/',
    feed: 'https://simonwillison.net/atom/everything/',
    bucket: 'voice',
    category: 'insights',
  },
  {
    id: 'importai',
    name: 'Import AI (Jack Clark)',
    url: 'https://importai.substack.com/',
    feed: 'https://importai.substack.com/feed',
    bucket: 'voice',
    category: 'insights',
  },
  {
    id: 'lilianweng',
    name: 'Lilian Weng',
    url: 'https://lilianweng.github.io/',
    feed: 'https://lilianweng.github.io/index.xml',
    bucket: 'voice',
    category: 'research',
  },
  {
    id: 'raschka',
    name: 'Sebastian Raschka',
    url: 'https://magazine.sebastianraschka.com/',
    feed: 'https://magazine.sebastianraschka.com/feed',
    bucket: 'voice',
    category: 'research',
  },
];
