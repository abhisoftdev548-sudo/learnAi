import mongoose from 'mongoose';
import {
  CATEGORIES,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_PASSING_SCORE,
  DEFAULT_TIME_LIMIT_MINUTES,
  DIFFICULTIES,
  MAX_ATTEMPTS_LIMIT,
  MAX_TIME_LIMIT,
  MIN_ATTEMPTS,
  MIN_TIME_LIMIT,
  SCORING_GROUP_KEYS,
  TEST_CASE_KINDS,
  TEST_CASE_TYPES,
  XP_BY_DIFFICULTY,
} from '../config/constants.js';

/**
 * Test cases are declarative so they can be evaluated deterministically.
 *
 * kind: 'static'  -> judged on the server from the submitted source (no code
 *                    execution at all: HTML/CSS/JS token analysis).
 * kind: 'measure' -> the client sandboxed iframe reports raw measurements, the
 *                    server judges them against `checks`.
 */
const testCaseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    group: { type: String, enum: SCORING_GROUP_KEYS, required: true },
    weight: { type: Number, default: 1, min: 0.1, max: 20 },
    kind: { type: String, enum: TEST_CASE_KINDS, default: 'static' },
    type: { type: String, enum: TEST_CASE_TYPES, required: true },
    description: { type: String, default: '' },
    failureMessage: { type: String, default: '' },

    // static assertions
    selector: { type: String, default: '' },
    property: { type: String, default: '' },
    attribute: { type: String, default: '' },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    operator: {
      type: String,
      enum: ['exists', 'not-exists', 'equals', 'not-equals', 'contains', 'not-contains', 'regex', 'min-count', 'max-count', 'gte', 'lte', 'one-of', 'any-of', 'media-present'],
      default: 'exists',
    },
    count: { type: Number, default: null },
    pattern: { type: String, default: '' },
    flags: { type: String, default: '' },
    // Which representation of the source a pattern test runs against:
    //  raw    -> exactly what the user submitted
    //  code   -> comments stripped
    //  masked -> comments, strings and regex literals stripped (pure code)
    scope: { type: String, enum: ['raw', 'code', 'masked'], default: 'code' },
    // Named check for `code-quality` tests (e.g. 'no-var', 'semicolons').
    check: { type: String, default: '' },
    // Which submitted file a check applies to for tests where it is ambiguous.
    target: { type: String, enum: ['html', 'css', 'js', 'auto'], default: 'auto' },

    // sandbox measurement
    script: { type: String, default: '' },
    timeoutMs: { type: Number, default: 3000, min: 250, max: 10000 },
    viewport: {
      width: { type: Number, default: null },
      height: { type: Number, default: null },
    },
    checks: {
      type: [
        new mongoose.Schema(
          {
            path: { type: String, required: true },
            op: {
              type: String,
              enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'not-contains', 'regex', 'in', 'truthy', 'changed-by', 'one-of'],
              required: true,
            },
            value: { type: mongoose.Schema.Types.Mixed, default: null },
            comparePath: { type: String, default: '' },
            tolerance: { type: Number, default: 0 },
            message: { type: String, default: '' },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    requires: { type: [String], default: [] },
  },
  { _id: false },
);

const challengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: [true, 'Description is required'], maxlength: 600 },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    difficulty: { type: String, enum: DIFFICULTIES, required: true, index: true },
    instructions: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one instruction/requirement is required',
      },
    },

    starterHTML: { type: String, default: '' },
    starterCSS: { type: String, default: '' },
    starterJS: { type: String, default: '' },

    testCases: {
      type: [testCaseSchema],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one test case is required',
      },
    },

    maxAttempts: { type: Number, default: DEFAULT_MAX_ATTEMPTS, min: MIN_ATTEMPTS, max: MAX_ATTEMPTS_LIMIT },
    timeLimit: { type: Number, default: DEFAULT_TIME_LIMIT_MINUTES, min: MIN_TIME_LIMIT, max: MAX_TIME_LIMIT },
    xp: { type: Number, default: 50, min: 10, max: 500 },
    passingScore: { type: Number, default: DEFAULT_PASSING_SCORE, min: 0, max: 100 },
    hints: { type: [String], default: [] },
    tags: { type: [String], default: [] },

    previewLanguage: { type: String, enum: ['html', 'css', 'javascript'], default: null },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        ret.id = ret._id?.toString();
        delete ret._id;
        return ret;
      },
    },
  },
);

challengeSchema.index({ category: 1, difficulty: 1, order: 1 });
challengeSchema.index({ title: 'text', description: 'text', tags: 'text' });

challengeSchema.virtual('totalTestWeight').get(function totalTestWeight() {
  return (this.testCases ?? []).reduce((sum, test) => sum + (test.weight ?? 1), 0);
});

challengeSchema.virtual('testCount').get(function testCount() {
  return (this.testCases ?? []).length;
});

challengeSchema.methods.defaultXp = function defaultXp() {
  return XP_BY_DIFFICULTY[this.difficulty] ?? 50;
};

/** List/summary payload (never includes the full test case or runtime specs). */
challengeSchema.methods.toSummaryJSON = function toSummaryJSON({ progress = null } = {}) {
  return {
    id: String(this._id),
    title: this.title,
    slug: this.slug,
    description: this.description,
    category: this.category,
    difficulty: this.difficulty,
    xp: this.xp,
    timeLimit: this.timeLimit,
    maxAttempts: this.maxAttempts,
    passingScore: this.passingScore,
    hintsCount: this.hints?.length ?? 0,
    tags: this.tags,
    order: this.order,
    isPublished: this.isPublished,
    testCount: this.testCount,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    progress,
  };
};

/**
 * Workspace payload. `requiredTests` only exposes test metadata (name, group,
 * weight) — never the assertions themselves, so the client cannot trivially
 * hard-code expected values.
 */
challengeSchema.methods.toDetailJSON = function toDetailJSON({ includeStarter = true } = {}) {
  return {
    ...this.toSummaryJSON(),
    instructions: this.instructions,
    starterHTML: includeStarter ? this.starterHTML : '',
    starterCSS: includeStarter ? this.starterCSS : '',
    starterJS: includeStarter ? this.starterJS : '',
    hints: this.hints,
    previewLanguage: this.previewLanguage,
    createdBy: this.createdBy,
    requiredTests: (this.testCases ?? []).map((test) => ({
      id: test.id,
      name: test.name,
      group: test.group,
      weight: test.weight,
      kind: test.kind,
      description: test.description,
      measurement: test.kind === 'measure',
    })),
    runtimeSpec: {
      viewport: { width: 1024, height: 768 },
      measurements: (this.testCases ?? [])
        .filter((test) => test.kind === 'measure')
        .map((test) => ({
          id: test.id,
          name: test.name,
          group: test.group,
          script: test.script,
          timeoutMs: test.timeoutMs,
          viewport: { width: test.viewport?.width ?? null, height: test.viewport?.height ?? null },
        })),
    },
  };
};

/** Full payload for admins (includes the assertions). */
challengeSchema.methods.toAdminJSON = function toAdminJSON() {
  return {
    ...this.toDetailJSON(),
    testCases: this.testCases,
  };
};

const Challenge = mongoose.models.Challenge ?? mongoose.model('Challenge', challengeSchema);

export default Challenge;
