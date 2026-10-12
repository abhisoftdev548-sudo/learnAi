import { describe, it, expect } from "vitest";
import {
  challengePayload,
  validateChallenge,
  cleanTest,
} from "./challengeForm.js";
import { createPreviewDocument } from "./preview.js";
import { metricValue, duration, initials } from "./format.js";
import { query } from "../services/api.js";
describe("frontend data contracts", () => {
  it("serializes filters and omits unset values without accepting path injection", () => {
    expect(
      query({ category: "CSS", difficulty: "", search: "a & b", page: 1 }),
    ).toBe("?category=CSS&search=a+%26+b&page=1");
  });
  it("converts form lines and numbers, stripping irrelevant Mongoose test defaults", () => {
    const result = challengePayload({
      instructions: "First\n\nSecond",
      hints: " A hint \n",
      maxAttempts: "3",
      timeLimit: "600",
      xp: "50",
      testCases: [
        {
          type: "js-call",
          group: "functionality",
          label: "Click",
          callee: "addEventListener",
          minCount: 1,
          selector: "unused",
        },
      ],
    });
    expect(result.instructions).toEqual(["First", "Second"]);
    expect(result.hints).toEqual(["A hint"]);
    expect(result.maxAttempts).toBe(3);
    expect(result.testCases[0]).toEqual({
      type: "js-call",
      group: "functionality",
      label: "Click",
      callee: "addEventListener",
    });
  });
  it("retains empty attribute values but removes empty optional media conditions", () => {
    expect(
      cleanTest({
        type: "html-attribute",
        label: "Attribute",
        group: "quality",
        selector: "input",
        attribute: "required",
        expected: "",
      }).expected,
    ).toBe("");
    expect(
      cleanTest({
        type: "css-declaration",
        label: "Layout",
        group: "layout",
        selector: ".card",
        property: "display",
        expected: "flex",
        media: "",
      }),
    ).not.toHaveProperty("media");
  });
  it("validates missing instructions, malformed calls and oversized starter code", () => {
    const data = {
      title: "Title",
      description: "Description",
      instructions: ["Do something"],
      hints: [],
      starterHTML: "",
      starterCSS: "",
      starterJS: "",
      testCases: [{ type: "js-call", label: "Call", callee: "x()" }],
    };
    expect(validateChallenge(data)).toContain("static call name");
    expect(validateChallenge({ ...data, instructions: [] })).toContain(
      "requirement lines",
    );
    expect(
      validateChallenge({ ...data, starterJS: "a".repeat(50001) }),
    ).toContain("50,000");
  });
  it("builds a network-restricted iframe document, escaping source-closing tags", () => {
    const doc = createPreviewDocument({
      htmlCode: "<h1>Hi</h1>",
      cssCode: "/* </style> */",
      jsCode: 'console.log("</script>")',
    });
    expect(doc).toContain("connect-src 'none'");
    expect(doc).toContain("form-action 'none'");
    expect(doc).toContain("<h1>Hi</h1>");
    expect(doc).toContain("<\\/script>");
    expect(doc).toContain("<\\/style>");
    expect(doc).not.toContain("allow-same-origin");
  });
  it("formats metrics without inventing values and reads achievement counters", () => {
    expect(metricValue({ categorySolved: { CSS: 3 } }, "CSS")).toBe(3);
    expect(duration(125)).toBe("2m 5s");
    expect(initials("Test Developer")).toBe("TD");
  });
});
