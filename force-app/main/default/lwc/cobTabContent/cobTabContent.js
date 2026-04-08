import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getCOBData from '@salesforce/apex/TRM_BCNAdjudicationApi.getCOBData';

/**
 * @description COB Tab Content - REAL DATA from TRM_BCNAdjudicationApi.getCOBData()
 * @author Trinity Deployment Architect
 * @date 2025-01-09
 *
 * RAY'S REQUIREMENTS: Coordination of Benefits data for Claims workflow
 * TRINITY PRINCIPLE: No hardcoded data - everything from sandbox sample data
 */
export default class CobTabContent extends LightningElement {
    @api recordId;

    cobData;
    error;
    isLoading = true;

    @wire(getCOBData, { caseId: '$recordId' })
    wiredCOBData({ error, data }) {
        this.isLoading = false;
        if (data) {
            this.cobData = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.cobData = undefined;
            this.showErrorToast('Error loading COB data', error.body?.message || error.message);
        }
    }

    // TRINITY ENHANCEMENT: Clean, non-duplicate getters with complete COB data support
    get hasCOBData() {
        return this.cobData != null && !this.error && (
            this.cobData.primaryPayer ||
            this.cobData.secondaryPayer ||
            this.cobData.tertiaryPayer
        );
    }

    get primaryPayer() {
        return this.cobData?.primaryPayer;
    }

    get secondaryPayer() {
        return this.cobData?.secondaryPayer;
    }

    get tertiaryPayer() {
        return this.cobData?.tertiaryPayer;
    }

    get hasPrimaryPayer() {
        return this.primaryPayer != null && (
            this.primaryPayer.name ||
            this.primaryPayer.payerType ||
            this.primaryPayer.priority
        );
    }

    get hasSecondaryPayer() {
        return this.secondaryPayer != null && (
            this.secondaryPayer.name ||
            this.secondaryPayer.payerType ||
            this.secondaryPayer.priority
        );
    }

    get hasTertiaryPayer() {
        return this.tertiaryPayer != null && (
            this.tertiaryPayer.name ||
            this.tertiaryPayer.payerType ||
            this.tertiaryPayer.priority
        );
    }

    // TRINITY ENHANCEMENT: Missing template properties for professional COB interface
    get payers() {
        const payerList = [];
        if (this.primaryPayer) payerList.push(this.primaryPayer);
        if (this.secondaryPayer) payerList.push(this.secondaryPayer);
        if (this.tertiaryPayer) payerList.push(this.tertiaryPayer);
        return payerList;
    }

    get cobSummary() {
        if (!this.cobData) return {};

        return {
            status: this.cobData.cobStatus || 'Active',
            statusClass: this.getCobStatusClass(this.cobData.cobStatus),
            lastUpdated: this.formatDate(this.cobData.lastUpdated),
            totalPayers: this.payers.length
        };
    }

    get medivestrankingInfo() {
        if (!this.cobData) return {};

        return {
            ranking: this.cobData.medivestrankingInfo?.ranking || this.calculateMedivestRanking()
        };
    }

    // TRINITY ENHANCEMENT: Utility methods for professional medical billing interface
    getCobStatusClass(status) {
        switch (status?.toLowerCase()) {
            case 'active':
                return 'summary-value status-active';
            case 'inactive':
                return 'summary-value status-inactive';
            case 'pending':
                return 'summary-value status-pending';
            default:
                return 'summary-value status-unknown';
        }
    }

    calculateMedivestRanking() {
        // Calculate Medivest ranking based on payer hierarchy
        if (this.hasPrimaryPayer && this.hasSecondaryPayer) {
            return 'Secondary';
        } else if (this.hasPrimaryPayer) {
            return 'Primary';
        } else {
            return 'Unknown';
        }
    }

    formatDate(dateValue) {
        if (!dateValue) return 'Not Available';

        try {
            const date = new Date(dateValue);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.warn('TRINITY: Error formatting date', dateValue, error);
            return 'Invalid Date';
        }
    }

    showErrorToast(title, message) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: 'error'
        });
        this.dispatchEvent(event);
    }
}