import { LCApplication } from '../types/lc';

const pad = (v: string|undefined, n: number) => (v||'').substring(0,n).trim();
const fmt = (ccy: string, amt: number) => `${ccy}${amt.toFixed(2).replace('.',',')} `;
const swiftDate = (iso: string) => { const d=new Date(iso); return `${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; };
function wrapLines(text: string, w=35): string {
  const words=text.split(' '); const lines: string[]=[]; let cur='';
  for (const word of words) { if ((cur+' '+word).trim().length<=w) { cur=(cur+' '+word).trim(); } else { if(cur)lines.push(cur); cur=word.substring(0,w); } }
  if(cur)lines.push(cur); return lines.join('\n');
}

export function generateMT700(lc: LCApplication): string {
  const s1=lc.step1, s2=lc.step2, s3=lc.step3;
  if (!s1||!s2||!s3) throw new Error('Incomplete LC data — all steps required');
  const {applicant:ap,beneficiary:ben,amountExpiry:ae,rules} = s1;
  const {goods,shipment,documents} = s2;
  const {paymentTerms:pt,settlementCharges:sc} = s3;

  const lines: string[] = [];
  lines.push('{1:F01HDFCINBBAXXX0000000000}');
  lines.push('{2:O7001200260614HDFCINBBAXXX00000000002606141200N}');
  lines.push(`{3:{108:${lc.applicationRef}}}`);
  lines.push('{4:');
  lines.push(':27:1/1');
  lines.push(`:40A:${rules.isTransferable?'IRREVOCABLE TRANSFERABLE':'IRREVOCABLE'}`);
  lines.push(`:20:${lc.applicationRef}`);
  lines.push(`:31C:${swiftDate(ap.applicationDate||new Date().toISOString())}`);
  lines.push(`:31D:${swiftDate(ae.expiryDate)}${pad(ae.expiryPlace,29)}`);
  lines.push(':51A:HDFCINBB');
  lines.push(`:50:${ap.applicantType==='SELF'?'HINDUSTAN UNILEVER LIMITED':pad((ap.thirdPartyName||'').toUpperCase(),35)}`);
  if (ap.applicantType==='THIRD_PARTY') {
    if(ap.thirdPartyAddress1) lines.push(pad(ap.thirdPartyAddress1.toUpperCase(),35));
    if(ap.thirdPartyCity) lines.push(pad(`${ap.thirdPartyCity.toUpperCase()}, ${ap.thirdPartyCountry?.toUpperCase()||''}`,35));
  } else {
    lines.push('UNILEVER HOUSE, B.D. SAWANT MARG');
    lines.push('CHAKALA, ANDHERI EAST, MUMBAI 400 099');
  }
  lines.push(`:59:${pad(ben.name.toUpperCase(),35)}`);
  if(ben.address1) lines.push(pad(ben.address1.toUpperCase(),35));
  if(ben.address2) lines.push(pad(ben.address2.toUpperCase(),35));
  lines.push(pad(`${ben.city.toUpperCase()}, ${ben.country.toUpperCase()}`,35));
  lines.push(`:32B:${fmt(ae.currency,ae.amount)}`);
  lines.push(`:39A:${ae.tolerancePlus||0}/${ae.toleranceMinus||0}`);
  if(ae.additionalAmountsCovered) lines.push(`:39C:${wrapLines(ae.additionalAmountsCovered)}`);
  lines.push(`:40E:${rules.applicableRules||'UCP LATEST VERSION'}`);
  const availByMap: Record<string,string> = {SIGHT:'BY PAYMENT',USANCE:'BY ACCEPTANCE',DEFERRED:'BY DEF PAYMENT',NEGOTIATION:'BY NEGOTIATION',MIXED:'BY MIXED PYMT'};
  lines.push(`:41D:${(pt.availableWith||'ANY BANK').toUpperCase()}\n${availByMap[pt.methodOfPayment]||'BY PAYMENT'}`);
  if((pt.methodOfPayment==='USANCE'||pt.methodOfPayment==='DEFERRED')&&pt.tenorDays) lines.push(`:42C:${pt.tenorDays} DAYS ${(pt.tenorBasis||'AFTER SIGHT').toUpperCase()}`);
  if(pt.mixedPaymentDetails) lines.push(`:42M:${wrapLines(pt.mixedPaymentDetails)}`);
  if(pt.deferredNegotiationDetails) lines.push(`:42P:${wrapLines(pt.deferredNegotiationDetails)}`);
  lines.push(`:43P:${shipment.partialShipment==='ALLOWED'?'ALLOWED':shipment.partialShipment==='NOT_ALLOWED'?'NOT ALLOWED':'CONDITIONAL'}`);
  lines.push(`:43T:${shipment.transhipment==='ALLOWED'?'ALLOWED':shipment.transhipment==='NOT_ALLOWED'?'NOT ALLOWED':'CONDITIONAL'}`);
  if(shipment.placeOfTakingInCharge) lines.push(`:44A:${pad(shipment.placeOfTakingInCharge.toUpperCase(),65)}`);
  if(shipment.portOfLoading) lines.push(`:44E:${pad(shipment.portOfLoading.toUpperCase(),65)}`);
  if(shipment.portOfDischarge) lines.push(`:44F:${pad(shipment.portOfDischarge.toUpperCase(),65)}`);
  if(shipment.placeOfFinalDestination) lines.push(`:44B:${pad(shipment.placeOfFinalDestination.toUpperCase(),65)}`);
  if(shipment.latestShipmentDate) lines.push(`:44C:${swiftDate(shipment.latestShipmentDate)}`);
  if(shipment.shipmentPeriod) lines.push(`:44D:${pad(shipment.shipmentPeriod.toUpperCase(),65)}`);
  lines.push(':45A:');
  for (const line of goods.lines) {
    lines.push(pad(line.description.toUpperCase(),65));
    if(line.hsCode) lines.push(`HS CODE: ${line.hsCode}`);
    if(line.countryOfOrigin) lines.push(`ORIGIN: ${line.countryOfOrigin.toUpperCase()}`);
    lines.push(`QTY: ${line.quantity} ${line.unit} AT ${ae.currency}${line.unitPrice.toFixed(2)}/UNIT`);
  }
  lines.push(`INCOTERMS: ${(goods.incoterms||'').toUpperCase()} ${(goods.namedPlace||'').toUpperCase()}`);
  lines.push(goods.importLicenseType==='LICENSE'&&goods.importLicenseRef?`IMPORT LICENCE: ${goods.importLicenseRef}`:'IMPORT UNDER OGL');
  lines.push(':46A:');
  for (const doc of documents.requirements) {
    let dl = doc.originals>0?`${doc.originals} ORIGINAL`:""; if(doc.copies>0) dl+=` AND ${doc.copies} COPY`; dl+=` OF ${doc.name.toUpperCase()}`;
    lines.push(dl.trim());
  }
  if(pt.specialPaymentConditions) { lines.push(':47A:'); lines.push(wrapLines(pt.specialPaymentConditions.toUpperCase())); }
  lines.push(':48:21 DAYS AFTER DATE OF SHIPMENT BUT WITHIN VALIDITY OF THE CREDIT');
  const confMap: Record<string,string> = {WITHOUT:'WITHOUT',MAY_ADD:'MAY ADD',CONFIRM:'CONFIRM'};
  lines.push(`:49:${confMap[rules.confirmationInstruction]||'WITHOUT'}`);
  lines.push(':53A:CITIUS33XXX');
  lines.push(`:71A:${sc.bankChargesBy}`);
  if(rules.confirmationInstruction!=='WITHOUT'&&sc.confirmationChargesBy) lines.push(`:71M:APPL`);
  if(ben.bankBIC) lines.push(`:57A:${ben.bankBIC}`);
  if(documents.bankInstructions) lines.push(`:72:${wrapLines(documents.bankInstructions.toUpperCase())}`);
  if(rules.preAdviceReference) lines.push(`:23:${pad(rules.preAdviceReference,16)}`);
  lines.push('-}');
  return lines.join('\n');
}
