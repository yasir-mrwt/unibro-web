export default function handler(_req, res) {
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const lines = ["User-agent: *", "Allow: /"];
  if (productionHost)
    lines.push(`Sitemap: https://${productionHost}/sitemap.xml`);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.status(200).send(`${lines.join("\n")}\n`);
}
