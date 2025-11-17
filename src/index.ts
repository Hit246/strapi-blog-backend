import type { Core } from '@strapi/strapi';

type StrapiInstance = Core.Strapi;

const CATEGORY_SEED = [
  {
    name: 'Product Updates',
    slug: 'product-updates',
    description: 'Release notes and platform improvements.',
  },
  {
    name: 'Founder Notes',
    slug: 'founder-notes',
    description: 'Behind-the-scenes stories from the founding team.',
  },
  {
    name: 'Learning',
    slug: 'learning',
    description: 'Tips, tutorials, and lessons learned.',
  },
];

const TAG_SEED = [
  { label: 'Strapi', slug: 'strapi' },
  { label: 'Next.js', slug: 'nextjs' },
  { label: 'Launch', slug: 'launch' },
  { label: 'Product', slug: 'product' },
  { label: 'Community', slug: 'community' },
];

const POST_SEED = [
  {
    title: 'Welcome to Launchpad Journal',
    slug: 'welcome-to-launchpad-journal',
    excerpt:
      'We are excited to kick off our public build journey with Launchpad Journal, a transparent blog that shares what we are building every sprint.',
    content: `<p>Welcome to <strong>Launchpad Journal</strong>, our new home for shipping notes and transparency. Expect bi-weekly posts that recap what shipped, why it matters, and how you can try it.</p><p>In this first note we walk through the tooling stack (Strapi + Next.js) and how the CMS keeps us shipping faster.</p>`,
    category: 'product-updates',
    tags: ['strapi', 'launch'],
    featured: true,
    readTime: 4,
  },
  {
    title: 'How We Built the First Prototype in 7 Days',
    slug: 'how-we-built-the-first-prototype-in-7-days',
    excerpt:
      'A sprint recap that covers planning, execution, and the trade-offs we made to deliver a working prototype in a single week.',
    content: `<p>Seven days is not a lot of time. Here is how we scoped ruthlessly, automated the boring parts, and focused on the experience that mattered.</p><ul><li>Day 1-2: Architecture + Strapi models</li><li>Day 3-4: Frontend scaffolding with Tailwind UI components</li><li>Day 5-6: Content polish + QA</li><li>Day 7: Demo prep</li></ul>`,
    category: 'founder-notes',
    tags: ['product', 'nextjs'],
    featured: false,
    readTime: 6,
  },
  {
    title: 'Lessons Learned from our First Community AMA',
    slug: 'lessons-learned-from-our-first-community-ama',
    excerpt:
      'The top questions from our AMA plus the roadmap items we pulled directly from the conversation.',
    content: `<p>Community feedback is our superpower. During the AMA we heard loud and clear that folks wanted better documentation, more screenshots, and a public roadmap.</p><p>We are committing to publishing monthly AMA recaps right here on the blog.</p>`,
    category: 'learning',
    tags: ['community', 'launch'],
    featured: false,
    readTime: 5,
  },
];

const ensureSeed = async (
  strapi: StrapiInstance,
  uid: any,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
) => {
  const existing = await strapi.entityService.findMany(uid, {
    filters: where,
    limit: 1,
  });

  if (existing.length > 0) {
    return existing[0];
  }

  return strapi.entityService.create(uid, { data });
};

const seedContent = async (strapi: StrapiInstance) => {
  const [existingPostsCount] = await Promise.all([
    strapi.entityService.count('api::blog-post.blog-post'),
  ]);

  if (existingPostsCount > 0) {
    return;
  }

  const categories = await Promise.all(
    CATEGORY_SEED.map((category) =>
      ensureSeed(strapi, 'api::category.category', { slug: category.slug }, category),
    ),
  );

  const tags = await Promise.all(
    TAG_SEED.map((tag) => ensureSeed(strapi, 'api::tag.tag', { slug: tag.slug }, tag)),
  );

  const findCategoryId = (slug: string) => {
    const match = categories.find((category) => category.slug === slug);

    if (!match) {
      throw new Error(`Missing seed category ${slug}`);
    }

    return match.id;
  };

  const findTagIds = (slugs: string[]) => {
    const matched = tags.filter((tag) => slugs.includes(tag.slug));

    if (matched.length === 0) {
      throw new Error(`Missing tags for post seed: ${slugs.join(', ')}`);
    }

    return matched.map((tag) => tag.id);
  };

  await Promise.all(
    POST_SEED.map((post) =>
      ensureSeed(
        strapi,
        'api::blog-post.blog-post',
        { slug: post.slug },
        {
          ...post,
          category: findCategoryId(post.category),
          tags: findTagIds(post.tags),
          publishedAt: new Date().toISOString(),
        },
      ),
    ),
  );
};

const setPublicPermissions = async (strapi: StrapiInstance) => {
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
    populate: ['permissions'],
  });

  if (!publicRole) {
    return;
  }

  const actions = [
    'api::blog-post.blog-post.find',
    'api::blog-post.blog-post.findOne',
    'api::category.category.find',
    'api::category.category.findOne',
    'api::tag.tag.find',
    'api::tag.tag.findOne',
  ];

  const permissionQuery = strapi.db.query('plugin::users-permissions.permission');

  await Promise.all(
    actions.map(async (action) => {
      const existing = await permissionQuery.findOne({
        where: {
          action,
          role: publicRole.id,
        },
      });

      if (existing) {
        await permissionQuery.update({
          where: { id: existing.id },
          data: { enabled: true },
        });
        return;
      }

      await permissionQuery.create({
        data: {
          action,
          role: publicRole.id,
          enabled: true,
        },
      });
    }),
  );
};

export default {
  register() { },
  async bootstrap({ strapi }: { strapi: StrapiInstance }) {
    await seedContent(strapi);
    await setPublicPermissions(strapi);
  },
};
