import { formatValue } from './format.js';

export default function MacroCard({ label, value, unit, tone, description }) {
  return (
    <div className={`macro-card macro-card--${tone}`}>
      <div className="macro-card__top">
        <span className="macro-card__label">{label}</span>
        <span className="macro-card__dot" aria-hidden="true" />
      </div>
      <div className="macro-card__value">
        {formatValue(value)} <span>{unit}</span>
      </div>
      <div className="macro-card__description">{description}</div>
    </div>
  );
}
