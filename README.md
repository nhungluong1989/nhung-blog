# Nhung Luong — technical blog

A fast, dark-themed technical blog built with **Astro**, with a **Keystatic** admin
so you can write and edit posts through a UI. Posts are stored as `.mdx` files in
this repo, so you always own your content.

Features: homepage with recent posts, individual post pages, About page, tags,
dark theme with a green accent, code syntax highlighting + copy button,
reading-time estimates, SEO meta + Open Graph tags, sitemap, and RSS.

---

## 1. Run it locally

You need [Node.js](https://nodejs.org) 18+ installed.

```bash
npm install
npm run dev
```

- Your blog: <http://localhost:4321>
- The writing admin: <http://localhost:4321/keystatic>

In the admin you can create and edit posts. Because storage is set to `local`
(see `keystatic.config.tsx`), changes save straight to `.mdx` files in
`src/content/blog/` on your machine. Commit them with git to publish.

To build the production version locally:

```bash
npm run build
npm run preview
```

---

## 2. Push it to GitHub

1. Create a new **empty** repo on GitHub (no README) — e.g. `nhung-blog`.
2. In this folder, run:

```bash
git init
git add .
git commit -m "Initial commit: Astro blog with Keystatic"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/nhung-blog.git
git push -u origin main
```

---

## 3. Deploy on Vercel

1. Go to <https://vercel.com> and sign in with GitHub.
2. Click **Add New → Project**, then import your `nhung-blog` repo.
3. Vercel auto-detects Astro. Leave the defaults and click **Deploy**.
4. After ~1 minute you'll get a live URL like `nhung-blog.vercel.app`.

Every time you `git push`, Vercel redeploys automatically.

---

## 4. Connect your custom domain

You already bought your domain, so:

1. In your Vercel project, go to **Settings → Domains**.
2. Type your domain (e.g. `nhungluong.dev`) and click **Add**.
3. Vercel shows the DNS records to add. In your registrar (Cloudflare):
   - Open your domain → **DNS** → **Records**.
   - Add the record Vercel asks for (usually a `CNAME` for `www` and/or an
     `A` record for the root `@`). Set proxy status to **DNS only** (grey cloud)
     if Cloudflare offers it.
4. Wait a few minutes for DNS to propagate. Vercel will verify and issue HTTPS
   automatically.

Then update `site: 'https://nhungluong.dev'` in `astro.config.mjs` to your real
domain and push, so SEO, sitemap, and RSS use the correct URL.

---

## 5. Writing your first post

Locally, run `npm run dev`, open <http://localhost:4321/keystatic>, click
**Blog posts → New**, write, and save. Then:

```bash
git add .
git commit -m "New post"
git push
```

Vercel redeploys and your post goes live.

---

## 6. (Optional) Edit posts on the LIVE site through /keystatic

Right now `/keystatic` only works locally. To edit the deployed site through
`yourdomain.com/keystatic`, switch Keystatic to **GitHub storage**:

1. In `keystatic.config.tsx`, replace the `storage` block with:

```ts
storage: {
  kind: 'github',
  repo: 'YOUR-USERNAME/nhung-blog',
},
```

2. Visit `https://yourdomain.com/keystatic` once deployed — Keystatic walks you
   through installing a GitHub app that lets it commit posts back to your repo.
3. Follow Keystatic's GitHub setup guide for the environment variables Vercel
   needs: <https://keystatic.com/docs/github-mode>

Until you do this, the simplest workflow is: write locally in `/keystatic`,
commit, and push.

---

## Project structure

```
src/
  content/blog/      your posts (.mdx) — created/edited via /keystatic
  content.config.ts  blog schema (title, description, pubDate, tags)
  layouts/           BaseLayout (+ copy-code button)
  components/        Header, Footer, PostCard, BaseHead (SEO)
  pages/             index, about, blog/[...slug], tags, rss.xml
  styles/global.css  dark + green theme
keystatic.config.tsx the admin (collections + fields)
astro.config.mjs     integrations, site URL, Shiki theme
```

Change the theme colors near the top of `src/styles/global.css`
(`--accent` is the green).
