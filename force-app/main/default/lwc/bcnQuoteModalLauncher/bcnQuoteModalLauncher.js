/**
 * BCN Quote Modal Launcher - Pure Button Component
 * 
 * RAY'S MODAL: Dedicated component for launching BCN/Quote Adjudication in modal
 * This is a pure button element that opens the full interface in a modal window
 * 
 * Trinity Deployment Architect - MVADM-77 Implementation
 * Matt's #2 Priority: "Launch from button to see modal" - Ray stressed this is "huge" for him
 */

import { LightningElement, api, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { wire } from 'lwc';

export default class BcnQuoteModalLauncher extends LightningElement {
  @api recordId;
  @api buttonText = 'BCN/Quote Adjudication'; // Customizable button text
  @api buttonSize = 'large'; // small, medium, large
  @api showIcon; // Show launch icon

  // RAY'S MODAL: Modal state management
  @track showModal = false;
  
  _effectiveRecordId = null;

  @wire(CurrentPageReference)
  setRef(ref) {
    if (ref && ref.state && ref.state.recordId) {
      this._effectiveRecordId = ref.state.recordId;
    }
  }

  // Computed property for effective record ID
  get effectiveRecordId() {
    return this.recordId || this._effectiveRecordId || null;
  }

  // Show icon by default (true) unless explicitly set to false
  get shouldShowIcon() {
    return this.showIcon !== false;
  }

  // Button size classes
  get buttonSizeClass() {
    const sizeMap = {
      'small': 'button-small',
      'medium': 'button-medium', 
      'large': 'button-large'
    };
    return sizeMap[this.buttonSize] || 'button-large';
  }

  // Icon size based on button size
  get iconSize() {
    const iconMap = {
      'small': 'x-small',
      'medium': 'small',
      'large': 'small'
    };
    return iconMap[this.buttonSize] || 'small';
  }

  // RAY'S MODAL: Modal control methods
  handleLaunchModal() {
    try {
      if (!this.effectiveRecordId) {
        console.warn('RAY MODAL: No record ID available');
        // Still allow modal to open for testing purposes
      }
      this.showModal = true;
      console.log('RAY MODAL: Launched for record:', this.effectiveRecordId);
    } catch (error) {
      console.error('Error launching modal:', error);
    }
  }

  handleCloseModal() {
    try {
      this.showModal = false;
      console.log('RAY MODAL: Closed');
    } catch (error) {
      console.error('Error closing modal:', error);
    }
  }

  // Handle backdrop click to close modal
  handleBackdropClick(event) {
    if (event.target.classList.contains('slds-backdrop')) {
      this.handleCloseModal();
    }
  }

  // Handle escape key to close modal
  handleKeyDown = (event) => {
    if (event.key === 'Escape' && this.showModal) {
      this.handleCloseModal();
    }
  }

  connectedCallback() {
    // Add escape key listener when component connects
    document.addEventListener('keydown', this.handleKeyDown);
  }

  disconnectedCallback() {
    // Remove escape key listener when component disconnects
    document.removeEventListener('keydown', this.handleKeyDown);
  }
}