import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { useLCStore } from '../store/lcStore';
import { StepsBar } from '../components/layout/StepsBar';
import type { LCApplication } from '../types/lc';
import type { GoodsLine } from '../types/lc';
import { v4 as uuidv4 } from 'uuid';

type Step2Data = NonNullable<LCApplication['step2']>;

const DEFAULT_LINE: GoodsLine = {
  id: '',
  description: '',
  hsCode: '',
  countryOfOrigin: '',
  quantity: 1,
  unit: 'PCS',
  unitPrice: 0,
  totalValue: 0,
};

const DEFAULT: Step2Data = {
  goods: {
    lines: [{ ...DEFAULT_LINE, id: uuidv4() }],
    incoterms: 'CIF',
    namedPlace: '',
    countryOfOrigin: '',
    importLicenseType: 'OGL',
  },
  shipment: {
    portOfLoading: '',
    portOfDischarge: '',
    latestShipmentDate: '',
    partialShipment: 'NOT_ALLOWED',
    transhipment: 'NOT_ALLOWED',
  },
  documents: {
    requirements: [
      { id: uuidv4(), name: 'Commercial Invoice', type: 'MANDATORY', originals: 3, copies: 3 },
      { id: uuidv4(), name: 'Full Set of Clean On Board Bills of Lading', type: 'MANDATORY', originals: 3, copies: 0 },
      { id: uuidv4(), name: 'Insurance Certificate', type: 'MANDATORY', originals: 1, copies: 1 },
      { id: uuidv4(), name: 'Packing List', type: 'MANDATORY', originals: 1, copies: 2 },
      { id: uuidv4(), name: 'Certificate of Origin', type: 'OPTIONAL', originals: 1, copies: 0 },
    ],
    uploadedDocuments: [],
  },
};

export function Step2Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentLC, loadLC, saveStep2, isSaving } = useLCStore();

  const { register, handleSubmit, control, watch, setValue, reset } = useForm<Step2Data>({
    defaultValues: DEFAULT,
  });

  const { fields: goodsFields, append: addGoodsLine, remove: removeGoodsLine } = useFieldArray({
    control, name: 'goods.lines',
  });

  const { fields: docFields } = useFieldArray({
    control, name: 'documents.requirements',
  });

  useEffect(() => {
    if (!currentLC && id) loadLC(id);
  }, [id]);

  useEffect(() => {
    if (currentLC?.step2) reset(currentLC.step2);
  }, [currentLC?.id]);

  const importLicenseType = watch('goods.importLicenseType');

  const recalcLine = (index: number) => {
    const lines = watch('goods.lines');
    const line = lines[index];
    if (line) {
      setValue(`goods.lines.${index}.totalValue`, +(line.quantity * line.unitPrice).toFixed(2));
    }
  };

  const onSubmit = async (data: Step2Data) => {
    await saveStep2(data);
    navigate(`/lc/${id}/step/3`);
  };

  if (!currentLC) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <StepsBar lc={currentLC} current={2} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">Goods Description</h2>
          </div>
          <div className="form-card-body">
            <div className="goods-table-wrap">
              <table className="goods-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>HS Code</th>
                    <th>Country of Origin</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Unit Price</th>
                    <th>Total Value</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {goodsFields.map((field, i) => (
                    <tr key={field.id}>
                      <td><input className="field-input" {...register(`goods.lines.${i}.description`, { required: true })} /></td>
                      <td><input className="field-input" placeholder="e.g. 3401.11" {...register(`goods.lines.${i}.hsCode`)} /></td>
                      <td><input className="field-input" {...register(`goods.lines.${i}.countryOfOrigin`)} /></td>
                      <td>
                        <input type="number" className="field-input" step="0.001" min="0"
                          {...register(`goods.lines.${i}.quantity`, { valueAsNumber: true })}
                          onChange={e => { register(`goods.lines.${i}.quantity`).onChange(e); recalcLine(i); }}
                        />
                      </td>
                      <td>
                        <select className="field-input" {...register(`goods.lines.${i}.unit`)}>
                          {['PCS','KG','MT','LTR','CTN','BAG','SET','BOX','ROLL'].map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input type="number" className="field-input" step="0.01" min="0"
                          {...register(`goods.lines.${i}.unitPrice`, { valueAsNumber: true })}
                          onChange={e => { register(`goods.lines.${i}.unitPrice`).onChange(e); recalcLine(i); }}
                        />
                      </td>
                      <td>
                        <input type="number" className="field-input" readOnly
                          {...register(`goods.lines.${i}.totalValue`, { valueAsNumber: true })} />
                      </td>
                      <td>
                        {goodsFields.length > 1 && (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeGoodsLine(i)}>×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
                onClick={() => addGoodsLine({ ...DEFAULT_LINE, id: uuidv4() })}>
                + Add Line
              </button>
            </div>

            <div className="grid-4" style={{ marginTop: 16 }}>
              <div className="field-group span-2">
                <label className="field-label required">Incoterms</label>
                <select className="field-input" {...register('goods.incoterms')}>
                  {['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'].map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div className="field-group span-2">
                <label className="field-label required">Named Place</label>
                <input className="field-input" placeholder="e.g. PORT OF HAMBURG"
                  {...register('goods.namedPlace', { required: true })} />
              </div>
              <div className="field-group span-2">
                <label className="field-label">Country of Origin (overall)</label>
                <input className="field-input" {...register('goods.countryOfOrigin')} />
              </div>
              <div className="field-group span-2">
                <label className="field-label required">Import License Type</label>
                <select className="field-input" {...register('goods.importLicenseType')}>
                  <option value="OGL">OGL (Open General Licence)</option>
                  <option value="LICENSE">Specific Licence Required</option>
                </select>
              </div>
              {importLicenseType === 'LICENSE' && (
                <div className="field-group span-4">
                  <label className="field-label required">Import Licence Reference</label>
                  <input className="field-input" {...register('goods.importLicenseRef', { required: importLicenseType === 'LICENSE' })} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">Shipment Terms</h2>
          </div>
          <div className="form-card-body">
            <div className="grid-4">
              <div className="field-group span-2">
                <label className="field-label required">Port of Loading</label>
                <input className="field-input" placeholder="e.g. HAMBURG, GERMANY"
                  {...register('shipment.portOfLoading', { required: true })} />
              </div>
              <div className="field-group span-2">
                <label className="field-label required">Port of Discharge</label>
                <input className="field-input" placeholder="e.g. NHAVA SHEVA, INDIA"
                  {...register('shipment.portOfDischarge', { required: true })} />
              </div>
              <div className="field-group span-2">
                <label className="field-label">Place of Taking in Charge</label>
                <input className="field-input" {...register('shipment.placeOfTakingInCharge')} />
              </div>
              <div className="field-group span-2">
                <label className="field-label">Place of Final Destination</label>
                <input className="field-input" {...register('shipment.placeOfFinalDestination')} />
              </div>
              <div className="field-group span-2">
                <label className="field-label required">Latest Shipment Date</label>
                <input type="date" className="field-input" {...register('shipment.latestShipmentDate', { required: true })} />
              </div>
              <div className="field-group span-2">
                <label className="field-label">Shipment Period</label>
                <input className="field-input" placeholder="e.g. WITHIN 30 DAYS OF LC ISSUANCE"
                  {...register('shipment.shipmentPeriod')} />
              </div>
              <div className="field-group span-2">
                <label className="field-label">Partial Shipment</label>
                <select className="field-input" {...register('shipment.partialShipment')}>
                  <option value="ALLOWED">Allowed</option>
                  <option value="NOT_ALLOWED">Not Allowed</option>
                  <option value="CONDITIONAL">Conditional</option>
                </select>
              </div>
              <div className="field-group span-2">
                <label className="field-label">Transhipment</label>
                <select className="field-input" {...register('shipment.transhipment')}>
                  <option value="ALLOWED">Allowed</option>
                  <option value="NOT_ALLOWED">Not Allowed</option>
                  <option value="CONDITIONAL">Conditional</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">Document Requirements</h2>
          </div>
          <div className="form-card-body">
            <div className="doc-cards">
              {docFields.map((field, i) => (
                <div key={field.id} className="doc-card">
                  <div className="doc-card-name">
                    <input className="field-input" {...register(`documents.requirements.${i}.name`)} />
                  </div>
                  <div className="doc-card-meta">
                    <label className="field-label">Type</label>
                    <select className="field-input" {...register(`documents.requirements.${i}.type`)}>
                      <option value="MANDATORY">Mandatory</option>
                      <option value="OPTIONAL">Optional</option>
                    </select>
                  </div>
                  <div className="doc-card-meta">
                    <label className="field-label">Originals</label>
                    <input type="number" min="0" max="9" className="field-input"
                      {...register(`documents.requirements.${i}.originals`, { valueAsNumber: true })} />
                  </div>
                  <div className="doc-card-meta">
                    <label className="field-label">Copies</label>
                    <input type="number" min="0" max="9" className="field-input"
                      {...register(`documents.requirements.${i}.copies`, { valueAsNumber: true })} />
                  </div>
                </div>
              ))}
            </div>
            <div className="field-group" style={{ marginTop: 16 }}>
              <label className="field-label">Additional Bank Instructions</label>
              <textarea className="field-input" rows={3}
                {...register('documents.bankInstructions')}
                placeholder="Special instructions for document presentation…" />
            </div>
          </div>
        </div>

        <div className="action-bar">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(`/lc/${id}/step/1`)}>
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
