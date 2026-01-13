// bcnQuoteEmbeddedInterface.js
// TRINITY HEADER ENHANCEMENT: Added Bill header data (Payee, Invoice ID, BCN Number)
// Removed inaccurate "Updated X days ago" timestamp per client requirement
import { LightningElement, api, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { getRecord } from 'lightning/uiRecordApi';
import getBillHeaderData from '@salesforce/apex/TRM_MedicalBillingService.getBillHeaderData';

// Case fields for alert system - using existing schema
const CASE_FIELDS = [
    'Case.Id',
    'Case.CaseNumber',
    'Case.Status',
    'Case.Priority',
    'Case.Subject',
    'Case.LastModifiedDate'
];

export default class BcnQuoteEmbeddedInterface extends LightningElement {
  @api recordId;

  _isExpanded = false;
  _effectiveRecordId = null;
  _observer = null;
  caseData = null;
  billData = null; // TRINITY: Bill header data

  @wire(CurrentPageReference)
  setRef(ref) {
    if (!ref) return;
    const attrId  = ref.attributes?.recordId || null;                 // record pages
    const stateId = ref.state?.c__recordId || ref.state?.recordId || null; // app pages or custom nav
    this._effectiveRecordId = this.recordId || attrId || stateId || this._effectiveRecordId;
  }

  // Wire to get Case data for alert system - REAL SALESFORCE DATA ONLY
  @wire(getRecord, { recordId: '$effectiveRecordId', fields: CASE_FIELDS })
  wiredCase({ error, data }) {
    if (data) {
      this.caseData = data;
      console.log('Case data loaded for alerts:', data);
    } else if (error) {
      console.error('Error loading case data:', error);
      this.caseData = null;
    }
  }

  // TRINITY HEADER ENHANCEMENT: Wire Bill header data
  @wire(getBillHeaderData, { caseId: '$effectiveRecordId' })
  wiredBillHeader({ error, data }) {
    if (data) {
      this.billData = data;
      console.log('Bill header data loaded:', data);
    } else if (error) {
      console.error('Error loading Bill header data:', error);
      this.billData = null;
    }
  }

  get effectiveRecordId() { return this.recordId || this._effectiveRecordId || null; }

  get isExpanded() { return this._isExpanded; }
  get containerClass() { return this._isExpanded ? 'slds-card expanded-interface' : 'slds-card collapsed-interface'; }
  get toggleButtonLabel() { return this._isExpanded ? 'Collapse BCN/Quote Interface' : 'Expand BCN/Quote Interface'; }
  get toggleButtonIcon() { return this._isExpanded ? 'utility:chevronup' : 'utility:chevrondown'; }
  get showContent() { return this._isExpanded; }

  // TRINITY ALERT SYSTEM - Real Case Data Only, No Hardcoded Values
  get caseNumber() {
    return this.caseData?.fields?.CaseNumber?.value || null;
  }

  get caseStatus() {
    return this.caseData?.fields?.Status?.value || null;
  }

  get casePriority() {
    return this.caseData?.fields?.Priority?.value || null;
  }

  get caseSubject() {
    return this.caseData?.fields?.Subject?.value || null;
  }

  // TRINITY HEADER ENHANCEMENT: Bill header computed properties
  // Always return display values - null values will be highlighted
  get billBCNNumber() {
    return this.billData?.BCN_Number__c || '(Not Set)';
  }

  get billBCNNumberIsNull() {
    return !this.billData?.BCN_Number__c;
  }

  get billInvoiceId() {
    return this.billData?.Invoice_Id__c || '(Not Set)';
  }

  get billInvoiceIdIsNull() {
    return !this.billData?.Invoice_Id__c;
  }

  get billPayeeName() {
    // Use Payee_Name_Label__c (text field) with fallback to Payee_Name__r.Name (lookup)
    return this.billData?.Payee_Name_Label__c || this.billData?.Payee_Name__r?.Name || '(Not Set)';
  }

  get billPayeeNameIsNull() {
    return !this.billData?.Payee_Name_Label__c && !this.billData?.Payee_Name__r?.Name;
  }

  get statusAlert() {
    const status = this.caseStatus;
    if (!status) return { level: 'info', text: 'LOADING', class: 'status-info' };

    // Map real Case.Status values to alert levels - NO HARDCODED DATA
    switch (status.toLowerCase()) {
      case 'keying':
        return { level: 'warning', text: 'PENDING REVIEW', class: 'status-warning' };
      case 'new':
        return { level: 'info', text: 'NEW CASE', class: 'status-info' };
      case 'working':
      case 'in progress':
        return { level: 'progress', text: 'IN PROGRESS', class: 'status-progress' };
      case 'closed':
      case 'resolved':
        return { level: 'success', text: 'COMPLETED', class: 'status-success' };
      case 'escalated':
        return { level: 'error', text: 'ESCALATED', class: 'status-error' };
      default:
        return { level: 'info', text: status.toUpperCase(), class: 'status-info' };
    }
  }

  get priorityIcon() {
    const priority = this.casePriority;
    if (!priority) return 'utility:info';

    switch (priority.toLowerCase()) {
      case 'high': return 'utility:priority';
      case 'medium': return 'utility:warning';
      case 'low': return 'utility:info';
      default: return 'utility:info';
    }
  }

  handleToggle() {
    this._isExpanded = !this._isExpanded;
    console.log('Toggle clicked, isExpanded:', this._isExpanded);
  }

  connectedCallback() {
    console.log('BCN Quote Interface loaded with recordId:', this.recordId);
    // TRINITY UX: Interface should be collapsed by default for better usability
    this._isExpanded = false;
  }

  renderedCallback() {
    // TRINITY: No longer needed - we're using custom grid instead of RavenGrid
    // Component is now purely focused on tab container and custom grid integration
  }
}