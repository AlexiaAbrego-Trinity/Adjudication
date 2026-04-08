/**
 * BCN Quote Quick Action - TRINITY SURGICAL QUICK ACTION LAUNCHER
 *
 * EXACT REPLICA of bcnQuoteEmbeddedInterface functionality as a Quick Action modal
 * Contains ALL tabs and grid exactly like the embedded interface
 *
 * Trinity Deployment Architect - Quick Action Implementation
 * Client Requirement: "The client wants it that way" - Quick Action modal
 * Ray's Requirement: "huge" workflow need for modal interface
 */

import { LightningElement, api, track, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import { getRecord, notifyRecordUpdateAvailable } from 'lightning/uiRecordApi';
import { CloseActionScreenEvent } from 'lightning/actions';
import { RefreshEvent } from 'lightning/refresh';
import getBillHeaderData from '@salesforce/apex/TRM_MedicalBillingService.getBillHeaderData';
import isCurrentUserSystemAdmin from '@salesforce/apex/TRM_MedicalBillingService.isCurrentUserSystemAdmin';

// Case fields for alert system - EXACT REPLICA from bcnQuoteEmbeddedInterface
const CASE_FIELDS = [
    'Case.Id',
    'Case.CaseNumber',
    'Case.Status',
    'Case.Priority',
    'Case.Subject',
    'Case.LastModifiedDate',
    'Case.Current_Adjudication_Stage__c' // CLIENT REQUEST: For Bill link visibility check
];

export default class BcnQuoteQuickAction extends NavigationMixin(LightningElement) {
    @api recordId;
    @track showModal = false;

    // EXACT REPLICA: Private properties from bcnQuoteEmbeddedInterface
    _effectiveRecordId = null;
    caseData = null;
    billData = null; // TRINITY: Bill header data

    // CLIENT REQUEST: Admin check for Bill link visibility
    @track isAdmin = false;

    // TRINITY: Track total paid from grid footer (real-time calculation)
    @track gridTotalPaid = 0;

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
            console.log('🔍 Quick Action: Bill header data loaded:', JSON.stringify(data));
            console.log('🔍 billData.billId:', data.billId);
            console.log('🔍 billData keys:', Object.keys(data));
        } else if (error) {
            console.error('Quick Action: Error loading Bill header data:', error);
            this.billData = null;
        }
    }

    // CLIENT REQUEST: Check if current user is System Administrator
    @wire(isCurrentUserSystemAdmin)
    wiredIsAdmin({ error, data }) {
        if (data !== undefined) {
            this.isAdmin = data;
            console.log('🔍 Quick Action: User is admin:', data, '(type:', typeof data, ')');
        } else if (error) {
            console.error('Quick Action: Error checking admin status:', error);
            this.isAdmin = false;
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

    // RAY FEEDBACK #10: Total Paid display in Bill Header
    // TRINITY: Use real-time calculation from grid footer (sum of Approved_Amount__c)
    get billTotalPaid() {
        const value = this.gridTotalPaid || 0;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    }

    get billTotalPaidIsNull() {
        return !this.gridTotalPaid || this.gridTotalPaid === 0;
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
            case 'send to netsuite':
                // CLIENT REQUEST (2026-02-04): Display "SEND TO NETSUITE" for status "Send To Netsuite"
                return { level: 'success', text: 'SEND TO NETSUITE', class: 'status-success' };
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

    // CLIENT REQUEST: Check if Case is in Adjudicated stage (locked)
    get isAdjudicated() {
        const stage = this.caseData?.fields?.Current_Adjudication_Stage__c?.value;
        console.log('🔍 DEBUG isAdjudicated - Current_Adjudication_Stage__c:', stage);
        return stage === 'Adjudicated';
    }

    // CLIENT REQUEST: Show Bill link only if admin AND case is adjudicated
    get showBillLink() {
        const isAdmin = this.isAdmin === true;
        const isAdjudicated = this.isAdjudicated === true;
        const hasBillId = !!this.billRecordId;
        const result = isAdmin && isAdjudicated && hasBillId;
        console.log('🔍 DEBUG showBillLink - isAdmin:', isAdmin, 'isAdjudicated:', isAdjudicated, 'hasBillId:', hasBillId, 'billRecordId:', this.billRecordId, 'result:', result);
        return result;
    }

    // CLIENT REQUEST: Get Bill record ID for navigation
    get billRecordId() {
        return this.billData?.Id;
    }

    // CLIENT REQUEST: Handle navigation to Bill record
    handleNavigateToBill(event) {
        const recordId = event.currentTarget.dataset.recordId;

        if (recordId) {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: recordId,
                    objectApiName: 'Bill__c',
                    actionName: 'view'
                }
            });
        }
    }

    // TRINITY QUICK ACTION: Simple modal control methods
    openModal() {
        this.showModal = true;
        console.log('TRINITY QUICK ACTION: Opened for record:', this.effectiveRecordId);
    }

    closeModal() {
        this.showModal = false;
        console.log('TRINITY QUICK ACTION: Closed');

        // Esperar 500ms para que el save + DLRS terminen y se propague a la UI
        setTimeout(() => {
            // Notificar que el Bill record fue actualizado (más específico que RefreshEvent)
            if (this.billData?.Id) {
                notifyRecordUpdateAvailable([{ recordId: this.billData.Id }]);
                console.log('TRINITY: Notified Bill record update:', this.billData.Id);
            }

            // También disparar RefreshEvent para refrescar toda la página
            this.dispatchEvent(new RefreshEvent());
            console.log('TRINITY: Page refreshed after save + DLRS calculation (500ms delay)');

            // Close the Quick Action AFTER refresh
            this.closeQuickAction();
        }, 500);
    }

    // TRINITY QUICK ACTION: Close the Quick Action screen
    closeQuickAction() {
        this.dispatchEvent(new CloseActionScreenEvent());
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
        // TRINITY QUICK ACTION: Auto-open modal when component loads
        this.showModal = true;
        console.log('TRINITY QUICK ACTION: Component loaded with recordId:', this.recordId);

        // MVADM-XXX FIX: Refresh grid data when modal opens to show latest changes
        // Uses proper LWC @api method communication (respects Shadow DOM)
        setTimeout(() => {
            const tabContainer = this.template.querySelector('c-bcn-quote-tab-container');
            if (tabContainer && typeof tabContainer.refreshGrid === 'function') {
                tabContainer.refreshGrid();
                console.log('TRINITY: Grid refresh triggered via @api method');
            } else {
                console.warn('TRINITY: Tab container not found or refreshGrid() not available');
            }
        }, 300); // 300ms delay to ensure DOM is fully rendered
    }

    disconnectedCallback() {
        // Remove escape key listener
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    /**
     * TRINITY: Handle total paid change event from grid footer
     * Updates header display with real-time calculation from grid
     */
    handleTotalPaidChange(event) {
        this.gridTotalPaid = event.detail.totalPaid;
        console.log('TRINITY: Header received total paid update:', this.gridTotalPaid);
    }
}