import { defineConfig, devices } from "@playwright/test";
// The portable Chromium binary is optional and only used in restricted Linux CI.
let launchOptions = {};
if (process.env.PORTABLE_CHROMIUM === "1") {
  const { default: binary, inflate } = await import("@sparticuz/chromium");
  await inflate("node_modules/@sparticuz/chromium/bin/al2023.tar.br");
  launchOptions = {
    executablePath: await binary.executablePath(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    env: { ...process.env, LD_LIBRARY_PATH: "/tmp/al2023/lib" },
  };
}
export default defineConfig({
  testDir: "./frontend-tests",
  testMatch: "**/*.spec.js",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: "npm run dev:client",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
