import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useLCStore } from '../store/lcStore';
import { StepsBar } from '../components/layout/StepsBar';
import { BICSearch } from '../components/form/BICSearch';
import { BeneficiarySearch } from '../components/form/BeneficiarySearch';
import { api } from '../api/client';
import type { DropdownOption } from '../api/client';
import type { LCApplication, BeneficiaryRecord } from '../types/lc';

type Step1Data = NonNullable<LCApplication['step1']>;

const DEFAULT: Step1Data = {
  applicant: {
    applicantType: 'SELF',
    customerReference: '',
    lcCategory: 'IMPORT',
    applicationDate: new Date().toISOString().slice(0, 10),
    purposeOfImport: '',
  },
  beneficiary: {
    name: '',
    address1: '',
    city: '',
    country: '',
    bankAccountNumber: '',
    bankBIC: '',
    bankName: '',
    bankCountry: '',
  },
  amountExpiry: {
    currency: 'USD',
    amount: 0,
    tolerancePlus: 0,
    toleranceMinus: 0,
    expiryDate: '',
    expiryPlace: '',
  },
  rules: {
    applicableRules: 'UCP LATEST VERSION',
    methodOfIssue: 'SWIFT',
    confirmationInstruction: 'WITHOUT',
    isTransferable: false,
    isRevolving: false,
  },
};

export function Step1Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentLC, loadLC, saveStep1, isSaving } = useLCStore();
  const [purposeOptions, setPurposeOptions] = useState<DropdownOption[]>([]);

  useEffect(() => {
    api.getDropdown('PURPOSE_OF_IMPORT').then(r => setPurposeOptions(r.data)).catch(() => {});
  }, []);

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<Step1Data>({
    defaultValues: DEFAULT,
  });

  useEffect(() => {
    if (!currentLC && id) loadLC(id);
  }, [id]);

  useEffect(() => {
    if (currentLC?.step1) reset(currentLC.step1);
  }, [currentLC?.id]);

  const applicantType = watch('applicant.applicantType');
  const isTransferable = watch('rules.isTransferable');
  const isRevolving = watch('rules.isRevolving');
  const methodOfIssue = watch('rules.methodOfIssue');

  const fillBeneficiary = (r: BeneficiaryRecord) => {
    setValue('beneficiary.name', r.name);
    setValue('beneficiary.address1', r.address1 ?? '');
    setValue('beneficiary.city', r.city);
    setValue('beneficiary.country', r.country);
    if (r.bank_bic) setValue('beneficiary.bankBIC', r.bank_bic);
    if (r.bank_name) setValue('beneficiary.bankName', r.bank_name);
    if (r.bank_country) setValue('beneficiary.bankCountry', r.bank_country);
    if (r.bank_account) setValue('beneficiary.bankAccountNumber', r.bank_account);
  };

  const onSubmit = async (data: Step1Data) => {
    await saveStep1(data);
    navigate(`/lc/${id}/step/2`);
  };

  if (!currentLC) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <StepsBar lc={currentLC} current={1} />

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Applicant Details */}
        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">Applicant Details</h2>
          </div>
          <div className="form-card-body">
            <div className="field-group">
              <label className="field-label">Applicant Type</label>
              <div className="choice-row">
                {(['SELF', 'THIRD_PARTY'] as const).map(v => (
                  <label key={v} className={`choice-card${watch('applicant.applicantType') === v ? ' selected' : ''}`}>
                    <input type="radio" value={v} {...register('applicant.applicantType')} style={{ display: 'none' }} />
                    {v === 'SELF' ? 'Self (Company)' : 'Third Party'}
                  </label>
                ))}
              </div>
            </div>

            {applicantType === 'THIRD_PARTY' && (
              <div className="grid-4">
                <div className="field-group span-2">
                  <label className="field-label">Third Party Name</label>
                  <input className="field-input" {...register('applicant.thirdPartyName')} />
                </div>
                <div className="field-group span-2">
                  <label className="field-label">Address Line 1</label>
                  <input className="field-input" {...register('applicant.thirdPartyAddress1')} />
                </div>
                <div className="field-group">
                  <label className="field-label">City</label>
                  <input className="field-input" {...register('applicant.thirdPartyCity')} />
                </div>
                <div className="field-group">
                  <label className="field-label">Country</label>
                  <input className="field-input" {...register('applicant.thirdPartyCountry')} />
                </div>
                <div className="field-group">
                  <label className="field-label">IEC Code</label>
                  <input className="field-input" {...register('applicant.thirdPartyIEC')} />
                </div>
              </div>
            )}

            <div className="grid-4">
              <div className="field-group span-2">
                <label className="field-label required">Customer Reference</label>
                <input
                  className={`field-input${errors.applicant?.customerReference ? ' error' : ''}`}
                  {...register('applicant.customerReference', { required: true })}
                  placeholder="e.g. PO-2024-00123"
                />
              </div>
              <div className="field-group">
                <label className="field-label required">LC Category</label>
                <select className="field-input" {...register('applicant.lcCategory')}>
                  <option value="IMPORT">Import LC</option>
                  <option value="INLAND">Inland LC</option>
                </select>
              </div>
              <div className="field-group">
                <label className="field-label required">Application Date</label>
                <input type="date" className="field-input" {...register('applicant.applicationDate', { required: true })} />
              </div>
              <div className="field-group span-4">
                <label className="field-label required">Purpose of Import</label>
                <select
                  className={`field-input${errors.applicant?.purposeOfImport ? ' error' : ''}`}
                  {...register('applicant.purposeOfImport', { required: true })}
                >
                  <option value="">Select purpose…</option>
                  {purposeOptions.map(o => (
                    <option key={o.value_code} value={o.value_code}>{o.display_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Beneficiary Details */}
        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">Beneficiary Details</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="field-label" style={{ margin: 0 }}>Search saved:</span>
              <BeneficiarySearch onSelect={fillBeneficiary} />
            </div>
          </div>
          <div className="form-card-body">
            <div className="grid-4">
              <div className="field-group span-2">
                <label className="field-label required">Beneficiary Name</label>
                <input
                  className={`field-input${errors.beneficiary?.name ? ' error' : ''}`}
                  {...register('beneficiary.name', { required: true })}
                />
              </div>
              <div className="field-group span-2">
                <label className="field-label required">Address Line 1</label>
                <input className="field-input" {...register('beneficiary.address1', { required: true })} />
              </div>
              <div className="field-group">
                <label className="field-label">Address Line 2</label>
                <input className="field-input" {...register('beneficiary.address2')} />
              </div>
              <div className="field-group">
                <label className="field-label">Address Line 3</label>
                <input className="field-input" {...register('beneficiary.address3')} />
              </div>
              <div className="field-group">
                <label className="field-label required">City</label>
                <input className="field-input" {...register('beneficiary.city', { required: true })} />
              </div>
              <div className="field-group">
                <label className="field-label required">Country</label>
                <input className="field-input" {...register('beneficiary.country', { required: true })} />
              </div>
            </div>

            <div className="section-divider"><span>Beneficiary's Bank</span></div>

            <div className="grid-4">
              <div className="field-group span-2">
                <label className="field-label required">Bank BIC / SWIFT Code</label>
                <Controller
                  name="beneficiary.bankBIC"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <BICSearch
                      value={field.value}
                      onChange={(bic, rec) => {
                        field.onChange(bic);
                        if (rec) {
                          setValue('beneficiary.bankName', rec.bank_name);
                          setValue('beneficiary.bankCountry', rec.country);
                        }
                      }}
                    />
                  )}
                />
              </div>
              <div className="field-group span-2">
                <label className="field-label required">Bank Name</label>
                <input className="field-input" {...register('beneficiary.bankName', { required: true })} />
              </div>
              <div className="field-group">
                <label className="field-label required">Bank Country</label>
                <input className="field-input" {...register('beneficiary.bankCountry', { required: true })} />
              </div>
              <div className="field-group span-3">
                <label className="field-label required">Bank Account Number / IBAN</label>
                <input className="field-input" {...register('beneficiary.bankAccountNumber', { required: true })} />
              </div>
            </div>
          </div>
        </div>

        {/* Amount & Expiry */}
        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">LC Amount &amp; Expiry</h2>
          </div>
          <div className="form-card-body">
            <div className="grid-4">
              <div className="field-group">
                <label className="field-label required">Currency</label>
                <select className="field-input" {...register('amountExpiry.currency')}>
                  {['USD','EUR','GBP','JPY','CHF','AED','SGD','HKD'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="field-group span-2">
                <label className="field-label required">Amount</label>
                <input
                  type="number"
                  className="field-input"
                  step="0.01"
                  {...register('amountExpiry.amount', { required: true, valueAsNumber: true, min: 1 })}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Tolerance +%</label>
                <input type="number" className="field-input" step="0.01" min="0" max="10"
                  {...register('amountExpiry.tolerancePlus', { valueAsNumber: true })} />
              </div>
              <div className="field-group">
                <label className="field-label">Tolerance -%</label>
                <input type="number" className="field-input" step="0.01" min="0" max="10"
                  {...register('amountExpiry.toleranceMinus', { valueAsNumber: true })} />
              </div>
              <div className="field-group span-2">
                <label className="field-label required">Expiry Date</label>
                <input type="date" className="field-input" {...register('amountExpiry.expiryDate', { required: true })} />
              </div>
              <div className="field-group span-2">
                <label className="field-label required">Expiry Place</label>
                <input className="field-input" placeholder="e.g. BENEFICIARY'S COUNTRY"
                  {...register('amountExpiry.expiryPlace', { required: true })} />
              </div>
              <div className="field-group span-4">
                <label className="field-label">Additional Amounts Covered</label>
                <input className="field-input" placeholder="Insurance, freight, etc."
                  {...register('amountExpiry.additionalAmountsCovered')} />
              </div>
            </div>
          </div>
        </div>

        {/* LC Rules */}
        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">LC Rules &amp; Conditions</h2>
          </div>
          <div className="form-card-body">
            <div className="grid-4">
              <div className="field-group span-2">
                <label className="field-label required">Applicable Rules</label>
                <select className="field-input" {...register('rules.applicableRules')}>
                  <option>UCP LATEST VERSION</option>
                  <option>UCP 600</option>
                  <option>EUCP LATEST VERSION</option>
                  <option>EUCPURR LATEST VERSION</option>
                  <option>URR LATEST VERSION</option>
                  <option>OTHR</option>
                </select>
              </div>
              <div className="field-group span-2">
                <label className="field-label required">Method of Issue</label>
                <select className="field-input" {...register('rules.methodOfIssue')}>
                  <option value="SWIFT">SWIFT</option>
                  <option value="COURIER">Courier</option>
                  <option value="PREADVICE">Pre-Advice</option>
                </select>
              </div>

              {methodOfIssue === 'PREADVICE' && (
                <div className="field-group span-2">
                  <label className="field-label">Pre-Advice Reference</label>
                  <input className="field-input" {...register('rules.preAdviceReference')} />
                </div>
              )}
              {methodOfIssue === 'COURIER' && (
                <div className="field-group span-2">
                  <label className="field-label">Courier Name</label>
                  <input className="field-input" {...register('rules.courierName')} />
                </div>
              )}

              <div className="field-group span-2">
                <label className="field-label required">Confirmation Instructions</label>
                <select className="field-input" {...register('rules.confirmationInstruction')}>
                  <option value="WITHOUT">Without</option>
                  <option value="MAY_ADD">May Add</option>
                  <option value="CONFIRM">Confirm</option>
                </select>
              </div>
              <div className="field-group span-2">
                <label className="field-label">Preferred Confirming Bank BIC</label>
                <Controller
                  name="rules.preferredConfirmingBank"
                  control={control}
                  render={({ field }) => (
                    <BICSearch value={field.value ?? ''} onChange={field.onChange} />
                  )}
                />
              </div>

              <div className="field-group span-2">
                <label className="field-label">Transferable</label>
                <div className="toggle-row">
                  <label className="toggle">
                    <input type="checkbox" {...register('rules.isTransferable')} />
                    <span className="toggle-track" />
                  </label>
                  <span>{isTransferable ? 'Yes — LC is transferable' : 'No'}</span>
                </div>
              </div>

              {isTransferable && (
                <div className="field-group span-2">
                  <label className="field-label">Preferred Transferring Bank BIC</label>
                  <Controller
                    name="rules.preferredTransferringBank"
                    control={control}
                    render={({ field }) => (
                      <BICSearch value={field.value ?? ''} onChange={field.onChange} />
                    )}
                  />
                </div>
              )}

              <div className="field-group span-2">
                <label className="field-label">Revolving</label>
                <div className="toggle-row">
                  <label className="toggle">
                    <input type="checkbox" {...register('rules.isRevolving')} />
                    <span className="toggle-track" />
                  </label>
                  <span>{isRevolving ? 'Yes — Revolving LC' : 'No'}</span>
                </div>
              </div>

              {isRevolving && (
                <>
                  <div className="field-group span-2">
                    <label className="field-label">Reinstatement Terms</label>
                    <input className="field-input" {...register('rules.reinstatement')} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Frequency</label>
                    <input className="field-input" {...register('rules.frequency')} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">No. of Reinstatements</label>
                    <input type="number" className="field-input"
                      {...register('rules.numberOfReinstatements', { valueAsNumber: true })} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="action-bar">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save & Continue →'}
          </button>
        </div>
      </form>
    </div>
  );
}
