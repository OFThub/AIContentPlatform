/**
 * Loading spinner.
 *
 * The spin is drawn by giving a circle a single visible edge, so
 * `rounded-full` + `border-b-2` is the mechanism, not a styling accident:
 * drop either class and there is nothing left to see rotating. Design review
 * flags that pair as a border clashing with a radius, which is why every
 * spinner in the app lives here -- one component to waive instead of ten
 * call sites.
 */
const SIZES = {
  sm: 'h-5 w-5',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const TONES = {
  primary: 'border-primary-600',
  inverse: 'border-white',
};

export default function Spinner({ size = 'lg', tone = 'primary', className = '' }) {
  const dimension = SIZES[size] || SIZES.lg;
  const colour = TONES[tone] || TONES.primary;

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-b-2 ${dimension} ${colour} ${className}`}
    />
  );
}
