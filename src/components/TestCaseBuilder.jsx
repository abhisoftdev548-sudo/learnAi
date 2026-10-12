import { Plus, Trash2 } from "lucide-react";
import { Button, Field } from "./UI";
import {
  newTest,
  testTypes,
  testGroups,
  nodeTypes,
} from "../utils/challengeForm";
export default function TestCaseBuilder({ tests, onChange, disabled }) {
  const update = (index, patch) =>
    onChange(
      tests.map((test, i) => (i === index ? { ...test, ...patch } : test)),
    );
  return (
    <div className="test-builder">
      {tests.map((test, index) => (
        <div className="test-builder-card" key={index}>
          <div className="test-builder-heading">
            <span>CHECK {String(index + 1).padStart(2, "0")}</span>
            <button
              type="button"
              className="icon-btn danger-icon"
              disabled={disabled}
              aria-label={`Remove test ${index + 1}`}
              onClick={() => onChange(tests.filter((_, i) => i !== index))}
            >
              <Trash2 size={15} />
            </button>
          </div>
          <Field label="Test label">
            <input
              required
              maxLength={200}
              value={test.label}
              placeholder="A semantic main heading exists"
              onChange={(e) => update(index, { label: e.target.value })}
            />
          </Field>
          <div className="form-grid">
            <Field label="Test type">
              <select
                value={test.type}
                onChange={(e) =>
                  update(index, {
                    type: e.target.value,
                    nodeType: nodeTypes[0],
                    minCount: 1,
                    expected: test.expected || "",
                  })
                }
              >
                {testTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </Field>
            <Field label="Scoring group">
              <select
                value={test.group}
                onChange={(e) => update(index, { group: e.target.value })}
              >
                {testGroups.map((group) => (
                  <option key={group}>{group}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="form-grid">
            {["html-selector", "html-attribute", "css-declaration"].includes(
              test.type,
            ) && (
              <Field label="Selector">
                <input
                  required
                  maxLength={200}
                  value={test.selector || ""}
                  placeholder={
                    test.type === "css-declaration" ? ".card" : "main h1"
                  }
                  onChange={(e) => update(index, { selector: e.target.value })}
                />
              </Field>
            )}
            {test.type === "html-selector" && (
              <Field label="Minimum matches">
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={test.minCount ?? 1}
                  onChange={(e) => update(index, { minCount: e.target.value })}
                />
              </Field>
            )}
            {test.type === "html-attribute" && (
              <Field label="Attribute">
                <input
                  required
                  maxLength={80}
                  value={test.attribute || ""}
                  placeholder="aria-label"
                  onChange={(e) => update(index, { attribute: e.target.value })}
                />
              </Field>
            )}
            {test.type === "css-declaration" && (
              <Field label="Property">
                <input
                  required
                  maxLength={80}
                  value={test.property || ""}
                  placeholder="display"
                  onChange={(e) => update(index, { property: e.target.value })}
                />
              </Field>
            )}
            {["html-attribute", "css-declaration"].includes(test.type) && (
              <Field label="Expected value">
                <input
                  required={test.type === "css-declaration"}
                  maxLength={test.type === "css-declaration" ? 200 : 500}
                  value={test.expected ?? ""}
                  placeholder={
                    test.type === "css-declaration" ? "flex" : "Main navigation"
                  }
                  onChange={(e) => update(index, { expected: e.target.value })}
                />
              </Field>
            )}
            {test.type === "css-declaration" && (
              <Field label="Media condition (optional)">
                <input
                  maxLength={200}
                  value={test.media || ""}
                  placeholder="(max-width: 600px)"
                  onChange={(e) => update(index, { media: e.target.value })}
                />
              </Field>
            )}
            {test.type === "js-node" && (
              <Field label="AST node type">
                <select
                  value={test.nodeType || nodeTypes[0]}
                  onChange={(e) => update(index, { nodeType: e.target.value })}
                >
                  {nodeTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </Field>
            )}
            {test.type === "js-call" && (
              <Field label="Function or method call">
                <input
                  required
                  maxLength={100}
                  value={test.callee || ""}
                  placeholder="document.createElement"
                  onChange={(e) => update(index, { callee: e.target.value })}
                />
              </Field>
            )}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || tests.length >= 50}
        onClick={() => onChange([...tests, newTest()])}
      >
        <Plus size={15} />
        Add test case
      </Button>
    </div>
  );
}
