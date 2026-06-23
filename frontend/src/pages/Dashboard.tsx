import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { LCApplication } from '../types/lc';
import { useLCStore } from '../store/lcStore';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  SUBMITTED_TO_BANK: 'Submitted to Bank',
  ISSUED: 'Issued',
  REJECTED: 'Rejected',
};

const STATUS_PILL: Record<string, string> = {
  DRAFT: 'pill-info',
  PENDING_APPROVAL: 'pill-warn',
  APPROVED: 'pill-ok',
  SUBMITTED_TO_BANK: 'pill-ok',
  ISSUED: 'pill-ok',
  REJECTED: 'pill-err',
};

export function Dashboard() {
  const [applications, setApplications] = useState<LCApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { createNewLC, loadLC } = useLCStore();

  useEffect(() => {
    api.listLC().then(res => {
      setApplications(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleNew = async () => {
    const id = await createNewLC();
    navigate(`/lc/${id}/step/1`);
  };

  const handleOpen = async (lc: LCApplication) => {
    await loadLC(lc.id);
    navigate(`/lc/${lc.id}/step/${Math.min(lc.currentStep, 5)}`);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">LC Applications</h1>
          <p className="page-subtitle">Hindustan Unilever Limited · Trade Finance</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>+ New LC Application</button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--chrome-40)' }}>Loading…</div>
      ) : applications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <h3>No applications yet</h3>
          <p>Create your first Letter of Credit application to get started.</p>
          <button className="btn btn-primary" onClick={handleNew}>Create New LC</button>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Beneficiary</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Step</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {applications.map(lc => (
                <tr key={lc.id}>
                  <td><code>{lc.applicationRef}</code></td>
                  <td>{lc.step1?.beneficiary.name ?? '—'}</td>
                  <td>
                    {lc.step1
                      ? `${lc.step1.amountExpiry.currency} ${lc.step1.amountExpiry.amount.toLocaleString()}`
                      : '—'}
                  </td>
                  <td>
                    <span className={`pill ${STATUS_PILL[lc.status] ?? 'pill-info'}`}>
                      {STATUS_LABELS[lc.status] ?? lc.status}
                    </span>
                  </td>
                  <td>{new Date(lc.createdAt).toLocaleDateString()}</td>
                  <td>{lc.currentStep} / 5</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleOpen(lc)}>
                      {lc.status === 'DRAFT' ? 'Continue' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
