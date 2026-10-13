import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SelectField, TextArea, TextField, Toggle } from '../../components/ui/Controls.jsx';
import Button from '../../components/ui/Button.jsx';
import { CATEGORIES, DIFFICULTIES, GROUP_LABELS } from '../../lib/constants.js';

const GROUP_OPTIONS = Object.entries(GROUP_LABELS).map(([value, label]) => ({ value, label }));

/** Test-case types an admin can author without writing measurement scripts. */
const TEST_TYPES = [
  { value: 'html-selector', label: 'HTML — element/selector exists' },
  { value: 'html-text', label: 'HTML — text content' },
  { value: 'html-count', label: 'HTML — element count' },
  { value: 'css-declaration', label: 'CSS — declaration value' },
  { value: 'css-media', label: 'CSS — responsive media query' },
  { value: 'css-selector', label: 'CSS — selector exists' },
  { value: 'js-pattern', label: 'JavaScript — code pattern' },
  { value: 'code-quality', label: 'Code quality check' },
];

const QUALITY_CHECKS = [
  { value: 'has-meta-viewport', label: 'Has meta viewport' },
  { value: 'uses-semantic-tags', label: 'Uses semantic tags' },
  { value: 'no-inline-style', label: 'No inline styles' },
  { value: 'form-labels', label: 'Form inputs labelled' },
  { value: 'no-inline-event-handlers', label: 'No inline event handlers' },
  { value: 'css-no-important', label: 'No !important' },
  { value: 'css-transitions', label: 'Uses transitions' },
  { value: 'responsive-techniques', label: 'Uses responsive techniques' },
  { value: 'balanced-braces', label: 'Balanced braces' },
  { value: 'modern-syntax', label: 'Modern syntax (const/let)' },
  { value: 'no-console', label: 'No console statements' },
];

const OPERATORS = [
  { value: 'exists', label: 'exists' },
  { value: 'equals', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'regex', label: 'matches regex' },
  { value: 'min-count', label: 'at least N' },
  { value: 'one-of', label: 'one of (comma separated)' },
];

function createEmptyTest(index) {
  return {
    id: `test-${index + 1}`,
    name: '',
    group: 'html',
    type: 'html-selector',
    weight: 2,
    selector: '',
    property: '',
    operator: 'exists',
    value: '',
    pattern: '',
    check: 'no-inline-style',
    failureMessage: '',
  };
}

function newChallengeDraft() {
  return {
    title: '',
    description: '',
    category: 'HTML',
    difficulty: 'Easy',
    instructionsText: '',
    starterHTML: '',
    starterCSS: '',
    starterJS: '',
    hintsText: '',
    tagsText: '',
    maxAttempts: 3,
    timeLimit: 30,
    passingScore: 70,
    xp: 50,
    isPublished: true,
    testCases: [createEmptyTest(0)],
  };
}

/** Normalise API data → form draft (admins receive the full test definitions). */
function toDraft(challenge) {
  const tests = challenge.testCases ?? challenge.requiredTests ?? [];
  return {
    title: challenge.title ?? '',
    description: challenge.description ?? '',
    category: challenge.category ?? 'HTML',
    difficulty: challenge.difficulty ?? 'Easy',
    instructionsText: (challenge.instructions ?? []).join('\n'),
    starterHTML: challenge.starterHTML ?? '',
    starterCSS: challenge.starterCSS ?? '',
    starterJS: challenge.starterJS ?? '',
    hintsText: (challenge.hints ?? []).join('\n'),
    tagsText: (challenge.tags ?? []).join(', '),
    maxAttempts: challenge.maxAttempts ?? 3,
    timeLimit: challenge.timeLimit ?? 30,
    passingScore: challenge.passingScore ?? 70,
    xp: challenge.xp ?? 50,
    isPublished: challenge.isPublished ?? true,
    testCases: tests.map((test) => ({
      id: test.id,
      name: test.name,
      group: test.group,
      type: test.kind === 'measure' || test.measurement ? 'measure' : test.type ?? 'html-selector',
      weight: test.weight ?? 1,
      selector: test.selector ?? '',
      property: test.property ?? '',
      operator: test.operator ?? 'exists',
      value: test.value ?? '',
      pattern: test.pattern ?? '',
      check: test.check ?? 'no-inline-style',
      failureMessage: test.failureMessage ?? '',
      script: test.script ?? '',
      readOnly: test.kind === 'measure' || test.measurement,
    })),
  };
}

/** Turn the draft into the API payload. */
export function draftToPayload(draft) {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category,
    difficulty: draft.difficulty,
    instructions: draft.instructionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    starterHTML: draft.starterHTML,
    starterCSS: draft.starterCSS,
    starterJS: draft.starterJS,
    hints: draft.hintsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    tags: draft.tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    maxAttempts: Number(draft.maxAttempts),
    timeLimit: Number(draft.timeLimit),
    passingScore: Number(draft.passingScore),
    xp: Number(draft.xp),
    isPublished: Boolean(draft.isPublished),
    testCases: draft.testCases.map((test) => ({
      id: test.id.trim(),
      name: test.name.trim() || test.id.trim(),
      group: test.group,
      type: test.type === 'measure' ? 'measure' : test.type,
      weight: Number(test.weight) || 1,
      selector: test.type === 'measure' ? undefined : test.selector || undefined,
      property: test.property || undefined,
      operator: test.operator || 'exists',
      // Media checks compare a numeric viewport width; everything else is text.
      value:
        test.value === '' || test.value === null
          ? null
          : test.type === 'css-media' || test.type === 'html-count'
            ? Number(test.value) || null
            : test.value,
      pattern: test.pattern || undefined,
      check: test.type === 'code-quality' ? test.check : undefined,
      failureMessage: test.failureMessage || undefined,
      ...(test.type === 'measure' ? { script: test.script ?? '' } : {}),
    })),
  };
}

function TestCaseRow({ test, index, onChange, onRemove, canRemove }) {
  const set = (patch) => onChange({ ...test, ...patch });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Test {index + 1}</p>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
          aria-label={`Remove test ${index + 1}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField label="ID" value={test.id} onChange={(event) => set({ id: event.target.value })} placeholder="hero-heading" />
        <TextField label="Name" value={test.name} onChange={(event) => set({ name: event.target.value })} placeholder="Heading exists" />
        <SelectField label="Group" value={test.group} options={GROUP_OPTIONS} onChange={(event) => set({ group: event.target.value })} />
        <TextField
          label="Weight"
          type="number"
          min="0.1"
          step="0.5"
          value={test.weight}
          onChange={(event) => set({ weight: event.target.value })}
        />
      </div>

      {test.readOnly ? (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextField label="Behaviour check" value={test.name} readOnly />
            <TextField label="Group" value={GROUP_LABELS[test.group] ?? test.group} readOnly />
          </div>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-ink-500">
            This check is measured in the browser sandbox. Its script is preserved as-is, and its weight can be tuned above.
          </p>
        </>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField label="Type" value={test.type} options={TEST_TYPES} onChange={(event) => set({ type: event.target.value })} />

            {test.type !== 'code-quality' ? (
              <TextField
                label="Selector"
                value={test.selector}
                onChange={(event) => set({ selector: event.target.value })}
                placeholder=".hero h1"
              />
            ) : (
              <SelectField label="Check" value={test.check} options={QUALITY_CHECKS} onChange={(event) => set({ check: event.target.value })} />
            )}

            {['css-declaration', 'css-media'].includes(test.type) ? (
              <TextField
                label="Property"
                value={test.property}
                onChange={(event) => set({ property: event.target.value })}
                placeholder={test.type === 'css-media' ? 'padding' : 'display'}
              />
            ) : null}

            {test.type !== 'code-quality' ? (
              <SelectField label="Operator" value={test.operator} options={OPERATORS} onChange={(event) => set({ operator: event.target.value })} />
            ) : null}

            {test.type === 'css-media' ? (
              <TextField
                label="Max width (px)"
                type="number"
                value={test.value}
                onChange={(event) => set({ value: event.target.value })}
                placeholder="768"
              />
            ) : ['equals', 'contains', 'min-count', 'one-of'].includes(test.operator) ? (
              <TextField label="Value" value={test.value} onChange={(event) => set({ value: event.target.value })} />
            ) : test.operator === 'regex' ? (
              <TextField label="Pattern" value={test.pattern} onChange={(event) => set({ pattern: event.target.value })} placeholder="flex|grid" />
            ) : null}
          </div>

          <TextField
            className="mt-3"
            label="Failure message"
            value={test.failureMessage}
            onChange={(event) => set({ failureMessage: event.target.value })}
            placeholder="Add a heading with class “hero-title”."
          />
        </>
      )}

    </div>
  );
}

/** Full challenge authoring form (create + edit). */
export function ChallengeForm({ initialChallenge = null, onSubmit, onCancel, submitting, submitLabel = 'Save challenge' }) {
  const [draft, setDraft] = useState(() => (initialChallenge ? toDraft(initialChallenge) : newChallengeDraft()));
  const [errors, setErrors] = useState({});

  const set = (patch) => setDraft((current) => ({ ...current, ...patch }));

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (draft.title.trim().length < 4) nextErrors.title = 'Give the challenge a clear title.';
    if (draft.description.trim().length < 10) nextErrors.description = 'Describe what to build in at least 10 characters.';
    if (!draft.instructionsText.trim()) nextErrors.instructionsText = 'Add at least one requirement.';
    if (!draft.testCases.length) nextErrors.testCases = 'Add at least one test case.';
    const duplicateIds = draft.testCases.map((test) => test.id.trim()).filter((id, index, list) => id && list.indexOf(id) !== index);
    if (duplicateIds.length) nextErrors.testCases = `Duplicate test id: ${duplicateIds[0]}`;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    await onSubmit(draftToPayload(draft), draft);
  };

  return (
    <form className="space-y-6" onSubmit={submit} noValidate>
      <div className="grid gap-4 lg:grid-cols-3">
        <TextField
          className="lg:col-span-2"
          label="Title"
          value={draft.title}
          error={errors.title}
          onChange={(event) => set({ title: event.target.value })}
          placeholder="Responsive Pricing Table"
        />
        <SelectField label="Category" value={draft.category} options={CATEGORIES.map((category) => ({ value: category, label: category }))} onChange={(event) => set({ category: event.target.value })} />
      </div>

      <TextArea
        label="Description"
        rows={2}
        value={draft.description}
        error={errors.description}
        onChange={(event) => set({ description: event.target.value })}
        placeholder="Build a pricing table that stays readable from mobile to desktop."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SelectField
          label="Difficulty"
          value={draft.difficulty}
          options={DIFFICULTIES.map((difficulty) => ({ value: difficulty, label: difficulty }))}
          onChange={(event) => set({ difficulty: event.target.value })}
        />
        <TextField label="XP" type="number" min="10" max="500" value={draft.xp} onChange={(event) => set({ xp: event.target.value })} />
        <TextField label="Max attempts" type="number" min="1" max="10" value={draft.maxAttempts} onChange={(event) => set({ maxAttempts: event.target.value })} />
        <TextField label="Time limit (min)" type="number" min="5" max="240" value={draft.timeLimit} onChange={(event) => set({ timeLimit: event.target.value })} />
        <TextField label="Passing score" type="number" min="0" max="100" value={draft.passingScore} onChange={(event) => set({ passingScore: event.target.value })} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TextArea
          label="Requirements (one per line)"
          rows={5}
          value={draft.instructionsText}
          error={errors.instructionsText}
          onChange={(event) => set({ instructionsText: event.target.value })}
          placeholder={'Use a <table> or grid layout\nThree pricing tiers with prices\nHighlight the recommended tier'}
        />
        <div className="space-y-4">
          <TextArea
            label="Hints (one per line)"
            rows={3}
            value={draft.hintsText}
            onChange={(event) => set({ hintsText: event.target.value })}
            placeholder="CSS grid handles equal-height columns."
          />
          <TextField
            label="Tags"
            value={draft.tagsText}
            onChange={(event) => set({ tagsText: event.target.value })}
            placeholder="layout, grid, responsive"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <TextArea
          label="Starter HTML"
          rows={7}
          className="font-mono"
          value={draft.starterHTML}
          onChange={(event) => set({ starterHTML: event.target.value })}
        />
        <TextArea
          label="Starter CSS"
          rows={7}
          className="font-mono"
          value={draft.starterCSS}
          onChange={(event) => set({ starterCSS: event.target.value })}
        />
        <TextArea
          label="Starter JavaScript"
          rows={7}
          className="font-mono"
          value={draft.starterJS}
          onChange={(event) => set({ starterJS: event.target.value })}
        />
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink-800">Test cases</h3>
            <p className="text-xs text-ink-500">Each group's points are distributed across its tests by weight.</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={Plus}
            onClick={() => set({ testCases: [...draft.testCases, createEmptyTest(draft.testCases.length)] })}
          >
            Add test
          </Button>
        </div>

        {errors.testCases ? <p className="mb-3 text-xs text-rose-600">{errors.testCases}</p> : null}

        <div className="space-y-3">
          {draft.testCases.map((test, index) => (
            <TestCaseRow
              key={`${test.id}-${index}`}
              test={test}
              index={index}
              canRemove={draft.testCases.length > 1}
              onChange={(next) => set({ testCases: draft.testCases.map((entry, i) => (i === index ? next : entry)) })}
              onRemove={() => set({ testCases: draft.testCases.filter((_, i) => i !== index) })}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
        <Toggle
          id="is-published"
          checked={draft.isPublished}
          onChange={(value) => set({ isPublished: value })}
          label="Published"
          description="Published challenges appear in the member catalogue."
        />
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default ChallengeForm;
