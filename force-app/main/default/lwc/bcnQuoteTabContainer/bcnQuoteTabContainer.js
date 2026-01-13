/**
 * BCN Quote Tab Container Component
 *
 * Container for BCN/Quote Adjudication tabs with collapsible sidebar.
 * Provides reference data access and custom grid integration.
 */
import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

// Debug mode - set to true to enable console logging
const DEBUG_MODE = false;

/**
 * Conditional debug logger - only logs when DEBUG_MODE is true
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
function debugLog(message, data = null) {
    if (DEBUG_MODE) {
        if (data !== null) {
            console.log(message, data);
        } else {
            console.log(message);
        }
    }
}

export default class BcnQuoteTabContainer extends LightningElement {
    @api recordId;

    /**
     * Public API method to refresh grid data
     * Called by parent components (bcnQuoteQuickAction) when modal reopens
     * Fixes stale data issue where changes don't appear until page reload
     * Uses proper LWC component communication through @api methods
     */
    @api
    refreshGrid() {
        debugLog('bcnQuoteTabContainer.refreshGrid() called');
        const grid = this.template.querySelector('c-custom-bill-line-item-grid');
        if (grid && typeof grid.refreshData === 'function') {
            grid.refreshData();
            debugLog('Grid refreshData() called successfully');
        } else {
            debugLog('Grid component not found or refreshData not available');
        }
    }

    @track activeTab = 'summary';
    @track isActiveTabCollapsed = true; // Start collapsed for streamlined UX
    @track isSidebarExpanded = false; // Sidebar starts collapsed for maximum grid space
    @track showReferenceOverlay = false; // Overlay for detailed reference content

    // Tab handling methods
    handleTabClick(event) {
        event.preventDefault();
        const tabName = event.currentTarget.dataset.tab;
        if (tabName) {
            if (this.activeTab === tabName) {
                // Clicking active tab toggles collapse
                this.isActiveTabCollapsed = !this.isActiveTabCollapsed;
            } else {
                // Switching tabs always expands
                this.activeTab = tabName;
                this.isActiveTabCollapsed = false;
            }
        }
    }

    // Tab state getters
    get summaryTabActive() { return this.activeTab === 'summary'; }
    get accountsTabActive() { return this.activeTab === 'accounts'; }
    get injuryTabActive() { return this.activeTab === 'injury'; }
    get coverageTabActive() { return this.activeTab === 'coverage'; }
    get rxTabActive() { return this.activeTab === 'rx'; }
    get restrictionsTabActive() { return this.activeTab === 'restrictions'; }
    get cobTabActive() { return this.activeTab === 'cob'; }
    get miscTabActive() { return this.activeTab === 'misc'; }
    get dmeTabActive() { return this.activeTab === 'dme'; }
    get eobTabActive() { return this.activeTab === 'eob'; }
    get documentsTabActive() { return this.activeTab === 'documents'; }
    get verificationTabActive() { return this.activeTab === 'verification'; }

    // Simple accordion content visibility
    get showTabContent() { return !this.isActiveTabCollapsed; }

    // Visual indicator for collapsed/expanded state
    get tabChevronIcon() {
        return this.isActiveTabCollapsed ? 'utility:chevronright' : 'utility:chevrondown';
    }

    // Tab index getters for accessibility
    get summaryTabIndex() { return this.activeTab === 'summary' ? '0' : '-1'; }
    get accountsTabIndex() { return this.activeTab === 'accounts' ? '0' : '-1'; }
    get injuryTabIndex() { return this.activeTab === 'injury' ? '0' : '-1'; }
    get coverageTabIndex() { return this.activeTab === 'coverage' ? '0' : '-1'; }
    get rxTabIndex() { return this.activeTab === 'rx' ? '0' : '-1'; }
    get restrictionsTabIndex() { return this.activeTab === 'restrictions' ? '0' : '-1'; }
    get cobTabIndex() { return this.activeTab === 'cob' ? '0' : '-1'; }
    get miscTabIndex() { return this.activeTab === 'misc' ? '0' : '-1'; }
    get dmeTabIndex() { return this.activeTab === 'dme' ? '0' : '-1'; }
    get eobTabIndex() { return this.activeTab === 'eob' ? '0' : '-1'; }
    get documentsTabIndex() { return this.activeTab === 'documents' ? '0' : '-1'; }
    get verificationTabIndex() { return this.activeTab === 'verification' ? '0' : '-1'; }

    // Tab class getters for styling
    get summaryTabClass() { return this.activeTab === 'summary' ? 'tab-button active' : 'tab-button'; }
    get accountsTabClass() { return this.activeTab === 'accounts' ? 'tab-button active' : 'tab-button'; }
    get injuryTabClass() { return this.activeTab === 'injury' ? 'tab-button active' : 'tab-button'; }
    get coverageTabClass() { return this.activeTab === 'coverage' ? 'tab-button active' : 'tab-button'; }
    get rxTabClass() { return this.activeTab === 'rx' ? 'tab-button active' : 'tab-button'; }
    get restrictionsTabClass() { return this.activeTab === 'restrictions' ? 'tab-button active' : 'tab-button'; }
    get cobTabClass() { return this.activeTab === 'cob' ? 'tab-button active' : 'tab-button'; }
    get miscTabClass() { return this.activeTab === 'misc' ? 'tab-button active' : 'tab-button'; }
    get dmeTabClass() { return this.activeTab === 'dme' ? 'tab-button active' : 'tab-button'; }
    get eobTabClass() { return this.activeTab === 'eob' ? 'tab-button active' : 'tab-button'; }
    get documentsTabClass() { return this.activeTab === 'documents' ? 'tab-button active' : 'tab-button'; }
    get verificationTabClass() { return this.activeTab === 'verification' ? 'tab-button active' : 'tab-button'; }

    // Sidebar methods - Reference data access
    toggleSidebar() {
        this.isSidebarExpanded = !this.isSidebarExpanded;
    }

    handleSidebarItemClick(event) {
        const itemName = event.currentTarget.dataset.item;
        if (itemName) {
            // Set active tab and show overlay with detailed content
            this.activeTab = itemName;
            this.showReferenceOverlay = true;
            debugLog('Showing overlay for:', itemName);
        }
    }

    closeOverlay() {
        this.showReferenceOverlay = false;
    }

    stopPropagation(event) {
        event.stopPropagation();
    }

    // Sidebar getters
    get sidebarClass() {
        return this.isSidebarExpanded ? 'reference-sidebar expanded' : 'reference-sidebar';
    }

    get sidebarToggleIcon() {
        return this.isSidebarExpanded ? 'utility:chevronright' : 'utility:chevronleft';
    }

    get sidebarToggleTitle() {
        return this.isSidebarExpanded ? 'Collapse Reference Panel' : 'Expand Reference Panel';
    }

    // Overlay getters
    get overlayTitle() {
        const titles = {
            'summary': 'Adjudication Summary & Controls',
            'accounts': 'Member Accounts',
            'injury': 'Injury Information',
            'coverage': 'Coverage Details',
            'rx': 'Prescription Information',
            'restrictions': 'Treatment Restrictions',
            'cob': 'Coordination of Benefits',
            'misc': 'Miscellaneous Notes',
            'dme': 'Durable Medical Equipment',
            'eob': 'Explanation of Benefits',
            'documents': 'Documents & Attachments',
            'verification': 'Verification Status'
        };
        return titles[this.activeTab] || 'Reference Information';
    }

    get overlayIcon() {
        const icons = {
            'summary': 'standard:dashboard',
            'accounts': 'standard:account',
            'injury': 'standard:case',
            'coverage': 'standard:contract',
            'rx': 'standard:medication',
            'restrictions': 'standard:restriction',
            'cob': 'standard:orders',
            'misc': 'standard:note',
            'dme': 'standard:product',
            'eob': 'standard:document',
            'documents': 'standard:file',
            'verification': 'standard:approval'
        };
        return icons[this.activeTab] || 'standard:knowledge';
    }

    // Ensure collapsed state on load
    connectedCallback() {
        // Force collapsed state on component initialization
        this.isActiveTabCollapsed = true;
        this.isSidebarExpanded = false; // Start with sidebar collapsed
    }

}