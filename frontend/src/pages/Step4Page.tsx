import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLCStore } from '../store/lcStore';
import { StepsBar } from '../components/layout/StepsBar';
import type { MismatchResult, MismatchResolution } from '../types/lc';

const STATUS_PILL: Record<string, string> = {
  ok: 'pill-ok',
  err: 'pill-err',
  warn: 'pill-warn',
  pending: 'pill-info',
};

const STATUS_LABEL: Record<string, string> = {
  ok: 'Match',
  err: 'Mismatch',
  warn: 'Warning',
  pending: 'Pending',
};

interface FixDrawerProps {
  mismatch: MismatchResult;
  index: number;
  onClose: () => void;
  onSave: (index: number, resolution: MismatchResolution) => Promise<void>;
}

function FixDrawer({ mismatch, index, onClose, onSave }: FixDrawerProps) {
  const [action, setAction] = useState<MismatchResolution['action']>(
    mismatch.resolution?.action ?? 'USE_DOCUMENT_VALUE'
  );
  const [explanation, setExplanation] = useState(mismatch.resolution?.explanation ?? '');
  const [resolvedValue, setResolvedValue] = useState(mismatch.resolution?.resolvedValue ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(index, {
      action,
      explanation: explanation || undefined,
      resolvedValue: action === 'REPLACE_DOCUMENT' ? resolvedValue : undefined,
      resolvedAt: new Date().toISOString(),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fix-drawer">
      <div className="fix-drawer-header">
        <h3>Resolve Mismatch</h3>
        <button className="fix-drawer-close" onClick={onClose}>×</button>
      </div>
      <div className="fix-drawer-body">
        <div className="fix-field">
          <span className="fix-label">Field</span>
          <span className="fix-value">{mismatch.field}</span>
        </div>
        {mismatch.swiftTag && (
          <div className="fix-field">
            <span className="fix-label">SWIFT Tag</span>
            <span className="fix-value"><code>{mismatch.swiftTag}</code></span>
          </div>
        )}
        <div className="fix-field">
          <span className="fix-label">Form Value</span>
          <span className="fix-value">{mismatch.formValue}</span>
        </div>
        {mismatch.piValue && (
          <div className="fix-field">
            <span className="fix-label">Proforma Invoice</span>
            <span className="fix-value err-text">{mismatch.piValue}</span>
          </div>
        )}
        {mismatch.poValue && (
          <div className="fix-field">
            <span className="fix-label">Purchase Order</span>
            <span className="fix-value warn-text">{mismatch.poValue}</span>
          </div>
        )}

        <div className="fix-section-label">Resolution Action</div>

        {([
          ['USE_DOCUMENT_VALUE', 'Use document value — accept the PI/PO data as correct'],
          ['REPLACE_DOCUMENT', 'Replace document — keep LC value, request amended document from beneficiary'],
          ['KEEP_WITH_EXPLANATION', 'Keep LC value with explanation'],
        ] as const).map(([val, label]) => (
          <label key={val} className={`radio-card${action === val ? ' selected' : ''}`}>
            <input type="radio" name="action" value={val}
              checked={action === val} onChange={() => setAction(val)} />
            <span>{label}</span>
          </label>
        ))}

        {action === 'REPLACE_DOCUMENT' && (
          <div className="field-group" style={{ marginTop: 12 }}>
            <label className="field-label">Confirmed LC Value (for amendment request)</label>
            <input className="field-input" value={resolvedValue}
              onChange={e => setResolvedValue(e.target.value)} />
          </div>
        )}

        {action === 'KEEP_WITH_EXPLANATION' && (
          <div className="field-group" style={{ marginTop: 12 }}>
            <label className="field-label required">Explanation</label>
            <textarea className="field-input" rows={3} value={explanation}
              onChange={e => setExplanation(e.target.value)}
              placeholder="Explain why the LC value should be retained…" />
          </div>
        )}
      </div>
      <div className="fix-drawer-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Confirm Resolution'}
        </button>
      </div>
    </div>
  );
}

export function Step4Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentLC, loadLC, runMismatch, resolveMismatch, isSaving } = useLCStore();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!currentLC && id) loadLC(id);
  }, [id]);

  const mismatches = currentLC?.step4?.mismatches ?? [];
  const hasErrors = mismatches.some(m => m.status === 'err' && !m.resolution);
  const canProceed = mismatches.length > 0 && !hasErrors;

  if (!currentLC) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className={`page${selectedIndex !== null ? ' with-drawer' : ''}`}>
      <StepsBar lc={currentLC} current={4} />

      <div className="form-card">
        <div className="form-card-header">
          <div>
            <h2 className="form-card-title">Document Pre-Validation</h2>
            <p className="form-card-subtitle">
              Compare LC form data against uploaded Proforma Invoice and Purchase Order
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => runMismatch()} disabled={isSaving}>
            {isSaving ? 'Running…' : currentLC.step4 ? '↺ Re-run Check' : '▶ Run Mismatch Check'}
          </button>
        </div>

        {!currentLC.step4 ? (
          <div className="form-card-body">
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3>No check run yet</h3>
              <p>Click "Run Mismatch Check" to compare your form data against PI/PO documents.</p>
            </div>
          </div>
        ) : (
          <div className="form-card-body">
            <div className="mismatch-summary">
              <span className="pill pill-ok">{mismatches.filter(m => m.status === 'ok').length} OK</span>
              <span className="pill pill-err">{mismatches.filter(m => m.status === 'err').length} Errors</span>
              <span className="pill pill-warn">{mismatches.filter(m => m.status === 'warn').length} Warnings</span>
              {currentLC.step4.runAt && (
                <span style={{ fontSize: 12, color: 'var(--ink-4)', marginLeft: 'auto' }}>
                  Last run: {new Date(currentLC.step4.runAt).toLocaleString()}
                </span>
              )}
            </div>

            <table className="mismatch-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>SWIFT</th>
                  <th>LC Form Value</th>
                  <th>PI Value</th>
                  <th>PO Value</th>
                  <th>Status</th>
                  <th>Resolution</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mismatches.map((m, i) => (
                  <tr key={i} className={m.status === 'err' ? 'row-err' : m.status === 'warn' ? 'row-warn' : ''}>
                    <td>{m.field}</td>
                    <td><code>{m.swiftTag ?? '—'}</code></td>
                    <td>{m.formValue}</td>
                    <td>{m.piValue ?? '—'}</td>
                    <td>{m.poValue ?? '—'}</td>
                    <td>
                      <span className={`pill ${STATUS_PILL[m.status]}`}>
                        {STATUS_LABEL[m.status]}
                      </span>
                    </td>
                    <td>
                      {m.resolution ? (
                        <span style={{ fontSize: 12 }}>{m.resolution.action.replace(/_/g, ' ')}</span>
                      ) : '—'}
                    </td>
                    <td>
                      {(m.status === 'err' || m.status === 'warn') && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIndex(i)}>
                          {m.resolution ? 'Edit' : 'Fix'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {hasErrors && (
              <div className="alert alert-err" style={{ marginTop: 16 }}>
                ⚠️ Please resolve all errors before proceeding to submission.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="action-bar">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(`/lc/${id}/step/3`)}>
          ← Back
        </button>
        <button
          className="btn btn-primary"
          onClick={() => navigate(`/lc/${id}/step/5`)}
          disabled={!canProceed}
          title={!canProceed ? 'Run mismatch check and resolve all errors first' : ''}
        >
          Review & Submit →
        </button>
      </div>

      {selectedIndex !== null && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedIndex(null)} />
          <FixDrawer
            mismatch={mismatches[selectedIndex]}
            index={selectedIndex}
            onClose={() => setSelectedIndex(null)}
            onSave={resolveMismatch}
          />
        </>
      )}
    </div>
  );
}
