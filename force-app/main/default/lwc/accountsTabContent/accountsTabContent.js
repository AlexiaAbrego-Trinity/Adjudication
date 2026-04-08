import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getMemberAccountData from '@salesforce/apex/TRM_BCNAdjudicationApi.getMemberAccountData';

export default class AccountsTabContent extends LightningElement {
    @api recordId; // Case ID from parent component
    
    @track isLoading = true;
    @track error = null;
    @track primaryAccount = null;
    @track relatedAccounts = [];
    @track accountAlerts = [];

    // Wire to get Member Account data
    @wire(getMemberAccountData, { caseId: '$recordId' })
    wiredAccountData(result) {
        this.wiredResult = result;
        if (result.data) {
            this.processAccountData(result.data);
            this.error = null;
            this.isLoading = false;
        } else if (result.error) {
            this.error = result.error.body?.message || 'Unknown error occurred';
            this.isLoading = false;
            console.error('Error loading account data:', result.error);
        }
    }

    // Process account data and set up display properties
    processAccountData(data) {
        if (!data) {
            this.primaryAccount = null;
            this.relatedAccounts = [];
            this.accountAlerts = [];
            return;
        }

        // Use REAL financial data from getMemberAccountData method
        if (data.primaryAccount) {
            this.primaryAccount = {
                id: data.primaryAccount.id,
                name: data.primaryAccount.name,
                accountType: data.primaryAccount.accountType,
                status: data.primaryAccount.status,
                statusClass: this.getStatusClass(data.primaryAccount.status),
                expirationDate: data.primaryAccount.expirationDate,
                expirationReason: data.primaryAccount.expirationReason,
                // Use REAL financial data from Apex method
                availableBalance: data.primaryAccount.availableBalance,
                allocatedFunds: data.primaryAccount.allocatedFunds,
                reservedFunds: data.primaryAccount.reservedFunds,
                totalBalance: data.primaryAccount.availableBalance // Total = Available for display
            };
        }

        // Process related accounts with REAL financial data
        if (data.relatedAccounts && data.relatedAccounts.length > 0) {
            this.relatedAccounts = data.relatedAccounts.map(account => ({
                id: account.id,
                name: account.name,
                accountType: account.accountType,
                status: account.status,
                statusClass: this.getStatusClass(account.status),
                badgeClass: this.getBadgeClass(account.accountType),
                icon: this.getAccountIcon(account.accountType),
                availableBalance: account.availableBalance // REAL data from Apex
            }));
        } else {
            this.relatedAccounts = [];
        }

        // Generate account alerts based on business rules
        this.generateAccountAlerts();
    }

    // Generate account alerts based on Ray's business rules
    generateAccountAlerts() {
        const alerts = [];

        // Check primary account status (no financial data available in current data structure)
        if (this.primaryAccount) {
            if (this.primaryAccount.status === 'Expired') {
                alerts.push({
                    id: 'account-expired',
                    type: 'error',
                    alertClass: 'account-alert alert-error',
                    icon: 'utility:error',
                    title: 'Account Expired',
                    message: 'This account has expired. Verify current effective dates before processing payments.'
                });
            }

            // Check for upcoming expiration
            if (this.primaryAccount.expirationDate) {
                const expirationDate = new Date(this.primaryAccount.expirationDate);
                const today = new Date();
                const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

                if (daysUntilExpiration <= 30 && daysUntilExpiration > 0) {
                    alerts.push({
                        id: 'expiring-soon',
                        type: 'warning',
                        alertClass: 'account-alert alert-warning',
                        icon: 'utility:clock',
                        title: 'Account Expiring Soon',
                        message: `Account expires in ${daysUntilExpiration} days. Plan accordingly for ongoing treatments.`
                    });
                }
            }

            // Check for expiration reason
            if (this.primaryAccount.expirationReason) {
                alerts.push({
                    id: 'expiration-reason',
                    type: 'info',
                    alertClass: 'account-alert alert-info',
                    icon: 'utility:info',
                    title: 'Account Expiration Details',
                    message: `Expiration reason: ${this.primaryAccount.expirationReason}`
                });
            }
        }

        // Check related accounts for issues
        this.relatedAccounts.forEach(account => {
            if (account.status === 'Suspended') {
                alerts.push({
                    id: `suspended-${account.id}`,
                    type: 'error',
                    alertClass: 'account-alert alert-error',
                    icon: 'utility:ban',
                    title: `${account.accountType} Account Suspended`,
                    message: `${account.name} is currently suspended and cannot be used for payments.`
                });
            }
        });

        this.accountAlerts = alerts;
    }

    // Computed properties
    get showNoData() {
        return !this.isLoading && !this.error && !this.primaryAccount;
    }

    get hasRelatedAccounts() {
        return this.relatedAccounts && this.relatedAccounts.length > 0;
    }

    get hasAccountAlerts() {
        return this.accountAlerts && this.accountAlerts.length > 0;
    }

    get accountStatusClass() {
        if (!this.primaryAccount) return 'account-status-unknown';
        
        if (this.primaryAccount.status === 'Active' && this.primaryAccount.availableBalance > 1000) {
            return 'account-status account-status-good';
        } else if (this.primaryAccount.status === 'Active') {
            return 'account-status account-status-warning';
        } else {
            return 'account-status account-status-error';
        }
    }

    get accountStatusIcon() {
        if (!this.primaryAccount) return 'utility:question';
        
        if (this.primaryAccount.status === 'Active' && this.primaryAccount.availableBalance > 1000) {
            return 'utility:success';
        } else if (this.primaryAccount.status === 'Active') {
            return 'utility:warning';
        } else {
            return 'utility:error';
        }
    }

    get accountStatusText() {
        if (!this.primaryAccount) return 'Unknown Status';
        
        if (this.primaryAccount.status === 'Active' && this.primaryAccount.availableBalance > 1000) {
            return 'Funds Available';
        } else if (this.primaryAccount.status === 'Active') {
            return 'Low Balance';
        } else {
            return this.primaryAccount.status;
        }
    }

    // Utility methods
    getStatusClass(status) {
        switch (status) {
            case 'Active':
                return 'status-active';
            case 'Expired':
                return 'status-expired';
            case 'Suspended':
                return 'status-suspended';
            case 'Pending':
                return 'status-pending';
            default:
                return 'status-unknown';
        }
    }

    getBadgeClass(accountType) {
        switch (accountType) {
            case 'MSA':
                return 'account-type-badge msa-badge';
            case 'PCA':
                return 'account-type-badge pca-badge';
            case 'SAK':
                return 'account-type-badge sak-badge';
            case 'MCA':
                return 'account-type-badge mca-badge';
            default:
                return 'account-type-badge default-badge';
        }
    }

    getAccountIcon(accountType) {
        switch (accountType) {
            case 'MSA':
                return 'utility:money';
            case 'PCA':
                return 'utility:prescription';
            case 'SAK':
                return 'utility:shield';
            case 'MCA':
                return 'utility:account';
            default:
                return 'utility:account';
        }
    }

    // Event handlers
    handleViewPrimaryDetails() {
        // Navigate to Member Account record or show detailed modal
        this.showToast('Info', 'Opening detailed account view...', 'info');
        // Implementation would navigate to the Member Account record
    }

    // Utility method to show toast messages
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }

    // Refresh account data
    async refreshAccountData() {
        this.isLoading = true;
        try {
            await refreshApex(this.wiredResult);
        } catch (error) {
            this.error = error.message;
            this.isLoading = false;
        }
    }
}