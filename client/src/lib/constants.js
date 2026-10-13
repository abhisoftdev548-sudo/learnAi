/** Shared display constants (kept in sync with the backend enums). */

export const CATEGORIES = ['HTML', 'CSS', 'JavaScript'];

export const CATEGORY_STYLES = {
  HTML: {
    label: 'HTML',
    icon: 'FileCode2',
    chip: 'bg-orange-50 text-orange-700 border border-orange-100',
    dot: 'bg-orange-400',
    bar: 'bg-orange-400',
    accent: 'text-orange-600',
  },
  CSS: {
    label: 'CSS',
    icon: 'Palette',
    chip: 'bg-sky-50 text-sky-700 border border-sky-100',
    dot: 'bg-sky-400',
    bar: 'bg-sky-400',
    accent: 'text-sky-600',
  },
  JavaScript: {
    label: 'JavaScript',
    icon: 'Braces',
    chip: 'bg-amber-50 text-amber-700 border border-amber-100',
    dot: 'bg-amber-400',
    bar: 'bg-amber-400',
    accent: 'text-amber-600',
  },
};

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export const DIFFICULTY_STYLES = {
  Easy: { chip: 'bg-emerald-50 text-emerald-700 border border-emerald-100', bar: 'bg-emerald-500' },
  Medium: { chip: 'bg-amber-50 text-amber-700 border border-amber-100', bar: 'bg-amber-500' },
  Hard: { chip: 'bg-rose-50 text-rose-700 border border-rose-100', bar: 'bg-rose-500' },
};

export const GROUP_LABELS = {
  html: 'HTML Structure',
  css: 'CSS / Layout',
  functionality: 'Functionality',
  responsiveness: 'Responsiveness',
  codeQuality: 'Code Quality',
};

export const GROUP_MAX_POINTS = {
  html: 20,
  css: 25,
  functionality: 30,
  responsiveness: 15,
  codeQuality: 10,
};

export const STATUS_STYLES = {
  passed: { label: 'Passed', chip: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  failed: { label: 'Failed', chip: 'bg-rose-50 text-rose-700 border border-rose-100' },
};

export const LEADERBOARD_PERIODS = [
  { value: 'weekly', label: 'This week' },
  { value: 'monthly', label: 'This month' },
  { value: 'all-time', label: 'All time' },
];

export const ACTIVITY_LEVEL_STYLES = [
  'bg-slate-100',
  'bg-brand-100',
  'bg-brand-200',
  'bg-brand-400',
  'bg-brand-600',
];

export const EDITOR_THEMES = [
  { value: 'light', label: 'Light', monaco: 'learnai-light' },
  { value: 'dark', label: 'Dark', monaco: 'learnai-dark' },
];

export const STARTER_TEMPLATE = {
  HTML: '<!-- Build the structure here -->\n',
  CSS: '/* Style it here */\n',
  JavaScript: '// Add the behaviour here\n',
};
