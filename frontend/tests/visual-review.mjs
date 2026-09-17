import { chromium } from "playwright";

const baseUrl = process.env.VISUAL_BASE_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true });
const findings = [];
const mockApi = process.env.VISUAL_MOCK_API === "1";

const emptyApiResponse = (url) => {
  const path = new URL(url).pathname;
  if (path === "/api/resources/admin/all") {
    return { resources: [], stats: { total: 0, pending: 0, approved: 0, rejected: 0 } };
  }
  if (path === "/api/users") return { users: [] };
  if (path.includes("/api/chat/messages/")) return { messages: [] };
  if (path.includes("/api/chat/read/")) return { success: true };
  if (path === "/api/resources/counts") return { counts: {} };
  if (path === "/api/resources") return { resources: {} };
  return { success: true };
};

const capture = async ({ name, path = "/", width, height, user, action }) => {
  const page = await browser.newPage({ viewport: { width, height } });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  if (mockApi) {
    await page.route("**/api/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyApiResponse(route.request().url())),
      }),
    );
  }
  if (user) {
    await page.addInitScript((storedUser) => {
      localStorage.setItem("user", JSON.stringify(storedUser));
      localStorage.setItem("token", "visual-review-token");
      if (storedUser.context) {
        localStorage.setItem("selectedDepartment", JSON.stringify(storedUser.context.department));
        localStorage.setItem("dashboardData", JSON.stringify(storedUser.context));
      }
    }, user);
  }
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  if (action) await action(page);
  await page.screenshot({
    path: `/tmp/${name}.png`,
    fullPage: !name.includes("auth"),
  });
  const dimensions = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    title: document.title,
  }));
  findings.push({
    name,
    ...dimensions,
    overflow: dimensions.scrollWidth > dimensions.width,
    consoleErrors: [...new Set(consoleErrors)].slice(0, 3),
  });
  await page.close();
};

const context = {
  department: { name: "Computer Science", abbreviation: "CS" },
  semester: 4,
};
const student = {
  fullName: "Visual Review",
  email: "review@example.test",
  role: "student",
  isVerified: true,
  context,
};

await capture({ name: "unibro-home-1440", width: 1440, height: 1000 });
await capture({ name: "unibro-home-1024", width: 1024, height: 900 });
await capture({ name: "unibro-home-430", width: 430, height: 900 });
await capture({ name: "unibro-home-375", width: 375, height: 812 });
await capture({
  name: "unibro-auth-1440",
  width: 1440,
  height: 1000,
  action: (page) => page.getByRole("button", { name: "Sign in" }).click(),
});
await capture({ name: "unibro-department-1024", path: "/select-department", width: 1024, height: 900, user: student });
await capture({ name: "unibro-semester-768", path: "/select-semester", width: 768, height: 900, user: student });
await capture({ name: "unibro-dashboard-1440", path: "/dashboard", width: 1440, height: 1000, user: student });
await capture({ name: "unibro-resources-430", path: "/resources", width: 430, height: 900, user: student });
await capture({ name: "unibro-community-1024", path: "/community", width: 1024, height: 900, user: student });
await capture({ name: "unibro-upload-768", path: "/upload-modal", width: 768, height: 900, user: student });
await capture({ name: "unibro-admin-1440", path: "/admin/dashboard", width: 1440, height: 1000, user: { ...student, role: "admin" } });

console.log(JSON.stringify(findings, null, 2));
await browser.close();
