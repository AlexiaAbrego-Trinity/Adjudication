import { LightningElement, api, track } from 'lwc';

/**
 * BCN Quote Grid Modal Component
 * 
 * Provides a full-screen modal interface for Raven Grids
 * Used in BCN/Quote Case adjudication workflow
 * 
 * Features:
 * - Full-screen modal with responsive design
 * - Integration with Raven Grids component
 * - Keyboard navigation support (ESC to close)
 * - Backdrop click to close
 * - Professional styling with SLDS
 */
export default class BcnQuoteGridModal extends LightningElement {
    @api recordId;
    @api gridId = 'BCN_Quote_Adjudication_Grid';
    @api modalTitle = 'Bill Line Items Adjudication Review';
    @api buttonLabel = 'Bill/Quote Review';
    @api buttonVariant = 'brand';
    
    @track showModal = false;
    @track isLoading = false;
    
    // Modal size options: small, medium, large
    @api modalSize = 'large';
    
    /**
     * Opens the modal and prevents body scrolling
     */
    openModal() {
        this.isLoading = true;
        this.showModal = true;
        
        // Prevent body scrolling when modal is open
        document.body.style.overflow = 'hidden';
        
        // Add keyboard event listener for ESC key
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Simulate loading delay for better UX
        setTimeout(() => {
            this.isLoading = false;
        }, 500);
        
        // Dispatch custom event for analytics/tracking
        this.dispatchEvent(new CustomEvent('modalopened', {
            detail: {
                recordId: this.recordId,
                gridId: this.gridId,
                timestamp: new Date().toISOString()
            }
        }));
    }
    
    /**
     * Closes the modal and restores body scrolling
     */
    closeModal() {
        this.showModal = false;
        this.isLoading = false;
        
        // Restore body scrolling
        document.body.style.overflow = 'auto';
        
        // Remove keyboard event listener
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Dispatch custom event for analytics/tracking
        this.dispatchEvent(new CustomEvent('modalclosed', {
            detail: {
                recordId: this.recordId,
                gridId: this.gridId,
                timestamp: new Date().toISOString()
            }
        }));
    }
    
    /**
     * Handles keyboard navigation (ESC to close)
     */
    handleKeyDown(event) {
        if (event.key === 'Escape' && this.showModal) {
            this.closeModal();
        }
    }
    
    /**
     * Handles backdrop click to close modal
     */
    handleBackdropClick(event) {
        // Only close if clicking the backdrop itself, not child elements
        if (event.target === event.currentTarget) {
            this.closeModal();
        }
    }
    
    /**
     * Handles grid load success
     */
    handleGridLoad() {
        this.isLoading = false;
        
        // Dispatch grid loaded event
        this.dispatchEvent(new CustomEvent('gridloaded', {
            detail: {
                recordId: this.recordId,
                gridId: this.gridId,
                timestamp: new Date().toISOString()
            }
        }));
    }
    
    /**
     * Handles grid load error
     */
    handleGridError(event) {
        this.isLoading = false;
        
        console.error('Grid load error:', event.detail);
        
        // Dispatch grid error event
        this.dispatchEvent(new CustomEvent('griderror', {
            detail: {
                recordId: this.recordId,
                gridId: this.gridId,
                error: event.detail,
                timestamp: new Date().toISOString()
            }
        }));
        
        // Show user-friendly error message
        this.showErrorToast('Grid Load Error', 'Unable to load the adjudication grid. Please try again or contact your administrator.');
    }
    
    /**
     * Shows error toast notification
     */
    showErrorToast(title, message) {
        // Create and dispatch toast event
        const toastEvent = new CustomEvent('showtoast', {
            detail: {
                title: title,
                message: message,
                variant: 'error',
                mode: 'sticky'
            }
        });
        this.dispatchEvent(toastEvent);
    }
    
    /**
     * Computed property for modal CSS classes
     */
    get modalClasses() {
        let classes = 'slds-modal slds-fade-in-open modal-overlay-custom';

        switch (this.modalSize) {
            case 'small':
                classes += ' slds-modal_small';
                break;
            case 'medium':
                classes += ' slds-modal_medium';
                break;
            case 'large':
            default:
                classes += ' slds-modal_large';
                break;
        }

        return classes;
    }
    
    /**
     * Computed property for modal container styles
     */
    get modalContainerStyle() {
        // Ultra-wide for large datasets
        if (this.modalSize === 'large') {
            return 'max-width: 95vw; width: 95vw; max-height: 90vh;';
        }
        return '';
    }
    
    /**
     * Computed property for modal content styles
     */
    get modalContentStyle() {
        return 'height: 75vh; overflow: hidden; padding: 0;';
    }
    
    /**
     * Computed property for grid container styles
     */
    get gridContainerStyle() {
        return 'height: 100%; width: 100%; overflow: hidden;';
    }

    /**
     * Computed property for Raven Grids URL (if using iframe fallback)
     */
    get ravenGridsUrl() {
        // This would be used if iframe approach is needed as fallback
        // Format: /apex/RavenApps__Grid?id={gridId}&recordId={recordId}
        return `/apex/RavenApps__Grid?id=${this.gridId}&recordId=${this.recordId}`;
    }

    /**
     * Component lifecycle - cleanup on disconnect
     */
    disconnectedCallback() {
        // Ensure body scrolling is restored
        document.body.style.overflow = 'auto';

        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    }
}