import { Check } from 'lucide-react';

interface Loader3DProps {
  label: string;
  size?: 'default' | 'small';
  showOrbitDots?: boolean;
}

export function Loader3D({ label, size = 'default', showOrbitDots = false }: Loader3DProps) {
  const small = size === 'small';

  return (
    <div className="task-loader" role="status" aria-live="polite">
      <div className={`cube-scene${small ? ' small' : ''}`} aria-hidden="true">
        {showOrbitDots ? (
          <div className="cube-orbits">
            <span className="orbit-dot orbit-dot--one" />
            <span className="orbit-dot orbit-dot--two" />
            <span className="orbit-dot orbit-dot--three" />
          </div>
        ) : null}
        <div className="cube-bob">
          <div className="task-cube">
            <div className="cube-face cube-face--front"><Check strokeWidth={3.5} /></div>
            <div className="cube-face cube-face--back" />
            <div className="cube-face cube-face--right" />
            <div className="cube-face cube-face--left" />
            <div className="cube-face cube-face--top" />
            <div className="cube-face cube-face--bottom" />
          </div>
        </div>
      </div>
      <div className={`cube-shadow${small ? ' small' : ''}`} aria-hidden="true" />
      <p className="task-loader__label">
        {label}<span className="loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
      </p>
    </div>
  );
}
