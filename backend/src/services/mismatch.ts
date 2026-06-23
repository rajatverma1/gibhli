import { LCApplication, MismatchResult } from '../types/lc';

const norm = (v?: string|null) => (v||'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[.,]/g,'');
const meaningful = (v?: string|null) => !!v && v !== '—' && v !== 'N/A' && v !== '';
const amountNorm = (v?: string|number) => v==null?'':String(v).replace(/,/g,'').replace(/\s/g,'').toLowerCase();

function extractFromDocument(docType: 'PI'|'PO', lc: LCApplication) {
  const s1=lc.step1, s2=lc.step2;
  if (!s1||!s2) return {} as Record<string,string|undefined>;
  const base = {
    beneficiaryName: s1.beneficiary.name, beneficiaryAddress: s1.beneficiary.address1,
    city: s1.beneficiary.city, country: s1.beneficiary.country,
    amount: String(s1.amountExpiry.amount), currency: s1.amountExpiry.currency,
    additionalAmounts: s1.amountExpiry.additionalAmountsCovered,
    tolerance: `+${s1.amountExpiry.tolerancePlus}/-${s1.amountExpiry.toleranceMinus}`,
    portOfLoading: s2.shipment.portOfLoading, portOfDischarge: s2.shipment.portOfDischarge,
    goodsDescription: s2.goods.lines[0]?.description,
    quantity: s2.goods.lines[0] ? `${s2.goods.lines[0].quantity} ${s2.goods.lines[0].unit}` : '',
    latestShipmentDate: s2.shipment.latestShipmentDate,
    incoterms: s2.goods.incoterms, namedPlace: s2.goods.namedPlace,
  };
  if (docType==='PI') return { ...base, beneficiaryName: s1.beneficiary.name+' FZE', amount: String(Math.round(s1.amountExpiry.amount*1.02)) };
  return { ...base, portOfDischarge: (base.portOfDischarge||'').toUpperCase()+' PORT', additionalAmounts: s1.amountExpiry.additionalAmountsCovered ? s1.amountExpiry.additionalAmountsCovered+' as per contract' : undefined };
}

export function runMismatchCheck(lc: LCApplication): MismatchResult[] {
  const s1=lc.step1, s2=lc.step2;
  if (!s1||!s2) return [];
  const pi=extractFromDocument('PI',lc), po=extractFromDocument('PO',lc);

  function check(field:string, swiftTag:string, formValue:string, piValue?:string, poValue?:string, cmp?:(a:string,b:string)=>boolean): MismatchResult {
    const compare = cmp||((a,b)=>norm(a)===norm(b));
    const piOk = !meaningful(piValue)||compare(formValue,piValue!);
    const poOk = !meaningful(poValue)||compare(formValue,poValue!);
    let status: MismatchResult['status'] = 'ok';
    if (!piOk||!poOk) {
      const docConflict = meaningful(piValue)&&meaningful(poValue)&&!compare(piValue!,poValue!);
      status = docConflict||(!piOk&&meaningful(piValue)) ? 'err' : 'warn';
    }
    return { field, swiftTag, formValue, piValue: piValue||'—', poValue: poValue||'—', status };
  }

  const ccy = s1.amountExpiry.currency;
  return [
    check('Beneficiary legal name','59',s1.beneficiary.name,pi.beneficiaryName,po.beneficiaryName),
    check('LC amount','32B',`${ccy} ${s1.amountExpiry.amount.toLocaleString('en-US',{minimumFractionDigits:2})}`,pi.amount?`${ccy} ${pi.amount}`:undefined,po.amount?`${ccy} ${po.amount}`:undefined,(f,d)=>amountNorm(f.split(' ')[1])===amountNorm(d.split(' ')[1])),
    check('Additional amounts covered','39C',s1.amountExpiry.additionalAmountsCovered||'',pi.additionalAmounts,po.additionalAmounts),
    check('Beneficiary address','59',s1.beneficiary.address1,pi.beneficiaryAddress,po.beneficiaryAddress),
    check('Tolerance','39A',`+${s1.amountExpiry.tolerancePlus}/-${s1.amountExpiry.toleranceMinus}`,pi.tolerance,po.tolerance),
    check('Named place / port','',s2.goods.namedPlace||'',pi.namedPlace,po.namedPlace),
    check('Port of discharge','44F',s2.shipment.portOfDischarge,pi.portOfDischarge,po.portOfDischarge),
    check('Goods description','45A',s2.goods.lines[0]?.description||'',pi.goodsDescription,po.goodsDescription),
    check('Quantity','',s2.goods.lines[0]?`${s2.goods.lines[0].quantity} ${s2.goods.lines[0].unit}`:'',pi.quantity,po.quantity),
    check('Latest shipment date','44C',s2.shipment.latestShipmentDate,pi.latestShipmentDate,po.latestShipmentDate),
    check('Incoterms','45A',s2.goods.incoterms||'',pi.incoterms,po.incoterms),
  ];
}
