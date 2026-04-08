import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getDMEData from '@salesforce/apex/TRM_BCNAdjudicationApi.getDMEData';

export default class DmeTabContent extends LightningElement {
    @api recordId;
    
    dmeData;
    error;
    isLoading = true;

    @wire(getDMEData, { caseId: '$recordId' })
    wiredDMEData({ error, data }) {
        this.isLoading = false;
        if (data) {
            this.dmeData = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.dmeData = undefined;
            this.showErrorToast('Error loading DME data', error.body?.message || error.message);
        }
    }

    get hasDMEData() {
        return this.dmeData && (
            this.dmeData.mcaTotal ||
            this.dmeData.cost ||
            this.dmeData.costDriverItem ||
            this.dmeData.memberAccountName
        );
    }

    get hasFinancialData() {
        return this.dmeData && (
            this.dmeData.mcaTotal ||
            this.dmeData.mcaTotalMedicals ||
            this.dmeData.mcaTotalPrescriptions ||
            this.dmeData.cost
        );
    }

    get hasEquipmentData() {
        return this.dmeData && (
            this.dmeData.costDriverItem ||
            this.dmeData.facilities ||
            this.dmeData.diagnosticMedicalCare
        );
    }

    get hasAccountData() {
        return this.dmeData && (
            this.dmeData.memberAccountName ||
            this.dmeData.sakStatus ||
            this.dmeData.accountExpirationDate
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