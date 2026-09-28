# Deployment and search visibility

Run `npm run deploy` to generate the quote data and build the site into `dist/`.
Despite its name, this command only builds the site; your hosting service publishes it.

The production canonical URL is `https://literatureclock.netlify.app/`. Vite copies
`public/robots.txt` and `public/sitemap.xml` into the deployment. The home page
includes an accessible About section and WebApplication structured data.
Language and appearance query parameters remain app settings under the same
canonical page; they are not advertised as separately indexed translations.

After deployment, verify the URL-prefix property in Google Search Console, inspect
the home page using the live URL test, request indexing and submit `sitemap.xml`.
Indexing and rankings are determined by Google, not by the deployment itself.
If changing domains, update the canonical URL, social metadata, structured data,
robots sitemap URL and sitemap together, and redirect the old domain.
