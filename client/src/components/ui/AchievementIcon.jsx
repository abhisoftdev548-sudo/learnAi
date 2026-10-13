import {
  Award,
  Braces,
  Brush,
  CalendarCheck,
  Crown,
  Flag,
  Flame,
  Gauge,
  Gem,
  Layers,
  Medal,
  Palette,
  Rocket,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';

const ICONS = {
  flag: Flag,
  sword: Target,
  trophy: Trophy,
  medal: Medal,
  crown: Crown,
  flame: Flame,
  fire: Flame,
  star: Star,
  sparkles: Sparkles,
  zap: Zap,
  rocket: Rocket,
  palette: Palette,
  brush: Brush,
  braces: Braces,
  layers: Layers,
  calendar: CalendarCheck,
  gauge: Gauge,
  gem: Gem,
  award: Award,
};

const TIERS = {
  bronze: 'from-amber-100 to-amber-50 text-amber-700 ring-amber-200',
  silver: 'from-slate-100 to-slate-50 text-slate-600 ring-slate-200',
  gold: 'from-yellow-100 to-amber-50 text-yellow-700 ring-yellow-200',
  platinum: 'from-brand-100 to-violet-50 text-brand-700 ring-brand-200',
};

export function AchievementIcon({ icon, tier = 'bronze', earned = true, size = 'md', className = '' }) {
  const Icon = ICONS[String(icon ?? '').toLowerCase()] ?? Award;
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-11 w-11',
    lg: 'h-14 w-14',
  };
  const iconSizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' };
  const tierStyle = TIERS[tier] ?? TIERS.bronze;

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl ring-1 ${
        earned ? `bg-gradient-to-br ${tierStyle}` : 'bg-slate-50 text-ink-400 ring-slate-200'
      } ${sizes[size]} ${className}`}
    >
      <Icon className={iconSizes[size]} />
    </span>
  );
}

export default AchievementIcon;
