const siteUrl = process.env.PUBLIC_SITE_URL || 'https://signal.gawinjin.workers.dev';
const repoUrl = process.env.PUBLIC_REPO_URL || 'https://github.com/gawinjin/News-curation';

export const siteConfig = {
  name: 'Signal',
  tagline: 'AI news, made useful.',
  description:
    'Signal turns the latest AI releases, research, and ideas into clear writeups with practical guides anyone can follow.',
  author: 'Signal Editorial',
  url: siteUrl,
  repoUrl,
  contactEmail: process.env.PUBLIC_CONTACT_EMAIL || 'hello@gawinjin.com',
};
