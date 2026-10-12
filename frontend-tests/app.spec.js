import { test, expect } from "@playwright/test";
import { installContractFixtures, challenge, submission } from "./fixtures";
test("login and register are responsive, protect routes, and validate confirmation", async ({
  page,
}) => {
  const requests = await installContractFixtures(page, {
    authenticated: false,
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.evaluate(() => innerWidth),
  );
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.getByLabel("Full name").fill("Test Developer");
  await page.getByLabel("Username").fill("test_developer");
  await page.getByLabel("Email address").fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("secure-password");
  await page.getByLabel("Confirm password").fill("wrong-password");
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(page.getByRole("alert")).toContainText("passwords don’t match");
  expect(requests.some((r) => r.path === "/api/auth/register")).toBe(false);
  await page.getByLabel("Confirm password").fill("secure-password");
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome back, Test/ }),
  ).toBeVisible();
  expect(
    requests.find((r) => r.path === "/api/auth/register").body,
  ).not.toHaveProperty("confirm");
});
test("login posts credentials, loads dashboard, and logs out without localStorage auth", async ({
  page,
}) => {
  const requests = await installContractFixtures(page, {
    authenticated: false,
  });
  await page.goto("/login");
  await page.getByLabel("Email address").fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("secure-password");
  await page.getByRole("button", { name: "Sign in to your workspace" }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome back, Test/ }),
  ).toBeVisible();
  expect(requests.find((r) => r.path === "/api/auth/login").body).toEqual({
    email: "test@example.com",
    password: "secure-password",
  });
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByRole("button", { name: "User menu", exact: true }).click();
  await page
    .locator(".dropdown")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  expect(requests.some((r) => r.path === "/api/auth/logout")).toBe(true);
});
test("unavailable API and invalid credentials produce actionable errors", async ({
  page,
}) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ success: false, message: "Database unavailable" }),
    }),
  );
  await page.goto("/login");
  await expect(page.locator(".connection-note")).toBeVisible();
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        message: "Invalid email or password",
      }),
    }),
  );
  await page.getByLabel("Email address").fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in to your workspace" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Invalid email or password",
  );
});
test("dashboard, activity, profile and achievements use API contract data", async ({
  page,
}, testInfo) => {
  await installContractFixtures(page);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Welcome back, Test/ }),
  ).toBeVisible();
  await expect(
    page.locator('.calendar-cell[aria-label*="1 submissions"]'),
  ).toHaveCount(1);
  await page.screenshot({
    path: `test-results/dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "Test Developer", exact: true }),
  ).toBeVisible();
  await page.goto("/achievements");
  await expect(
    page.getByRole("heading", { name: "First Challenge", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".achievement-card.locked")).toContainText(
    "1 / 10",
  );
  await page.getByRole("button", { name: "In progress", exact: true }).click();
  await expect(page.locator(".achievement-card")).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("challenge filters and search query the server and show empty states", async ({
  page,
}) => {
  const requests = await installContractFixtures(page);
  await page.goto("/challenges");
  await expect(page.locator(".challenge-card")).toHaveCount(2);
  await page.getByRole("button", { name: "CSS", exact: true }).click();
  await expect(page.locator(".challenge-card")).toHaveCount(1);
  await expect(page.locator(".challenge-card")).toContainText(
    "Flexbox Fundamentals",
  );
  await page.getByLabel("Filter difficulty").selectOption("Hard");
  await expect(
    page.getByRole("heading", { name: "No challenges found" }),
  ).toBeVisible();
  expect(
    requests.some(
      (r) =>
        r.path === "/api/challenges" &&
        r.search.includes("category=CSS") &&
        r.search.includes("difficulty=Hard"),
    ),
  ).toBe(true);
  await page.getByLabel("Filter difficulty").selectOption("");
  await page
    .getByRole("button", { name: "All challenges", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Search challenge titles" })
    .fill("Semantic");
  await expect(page.locator(".challenge-card")).toHaveCount(1);
  await expect(page.locator(".challenge-card")).toContainText(
    "Semantic Profile Card",
  );
});
test("Monaco edits run only in a sandbox; submission shows authoritative response", async ({
  page,
}, testInfo) => {
  const requests = await installContractFixtures(page);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/challenges/${challenge._id}`);
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 30000 });
  await expect(
    page
      .frameLocator('iframe[title="Sandboxed challenge preview"]')
      .locator("h1"),
  ).toHaveText("Starter preview");
  await expect(page.locator("iframe")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press(
    (await page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.userAgent)))
      ? "Meta+A"
      : "Control+A",
  );
  await page.keyboard.insertText("<main><h1>Edited preview</h1></main>");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.frameLocator("iframe").locator("h1")).toHaveText(
    "Edited preview",
  );
  const frame = page.frames().find((f) => f.url() === "about:srcdoc");
  expect(
    await frame.evaluate(() => {
      try {
        return !!parent.document.body;
      } catch {
        return false;
      }
    }),
  ).toBe(false);
  expect(
    await frame.evaluate(() =>
      fetch("https://example.invalid/sandbox-test")
        .then(() => true)
        .catch(() => false),
    ),
  ).toBe(false);
  await page.getByRole("tab", { name: "script.js" }).click();
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press(
    (await page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.userAgent)))
      ? "Meta+A"
      : "Control+A",
  );
  await page.keyboard.insertText(
    'document.body.dataset.ran = "inside-sandbox";',
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.frameLocator("iframe").locator("body")).toHaveAttribute(
    "data-ran",
    "inside-sandbox",
  );
  expect(await page.evaluate(() => document.body.dataset.ran)).toBeUndefined();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".result-score")).toContainText("100");
  await expect(page.locator(".result-metrics")).toContainText("+80 XP");
  const submitted = requests.find(
    (r) => r.path === "/api/submissions" && r.method === "POST",
  ).body;
  expect(submitted.htmlCode).toBe("<main><h1>Edited preview</h1></main>");
  expect(submitted).not.toHaveProperty("score");
  await page.getByRole("button", { name: "Close dialog" }).last().click();
  await page.screenshot({
    path: `test-results/workspace-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    errors.filter((message) => !message.includes("ResizeObserver")),
  ).toEqual([]);
});
test("reset confirmation preserves or resets edits, and unsaved navigation is guarded", async ({
  page,
}) => {
  await installContractFixtures(page);
  await page.goto(`/challenges/${challenge._id}`);
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 30000 });
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press(
    (await page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.userAgent)))
      ? "Meta+A"
      : "Control+A",
  );
  await page.keyboard.insertText("<h1>Unsaved</h1>");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("starter code");
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page
    .getByRole("link", { name: "Back to challenges", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("unsaved code");
  await page.getByRole("button", { name: "Keep coding" }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: "Reset code", exact: true }).click();
  await page
    .getByRole("link", { name: "Back to challenges", exact: true })
    .click();
  await expect(page).toHaveURL(/\/challenges$/);
});
test("leaderboard periods and owner history are connected", async ({
  page,
}) => {
  const requests = await installContractFixtures(page);
  await page.goto("/leaderboard");
  await expect(page.locator(".my-row")).toContainText("Test Developer");
  await page.getByRole("button", { name: "This week" }).click();
  await expect(page.locator(".my-row")).toBeVisible();
  expect(
    requests.some(
      (r) =>
        r.path === "/api/leaderboard" && r.search.includes("period=weekly"),
    ),
  ).toBe(true);
  await page.goto("/history");
  await page
    .getByRole("link", { name: "Semantic Profile Card", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/history/${submission._id}`));
  await expect(
    page.getByRole("heading", { name: "Your test results" }),
  ).toBeVisible();
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 30000 });
});
test("settings saves only permitted profile fields", async ({ page }) => {
  const requests = await installContractFixtures(page);
  await page.goto("/settings");
  await page.getByLabel("Full name").fill("Updated Test Name");
  await page.getByLabel("Bio").fill("A new bio.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".toast")).toContainText("Changes saved");
  expect(
    requests.find((r) => r.path === "/api/users/me" && r.method === "PUT").body,
  ).toEqual({ name: "Updated Test Name", bio: "A new bio.", avatar: "" });
});
test("non-admin redirects away from admin APIs", async ({ page }) => {
  const requests = await installContractFixtures(page);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: /Welcome back, Test/ }),
  ).toBeVisible();
  expect(requests.some((r) => r.path.startsWith("/api/admin"))).toBe(false);
});
test("admin overview, users, monitoring and challenge create form work", async ({
  page,
}) => {
  const requests = await installContractFixtures(page, { admin: true });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "A space for your team to grow." }),
  ).toBeVisible();
  await page.goto("/admin/users");
  await expect(page.locator("tbody")).toContainText("test_developer");
  await page.goto("/admin/submissions");
  await expect(page.locator("tbody")).toContainText("Semantic Profile Card");
  await page.goto("/admin/challenges/new");
  await page.getByLabel("Challenge title").fill("Test API Challenge");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A description for the API.");
  await page.getByLabel("Requirements").fill("Add a main heading.");
  await page.getByLabel("Test label").fill("Heading exists");
  await page.getByLabel("Selector", { exact: true }).fill("h1");
  await page.getByRole("button", { name: "Publish challenge" }).click();
  await expect(page).toHaveURL(/\/admin\/challenges$/);
  const body = requests.find(
    (r) => r.path === "/api/admin/challenges" && r.method === "POST",
  ).body;
  expect(body.testCases).toEqual([
    {
      label: "Heading exists",
      type: "html-selector",
      group: "structure",
      selector: "h1",
      minCount: 1,
    },
  ]);
  expect(body.instructions).toEqual(["Add a main heading."]);
});
test("expired session returns to sign-in instead of showing stale private data", async ({
  page,
}) => {
  await installContractFixtures(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Welcome back, Test/ }),
  ).toBeVisible();
  await page.route("**/api/leaderboard*", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ success: false, message: "Unauthorized" }),
    }),
  );
  await page.goto("/leaderboard");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
});

test("mobile navigation is accessible and tablet pages have no horizontal page overflow", async ({
  page,
}, testInfo) => {
  await installContractFixtures(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Welcome back, Test/ }),
  ).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await expect(page.locator(".sidebar")).toHaveAttribute("inert", "");
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.locator(".sidebar")).not.toHaveAttribute("inert", "");
    await page
      .locator(".sidebar")
      .getByRole("link", { name: "History", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "A record of your progress." }),
    ).toBeVisible();
    await expect(page.locator(".sidebar")).toHaveAttribute("inert", "");
  }
  await page.setViewportSize({ width: 768, height: 1024 });
  for (const path of [
    "/challenges",
    "/profile",
    "/leaderboard",
    "/achievements",
    "/settings",
  ]) {
    await page.goto(path);
    await expect(page.locator(".main-content h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("admin challenge editing and archival call the real service contracts", async ({
  page,
}) => {
  const requests = await installContractFixtures(page, { admin: true });
  await page.goto(`/admin/challenges/${challenge._id}/edit`);
  await expect(page.getByLabel("Challenge title")).toHaveValue(challenge.title);
  await page.getByLabel("Challenge title").fill("Updated challenge");
  await page.getByRole("button", { name: "Save challenge" }).click();
  await expect(page).toHaveURL(/\/admin\/challenges$/);
  expect(
    requests.find(
      (r) =>
        r.path === `/api/admin/challenges/${challenge._id}` &&
        r.method === "PUT",
    ).body.title,
  ).toBe("Updated challenge");
  await page
    .getByRole("button", { name: `Archive ${challenge.title}` })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Existing submissions");
  await page
    .getByRole("button", { name: "Archive challenge", exact: true })
    .click();
  await expect(page.locator(".toast").last()).toContainText("archived");
  expect(
    requests.some(
      (r) =>
        r.path === `/api/admin/challenges/${challenge._id}` &&
        r.method === "DELETE",
    ),
  ).toBe(true);
});
