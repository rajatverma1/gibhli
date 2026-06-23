import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useLCStore } from '../store/lcStore';
import { StepsBar } from '../components/layout/StepsBar';
import { api } from '../api/client';
import type { DropdownOption, CustomerAccount } from '../api/client';
import type { LCApplication } from '../types/lc';
import { v4 as uuidv4 } from 'uuid';

type Step3Data = NonNullable<LCApplication['step3']>;

const DECLARATIONS = [
  {
    id: uuidv4(),
    title: 'UCP Compliance',
    text: 'I confirm this LC application complies with UCP 600 and applicable RBI guidelines for import financing.',
    confirmed: false,
  },
  {
    id: uuidv4(),
    title: 'FEMA Declaration',
    text: 'The import transaction is in accordance with the Foreign Exchange Management Act 1999 and RBI regulations.',
    confirmed: false,
  },
  {
    id: uuidv4(),
    title: 'Purpose of Import',
    text: 'The goods described herein are imported for genuine commercial purposes and not for re-export without prior RBI approval.',
    confirmed: false,
  },
  {
    id: uuidv4(),
    title: 'Sanctions Compliance',
    text: 'The beneficiary, country, and goods are not subject to any sanctions by OFAC, UN, EU, or Government of India.',
    confirmed: false,
  },
];

const DEFAULT: Step3Data = {
  paymentTerms: {
    methodOfPayment: 'SIGHT',
    availableWith: 'ISSUING BANK',
  },
  settlementCharges: {
    debitAccountForPayment: '',
    bankChargesBy: 'OUR',
  },
  declarations: DECLARATIONS,
};

function formatLimit(currency: string, limit: number) {
  return `${currency} ${limit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function Step3Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentLC, loadLC, saveStep3, isSaving } = useLCStore();
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [chargesOptions, setChargesOptions] = useState<DropdownOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<DropdownOption[]>([]);

  useEffect(() => {
    api.getAccounts().then(r => setAccounts(r.data)).catch(() => {});
    api.getDropdown('BANK_CHARGES_BY').then(r => setChargesOptions(r.data)).catch(() => {});
    api.getDropdown('PAYMENT_METHOD').then(r => setPaymentMethods(r.data)).catch(() => {});
  }, []);

  const { register, handleSubmit, watch, reset } = useForm<Step3Data>({
    defaultValues: DEFAULT,
  });

  useEffect(() => {
    if (!currentLC && id) loadLC(id);
  }, [id]);

  useEffect(() => {
    if (currentLC?.step3) reset(currentLC.step3);
    else if (currentLC && !currentLC.step3) reset(DEFAULT);
  }, [currentLC?.id]);

  const method = watch('paymentTerms.methodOfPayment');
  const declarations = watch('declarations');

  const onSubmit = async (data: Step3Data) => {
    data.declarations = data.declarations.map((d, i) => ({
      ...d,
      confirmedAt: d.confirmed ? (declarations[i]?.confirmedAt || new Date().toISOString()) : undefined,
    }));
    await saveStep3(data);
    navigate(`/lc/${id}/step/4`);
  };

  if (!currentLC) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <StepsBar lc={currentLC} current={3} />

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Payment Terms */}
        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">Payment Terms</h2>
          </div>
          <div className="form-card-body">
            <div className="grid-4">
              <div className="field-group span-2">
                <label className="field-label required">Method of Payment</label>
                <select className="field-input" {...register('paymentTerms.methodOfPayment')}>
                  {paymentMethods.length > 0
                    ? paymentMethods.map(o => (
                        <option key={o.value_code} value={o.value_code}>{o.display_name}</option>
                      ))
                    : (
                      <>
                        <option value="SIGHT">Sight</option>
                        <option value="USANCE">Usance</option>
                        <option value="DEFERRED">Deferred Payment</option>
                        <option value="NEGOTIATION">Negotiation</option>
                        <option value="MIXED">Mixed Payment</option>
                      </>
                    )
                  }
                </select>
              </div>
              <div className="field-group span-2">
                <label className="field-label required">Available With</label>
                <input className="field-input"
                  placeholder="e.g. ANY BANK or ISSUING BANK"
                  {...register('paymentTerms.availableWith', { required: true })} />
              </div>
              <div className="field-group span-2">
                <label className="field-label">Available Country</label>
                <input className="field-input" {...register('paymentTerms.availableCountry')} />
              </div>

              {(method === 'USANCE' || method === 'DEFERRED') && (
                <>
                  <div className="field-group">
                    <label className="field-label">Tenor Basis</label>
                    <input className="field-input" placeholder="e.g. DAYS FROM BL DATE"
                      {...register('paymentTerms.tenorBasis')} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Tenor Days</label>
                    <input type="number" className="field-input" min="1"
                      {...register('paymentTerms.tenorDays', { valueAsNumber: true })} />
                  </div>
                  <div className="field-group span-2">
                    <label className="field-label">Drawee Bank Type</label>
                    <select className="field-input" {...register('paymentTerms.draweeBankType')}>
                      <option value="">Select…</option>
                      <option>ISSUING BANK</option>
                      <option>CONFIRMING BANK</option>
                      <option>NOMINATED BANK</option>
                    </select>
                  </div>
                </>
              )}

              {method === 'MIXED' && (
                <div className="field-group span-4">
                  <label className="field-label">Mixed Payment Details</label>
                  <textarea className="field-input" rows={3}
                    {...register('paymentTerms.mixedPaymentDetails')}
                    placeholder="e.g. 50% at sight, 50% at 90 days from date of Bill of Lading" />
                </div>
              )}

              {method === 'DEFERRED' && (
                <div className="field-group span-4">
                  <label className="field-label">Deferred / Negotiation Details</label>
                  <textarea className="field-input" rows={2}
                    {...register('paymentTerms.deferredNegotiationDetails')} />
                </div>
              )}

              <div className="field-group span-4">
                <label className="field-label">Special Payment Conditions</label>
                <textarea className="field-input" rows={2}
                  {...register('paymentTerms.specialPaymentConditions')}
                  placeholder="Any special conditions for payment…" />
              </div>
            </div>
          </div>
        </div>

        {/* Settlement & Charges */}
        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">Settlement &amp; Charges</h2>
          </div>
          <div className="form-card-body">
            <div className="grid-4">
              <div className="field-group span-2">
                <label className="field-label required">Debit Account for Payment</label>
                <select
                  className="field-input"
                  {...register('settlementCharges.debitAccountForPayment', { required: true })}
                >
                  <option value="">Select account…</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.account_number}>
                      {acc.account_name} — {formatLimit(acc.currency, acc.available_limit)} available
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group span-2">
                <label className="field-label required">Bank Charges By</label>
                <select className="field-input" {...register('settlementCharges.bankChargesBy')}>
                  {chargesOptions.length > 0
                    ? chargesOptions.map(o => (
                        <option key={o.value_code} value={o.value_code}>{o.display_name}</option>
                      ))
                    : (
                      <>
                        <option value="OUR">OUR — All charges by Applicant</option>
                        <option value="SHA">SHA — Shared</option>
                        <option value="BEN">BEN — All charges by Beneficiary</option>
                        <option value="OTH">OTH — Other arrangement</option>
                      </>
                    )
                  }
                </select>
              </div>
              <div className="field-group span-2">
                <label className="field-label">Charges Debit Account</label>
                <select
                  className="field-input"
                  {...register('settlementCharges.chargesDebitAccount')}
                >
                  <option value="">Same as payment account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.account_number}>
                      {acc.account_name} — {formatLimit(acc.currency, acc.available_limit)} available
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group span-2">
                <label className="field-label">Confirmation Charges By</label>
                <input className="field-input" {...register('settlementCharges.confirmationChargesBy')} />
              </div>
              <div className="field-group span-2">
                <label className="field-label">Forward Contract Reference</label>
                <input className="field-input" placeholder="If covering with a forward contract"
                  {...register('settlementCharges.forwardContractRef')} />
              </div>
              <div className="field-group span-4">
                <label className="field-label">Additional Charges Info</label>
                <textarea className="field-input" rows={2}
                  {...register('settlementCharges.additionalChargesInfo')} />
              </div>
            </div>
          </div>
        </div>

        {/* Declarations */}
        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">Declarations &amp; Confirmations</h2>
          </div>
          <div className="form-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {DEFAULT.declarations.map((decl, i) => (
                <div key={decl.id} className="declaration-card">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      className="declaration-check"
                      {...register(`declarations.${i}.confirmed`)}
                    />
                    <div>
                      <div className="declaration-title">{decl.title}</div>
                      <div className="declaration-text">{decl.text}</div>
                    </div>
                  </label>
                  <input type="hidden" value={decl.id} {...register(`declarations.${i}.id`)} />
                  <input type="hidden" value={decl.title} {...register(`declarations.${i}.title`)} />
                  <input type="hidden" value={decl.text} {...register(`declarations.${i}.text`)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="action-bar">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(`/lc/${id}/step/2`)}>
            ← Back
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save & Continue →'}
          </button>
        </div>
      </form>
    </div>
  );
}
