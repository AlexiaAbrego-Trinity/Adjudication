import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getFollowUpData from '@salesforce/apex/TRM_BCNAdjudicationApi.getFollowUpData';
import setBcnFollowUp from '@salesforce/apex/TRM_BCNAdjudicationApi.setBcnFollowUp';
import setRefundFollowUp from '@salesforce/apex/TRM_BCNAdjudicationApi.setRefundFollowUp';

export default class VerificationTabContent extends LightningElement {
    @api recordId;

    verificationData;
    error;
    isLoading = true;
    wiredFollowUpResult;

    // Follow-up management state
    @track bcnFollowUpDate = '';
    @track bcnFollowUpNote = '';
    @track refundFollowUpDate = '';
    @track refundFollowUpNote = '';
    @track isSavingBcn = false;
    @track isSavingRefund = false;

    @wire(getFollowUpData, { caseId: '$recordId' })
    wiredVerificationData(result) {
        this.wiredFollowUpResult = result;
        const { error, data } = result;
        this.isLoading = false;
        if (data) {
            this.verificationData = data;
            this.error = undefined;
            // Pre-populate form fields with existing data
            this.bcnFollowUpDate = data.bcnFollowUp?.internalDueDate || '';
            this.bcnFollowUpNote = data.bcnFollowUp?.internalNote || '';
            this.refundFollowUpDate = data.refundFollowUp?.hasRefundRequest ? data.bcnFollowUp?.externalDueDate || '' : '';
            this.refundFollowUpNote = data.refundFollowUp?.refundReason || '';
        } else if (error) {
            this.error = error;
            this.verificationData = undefined;
            this.showErrorToast('Error loading verification data', error.body?.message || error.message);
        }
    }

    get hasVerificationData() {
        return this.verificationData && (
            this.verificationData.bcnFollowUp ||
            this.verificationData.refundFollowUp ||
            this.verificationData.memberAccountName
        );
    }

    get hasBcnFollowUp() {
        return this.verificationData?.bcnFollowUp && (
            this.verificationData.bcnFollowUp.threeMonthFollowUp ||
            this.verificationData.bcnFollowUp.sixMonthFollowUp ||
            this.verificationData.bcnFollowUp.internalNote ||
            this.verificationData.bcnFollowUp.caseNotes
        );
    }

    get hasRefundFollowUp() {
        return this.verificationData?.refundFollowUp && (
            this.verificationData.refundFollowUp.hasRefundRequest ||
            this.verificationData.refundFollowUp.refundReason
        );
    }

    get hasAccountInfo() {
        return this.verificationData && (
            this.verificationData.memberAccountName ||
            this.verificationData.sakStatus ||
            this.verificationData.accountExpirationDate
        );
    }

    // Follow-up management handlers
    handleBcnDateChange(event) {
        this.bcnFollowUpDate = event.target.value;
    }

    handleBcnNoteChange(event) {
        this.bcnFollowUpNote = event.target.value;
    }

    handleRefundDateChange(event) {
        this.refundFollowUpDate = event.target.value;
    }

    handleRefundNoteChange(event) {
        this.refundFollowUpNote = event.target.value;
    }

    async handleSetBcnFollowUp() {
        if (!this.recordId) {
            this.showErrorToast('Error', 'No case ID available');
            return;
        }

        this.isSavingBcn = true;
        try {
            const result = await setBcnFollowUp({
                caseId: this.recordId,
                followUpDate: this.bcnFollowUpDate || null,
                followUpNote: this.bcnFollowUpNote || null
            });

            this.showSuccessToast('Success', result);

            // Refresh the data
            await refreshApex(this.wiredFollowUpResult);

        } catch (error) {
            this.showErrorToast('Error setting BCN Follow-up', error.body?.message || error.message);
        } finally {
            this.isSavingBcn = false;
        }
    }

    async handleSetRefundFollowUp() {
        if (!this.recordId) {
            this.showErrorToast('Error', 'No case ID available');
            return;
        }

        this.isSavingRefund = true;
        try {
            const result = await setRefundFollowUp({
                caseId: this.recordId,
                followUpDate: this.refundFollowUpDate || null,
                followUpNote: this.refundFollowUpNote || null
            });

            this.showSuccessToast('Success', result);

            // Refresh the data
            await refreshApex(this.wiredFollowUpResult);

        } catch (error) {
            this.showErrorToast('Error setting Refund Follow-up', error.body?.message || error.message);
        } finally {
            this.isSavingRefund = false;
        }
    }

    showSuccessToast(title, message) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: 'success'
        });
        this.dispatchEvent(event);
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