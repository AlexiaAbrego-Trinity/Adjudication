/**
 * @description Case-level duplicate detection summary component
 * ADDED: For Case-level duplicate detection enhancement
 * Provides immediate visibility of duplicate status on Case record pages
 * 
 * @author Trinity CRM
 * @date 2025-09-01
 * @version 1.0
 */
import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
import DUPLICATE_CHECK_CHANNEL from '@salesforce/messageChannel/DuplicateCheckChannel__c';
import getCaseDuplicateSummary from '@salesforce/apex/TRM_DuplicateDetectionApi.getCaseDuplicateSummary';
import getBillIdFromCase from '@salesforce/apex/TRM_MedicalBillingService.getBillIdFromCase';
import triggerBillDuplicateCheck from '@salesforce/apex/TRM_DuplicateDetectionApi.triggerBillDuplicateCheck';

// Case fields needed for component
const CASE_FIELDS = ['Case.Id', 'Case.CaseNumber', 'Case.BCN__c'];

export default class TrmCaseDuplicateSummary extends LightningElement {
    @api recordId; // Case record ID from record page context

    // Component state
    caseSummary = null;
    error = null;
    isLoading = true;
    wiredSummaryResult;

    // LMS: Subscription for duplicate check completion messages
    subscription = null;

    // LMS: Wire MessageContext for subscribing to messages
    @wire(MessageContext)
    messageContext;

    /**
     * @description Component lifecycle - NO auto-trigger (detection runs when stage changes to Bill Review)
     * CHANGED: Removed auto-trigger to prevent duplicate detection on page load
     * ADDED: Subscribe to LMS for duplicate check completion from grid
     */
    connectedCallback() {
        console.log('[TrmCaseDuplicateSummary] Component loaded - waiting for duplicate detection from grid stage change');
        console.log('[TrmCaseDuplicateSummary] Case ID:', this.recordId);

        // LMS: Subscribe to duplicate check completion messages
        this.subscribeToMessageChannel();
    }

    /**
     * @description Component lifecycle cleanup
     * ADDED: Unsubscribe from LMS when component is destroyed
     */
    disconnectedCallback() {
        this.unsubscribeFromMessageChannel();
    }

    /**
     * @description Subscribe to LMS duplicate check channel
     * ADDED: Listen for duplicate check completion from grid via LMS
     */
    subscribeToMessageChannel() {
        if (!this.subscription) {
            this.subscription = subscribe(
                this.messageContext,
                DUPLICATE_CHECK_CHANNEL,
                (message) => this.handleDuplicateCheckMessage(message)
            );
            console.log('[TrmCaseDuplicateSummary] Subscribed to duplicate check channel');
        }
    }

    /**
     * @description Unsubscribe from LMS duplicate check channel
     * ADDED: Clean up subscription when component is destroyed
     */
    unsubscribeFromMessageChannel() {
        if (this.subscription) {
            unsubscribe(this.subscription);
            this.subscription = null;
            console.log('[TrmCaseDuplicateSummary] Unsubscribed from duplicate check channel');
        }
    }

    /**
     * @description Handle duplicate check completion message from LMS
     * ADDED: Auto-refresh summary when grid completes duplicate detection
     */
    async handleDuplicateCheckMessage(message) {
        console.log('[TrmCaseDuplicateSummary] Received duplicate check message via LMS', message);

        // Only refresh if the message is for this Case
        if (message.caseId === this.recordId) {
            try {
                // Refresh the summary data to get updated lastCheckDate
                await refreshApex(this.wiredSummaryResult);

                console.log('[TrmCaseDuplicateSummary] Summary refreshed after duplicate check');
            } catch (error) {
                console.error('[TrmCaseDuplicateSummary] Error refreshing summary:', error);
            }
        } else {
            console.log('[TrmCaseDuplicateSummary] Message is for different Case, ignoring');
        }
    }

    /**
     * @description Run automatic duplicate detection for the Case's Bill
     */
    async runAutoDuplicateCheck() {
        try {
            console.log('[TrmCaseDuplicateSummary] Getting Bill ID from Case...');

            // Get Bill ID from Case
            const billId = await getBillIdFromCase({ caseId: this.recordId });

            if (!billId) {
                console.log('[TrmCaseDuplicateSummary] No Bill associated with this Case - skipping duplicate check');
                return;
            }

            console.log('[TrmCaseDuplicateSummary] Bill ID resolved:', billId);
            console.log('[TrmCaseDuplicateSummary] Triggering duplicate detection...');

            // Trigger duplicate detection for the Bill
            const result = await triggerBillDuplicateCheck({ billId: billId });

            console.log('[TrmCaseDuplicateSummary] Duplicate check completed:', result);

            // Dispatch event to notify other components
            this.dispatchEvent(new CustomEvent('duplicatecheckComplete', {
                detail: {
                    caseId: this.recordId,
                    billId: billId,
                    message: result,
                    source: 'caseSummary'
                },
                bubbles: true,
                composed: true
            }));

            // Refresh the summary data
            await refreshApex(this.wiredSummaryResult);

            console.log('[TrmCaseDuplicateSummary] Summary refreshed');

        } catch (error) {
            console.error('[TrmCaseDuplicateSummary] Error running auto duplicate check:', error);
            // Don't show error to user - it's an automatic background process
        }
    }

    /**
     * @description Wire Case record data
     */
    @wire(getRecord, { recordId: '$recordId', fields: CASE_FIELDS })
    caseRecord;

    /**
     * @description Wire Case duplicate summary data
     */
    @wire(getCaseDuplicateSummary, { caseId: '$recordId' })
    wiredCaseSummary(result) {
        this.wiredSummaryResult = result;
        this.isLoading = true;

        if (result.data) {
            this.caseSummary = result.data;
            this.error = null;
            this.isLoading = false;
        } else if (result.error) {
            this.error = result.error;
            this.caseSummary = null;
            this.isLoading = false;
            console.error('TrmCaseDuplicateSummary: Error loading summary', result.error);
        }
    }
    
    /**
     * @description Check if component should be visible
     * GETTER: Prevents LWC1060 template expression error
     * CHANGED: Only show after duplicate detection has run (lastCheckDate != null)
     */
    get showComponent() {
        return this.recordId && !this.isLoading && this.caseSummary && this.caseSummary.lastCheckDate != null;
    }
    
    /**
     * @description Check if summary data is available
     * GETTER: Prevents LWC1060 template expression error
     */
    get hasSummaryData() {
        return this.caseSummary && !this.error;
    }
    
    /**
     * @description Check if there are any duplicate warnings
     * GETTER: Prevents LWC1060 template expression error
     */
    get hasWarnings() {
        return this.caseSummary && this.caseSummary.hasWarnings;
    }
    
    /**
     * @description Get status icon name based on duplicate status
     * GETTER: Prevents LWC1060 template expression error
     */
    get statusIconName() {
        if (!this.caseSummary) return 'utility:info';
        
        if (this.caseSummary.exactMatches > 0) {
            return 'utility:error';
        } else if (this.caseSummary.potentialMatches > 0) {
            return 'utility:warning';
        }
        return 'utility:success';
    }
    
    /**
     * @description Get status icon variant for styling
     * GETTER: Prevents LWC1060 template expression error
     */
    get statusIconVariant() {
        if (!this.caseSummary) return 'neutral';
        
        if (this.caseSummary.exactMatches > 0) {
            return 'error';
        } else if (this.caseSummary.potentialMatches > 0) {
            return 'warning';
        }
        return 'success';
    }
    
    /**
     * @description Get component CSS classes based on status
     * GETTER: Prevents LWC1060 template expression error
     */
    get componentClasses() {
        let baseClasses = 'case-duplicate-summary slds-card';
        
        if (this.caseSummary && this.caseSummary.statusClass) {
            baseClasses += ' ' + this.caseSummary.statusClass;
        }
        
        return baseClasses;
    }
    
    /**
     * @description Get exact matches label with proper pluralization
     * GETTER: Prevents LWC1060 template expression error
     */
    get exactMatchesLabel() {
        if (!this.caseSummary) return 'Exact Matches';
        const count = this.caseSummary.exactMatches || 0;
        return `Exact Match${count !== 1 ? 'es' : ''}`;
    }
    
    /**
     * @description Get potential matches label with proper pluralization
     * GETTER: Prevents LWC1060 template expression error
     */
    get potentialMatchesLabel() {
        if (!this.caseSummary) return 'Potential Matches';
        const count = this.caseSummary.potentialMatches || 0;
        return `Potential Match${count !== 1 ? 'es' : ''}`;
    }
    
    /**
     * @description Get bills label with proper pluralization
     * GETTER: Prevents LWC1060 template expression error
     */
    get billsLabel() {
        if (!this.caseSummary) return 'Bills';
        const count = this.caseSummary.totalBills || 0;
        return `Bill${count !== 1 ? 's' : ''}`;
    }
    
    /**
     * @description Get line items label with proper pluralization
     * GETTER: Prevents LWC1060 template expression error
     */
    get lineItemsLabel() {
        if (!this.caseSummary) return 'Line Items';
        const count = this.caseSummary.totalLineItems || 0;
        return `Line Item${count !== 1 ? 's' : ''}`;
    }
    
    /**
     * @description Get formatted last check date
     * GETTER: Prevents LWC1060 template expression error
     */
    get formattedLastCheck() {
        if (!this.caseSummary || !this.caseSummary.lastCheckDate) {
            return 'Never checked';
        }
        
        const checkDate = new Date(this.caseSummary.lastCheckDate);
        return checkDate.toLocaleString();
    }
    
    /**
     * @description Handle View All Duplicates button click
     * Opens comprehensive modal with all duplicate matches
     */
    handleViewAllDuplicates() {
        // Dispatch custom event to open comprehensive modal
        const viewAllEvent = new CustomEvent('viewallduplicates', {
            detail: {
                caseId: this.recordId,
                caseSummary: this.caseSummary
            },
            bubbles: true,
            composed: true
        });
        
        this.dispatchEvent(viewAllEvent);
    }
    
    /**
     * @description Handle refresh button click
     * Refreshes the duplicate summary data
     */
    async handleRefresh() {
        this.isLoading = true;
        
        try {
            await refreshApex(this.wiredSummaryResult);
            
            this.dispatchEvent(new ShowToastEvent({
                title: 'Success',
                message: 'Duplicate summary refreshed successfully',
                variant: 'success'
            }));
            
        } catch (error) {
            console.error('TrmCaseDuplicateSummary: Refresh error', error);
            
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'Failed to refresh duplicate summary: ' + error.body?.message || error.message,
                variant: 'error'
            }));
        }
        
        this.isLoading = false;
    }
}