export function createPreviewDocument({ htmlCode, cssCode, jsCode }) {
  // This entire document runs only inside an opaque-origin, allow-scripts-only iframe.
  const policy =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; font-src 'none'; media-src 'none'; frame-src 'none'; object-src 'none'; worker-src 'none'; form-action 'none'; base-uri 'none';";
  const css = cssCode.replace(/<\/style/gi, "<\\/style");
  const js = jsCode.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui,sans-serif; margin:16px;} ${css}</style></head><body>${htmlCode}<script type="module">${js}</script></body></html>`;
}
