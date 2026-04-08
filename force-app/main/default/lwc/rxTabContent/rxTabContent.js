import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getRxData from '@salesforce/apex/TRM_BCNAdjudicationApi.getRxData';

/**
 * @description Rx Tab Content - REAL DATA from TRM_BCNAdjudicationApi.getRxData()
 * @author Trinity Deployment Architect
 * @date 2025-01-09
 * 
 * RAY'S REQUIREMENTS: Prescription coverage and restrictions for Claims workflow
 * TRINITY PRINCIPLE: No hardcoded data - everything from sandbox sample data
 */
export default class RxTabContent extends LightningElement {
    @api recordId;
    
    rxData;
    error;
    isLoading = true;

    @wire(getRxData, { caseId: '$recordId' })
    wiredRxData({ error, data }) {
        this.isLoading = false;
        if (data) {
            this.rxData = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.rxData = undefined;
            this.showErrorToast('Error loading Rx data', error.body?.message || error.message);
        }
    }

    get hasRxData() {
        return this.rxData && (
            this.rxData.rxCategory ||
            this.rxData.rxDescription ||
            this.rxData.pbmInvoiceNumber ||
            this.rxData.memberAccountName
        );
    }

    get hasBasicRxInfo() {
        return this.rxData && (
            this.rxData.rxCategory ||
            this.rxData.rxDescription ||
            this.rxData.calculationMethodRx
        );
    }

    get hasPbmInfo() {
        return this.rxData && (
            this.rxData.pbmInvoiceNumber ||
            this.rxData.pbmInvoiceMemberId
        );
    }

    get hasAccountInfo() {
        return this.rxData && (
            this.rxData.memberAccountName ||
            this.rxData.sakStatus ||
            this.rxData.accountExpirationDate
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