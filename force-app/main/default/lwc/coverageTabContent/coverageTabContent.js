import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getCoverageData from '@salesforce/apex/TRM_BCNAdjudicationApi.getCoverageData';

/**
 * @description Coverage Tab Content - REAL DATA from TRM_BCNAdjudicationApi.getCoverageData()
 * @author Trinity Deployment Architect
 * @date 2025-01-09
 * 
 * RAY'S REQUIREMENTS: Display specific care coverage by Member Accounts for Claims workflow
 * TRINITY PRINCIPLE: No hardcoded data - everything from sandbox sample data
 */
export default class CoverageTabContent extends LightningElement {
    @api recordId;
    
    coverageData;
    error;
    isLoading = true;

    @wire(getCoverageData, { caseId: '$recordId' })
    wiredCoverageData({ error, data }) {
        this.isLoading = false;
        if (data) {
            this.coverageData = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.coverageData = undefined;
            this.showErrorToast('Error loading coverage data', error.body?.message || error.message);
        }
    }

    get hasCoverageData() {
        return this.coverageData && (
            this.coverageData.memberAccountName ||
            this.coverageData.sakStatus ||
            this.coverageData.accountExpirationDate ||
            this.coverageData.caseId
        );
    }

    get hasAccountInfo() {
        return this.coverageData && (
            this.coverageData.memberAccountName ||
            this.coverageData.sakStatus ||
            this.coverageData.accountExpirationDate
        );
    }

    get hasCaseInfo() {
        return this.coverageData && (
            this.coverageData.caseId ||
            this.coverageData.caseNumber
        );
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