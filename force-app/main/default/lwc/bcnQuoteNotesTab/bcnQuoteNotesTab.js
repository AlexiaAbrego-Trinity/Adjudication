import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

// Case fields for notes
const CASE_FIELDS = [
    'Case.Id',
    'Case.Internal_Note__c', 
    'Case.EOB_Note__c'
];

export default class BcnQuoteNotesTab extends LightningElement {
    @api recordId;
    
    @track internalNote = '';
    @track eobNote = '';
    @track isLoading = false;
    @track isSaving = false;
    @track hasUnsavedChanges = false;
    
    // Wire service to get Case data
    wiredCaseResult;
    
    @wire(getRecord, { recordId: '$recordId', fields: CASE_FIELDS })
    wiredCase(result) {
        this.wiredCaseResult = result;
        
        if (result.data) {
            console.log('[NotesTab] Case data loaded:', result.data);
            this.internalNote = result.data.fields.Internal_Note__c.value || '';
            this.eobNote = result.data.fields.EOB_Note__c.value || '';
            this.hasUnsavedChanges = false;
        } else if (result.error) {
            console.error('[NotesTab] Error loading case:', result.error);
            this.showError('Error loading case notes: ' + this.getErrorMessage(result.error));
        }
    }
    
    // Event handlers
    handleInternalNoteChange(event) {
        this.internalNote = event.target.value;
        this.hasUnsavedChanges = true;
        console.log('[NotesTab] Internal note changed, length:', this.internalNote.length);
    }
    
    handleEobNoteChange(event) {
        this.eobNote = event.target.value;
        this.hasUnsavedChanges = true;
        console.log('[NotesTab] EOB note changed, length:', this.eobNote.length);
    }
    
    async handleSave() {
        if (!this.hasUnsavedChanges) {
            this.showInfo('No changes to save');
            return;
        }
        
        this.isSaving = true;
        
        try {
            console.log('[NotesTab] Saving notes...');
            
            const fields = {
                Id: this.recordId,
                Internal_Note__c: this.internalNote,
                EOB_Note__c: this.eobNote
            };
            
            await updateRecord({ fields });
            
            // Refresh the wired data
            await refreshApex(this.wiredCaseResult);
            
            this.hasUnsavedChanges = false;
            this.showSuccess('Notes saved successfully');
            
            console.log('[NotesTab] Notes saved successfully');
            
        } catch (error) {
            console.error('[NotesTab] Save error:', error);
            this.showError('Error saving notes: ' + this.getErrorMessage(error));
        } finally {
            this.isSaving = false;
        }
    }
    
    handleCancel() {
        console.log('[NotesTab] Canceling changes');
        
        // Reset to original values
        if (this.wiredCaseResult.data) {
            this.internalNote = this.wiredCaseResult.data.fields.Internal_Note__c.value || '';
            this.eobNote = this.wiredCaseResult.data.fields.EOB_Note__c.value || '';
        }
        
        this.hasUnsavedChanges = false;
        this.showInfo('Changes canceled');
    }
    
    handleKeyDown(event) {
        // Save on Ctrl+S
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            this.handleSave();
        }
    }
    
    // Helper methods
    getErrorMessage(error) {
        if (error.body) {
            if (error.body.message) {
                return error.body.message;
            }
            if (error.body.fieldErrors) {
                const fieldErrors = Object.values(error.body.fieldErrors).flat();
                return fieldErrors.map(err => err.message).join(', ');
            }
            if (error.body.pageErrors && error.body.pageErrors.length > 0) {
                return error.body.pageErrors[0].message;
            }
        }
        return error.message || 'Unknown error occurred';
    }
    
    // Toast message helpers
    showSuccess(message) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Success',
            message: message,
            variant: 'success'
        }));
    }
    
    showError(message) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Error',
            message: message,
            variant: 'error'
        }));
    }
    
    showInfo(message) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Info',
            message: message,
            variant: 'info'
        }));
    }
    
    // Computed properties
    get isDisabled() {
        return this.isLoading || this.isSaving;
    }
    
    get saveButtonLabel() {
        return this.isSaving ? 'Saving...' : 'Save Notes';
    }
    
    get internalNoteCharCount() {
        return this.internalNote ? this.internalNote.length : 0;
    }

    get eobNoteCharCount() {
        return this.eobNote ? this.eobNote.length : 0;
    }
    
    get maxLength() {
        return 32768; // Long Text Area max length
    }
    
    get internalNoteCharCountClass() {
        const remaining = this.maxLength - this.internalNoteCharCount;
        if (remaining < 100) return 'char-count warning';
        if (remaining < 500) return 'char-count caution';
        return 'char-count';
    }
    
    get eobNoteCharCountClass() {
        const remaining = this.maxLength - this.eobNoteCharCount;
        if (remaining < 100) return 'char-count warning';
        if (remaining < 500) return 'char-count caution';
        return 'char-count';
    }
}