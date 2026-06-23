import { useNavigate } from 'react-router-dom';
import type { LCApplication } from '../../types/lc';

const STEPS = [
  'Setup & Parties',
  'Goods & Docs',
  'Payment & Charges',
  'Pre-Validation',
  'Review & Submit',
];

interface StepsBarProps {
  lc: LCApplication;
  current: number;
}

export function StepsBar({ lc, current }: StepsBarProps) {
  const navigate = useNavigate();

  return (
    <div className="steps-bar">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = lc.currentStep > step;
        const active = current === step;
        const reachable = lc.currentStep >= step;
        return (
          <div
            key={step}
            className={`step-item${active ? ' active' : ''}${done ? ' done' : ''}${!reachable ? ' locked' : ''}`}
            onClick={() => reachable && navigate(`/lc/${lc.id}/step/${step}`)}
          >
            <div className="step-circle">
              {done ? '✓' : step}
            </div>
            <div className="step-label">{label}</div>
            {i < STEPS.length - 1 && <div className="step-connector" />}
          </div>
        );
      })}
    </div>
  );
}
