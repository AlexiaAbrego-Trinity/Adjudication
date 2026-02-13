/**
 * @description Container component for Case-level duplicate detection
 * ADDED: For Case-level duplicate detection enhancement
 * Manages communication between summary and modal components
 * 
 * @author Trinity CRM
 * @date 2025-09-01
 * @version 1.0
 */
import { LightningElement, api, track } from 'lwc';

export default class TrmCaseDuplicateContainer extends LightningElement {
    @api recordId; // Case record ID from record page context
    
    // Modal state
    @track isModalOpen = false;
    @track modalCaseId = null;
    @track modalCaseSummary = null;
    
    /**
     * @description Handle view all duplicates event from summary component
     * Opens the comprehensive modal with Case data
     */
    handleViewAllDuplicates(event) {
        console.log('TrmCaseDuplicateContainer: handleViewAllDuplicates called');
        console.log('TrmCaseDuplicateContainer: event.detail =', event.detail);
        console.log('TrmCaseDuplicateContainer: this.recordId =', this.recordId);

        const detail = event.detail;

        if (detail && detail.caseId) {
            this.modalCaseId = detail.caseId;
            this.modalCaseSummary = detail.caseSummary;
            this.isModalOpen = true;
            console.log('TrmCaseDuplicateContainer: Opening modal with caseId =', this.modalCaseId);
        } else {
            console.error('TrmCaseDuplicateContainer: No caseId in event detail!', detail);
            // Fallback: use recordId from container
            this.modalCaseId = this.recordId;
            this.modalCaseSummary = detail?.caseSummary;
            this.isModalOpen = true;
            console.log('TrmCaseDuplicateContainer: Using fallback recordId =', this.modalCaseId);
        }
    }
    
    /**
     * @description Handle modal close event
     * Closes the comprehensive modal
     */
    handleModalClose() {
        this.isModalOpen = false;
        // DO NOT clear modalCaseId and modalCaseSummary - keep them for next open
        // this.modalCaseId = null;
        // this.modalCaseSummary = null;
    }
    
    /**
     * @description Handle refresh event from modal
     * Refreshes the summary component data
     */
    handleRefreshSummary() {
        // Find and refresh the summary component
        const summaryComponent = this.template.querySelector('c-trm-case-duplicate-summary');
        if (summaryComponent && summaryComponent.handleRefresh) {
            summaryComponent.handleRefresh();
        }
    }
}