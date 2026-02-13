/**
 * @description Bill-level duplicate detection summary component
 * @author Trinity Development Team
 * @date 2025-09-01
 * @version 2.0.0
 * 
 * This component provides immediate duplicate visibility at the Bill record level
 * without requiring users to drill down to individual line items.
 * 
 * Features:
 * - Real-time duplicate count display
 * - Visual indicators for exact vs potential matches
 * - Manual "Check All" functionality
 * - Integration with Bill record pages
 */
import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { NavigationMixin } from 'lightning/navigation';
import getBillDuplicateSummary from '@salesforce/apex/TRM_DuplicateDetectionApi.getBillDuplicateSummary';
import triggerBillDuplicateCheck from '@salesforce/apex/TRM_DuplicateDetectionApi.triggerBillDuplicateCheck';
import getBillLineItemsWithMatches from '@salesforce/apex/TRM_DuplicateDetectionApi.getBillLineItemsWithMatches';
import getBillIdFromCase from '@salesforce/apex/TRM_MedicalBillingService.getBillIdFromCase';

export default class TrmBillDuplicateSummary extends NavigationMixin(LightningElement) {
    @api recordId; // Case ID (when used in Case page) or Bill ID (when used in Bill page)
    @track billId; // Actual Bill ID to use for duplicate detection
    @track isLoading = false;
    @track isCheckingDuplicates = false;

    // Modal state
    @track showModal = false;
    @track isLoadingMatches = false;
    @track modalError = null;
    @track allMatches = [];
    @track groupedMatches = [];

    // Wire the Bill duplicate summary data
    @wire(getBillDuplicateSummary, { billId: '$billId' })
    duplicateSummary;

    /**
     * @description Component lifecycle - Auto-trigger duplicate detection when Case/Bill is opened
     * AUTO DUPLICATE CHECK: Runs EVERY TIME the Case is opened to ensure fresh data
     */
    async connectedCallback() {
        console.log('[TrmBillDuplicateSummary] Component loaded - triggering automatic duplicate detection');
        console.log('[TrmBillDuplicateSummary] Initial recordId (Case or Bill):', this.recordId);

        // Wait a bit for recordId to be available
        setTimeout(async () => {
            console.log('[TrmBillDuplicateSummary] After timeout - recordId:', this.recordId);
            if (this.recordId) {
                // Get Bill ID from Case (recordId could be Case ID or Bill ID)
                await this.resolveBillId();

                if (this.billId) {
                    console.log('[TrmBillDuplicateSummary] Bill ID resolved:', this.billId);
                    console.log('[TrmBillDuplicateSummary] Calling handleCheckAllDuplicates()');
                    this.handleCheckAllDuplicates();
                } else {
                    console.warn('[TrmBillDuplicateSummary] No Bill ID available - skipping auto-detect');
                }
            } else {
                console.warn('[TrmBillDuplicateSummary] No recordId available - skipping auto-detect');
            }
        }, 500);
    }

    /**
     * @description Resolve Bill ID from Case ID or use recordId directly if it's already a Bill ID
     */
    async resolveBillId() {
        try {
            // Try to get Bill ID from Case (assumes recordId is Case ID)
            const resolvedBillId = await getBillIdFromCase({ caseId: this.recordId });

            if (resolvedBillId) {
                console.log('[TrmBillDuplicateSummary] Bill ID from Case:', resolvedBillId);
                this.billId = resolvedBillId;
            } else {
                // If no Bill found via Case, assume recordId is already a Bill ID
                console.log('[TrmBillDuplicateSummary] No Bill from Case - using recordId as Bill ID');
                this.billId = this.recordId;
            }
        } catch (error) {
            console.error('[TrmBillDuplicateSummary] Error resolving Bill ID:', error);
            // Fallback: assume recordId is Bill ID
            this.billId = this.recordId;
        }
    }

    /**
     * @description Check if component should be visible
     */
    get isVisible() {
        return this.recordId && this.duplicateSummary?.data;
    }
    
    /**
     * @description Get summary data safely
     */
    get summaryData() {
        return this.duplicateSummary?.data || {};
    }
    
    /**
     * @description Check if there are any duplicate warnings
     */
    get hasWarnings() {
        return this.summaryData.hasWarnings === true;
    }
    
    /**
     * @description Get total warning count
     */
    get totalWarnings() {
        return this.summaryData.totalWarnings || 0;
    }
    
    /**
     * @description Get exact match count
     */
    get exactMatches() {
        return this.summaryData.exactMatches || 0;
    }
    
    /**
     * @description Get potential match count
     */
    get potentialMatches() {
        return this.summaryData.potentialMatches || 0;
    }
    
    /**
     * @description Get total line items count
     */
    get totalLineItems() {
        return this.summaryData.totalLineItems || 0;
    }
    
    /**
     * @description Get formatted summary message
     */
    get summaryMessage() {
        return this.summaryData.summaryMessage || 'Loading duplicate summary...';
    }
    
    /**
     * @description Get CSS class for summary container based on warning level
     */
    get summaryContainerClass() {
        if (!this.hasWarnings) {
            return 'summary-container no-warnings';
        } else if (this.exactMatches > 0) {
            return 'summary-container exact-warnings';
        } else {
            return 'summary-container potential-warnings';
        }
    }
    
    /**
     * @description Get icon name based on warning status
     */
    get warningIcon() {
        if (!this.hasWarnings) {
            return 'utility:success';
        } else if (this.exactMatches > 0) {
            return 'utility:error';
        } else {
            return 'utility:warning';
        }
    }
    
    /**
     * @description Get icon variant based on warning status
     */
    get iconVariant() {
        if (!this.hasWarnings) {
            return 'success';
        } else if (this.exactMatches > 0) {
            return 'error';
        } else {
            return 'warning';
        }
    }
    
    /**
     * @description Check if manual check button should be enabled
     */
    get isCheckButtonDisabled() {
        return this.isCheckingDuplicates || this.totalLineItems === 0;
    }
    
    /**
     * @description Get button label for manual check
     */
    get checkButtonLabel() {
        if (this.isCheckingDuplicates) {
            return 'Checking...';
        }
        return `Check All Duplicates (${this.totalLineItems} items)`;
    }

    /**
     * @description Get exact match label with proper pluralization
     * ADDED: Fix for LWC1060 - Template expressions don't allow ConditionalExpression
     */
    get exactMatchLabel() {
        return `Exact Match${this.exactMatches > 1 ? 'es' : ''}`;
    }

    /**
     * @description Get potential match label with proper pluralization
     * ADDED: Fix for LWC1060 - Template expressions don't allow ConditionalExpression
     */
    get potentialMatchLabel() {
        return `Potential Match${this.potentialMatches > 1 ? 'es' : ''}`;
    }

    /**
     * @description Check if there are matches to show in modal
     */
    get hasMatchesToShow() {
        return this.groupedMatches && this.groupedMatches.length > 0;
    }
    
    /**
     * @description Handle manual duplicate check for all line items
     * AUTO DUPLICATE CHECK: Toasts removed to avoid repetitive notifications
     */
    async handleCheckAllDuplicates() {
        if (!this.billId) {
            console.warn('[TrmBillDuplicateSummary] No Bill ID available');
            return;
        }

        this.isCheckingDuplicates = true;

        try {
            const result = await triggerBillDuplicateCheck({ billId: this.billId });

            console.log('[TrmBillDuplicateSummary] Duplicate check completed:', result);

            // Dispatch event to notify parent components FIRST
            this.dispatchEvent(new CustomEvent('duplicatecheckComplete', {
                detail: {
                    billId: this.billId,
                    message: result,
                    source: 'summary'
                },
                bubbles: true,
                composed: true
            }));

            // THEN refresh the summary data (like the refresh button does)
            await refreshApex(this.duplicateSummary);

        } catch (error) {
            console.error('[TrmBillDuplicateSummary] Check duplicates error:', error);
            // Only show toast on error (not on success to avoid repetitive notifications)
            this.showToast('Error', error.body?.message || 'Failed to check duplicates', 'error');
        } finally {
            this.isCheckingDuplicates = false;
        }
    }
    
    /**
     * @description Handle view details action - show modal with parsed matching records
     */
    async handleViewDetails() {
        if (!this.summaryData || !this.hasWarnings) {
            this.showToast('Info', 'No duplicate matches to display', 'info');
            return;
        }

        this.showModal = true;
        this.isLoadingMatches = true;
        this.modalError = null;

        try {
            // Parse matching records from all line items with duplicates
            await this.loadAndParseMatchingRecords();
        } catch (error) {
            console.error('[TrmBillDuplicateSummary] Error loading matches:', error);
            this.modalError = error.message || 'Failed to load duplicate details';
        } finally {
            this.isLoadingMatches = false;
        }
    }
    
    /**
     * @description Show toast message
     */
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: variant === 'error' ? 'sticky' : 'dismissable'
        });
        this.dispatchEvent(event);
    }
    
    /**
     * @description Handle component errors
     */
    get hasError() {
        return this.duplicateSummary?.error;
    }
    
    /**
     * @description Get error message
     */
    get errorMessage() {
        return this.duplicateSummary?.error?.body?.message || 'Unknown error occurred';
    }

    /**
     * @description Load and parse matching records from Bill Line Items
     */
    async loadAndParseMatchingRecords() {
        try {
            // Get all line items for this Bill that have matching records
            const lineItemsWithMatches = await getBillLineItemsWithMatches({ billId: this.billId });

            if (!lineItemsWithMatches || lineItemsWithMatches.length === 0) {
                this.groupedMatches = [];
                return;
            }

            // Parse and group all matching records
            const allMatches = [];

            for (const lineItem of lineItemsWithMatches) {
                if (lineItem.Matching_Records__c) {
                    try {
                        const matchingRecords = JSON.parse(lineItem.Matching_Records__c);

                        // Process each matching record
                        for (const match of matchingRecords) {
                            const processedMatch = {
                                recordId: match.recordId,
                                recordName: match.recordName || `Line Item ${match.recordId}`,
                                matchType: match.matchType || 'Unknown',
                                matchTypeLabel: this.getMatchTypeLabel(match.matchType),
                                confidence: match.confidence || 0,
                                confidenceLabel: this.getConfidenceLabel(match.confidence),
                                chargeAmount: match.chargeAmount,
                                formattedChargeAmount: this.formatCurrency(match.chargeAmount),
                                serviceStartDate: match.serviceStartDate,
                                serviceEndDate: match.serviceEndDate,
                                formattedServiceDates: this.formatServiceDates(match.serviceStartDate, match.serviceEndDate),
                                procedureCode: match.procedureCode || 'N/A',
                                patientId: match.patientId,
                                sourceLineItemId: lineItem.Id,
                                sourceLineItemName: lineItem.Name
                            };

                            allMatches.push(processedMatch);
                        }
                    } catch (parseError) {
                        console.error('[TrmBillDuplicateSummary] Error parsing matching records for line item:', lineItem.Id, parseError);
                    }
                }
            }

            // Group matches by type
            this.groupedMatches = this.groupMatchesByType(allMatches);

        } catch (error) {
            console.error('[TrmBillDuplicateSummary] Error loading line items with matches:', error);
            throw new Error('Failed to load duplicate details: ' + (error.body?.message || error.message));
        }
    }

    /**
     * @description Group matches by match type
     */
    groupMatchesByType(matches) {
        const groups = {};

        for (const match of matches) {
            const groupKey = match.matchType;
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    groupTitle: this.getGroupTitle(groupKey),
                    matches: []
                };
            }
            groups[groupKey].matches.push(match);
        }

        // Convert to array and sort by priority (Exact first, then Potential)
        return Object.values(groups).sort((a, b) => {
            const priority = { 'Exact': 1, 'Potential': 2 };
            return (priority[a.matches[0]?.matchType] || 999) - (priority[b.matches[0]?.matchType] || 999);
        });
    }

    /**
     * @description Get group title for match type
     */
    getGroupTitle(matchType) {
        switch (matchType) {
            case 'Exact':
                return 'Exact Matches';
            case 'Potential':
                return 'Potential Matches';
            default:
                return 'Other Matches';
        }
    }

    /**
     * @description Get match type label
     */
    getMatchTypeLabel(matchType) {
        switch (matchType) {
            case 'Exact':
                return 'Exact Match';
            case 'Potential':
                return 'Potential Match';
            default:
                return 'Match';
        }
    }

    /**
     * @description Get confidence label
     */
    getConfidenceLabel(confidence) {
        if (confidence >= 90) return 'Very High';
        if (confidence >= 75) return 'High';
        if (confidence >= 50) return 'Medium';
        if (confidence >= 25) return 'Low';
        return 'Very Low';
    }

    /**
     * @description Format currency amount
     */
    formatCurrency(amount) {
        if (amount == null) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    /**
     * @description Format service dates
     */
    formatServiceDates(startDate, endDate) {
        if (!startDate) return 'N/A';

        const formatDate = (date) => {
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        };

        if (startDate === endDate || !endDate) {
            return formatDate(startDate);
        }

        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }

    /**
     * @description Handle modal close
     */
    handleCloseModal() {
        this.showModal = false;
        this.modalError = null;
        this.allMatches = [];
        this.groupedMatches = [];
    }

    /**
     * @description Handle navigation to record
     */
    handleNavigateToRecord(event) {
        const recordId = event.target.dataset.recordId;
        if (recordId) {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: recordId,
                    actionName: 'view'
                }
            });
        }
    }
}