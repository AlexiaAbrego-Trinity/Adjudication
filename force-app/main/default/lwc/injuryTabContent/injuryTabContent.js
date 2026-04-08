import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getInjuryData from '@salesforce/apex/TRM_BCNAdjudicationApi.getInjuryData';

/**
 * @description Injury Tab Content - REAL DATA from TRM_BCNAdjudicationApi.getInjuryData()
 * @author Trinity Deployment Architect
 * @date 2025-01-09
 * 
 * RAY'S REQUIREMENTS: Display covered injuries per Member Account for Claims workflow
 * TRINITY PRINCIPLE: No hardcoded data - everything from sandbox sample data
 */
export default class InjuryTabContent extends LightningElement {
    @api recordId;
    
    injuryData;
    error;
    isLoading = true;

    @wire(getInjuryData, { caseId: '$recordId' })
    wiredInjuryData({ error, data }) {
        this.isLoading = false;
        if (data) {
            this.injuryData = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.injuryData = undefined;
            this.showErrorToast('Error loading injury data', error.body?.message || error.message);
        }
    }

    get hasInjuryData() {
        return this.injuryData && this.injuryData.injuries && this.injuryData.injuries.length > 0;
    }

    get injuries() {
        return this.injuryData?.injuries || [];
    }

    get memberAccountInfo() {
        return this.injuryData?.memberAccountInfo || {};
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