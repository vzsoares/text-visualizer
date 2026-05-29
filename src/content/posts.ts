/**
 * Blog content. Each entry is rendered client-side by the post page
 * (`src/pages/post.html`) for the `/blog/:slug` route (see `blogPost()` in `src/alpine.ts`).
 *
 * `body` is a trusted HTML string authored here (this template ships no Markdown
 * renderer) and is injected via Alpine's `x-html`, styled with
 * `@tailwindcss/typography`'s `prose`.
 */
export interface Post {
    slug: string;
    title: string;
    /** ISO date (YYYY-MM-DD). */
    date: string;
    excerpt: string;
    /** Trusted HTML body. */
    body: string;
}

export const posts: Post[] = [
    {
        slug: "lorem-ipsum-dolor",
        title: "Lorem Ipsum Dolor",
        date: "2024-01-15",
        excerpt:
            "An introduction to the timeless placeholder text and why it still shows up everywhere.",
        body: `<p>Lorem ipsum dolor sit amet, <strong>consectetur adipiscing elit</strong>. Sed do
eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea.</p>
<h2>Why placeholders endure</h2>
<p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
fugiat nulla pariatur. A few reasons it sticks around:</p>
<ul>
  <li>It is <em>content-neutral</em>, so it never distracts from layout.</li>
  <li>Everyone recognizes it instantly.</li>
  <li>It fills space at a realistic density.</li>
</ul>
<pre><code>function lorem(words) {
  return Array.from({ length: words }, () =&gt; "lorem").join(" ");
}</code></pre>
<blockquote>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia
deserunt mollit anim id est laborum.</blockquote>`,
    },
    {
        slug: "sed-do-eiusmod",
        title: "Sed Do Eiusmod",
        date: "2024-02-02",
        excerpt:
            "Notes on tempor incididunt and the quiet art of filling space gracefully.",
        body: `<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem
accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo
inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
<h2>Three rules</h2>
<ol>
  <li>Keep paragraphs short.</li>
  <li>Vary the sentence length.</li>
  <li>Never let the filler outshine the real thing.</li>
</ol>
<p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed
quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>`,
    },
    {
        slug: "ut-enim-ad-minim",
        title: "Ut Enim Ad Minim",
        date: "2024-03-10",
        excerpt:
            "A closing piece on veniam, quis nostrud, and shipping the placeholder.",
        body: `<p>At vero eos et accusamus et iusto odio dignissimos ducimus qui
blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas
molestias excepturi sint occaecati cupiditate non provident.</p>
<h2>Shipping it</h2>
<p>Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore,
cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod
maxime placeat facere possimus, omnis voluptas assumenda est.</p>`,
    },
];

/** Look up a post by slug (used by the `/blog/:slug` route). */
export function getPost(slug: string): Post | undefined {
    return posts.find((post) => post.slug === slug);
}
