import type { APIRoute } from 'astro';
import exchanges from '../data/exchanges.json';
import categories from '../data/categories.json';
import countries from '../data/countries.json';

export const GET: APIRoute = () => {
  const site = 'https://cryptobonusworld.com';
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/bonuses/', priority: '0.9', changefreq: 'daily' },
    { url: '/exchanges/', priority: '0.8', changefreq: 'weekly' },
    { url: '/methodology/', priority: '0.5', changefreq: 'monthly' },
    { url: '/about/', priority: '0.4', changefreq: 'monthly' },
  ];

  const exchangePages = exchanges.map(ex => ({
    url: `/exchanges/${ex.slug}/`,
    priority: '0.85',
    changefreq: 'weekly',
    lastmod: ex.updatedAt,
  }));

  const categoryPages = categories.map(cat => ({
    url: `/categories/${cat.slug}/`,
    priority: '0.8',
    changefreq: 'weekly',
  }));

  const countryPages = countries.map(c => ({
    url: `/countries/${c.slug}/`,
    priority: '0.75',
    changefreq: 'weekly',
  }));

  const allPages = [...staticPages, ...exchangePages, ...categoryPages, ...countryPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${site}${page.url}</loc>
    <lastmod>${'lastmod' in page ? page.lastmod : today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
