import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLCStore } from '../store/lcStore';
import { StepsBar } from '../components/layout/StepsBar';
import { api } from '../api/client';

export function Step5Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentLC, loadLC, submitLC, isSaving } = useLCStore();
  const [mt700, setMt700] = useState<string | null>(null);
  const [loadingMT, setLoadingMT] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!currentLC && id) loadLC(id);
  }, [id]);

  const handleSubmit = async () => {
    await submitLC();
    setSubmitted(true);
    if (id) {
      setLoadingMT(true);
      const text = await api.getMT700(id);
      setMt700(text);
      setLoadingMT(false);
    }
  };

  const handlePreviewMT = async () => {
    if (!id) return;
    setLoadingMT(true);
    const text = await api.getMT700(id);
    setMt700(text);
    setLoadingMT(false);
  };

  if (!currentLC) return <div className="page"><p>Loading…</p></div>;

  const { step1, step2, step3 } = currentLC;

  if (submitted || currentLC.status !== 'DRAFT') {
    return (
      <div className="page">
        <StepsBar lc={currentLC} current={5} />
        <div className="success-screen">
          <div className="success-icon">✓</div>
          <h2>LC Application Submitted</h2>
          <p>Application <strong>{currentLC.applicationRef}</strong> has been submitted for bank processing.</p>
          {currentLC.submittedAt && (
            <p style={{ opacity: 0.7 }}>Submitted at {new Date(currentLC.submittedAt).toLocaleString()}</p>
          )}
          {currentLC.swiftMT700 && (
            <div style={{ marginTop: 24, textAlign: 'left', width: '100%' }}>
              <h3 style={{ marginBottom: 8 }}>SWIFT MT700 Message</h3>
              <pre className="swift-preview">{currentLC.swiftMT700}</pre>
            </div>
          )}
          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <StepsBar lc={currentLC} current={5} />

      <div className="form-card">
        <div className="form-card-header">
          <h2 className="form-card-title">Application Summary</h2>
          <span className="pill pill-info">{currentLC.applicationRef}</span>
        </div>
        <div className="form-card-body">
          {step1 && (
            <>
              <div className="review-section-label">Applicant &amp; Beneficiary</div>
              <div className="review-grid">
                <div className="review-field"><span className="review-label">Customer Reference</span><span className="review-value">{step1.applicant.customerReference}</span></div>
                <div className="review-field"><span className="review-label">LC Category</span><span className="review-value">{step1.applicant.lcCategory}</span></div>
                <div className="review-field"><span className="review-label">Application Date</span><span className="review-value">{step1.applicant.applicationDate}</span></div>
                <div className="review-field"><span className="review-label">Purpose</span><span className="review-value">{step1.applicant.purposeOfImport}</span></div>
                <div className="review-field"><span className="review-label">Beneficiary</span><span className="review-value">{step1.beneficiary.name}</span></div>
                <div className="review-field"><span className="review-label">Beneficiary Country</span><span className="review-value">{step1.beneficiary.country}</span></div>
                <div className="review-field"><span className="review-label">Beneficiary Bank BIC</span><span className="review-value"><code>{step1.beneficiary.bankBIC}</code></span></div>
                <div className="review-field"><span className="review-label">Bank Name</span><span className="review-value">{step1.beneficiary.bankName}</span></div>
              </div>

              <div className="review-section-label" style={{ marginTop: 16 }}>Amount &amp; Expiry</div>
              <div className="review-grid">
                <div className="review-field"><span className="review-label">Currency</span><span className="review-value">{step1.amountExpiry.currency}</span></div>
                <div className="review-field"><span className="review-label">Amount</span><span className="review-value" style={{ fontWeight: 600 }}>{step1.amountExpiry.currency} {step1.amountExpiry.amount.toLocaleString()}</span></div>
                <div className="review-field"><span className="review-label">Tolerance</span><span className="review-value">+{step1.amountExpiry.tolerancePlus}% / -{step1.amountExpiry.toleranceMinus}%</span></div>
                <div className="review-field"><span className="review-label">Expiry Date</span><span className="review-value">{step1.amountExpiry.expiryDate}</span></div>
                <div className="review-field"><span className="review-label">Expiry Place</span><span className="review-value">{step1.amountExpiry.expiryPlace}</span></div>
                <div className="review-field"><span className="review-label">Applicable Rules</span><span className="review-value">{step1.rules.applicableRules}</span></div>
                <div className="review-field"><span className="review-label">Confirmation</span><span className="review-value">{step1.rules.confirmationInstruction}</span></div>
                <div className="review-field"><span className="review-label">Method of Issue</span><span className="review-value">{step1.rules.methodOfIssue}</span></div>
              </div>
            </>
          )}

          {step2 && (
            <>
              <div className="review-section-label" style={{ marginTop: 16 }}>Goods &amp; Shipment</div>
              <div className="review-grid">
                <div className="review-field"><span className="review-label">Goods Lines</span><span className="review-value">{step2.goods.lines.length} line(s)</span></div>
                <div className="review-field"><span className="review-label">Incoterms</span><span className="review-value">{step2.goods.incoterms} {step2.goods.namedPlace}</span></div>
                <div className="review-field"><span className="review-label">Port of Loading</span><span className="review-value">{step2.shipment.portOfLoading}</span></div>
                <div className="review-field"><span className="review-label">Port of Discharge</span><span className="review-value">{step2.shipment.portOfDischarge}</span></div>
                <div className="review-field"><span className="review-label">Latest Shipment</span><span className="review-value">{step2.shipment.latestShipmentDate}</span></div>
                <div className="review-field"><span className="review-label">Partial Shipment</span><span className="review-value">{step2.shipment.partialShipment}</span></div>
              </div>
            </>
          )}

          {step3 && (
            <>
              <div className="review-section-label" style={{ marginTop: 16 }}>Payment &amp; Settlement</div>
              <div className="review-grid">
                <div className="review-field"><span className="review-label">Payment Method</span><span className="review-value">{step3.paymentTerms.methodOfPayment}</span></div>
                <div className="review-field"><span className="review-label">Available With</span><span className="review-value">{step3.paymentTerms.availableWith}</span></div>
                {step3.paymentTerms.tenorDays && (
                  <div className="review-field"><span className="review-label">Tenor</span><span className="review-value">{step3.paymentTerms.tenorDays} days {step3.paymentTerms.tenorBasis}</span></div>
                )}
                <div className="review-field"><span className="review-label">Debit Account</span><span className="review-value">{step3.settlementCharges.debitAccountForPayment}</span></div>
                <div className="review-field"><span className="review-label">Charges By</span><span className="review-value">{step3.settlementCharges.bankChargesBy}</span></div>
              </div>

              <div className="review-section-label" style={{ marginTop: 16 }}>Declarations</div>
              {step3.declarations.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className={`pill ${d.confirmed ? 'pill-ok' : 'pill-warn'}`}>
                    {d.confirmed ? '✓' : '✗'}
                  </span>
                  <span style={{ fontSize: 13 }}>{d.title}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="form-card">
        <div className="form-card-header">
          <h2 className="form-card-title">SWIFT MT700 Preview</h2>
          <button className="btn btn-ghost btn-sm" onClick={handlePreviewMT} disabled={loadingMT}>
            {loadingMT ? 'Loading…' : 'Generate Preview'}
          </button>
        </div>
        <div className="form-card-body">
          {mt700 ? (
            <pre className="swift-preview">{mt700}</pre>
          ) : (
            <p style={{ color: 'var(--ink-4)', fontSize: 13 }}>
              Click "Generate Preview" to see the SWIFT MT700 message that will be sent to the bank.
            </p>
          )}
        </div>
      </div>

      <div className="action-bar">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(`/lc/${id}/step/4`)}>
          ← Back
        </button>
        <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? 'Submitting…' : '✓ Submit LC Application'}
        </button>
      </div>
    </div>
  );
}
