export const testTypes = [
  "html-selector",
  "html-attribute",
  "css-declaration",
  "js-node",
  "js-call",
];
export const testGroups = [
  "structure",
  "layout",
  "functionality",
  "responsive",
  "quality",
];
export const nodeTypes = [
  "FunctionDeclaration",
  "ArrowFunctionExpression",
  "IfStatement",
  "ReturnStatement",
  "VariableDeclaration",
  "UpdateExpression",
  "AssignmentExpression",
  "CallExpression",
];
export const newTest = () => ({
  label: "",
  type: "html-selector",
  group: "structure",
  selector: "",
  minCount: 1,
});
export function cleanTest(test) {
  const base = { label: test.label, type: test.type, group: test.group };
  const fields = {
    "html-selector": ["selector", "minCount"],
    "html-attribute": ["selector", "attribute", "expected"],
    "css-declaration": ["selector", "property", "expected", "media"],
    "js-node": ["nodeType"],
    "js-call": ["callee"],
  }[test.type];
  for (const key of fields || [])
    if (test[key] !== undefined && !(key === "media" && !test[key]))
      base[key] = key === "minCount" ? Number(test[key]) : test[key];
  return base;
}
export function challengePayload(form) {
  return {
    ...form,
    instructions: form.instructions
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    hints: form.hints
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    maxAttempts: Number(form.maxAttempts),
    timeLimit: Number(form.timeLimit),
    xp: Number(form.xp),
    testCases: form.testCases.map(cleanTest),
  };
}
export function validateChallenge(data) {
  if (!data.title.trim() || !data.description.trim())
    return "Give your challenge a title and description.";
  if (
    !data.instructions.length ||
    data.instructions.length > 30 ||
    data.instructions.some((s) => s.length > 1000)
  )
    return "Add 1–30 requirement lines, each at most 1,000 characters.";
  if (data.hints.length > 20 || data.hints.some((s) => s.length > 1000))
    return "Use at most 20 hints, each at most 1,000 characters.";
  if (!data.testCases.length || data.testCases.length > 50)
    return "Add between 1 and 50 deterministic test cases.";
  if (
    [data.starterHTML, data.starterCSS, data.starterJS].some(
      (s) => s.length > 50000,
    )
  )
    return "Starter files must be at most 50,000 characters each.";
  for (const [i, t] of data.testCases.entries()) {
    if (!t.label?.trim()) return `Test ${i + 1} needs a label.`;
    const required =
      {
        "html-selector": ["selector"],
        "html-attribute": ["selector", "attribute"],
        "css-declaration": ["selector", "property", "expected"],
        "js-node": ["nodeType"],
        "js-call": ["callee"],
      }[t.type] || [];
    if (required.some((key) => !t[key]?.trim()))
      return `Complete all required fields for test ${i + 1}.`;
    if (
      t.type === "js-call" &&
      !/^[a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)*$/.test(t.callee)
    )
      return `Test ${i + 1}: enter a static call name such as document.createElement.`;
  }
  return "";
}
