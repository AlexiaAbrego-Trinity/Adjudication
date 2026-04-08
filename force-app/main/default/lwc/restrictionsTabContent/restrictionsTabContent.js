import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getRestrictionsData from '@salesforce/apex/TRM_BCNAdjudicationApi.getRestrictionsData';

export default class RestrictionsTabContent extends LightningElement {
    @api recordId;
    
    restrictionsData;
    error;
    isLoading = true;

    @wire(getRestrictionsData, { caseId: '$recordId' })
    wiredRestrictionsData({ error, data }) {
        this.isLoading = false;
        if (data) {
            this.restrictionsData = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.restrictionsData = undefined;
            this.showErrorToast('Error loading restrictions data', error.body?.message || error.message);
        }
    }

    get hasRestrictionsData() {
        return this.restrictionsData && this.restrictionsData.restrictions && this.restrictionsData.restrictions.length > 0;
    }

    get restrictions() {
        return this.restrictionsData?.restrictions || [];
    }

    get memberAccountInfo() {
        return this.restrictionsData?.memberAccountInfo || {};
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