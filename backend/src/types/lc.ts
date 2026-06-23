export type LCStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SUBMITTED_TO_BANK' | 'ISSUED' | 'REJECTED';
export type ApplicantType = 'SELF' | 'THIRD_PARTY';
export type LCCategory = 'IMPORT' | 'INLAND';
export type PaymentMethod = 'SIGHT' | 'USANCE' | 'DEFERRED' | 'NEGOTIATION' | 'MIXED';
export type ConfirmationInstruction = 'WITHOUT' | 'MAY_ADD' | 'CONFIRM';
export type PartialShipment = 'ALLOWED' | 'NOT_ALLOWED' | 'CONDITIONAL';
export type BankChargesCode = 'OUR' | 'SHA' | 'BEN' | 'OTH';

export interface ApplicantDetails {
  applicantType: ApplicantType;
  thirdPartyName?: string;
  thirdPartyAddress1?: string;
  thirdPartyAddress2?: string;
  thirdPartyAddress3?: string;
  thirdPartyCity?: string;
  thirdPartyCountry?: string;
  thirdPartyIEC?: string;
  customerReference: string;
  lcCategory: LCCategory;
  applicationDate: string;
  purposeOfImport: string;
}
export interface BeneficiaryDetails {
  name: string; address1: string; address2?: string; address3?: string;
  city: string; country: string; bankAccountNumber: string;
  bankBIC: string; bankName: string; bankCountry: string;
}
export interface LCAmountExpiry {
  currency: string; amount: number; tolerancePlus: number; toleranceMinus: number;
  expiryDate: string; expiryPlace: string; additionalAmountsCovered?: string;
}
export interface LCRules {
  applicableRules: string; methodOfIssue: string; preAdviceReference?: string;
  courierName?: string; confirmationInstruction: ConfirmationInstruction;
  preferredConfirmingBank?: string; isTransferable: boolean;
  preferredTransferringBank?: string; isRevolving: boolean;
  reinstatement?: string; frequency?: string; numberOfReinstatements?: number;
}
export interface GoodsLine {
  id: string; description: string; hsCode: string; countryOfOrigin: string;
  quantity: number; unit: string; unitPrice: number; totalValue: number;
}
export interface GoodsDescription {
  lines: GoodsLine[]; incoterms: string; namedPlace: string;
  countryOfOrigin: string; importLicenseType: 'OGL' | 'LICENSE'; importLicenseRef?: string;
}
export interface ShipmentTerms {
  portOfLoading: string; portOfDischarge: string; placeOfTakingInCharge?: string;
  placeOfFinalDestination?: string; latestShipmentDate: string; shipmentPeriod?: string;
  partialShipment: PartialShipment; transhipment: PartialShipment;
}
export interface DocumentRequirement {
  id: string; name: string; type: 'MANDATORY' | 'OPTIONAL'; originals: number; copies: number;
}
export interface UploadedDocument {
  id: string; name: string; type: 'PROFORMA_INVOICE' | 'PURCHASE_ORDER' | 'IMPORT_LICENSE' | 'OTHER';
  filename: string; uploadedAt: string;
}
export interface DocumentsSection {
  requirements: DocumentRequirement[]; bankInstructions?: string; uploadedDocuments: UploadedDocument[];
}
export interface PaymentTerms {
  methodOfPayment: PaymentMethod; availableWith: string; availableCountry?: string;
  tenorBasis?: string; tenorDays?: number; draweeBankType?: string;
  mixedPaymentDetails?: string; deferredNegotiationDetails?: string; specialPaymentConditions?: string;
}
export interface SettlementCharges {
  debitAccountForPayment: string; bankChargesBy: BankChargesCode;
  chargesDebitAccount?: string; confirmationChargesBy?: string;
  additionalChargesInfo?: string; forwardContractRef?: string;
}
export interface Declaration {
  id: string; title: string; text: string; confirmed: boolean; confirmedAt?: string;
}
export interface MismatchResolution {
  action: 'USE_DOCUMENT_VALUE' | 'REPLACE_DOCUMENT' | 'KEEP_WITH_EXPLANATION';
  explanation?: string; resolvedValue?: string; resolvedAt: string;
}
export interface MismatchResult {
  field: string; swiftTag?: string; formValue: string;
  piValue?: string; poValue?: string;
  status: 'ok' | 'err' | 'warn' | 'pending';
  resolution?: MismatchResolution;
}
export interface LCApplication {
  id: string; applicationRef: string; status: LCStatus; currentStep: number;
  createdAt: string; updatedAt: string; createdBy: string; companyId: string;
  step1?: { applicant: ApplicantDetails; beneficiary: BeneficiaryDetails; amountExpiry: LCAmountExpiry; rules: LCRules; };
  step2?: { goods: GoodsDescription; shipment: ShipmentTerms; documents: DocumentsSection; };
  step3?: { paymentTerms: PaymentTerms; settlementCharges: SettlementCharges; declarations: Declaration[]; };
  step4?: { mismatches: MismatchResult[]; runAt?: string; };
  swiftMT700?: string; submittedAt?: string;
}
export interface BICRecord { bic: string; bank_name: string; country: string; city?: string; }
export interface BeneficiaryRecord {
  id: string; name: string; city: string; country: string; address1?: string;
  bank_bic?: string; bank_name?: string; bank_country?: string; bank_account?: string;
}
