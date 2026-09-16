export default function handler(req, res) {
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const baseUrl = productionHost
    ? `https://${productionHost}`
    : "http://localhost:5173";
  const today = new Date().toISOString().split("T")[0];

  const urls = [
    { loc: "/", priority: "1.0", changefreq: "weekly" },
    { loc: "/community", priority: "0.8", changefreq: "monthly" },
    { loc: "/about", priority: "0.7", changefreq: "monthly" },
    { loc: "/select-department", priority: "0.8", changefreq: "monthly" },
    { loc: "/staff", priority: "0.7", changefreq: "monthly" },
  ];

  const urlsXml = urls
    .map(
      (url) => `  <url>
    <loc>${baseUrl}${url.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
    )
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.status(200).send(sitemap);
}
