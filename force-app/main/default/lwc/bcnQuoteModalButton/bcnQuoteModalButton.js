/**
 * BCN Quote Modal Button - TRINITY SURGICAL MODAL LAUNCHER
 *
 * EXACT REPLICA of bcnQuoteEmbeddedInterface functionality as a modal popup
 * Contains ALL tabs and grid exactly like the embedded interface
 *
 * Trinity Deployment Architect - MVADM-77 Implementation
 * Matt's #2 Priority: "simple button which launches the component as a modal"
 * Ray's Requirement: "huge" workflow need for modal interface
 *
 * TRINITY HEADER ENHANCEMENT: Added Bill header data (Payee, Invoice ID, BCN Number)
 * Removed inaccurate "Updated X days ago" timestamp per client requirement
 */

import { LightningElement, api, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { getRecord } from 'lightning/uiRecordApi';
import getBillHeaderData from '@salesforce/apex/TRM_MedicalBillingService.getBillHeaderData';

// Case fields for alert system - EXACT REPLICA from bcnQuoteEmbeddedInterface
const CASE_FIELDS = [
    'Case.Id',
    'Case.CaseNumber',
    'Case.Status',
    'Case.Priority',
    'Case.Subject',
    'Case.LastModifiedDate'
];

export default class BcnQuoteModalButton extends LightningElement {
    @api recordId;
    @track showModal = false;

    // EXACT REPLICA: Private properties from bcnQuoteEmbeddedInterface
    _effectiveRecordId = null;
    caseData = null;
    billData = null; // TRINITY: Bill header data

    // EXACT REPLICA: Wire to get current page reference
    @wire(CurrentPageReference)
    setRef(ref) {
        if (!ref) return;
        const attrId  = ref.attributes?.recordId || null;                 // record pages
        const stateId = ref.state?.c__recordId || ref.state?.recordId || null; // app pages or custom nav
        this._effectiveRecordId = this.recordId || attrId || stateId || this._effectiveRecordId;
    }

    // EXACT REPLICA: Wire to get Case data for alert system
    @wire(getRecord, { recordId: '$effectiveRecordId', fields: CASE_FIELDS })
    wiredCase({ error, data }) {
        if (data) {
            this.caseData = data;
            console.log('Modal: Case data loaded for alerts:', data);
        } else if (error) {
            console.error('Modal: Error loading case data:', error);
            this.caseData = null;
        }
    }

    // TRINITY HEADER ENHANCEMENT: Wire Bill header data
    @wire(getBillHeaderData, { caseId: '$effectiveRecordId' })
    wiredBillHeader({ error, data }) {
        if (data) {
            this.billData = data;
            console.log('Modal: Bill header data loaded:', data);
        } else if (error) {
            console.error('Modal: Error loading Bill header data:', error);
            this.billData = null;
        }
    }

    // EXACT REPLICA: Computed properties from bcnQuoteEmbeddedInterface
    get effectiveRecordId() {
        return this.recordId || this._effectiveRecordId || null;
    }

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

        // EXACT REPLICA: Map real Case.Status values to alert levels
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

    // TRINITY MODAL: Simple modal control methods
    openModal() {
        this.showModal = true;
        console.log('TRINITY MODAL: Opened for record:', this.effectiveRecordId);
    }

    closeModal() {
        this.showModal = false;
        console.log('TRINITY MODAL: Closed');
    }

    // Handle escape key to close modal
    handleKeyDown = (event) => {
        if (event.key === 'Escape' && this.showModal) {
            this.closeModal();
        }
    }

    connectedCallback() {
        // Add escape key listener
        document.addEventListener('keydown', this.handleKeyDown);
        console.log('TRINITY MODAL: Component loaded with recordId:', this.recordId);
    }

    disconnectedCallback() {
        // Remove escape key listener
        document.removeEventListener('keydown', this.handleKeyDown);
    }
}