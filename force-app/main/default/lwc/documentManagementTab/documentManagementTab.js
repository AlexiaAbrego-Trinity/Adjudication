import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import getDocumentData from '@salesforce/apex/TRM_MedicalBillingService.getDocumentData';

/**
 * @description Document Management Tab - PROFESSIONAL MEDICAL BILLING INTERFACE
 * @author Trinity Deployment Architect
 * @date 2025-01-09
 *
 * RAY'S REQUIREMENTS: Document upload, viewing, and management per MVADM-77
 * TRINITY ENHANCEMENT: Complete metadata display with ContentVersion preview support
 * TRINITY PRINCIPLE: No hardcoded data - real Salesforce Files and ContentDocument
 */
export default class DocumentManagementTab extends NavigationMixin(LightningElement) {
    @api recordId;

    documentData;
    error;
    isLoading = true;
    wiredDocumentResult;

    @wire(getDocumentData, { caseId: '$recordId' })
    wiredDocuments(result) {
        this.wiredDocumentResult = result;
        this.isLoading = false;
        if (result.data) {
            this.documentData = result.data;
            this.error = undefined;
            console.log('TRINITY: Document data loaded successfully', this.documentData);
        } else if (result.error) {
            this.error = result.error;
            this.documentData = undefined;
            console.error('TRINITY: Error loading documents', result.error);
            this.showErrorToast('Error loading documents', result.error.body?.message || result.error.message);
        }
    }

    // TRINITY ENHANCEMENT: Enhanced getters with complete document metadata
    get hasFiles() {
        return this.documentData && this.documentData.attachedDocuments && this.documentData.attachedDocuments.length > 0;
    }

    get files() {
        if (!this.documentData?.attachedDocuments) return [];

        // TRINITY ENHANCEMENT: Add formatted metadata and proper icons
        return this.documentData.attachedDocuments.map(doc => ({
            ...doc,
            iconName: this.getDocumentIcon(doc.fileType),
            formattedModifiedDate: this.formatDate(doc.lastModifiedDate),
            id: doc.documentId // For template compatibility
        }));
    }

    get documentCount() {
        return this.documentData?.documentCount || 0;
    }

    get caseNumber() {
        return this.documentData?.caseNumber || '';
    }

    get formattedTotalSize() {
        return this.documentData?.formattedTotalSize || '0 B';
    }

    get acceptedFormats() {
        return ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.tiff', '.bmp'];
    }

    // RAY'S REQUIREMENT: "[Attach Documents] - Immediately grabs and attaches all documents"
    handleAttachDocuments() {
        // Trigger the hidden file upload input
        const fileUpload = this.template.querySelector('lightning-file-upload');
        if (fileUpload) {
            // Focus on the file upload to trigger file selection dialog
            const fileInput = fileUpload.template.querySelector('input[type="file"]');
            if (fileInput) {
                fileInput.click();
            }
        }
    }

    // RAY'S REQUIREMENT: Clickable document count for viewing documents
    handleViewDocuments(event) {
        if (this.documentCount === 0) return;

        if (event.altKey) {
            // Alt+click: Download first document for native application
            const firstFile = this.files[0];
            if (firstFile) {
                this.downloadFile(firstFile.documentId, firstFile.title);
            }
        } else {
            // Regular click: Preview first document in browser
            const firstFile = this.files[0];
            if (firstFile) {
                this.previewFile(firstFile.documentId);
            }
        }
    }

    handleUploadFinished(event) {
        // TRINITY ENHANCEMENT: Refresh the document data after upload
        refreshApex(this.wiredDocumentResult);

        const uploadedFiles = event.detail.files;
        this.showSuccessToast(
            'Documents Uploaded Successfully',
            `${uploadedFiles.length} document(s) uploaded successfully to BCN/Quote case`
        );

        console.log('TRINITY: Documents uploaded successfully', uploadedFiles);
    }

    handleFilePreview(event) {
        const fileId = event.currentTarget.dataset.fileId;
        const fileName = event.currentTarget.dataset.fileName;
        
        // RAY'S REQUIREMENT: Left click = preview, Alt+click = native app
        if (event.altKey) {
            // Alt+click: Download file for native application
            this.downloadFile(fileId, fileName);
        } else {
            // Regular click: Preview in browser
            this.previewFile(fileId);
        }
    }

    // TRINITY ENHANCEMENT: Fixed preview functionality using ContentVersion ID
    previewFile(fileId) {
        // Find the document to get the ContentVersion ID
        const document = this.files.find(file => file.documentId === fileId);

        if (document && document.contentVersionId) {
            // TRINITY FIX: Use ContentVersion ID for proper preview
            this[NavigationMixin.Navigate]({
                type: 'standard__namedPage',
                attributes: {
                    pageName: 'filePreview'
                },
                state: {
                    selectedRecordId: document.contentVersionId
                }
            });
            console.log('TRINITY: Previewing document with ContentVersion ID', document.contentVersionId);
        } else {
            // Fallback to ContentDocument ID if ContentVersion not available
            this[NavigationMixin.Navigate]({
                type: 'standard__namedPage',
                attributes: {
                    pageName: 'filePreview'
                },
                state: {
                    selectedRecordId: fileId
                }
            });
            console.warn('TRINITY: Using ContentDocument ID fallback for preview', fileId);
        }
    }

    // TRINITY ENHANCEMENT: Enhanced download with proper URLs
    downloadFile(fileId, fileName) {
        const document = this.files.find(file => file.documentId === fileId);

        if (document && document.downloadUrl) {
            // Use the proper download URL from service layer
            const link = document.createElement('a');
            link.href = document.downloadUrl;
            link.download = fileName || document.title;
            link.click();
            console.log('TRINITY: Downloading document via service URL', document.downloadUrl);
        } else {
            // Fallback to standard download URL
            const downloadUrl = `/sfc/servlet.shepherd/document/download/${fileId}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            link.click();
            console.warn('TRINITY: Using fallback download URL', downloadUrl);
        }
    }

    // TRINITY ENHANCEMENT: Utility methods for professional medical billing interface
    getDocumentIcon(fileType) {
        if (!fileType) return 'utility:file';

        const type = fileType.toLowerCase();
        switch (type) {
            case 'pdf':
                return 'utility:pdf_ext';
            case 'doc':
            case 'docx':
                return 'utility:word_doc_ext';
            case 'xls':
            case 'xlsx':
                return 'utility:excel_doc_ext';
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'tiff':
            case 'bmp':
                return 'utility:image';
            default:
                return 'utility:file';
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.warn('TRINITY: Error formatting date', dateString, error);
            return 'Invalid Date';
        }
    }

    handleRetry() {
        this.isLoading = true;
        this.error = undefined;
        // Refresh the wired method
        refreshApex(this.wiredDocumentResult);
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