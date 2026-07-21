import { config, fields, collection } from '@keystatic/core';

export default config({
  // 'local' lets you edit posts on your own machine at /keystatic with no login.
  // To edit the LIVE site through /keystatic, switch this to the GitHub storage
  // block shown in README.md (Step 6) after you connect the GitHub app.
  storage: {
    kind: 'local',
  },
  ui: {
    brand: { name: 'Nhung Luong' },
  },
  collections: {
    posts: collection({
      label: 'Blog posts',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['title', 'pubDate'],
      schema: {
        title: fields.slug({
          name: { label: 'Title' },
          slug: {
            label: 'URL slug',
            description: 'The part of the address after /blog/. Auto-filled from the title.',
          },
        }),
        description: fields.text({
          label: 'Description',
          description: 'A one-line summary shown on the homepage and in search results.',
          multiline: true,
        }),
        pubDate: fields.date({
          label: 'Publish date',
          defaultValue: { kind: 'today' },
        }),
        tags: fields.array(
          fields.select({
            label: 'Tag',
            options: [
              { label: 'Data engineering', value: 'data engineering' },
              { label: 'AI engineering', value: 'ai engineering' },
              { label: 'Data products', value: 'data products' },
            ],
            defaultValue: 'data engineering',
          }),
          {
            label: 'Tags',
            itemLabel: (props) => props.value,
          }
        ),
        content: fields.mdx({
          label: 'Body',
          description: 'Write your post here. Fenced code blocks get syntax highlighting.',
        }),
      },
    }),
  },
});
