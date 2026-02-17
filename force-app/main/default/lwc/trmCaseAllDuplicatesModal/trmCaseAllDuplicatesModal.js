/**
 * @description Comprehensive modal showing ALL duplicate matches across entire Case
 * ADDED: For Case-level duplicate detection enhancement
 * Provides advanced filtering, grouping, and navigation capabilities
 * 
 * @author Trinity CRM
 * @date 2025-09-01
 * @version 1.0
 */
import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getCaseAllDuplicateMatches from '@salesforce/apex/TRM_DuplicateDetectionApi.getCaseAllDuplicateMatches';
import getCaseAllDuplicateMatchesV2 from '@salesforce/apex/TRM_DuplicateDetectionApi.getCaseAllDuplicateMatchesV2';
import getCaseDuplicateNavigationSummary from '@salesforce/apex/TRM_DuplicateDetectionApi.getCaseDuplicateNavigationSummary';
import getLineItemsForBill from '@salesforce/apex/TRM_DuplicateDetectionApi.getLineItemsForBill';

export default class TrmCaseAllDuplicatesModal extends NavigationMixin(LightningElement) {
    @api caseId;
    @api caseSummary;

    // Private property for isOpen with setter to detect changes
    _isOpen = false;

    @api
    get isOpen() {
        return this._isOpen;
    }

    set isOpen(value) {
        this._isOpen = value;
        // When modal opens, load data
        if (value === true && this.caseId) {
            console.log('TrmCaseAllDuplicatesModal: isOpen changed to true, loading data...');
            this.loadInitialData();
        }
    }

    // Component state
    @track allMatches = [];
    @track filteredMatches = [];
    @track isLoading = false;
    @track error = null;

    // Filtering and sorting state
    @track selectedMatchType = 'All';
    @track searchTerm = '';
    @track sortField = 'confidence';
    @track sortDirection = 'desc';
    @track groupByMatchType = true;

    // Modal state
    @track showFilters = false;

    // ADDED: 4-level navigation state
    @track viewMode = 'myLineItems'; // 'myLineItems', 'matchingCases', 'bills', 'theirLineItems'
    @track loadingStrategy = null; // 'full', 'summary'
    @track summary = null; // DuplicateSummaryDTO

    // ADDED: 4-level navigation data structures
    @track myLineItemSummaries = []; // Level 1: MY line items that have duplicates
    @track caseSummaries = []; // Level 2: Cases where selected line item is duplicated
    @track billSummaries = []; // Level 3: Bills within selected Case
    @track currentPageItems = []; // Level 4: Line items within selected Bill

    // ADDED: Navigation state tracking
    @track selectedMyLineItemId = null; // Selected MY line item (Level 1 → Level 2)
    @track selectedCaseId = null; // Selected Case (Level 2 → Level 3)
    @track selectedBillId = null; // Selected Bill (Level 3 → Level 4)

    // ADDED: Pagination state
    @track currentPage = 1;
    @track pageSize = 50;
    @track totalItems = 0;
    @track totalPages = 0;

    /**
     * @description Lifecycle hook - load data when modal opens
     * MODIFIED: Changed from @wire to manual load for adaptive strategy
     */
    connectedCallback() {
        console.log('TrmCaseAllDuplicatesModal: connectedCallback');
        if (this.caseId && this.isOpen) {
            this.loadInitialData();
        }
    }

    /**
     * @description Watch for caseId or isOpen changes
     */
    @api
    async refresh() {
        if (this.caseId && this.isOpen) {
            await this.loadInitialData();
        }
    }

    /**
     * @description Adaptive loading strategy - detects volume and chooses method
     * ADDED: For performance optimization with large volumes
     * UPDATED: Use V2 method with 4-level navigation (MY Line Items → Cases → Bills → Their Line Items)
     */
    async loadInitialData() {
        console.log('TrmCaseAllDuplicatesModal: loadInitialData');
        this.isLoading = true;
        this.error = null;

        try {
            // STRATEGY: Try V2 method first (optimized with source line item info)
            console.log('TrmCaseAllDuplicatesModal: Loading data with V2 method (4-level navigation)');

            let data;
            try {
                data = await getCaseAllDuplicateMatchesV2({ caseId: this.caseId });
                console.log('TrmCaseAllDuplicatesModal: V2 data loaded', data);
            } catch (v2Error) {
                // FALLBACK: Use V1 method if V2 fails
                console.warn('TrmCaseAllDuplicatesModal: V2 failed, falling back to V1', v2Error);
                data = await getCaseAllDuplicateMatches({ caseId: this.caseId });
                console.log('TrmCaseAllDuplicatesModal: V1 data loaded (fallback)', data);
            }

            this.allMatches = data || [];
            this.applyFiltersAndSort();

            this.totalItems = this.filteredMatches.length;
            this.totalPages = Math.ceil(this.totalItems / this.pageSize);
            this.currentPage = 1;

            if (this.totalItems === 0) {
                // No duplicates found
                console.log('TrmCaseAllDuplicatesModal: No duplicates found');
                this.loadingStrategy = 'full';
                this.viewMode = 'myLineItems';

            } else {
                // Group data by MY line items (4-level navigation)
                console.log('TrmCaseAllDuplicatesModal: Grouping data for 4-level navigation');
                this.loadingStrategy = 'full';
                this.groupByMyLineItems();
                this.viewMode = 'myLineItems'; // Start with MY Line Items view
            }

        } catch (error) {
            console.error('TrmCaseAllDuplicatesModal: Error loading data', error);
            this.error = error;
            this.allMatches = [];
            this.filteredMatches = [];
            this.totalItems = 0;
            this.totalPages = 0;
        }

        this.isLoading = false;
    }

    /**
     * @description Load full data and group in memory (for small volumes)
     * ADDED: Backward compatible with existing behavior
     */
    async loadFullData() {
        try {
            const data = await getCaseAllDuplicateMatches({ caseId: this.caseId });
            console.log('TrmCaseAllDuplicatesModal: Full data loaded', data);

            this.allMatches = data || [];
            this.applyFiltersAndSort();

            // BUGFIX: Update totalItems after loading data
            this.totalItems = this.filteredMatches.length;
            this.totalPages = Math.ceil(this.totalItems / this.pageSize);
            this.currentPage = 1;

            // Group in memory for 3-level navigation
            this.groupDataInMemory();

        } catch (error) {
            console.error('TrmCaseAllDuplicatesModal: Error loading full data', error);
            this.error = error;
            this.allMatches = [];
            this.filteredMatches = [];
            this.totalItems = 0;
            this.totalPages = 0;
        }
    }

    /**
     * @description FALLBACK: Legacy load method (100% backward compatible)
     * ADDED: Safety net if new methods fail
     */
    async loadFullDataLegacy() {
        try {
            console.log('TrmCaseAllDuplicatesModal: loadFullDataLegacy - calling getCaseAllDuplicateMatches with caseId:', this.caseId);
            const data = await getCaseAllDuplicateMatches({ caseId: this.caseId });
            console.log('TrmCaseAllDuplicatesModal: loadFullDataLegacy - received data:', data);

            this.allMatches = data || [];
            this.error = null;
            this.applyFiltersAndSort();
            this.loadingStrategy = 'full';
            this.viewMode = 'lineItems'; // Show line items directly (legacy behavior)

            // BUGFIX: Update totalItems and pagination after loading data
            this.totalItems = this.filteredMatches.length;
            this.totalPages = Math.ceil(this.totalItems / this.pageSize);
            this.currentPage = 1;

            // BUGFIX: Populate currentPageItems for display
            this.updateCurrentPageItems();

            console.log('TrmCaseAllDuplicatesModal: loadFullDataLegacy - complete. allMatches.length:', this.allMatches.length, 'totalItems:', this.totalItems);

        } catch (error) {
            this.error = error;
            this.allMatches = [];
            this.filteredMatches = [];
            this.totalItems = 0;
            this.totalPages = 0;
            console.error('TrmCaseAllDuplicatesModal: Error loading matches (legacy)', error);
        }
    }

    /**
     * @description Group loaded data by MY line items (4-level navigation)
     * ADDED: For 4-level navigation (MY Line Items → Cases → Bills → Their Line Items)
     * Groups by sourceLineItemId to show which of MY line items have duplicates
     */
    groupByMyLineItems() {
        console.log('TrmCaseAllDuplicatesModal: groupByMyLineItems - processing', this.allMatches.length, 'matches');

        const myLineItemMap = new Map();

        this.allMatches.forEach(match => {
            const sourceId = match.sourceLineItemId;

            // Skip if no source line item info (V1 fallback data)
            if (!sourceId) {
                console.warn('TrmCaseAllDuplicatesModal: Match missing sourceLineItemId, skipping', match);
                return;
            }

            // Create or get MY line item summary
            if (!myLineItemMap.has(sourceId)) {
                myLineItemMap.set(sourceId, {
                    myLineItemId: sourceId,
                    myLineItemName: match.sourceLineItemName,
                    myBillId: match.sourceBillId,
                    myChargeAmount: match.sourceChargeAmount,
                    totalMatchingCases: 0,
                    totalMatches: 0,
                    exactCount: 0,
                    potentialCount: 0,
                    caseIds: new Set(),
                    matches: [] // Store all matches for this line item
                });
            }

            const myLineItem = myLineItemMap.get(sourceId);
            myLineItem.totalMatches++;
            if (match.matchType === 'Exact') myLineItem.exactCount++;
            if (match.matchType === 'Potential') myLineItem.potentialCount++;

            // Track unique Cases
            if (match.caseId && !myLineItem.caseIds.has(match.caseId)) {
                myLineItem.caseIds.add(match.caseId);
                myLineItem.totalMatchingCases++;
            }

            // Store the match for drill-down
            myLineItem.matches.push(match);
        });

        // Convert to array and add display properties
        this.myLineItemSummaries = Array.from(myLineItemMap.values()).map(item => ({
            ...item,
            caseIds: Array.from(item.caseIds), // Convert Set to Array for template
            formattedChargeAmount: item.myChargeAmount ? `$${item.myChargeAmount.toFixed(2)}` : '$0.00',
            matchSummary: `${item.exactCount} Exact, ${item.potentialCount} Potential`
        }));

        console.log('TrmCaseAllDuplicatesModal: groupByMyLineItems - created', this.myLineItemSummaries.length, 'MY line item summaries');
        this.viewMode = 'myLineItems'; // Start with MY Line Items view
    }

    /**
     * @description Group loaded data in memory (for small volumes) - LEGACY 3-level navigation
     * KEPT: For backward compatibility with V1 data
     */
    groupDataInMemory() {
        const caseSummaryMap = new Map();
        const billSummaryMap = new Map();

        this.allMatches.forEach(match => {
            const caseId = match.caseId;
            const billId = match.billExternalId;

            // Aggregate by Case
            if (!caseSummaryMap.has(caseId)) {
                caseSummaryMap.set(caseId, {
                    caseId: caseId,
                    caseNumber: match.caseNumber,
                    billCount: 0,
                    totalLineItems: 0,
                    exactCount: 0,
                    potentialCount: 0,
                    billIds: []
                });
            }
            const caseSummary = caseSummaryMap.get(caseId);
            caseSummary.totalLineItems++;
            if (match.matchType === 'Exact') caseSummary.exactCount++;
            if (match.matchType === 'Potential') caseSummary.potentialCount++;
            if (!caseSummary.billIds.includes(billId)) {
                caseSummary.billIds.push(billId);
                caseSummary.billCount++;
            }

            // Aggregate by Bill
            const billKey = `${caseId}_${billId}`;
            if (!billSummaryMap.has(billKey)) {
                billSummaryMap.set(billKey, {
                    billExternalId: billId,
                    caseId: caseId,
                    lineItemCount: 0,
                    exactCount: 0,
                    potentialCount: 0
                });
            }
            const billSummary = billSummaryMap.get(billKey);
            billSummary.lineItemCount++;
            if (match.matchType === 'Exact') billSummary.exactCount++;
            if (match.matchType === 'Potential') billSummary.potentialCount++;
        });

        this.caseSummaries = Array.from(caseSummaryMap.values());
        this.billSummaries = Array.from(billSummaryMap.values());
        this.viewMode = 'cases'; // Start with Case view
    }

    /**
     * @description Navigate to Bills view for selected Case
     * ADDED: For 3-level navigation (Cases → Bills)
     */
    async handleViewBills(event) {
        const caseId = event.currentTarget.dataset.caseId;
        console.log('TrmCaseAllDuplicatesModal: handleViewBills', caseId);

        this.selectedCaseId = caseId;
        this.viewMode = 'bills';
    }

    /**
     * @description Navigate to Line Items view for selected Bill
     * ADDED: For 3-level navigation (Bills → Line Items)
     */
    async handleViewLineItems(event) {
        const billId = event.currentTarget.dataset.billId;
        console.log('TrmCaseAllDuplicatesModal: handleViewLineItems', billId);

        this.selectedBillId = billId;
        this.currentPage = 1;

        if (this.loadingStrategy === 'full') {
            // In-memory pagination
            this.loadLineItemsFromMemory();
        } else {
            // Server-side pagination
            await this.loadLineItemsPage();
        }

        this.viewMode = 'lineItems';
    }

    /**
     * @description Navigate back to Bills view
     * ADDED: For 3-level navigation (Line Items → Bills)
     */
    handleBackToBills() {
        console.log('TrmCaseAllDuplicatesModal: handleBackToBills');
        this.selectedBillId = null;
        this.viewMode = 'bills';
    }

    /**
     * @description Navigate back to Cases view
     * ADDED: For 3-level navigation (Bills → Cases)
     */
    handleBackToCases() {
        console.log('TrmCaseAllDuplicatesModal: handleBackToCases');
        this.selectedCaseId = null;
        this.selectedBillId = null;
        this.viewMode = 'cases';
    }

    // ============ 4-LEVEL NAVIGATION METHODS ============

    /**
     * @description Navigate from MY Line Items to Matching Cases
     * ADDED: Level 1 → Level 2 navigation
     */
    handleViewMatchingCases(event) {
        const myLineItemId = event.currentTarget.dataset.id;
        console.log('TrmCaseAllDuplicatesModal: handleViewMatchingCases - myLineItemId:', myLineItemId);

        this.selectedMyLineItemId = myLineItemId;

        // Find the MY line item summary
        const myLineItem = this.myLineItemSummaries.find(item => item.myLineItemId === myLineItemId);
        if (!myLineItem) {
            console.error('TrmCaseAllDuplicatesModal: MY line item not found:', myLineItemId);
            return;
        }

        // Group matches by Case
        const caseSummaryMap = new Map();
        myLineItem.matches.forEach(match => {
            const caseId = match.caseId;
            if (!caseId) return;

            if (!caseSummaryMap.has(caseId)) {
                caseSummaryMap.set(caseId, {
                    caseId: caseId,
                    caseNumber: match.caseNumber,
                    billCount: 0,
                    matchCount: 0,
                    exactCount: 0,
                    potentialCount: 0,
                    billIds: new Set()
                });
            }

            const caseSummary = caseSummaryMap.get(caseId);
            caseSummary.matchCount++;
            if (match.matchType === 'Exact') caseSummary.exactCount++;
            if (match.matchType === 'Potential') caseSummary.potentialCount++;

            if (match.billExternalId && !caseSummary.billIds.has(match.billExternalId)) {
                caseSummary.billIds.add(match.billExternalId);
                caseSummary.billCount++;
            }
        });

        this.caseSummaries = Array.from(caseSummaryMap.values()).map(cs => ({
            ...cs,
            billIds: Array.from(cs.billIds),
            matchSummary: `${cs.exactCount} Exact, ${cs.potentialCount} Potential`
        }));

        console.log('TrmCaseAllDuplicatesModal: Created', this.caseSummaries.length, 'case summaries');
        this.viewMode = 'matchingCases';
    }

    /**
     * @description Navigate from Matching Cases to Bills
     * ADDED: Level 2 → Level 3 navigation
     */
    handleViewBillsForCase(event) {
        const caseId = event.currentTarget.dataset.id;
        console.log('TrmCaseAllDuplicatesModal: handleViewBillsForCase - caseId:', caseId);

        this.selectedCaseId = caseId;

        // Find the MY line item summary
        const myLineItem = this.myLineItemSummaries.find(item => item.myLineItemId === this.selectedMyLineItemId);
        if (!myLineItem) {
            console.error('TrmCaseAllDuplicatesModal: MY line item not found');
            return;
        }

        // Filter matches for this Case and group by Bill
        const billSummaryMap = new Map();
        myLineItem.matches
            .filter(match => match.caseId === caseId)
            .forEach(match => {
                const billId = match.billExternalId;
                if (!billId) return;

                if (!billSummaryMap.has(billId)) {
                    billSummaryMap.set(billId, {
                        billExternalId: billId,
                        caseId: caseId,
                        lineItemCount: 0,
                        exactCount: 0,
                        potentialCount: 0
                    });
                }

                const billSummary = billSummaryMap.get(billId);
                billSummary.lineItemCount++;
                if (match.matchType === 'Exact') billSummary.exactCount++;
                if (match.matchType === 'Potential') billSummary.potentialCount++;
            });

        this.billSummaries = Array.from(billSummaryMap.values()).map(bs => ({
            ...bs,
            matchSummary: `${bs.exactCount} Exact, ${bs.potentialCount} Potential`
        }));

        console.log('TrmCaseAllDuplicatesModal: Created', this.billSummaries.length, 'bill summaries');
        this.viewMode = 'bills';
    }

    /**
     * @description Navigate from Bills to Their Line Items
     * ADDED: Level 3 → Level 4 navigation
     */
    handleViewTheirLineItems(event) {
        const billId = event.currentTarget.dataset.id;
        console.log('TrmCaseAllDuplicatesModal: handleViewTheirLineItems - billId:', billId);

        this.selectedBillId = billId;

        // Find the MY line item summary
        const myLineItem = this.myLineItemSummaries.find(item => item.myLineItemId === this.selectedMyLineItemId);
        if (!myLineItem) {
            console.error('TrmCaseAllDuplicatesModal: MY line item not found');
            return;
        }

        // Filter matches for this Bill
        const filtered = myLineItem.matches.filter(match =>
            match.caseId === this.selectedCaseId &&
            match.billExternalId === billId
        );

        this.totalItems = filtered.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        this.currentPage = 1;

        const startIndex = 0;
        const endIndex = this.pageSize;
        this.currentPageItems = filtered.slice(startIndex, endIndex);

        console.log('TrmCaseAllDuplicatesModal: Loaded', this.currentPageItems.length, 'line items');
        this.viewMode = 'theirLineItems';
    }

    /**
     * @description Navigate back to MY Line Items
     * ADDED: Level 2 → Level 1 navigation
     */
    handleBackToMyLineItems() {
        console.log('TrmCaseAllDuplicatesModal: handleBackToMyLineItems');
        this.selectedMyLineItemId = null;
        this.selectedCaseId = null;
        this.selectedBillId = null;
        this.caseSummaries = [];
        this.billSummaries = [];
        this.currentPageItems = [];
        this.viewMode = 'myLineItems';
    }

    /**
     * @description Navigate back to Matching Cases
     * ADDED: Level 3 → Level 2 navigation
     */
    handleBackToMatchingCases() {
        console.log('TrmCaseAllDuplicatesModal: handleBackToMatchingCases');
        this.selectedCaseId = null;
        this.selectedBillId = null;
        this.billSummaries = [];
        this.currentPageItems = [];
        this.viewMode = 'matchingCases';
    }

    /**
     * @description Navigate back to Bills
     * ADDED: Level 4 → Level 3 navigation
     */
    handleBackToBills() {
        console.log('TrmCaseAllDuplicatesModal: handleBackToBills');
        this.selectedBillId = null;
        this.currentPageItems = [];
        this.viewMode = 'bills';
    }

    /**
     * @description Update current page items from filtered matches
     * ADDED: For legacy mode pagination (all items, no filtering by bill/case)
     */
    updateCurrentPageItems() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.currentPageItems = this.filteredMatches.slice(startIndex, endIndex);

        console.log('TrmCaseAllDuplicatesModal: updateCurrentPageItems - page:', this.currentPage, 'items:', this.currentPageItems.length);
    }

    /**
     * @description Load line items from memory (for full load strategy)
     * ADDED: In-memory pagination for small volumes
     */
    loadLineItemsFromMemory() {
        const filtered = this.allMatches.filter(match =>
            match.billExternalId === this.selectedBillId &&
            match.caseId === this.selectedCaseId
        );

        this.totalItems = filtered.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.currentPageItems = filtered.slice(startIndex, endIndex);
    }

    /**
     * @description Load line items page from server (for summary strategy)
     * ADDED: Server-side pagination for large volumes
     */
    async loadLineItemsPage() {
        this.isLoading = true;

        try {
            const result = await getLineItemsForBill({
                caseId: this.caseId,
                billExternalId: this.selectedBillId,
                pageNumber: this.currentPage,
                pageSize: this.pageSize
            });

            console.log('TrmCaseAllDuplicatesModal: Line items page loaded', result);

            this.currentPageItems = result.items || [];
            this.totalItems = result.total || 0;
            this.totalPages = result.totalPages || 0;

        } catch (error) {
            console.error('TrmCaseAllDuplicatesModal: Error loading line items page', error);
            this.error = error;
            this.currentPageItems = [];
        }

        this.isLoading = false;
    }

    /**
     * @description Handle next page
     * ADDED: For pagination
     */
    async handleNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;

            if (this.loadingStrategy === 'full') {
                // BUGFIX: Check if we're in legacy mode (no bill selected) or 3-level navigation
                if (this.viewMode === 'lineItems' && !this.selectedBillId) {
                    // Legacy mode: paginate all filtered matches
                    this.updateCurrentPageItems();
                } else {
                    // 3-level navigation: paginate filtered by bill
                    this.loadLineItemsFromMemory();
                }
            } else {
                await this.loadLineItemsPage();
            }
        }
    }

    /**
     * @description Handle previous page
     * ADDED: For pagination
     */
    async handlePreviousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;

            if (this.loadingStrategy === 'full') {
                // BUGFIX: Check if we're in legacy mode (no bill selected) or 3-level navigation
                if (this.viewMode === 'lineItems' && !this.selectedBillId) {
                    // Legacy mode: paginate all filtered matches
                    this.updateCurrentPageItems();
                } else {
                    // 3-level navigation: paginate filtered by bill
                    this.loadLineItemsFromMemory();
                }
            } else {
                await this.loadLineItemsPage();
            }
        }
    }

    /**
     * @description Check if modal should be visible
     * GETTER: Prevents LWC1060 template expression error
     */
    get showModal() {
        return this.isOpen && this.caseId;
    }

    /**
     * @description Check if in Cases view
     * ADDED: For 3-level navigation templates
     */
    get isCaseView() {
        return this.viewMode === 'cases';
    }

    /**
     * @description Check if in Bills view
     * ADDED: For 3-level navigation templates
     */
    get isBillView() {
        return this.viewMode === 'bills';
    }

    /**
     * @description Check if in Line Items view (LEGACY 3-level navigation)
     * KEPT: For backward compatibility
     */
    get isLineItemView() {
        return this.viewMode === 'lineItems';
    }

    /**
     * @description Check if in MY Line Items view (Level 1)
     * ADDED: For 4-level navigation
     */
    get isMyLineItemsView() {
        return this.viewMode === 'myLineItems';
    }

    /**
     * @description Check if in Matching Cases view (Level 2)
     * ADDED: For 4-level navigation
     */
    get isMatchingCasesView() {
        return this.viewMode === 'matchingCases';
    }

    /**
     * @description Check if in Their Line Items view (Level 4)
     * ADDED: For 4-level navigation
     */
    get isTheirLineItemsView() {
        return this.viewMode === 'theirLineItems';
    }

    /**
     * @description Check if empty state
     * ADDED: For empty state template
     */
    get isEmpty() {
        return this.loadingStrategy === 'empty' || this.totalItems === 0;
    }

    /**
     * @description Check if breadcrumb navigation should be shown
     * ADDED: Hide breadcrumb in legacy mode (full load without navigation)
     */
    get showBreadcrumb() {
        // Don't show breadcrumb in legacy mode (full load, lineItems view, no selectedBillId)
        if (this.loadingStrategy === 'full' && this.viewMode === 'lineItems' && !this.selectedBillId) {
            return false;
        }
        // Show breadcrumb in all other cases (summary mode, or when navigating)
        return !this.isEmpty;
    }

    /**
     * @description Get selected MY line item summary
     * ADDED: For 4-level navigation breadcrumb
     */
    get currentMyLineItem() {
        if (!this.selectedMyLineItemId) return null;
        return this.myLineItemSummaries.find(item => item.myLineItemId === this.selectedMyLineItemId);
    }

    /**
     * @description Get current Case summary
     * ADDED: For Bills view breadcrumb
     */
    get currentCaseSummary() {
        if (!this.selectedCaseId) return null;
        return this.caseSummaries.find(cs => cs.caseId === this.selectedCaseId);
    }

    /**
     * @description Get Bill summaries for selected Case
     * ADDED: For Bills view
     */
    get currentBillSummaries() {
        if (!this.selectedCaseId) return [];
        return this.billSummaries.filter(bs => bs.caseId === this.selectedCaseId);
    }

    /**
     * @description Check if first page
     * ADDED: For pagination controls
     */
    get isFirstPage() {
        return this.currentPage <= 1;
    }

    /**
     * @description Check if last page
     * ADDED: For pagination controls
     */
    get isLastPage() {
        return this.currentPage >= this.totalPages;
    }

    /**
     * @description Get pagination info text
     * ADDED: For pagination display
     */
    get paginationInfo() {
        if (this.totalItems === 0) return 'No items';

        const startItem = (this.currentPage - 1) * this.pageSize + 1;
        const endItem = Math.min(this.currentPage * this.pageSize, this.totalItems);

        return `${startItem}-${endItem} of ${this.totalItems}`;
    }

    /**
     * @description Check if matches data is available
     * GETTER: Prevents LWC1060 template expression error
     */
    get hasMatches() {
        if (this.viewMode === 'lineItems') {
            return this.currentPageItems && this.currentPageItems.length > 0;
        }
        return this.filteredMatches && this.filteredMatches.length > 0;
    }

    /**
     * @description Get error message safely
     * ADDED: Handle different error structures
     */
    get errorMessage() {
        if (!this.error) {
            return '';
        }

        // Handle different error structures
        if (this.error.body && this.error.body.message) {
            return this.error.body.message;
        }

        if (this.error.message) {
            return this.error.message;
        }

        if (typeof this.error === 'string') {
            return this.error;
        }

        return 'An unexpected error occurred';
    }
    
    /**
     * @description Get modal title with match count
     * MODIFIED: Updated for 4-level navigation
     */
    get modalTitle() {
        if (this.isEmpty) {
            return 'All Duplicate Matches';
        }

        // Level 1: MY Line Items
        if (this.viewMode === 'myLineItems') {
            const count = this.myLineItemSummaries.length;
            return `My Line Items with Duplicates (${count})`;
        }

        // Level 2: Matching Cases
        if (this.viewMode === 'matchingCases') {
            const myLineItem = this.currentMyLineItem;
            const lineItemLabel = myLineItem ? myLineItem.myLineItemName : 'Line Item';
            const caseCount = this.caseSummaries.length;
            return `${lineItemLabel} - Found in ${caseCount} Case${caseCount !== 1 ? 's' : ''}`;
        }

        // Level 3: Bills
        if (this.viewMode === 'bills') {
            const billCount = this.currentBillSummaries.length;
            const caseSummary = this.currentCaseSummary;
            const caseLabel = caseSummary ? caseSummary.caseNumber : 'Case';
            return `${caseLabel} - ${billCount} Bill${billCount !== 1 ? 's' : ''}`;
        }

        // Level 4: Their Line Items
        if (this.viewMode === 'theirLineItems') {
            return `Bill ${this.selectedBillId} - Line Items (${this.totalItems})`;
        }

        // LEGACY: 3-level navigation (backward compatibility)
        if (this.viewMode === 'cases') {
            const caseCount = this.caseSummaries.length;
            return `Duplicate Matches - ${caseCount} Case${caseCount !== 1 ? 's' : ''} (${this.totalItems} items)`;
        }

        if (this.viewMode === 'lineItems') {
            // BUGFIX: For legacy mode (no navigation), show simple title
            if (this.loadingStrategy === 'full' && !this.selectedBillId) {
                return `All Duplicate Matches (${this.totalItems})`;
            }
            return `Bill ${this.selectedBillId} - Line Items`;
        }

        // Fallback to legacy behavior
        const totalCount = this.allMatches.length;
        const filteredCount = this.filteredMatches.length;

        if (totalCount === 0) {
            return 'All Duplicate Matches';
        }

        if (filteredCount === totalCount) {
            return `All Duplicate Matches (${totalCount})`;
        }

        return `Duplicate Matches (${filteredCount} of ${totalCount})`;
    }
    
    /**
     * @description Get match type filter options
     * GETTER: Prevents LWC1060 template expression error
     */
    get matchTypeOptions() {
        return [
            { label: 'All Types', value: 'All' },
            { label: 'Exact Matches', value: 'Exact' },
            { label: 'Potential Matches', value: 'Potential' }
        ];
    }
    
    /**
     * @description Get sort field options
     * GETTER: Prevents LWC1060 template expression error
     */
    get sortFieldOptions() {
        return [
            { label: 'Confidence', value: 'confidence' },
            { label: 'Charge Amount', value: 'chargeAmount' },
            { label: 'Service Date', value: 'serviceStartDate' },
            { label: 'Match Type', value: 'matchType' },
            { label: 'Bill External ID', value: 'billExternalId' }
        ];
    }
    
    /**
     * @description Get grouped matches for display
     * GETTER: Prevents LWC1060 template expression error
     */
    get groupedMatches() {
        if (!this.groupByMatchType) {
            return [{ 
                groupTitle: null, 
                matches: this.filteredMatches,
                groupClass: 'ungrouped-matches'
            }];
        }
        
        const exactMatches = this.filteredMatches.filter(match => match.matchType === 'Exact');
        const potentialMatches = this.filteredMatches.filter(match => match.matchType === 'Potential');
        
        const groups = [];
        
        if (exactMatches.length > 0) {
            groups.push({
                groupTitle: `Exact Matches (${exactMatches.length})`,
                matches: exactMatches,
                groupClass: 'exact-matches-group'
            });
        }
        
        if (potentialMatches.length > 0) {
            groups.push({
                groupTitle: `Potential Matches (${potentialMatches.length})`,
                matches: potentialMatches,
                groupClass: 'potential-matches-group'
            });
        }
        
        return groups;
    }
    
    /**
     * @description Get filters toggle button label
     * GETTER: Prevents LWC1060 template expression error
     */
    get filtersToggleLabel() {
        return this.showFilters ? 'Hide Filters' : 'Show Filters';
    }
    
    /**
     * @description Get filters toggle icon
     * GETTER: Prevents LWC1060 template expression error
     */
    get filtersToggleIcon() {
        return this.showFilters ? 'utility:chevronup' : 'utility:chevrondown';
    }
    
    /**
     * @description Handle modal close
     */
    handleClose() {
        this.isOpen = false;

        // BUGFIX: Reset state to prevent errors on re-open
        this.resetModalState();

        // Dispatch close event
        const closeEvent = new CustomEvent('modalclose', {
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(closeEvent);
    }

    /**
     * @description Reset modal state
     * ADDED: Clean up state when closing to prevent errors on re-open
     * UPDATED: Added 4-level navigation state reset
     */
    resetModalState() {
        this.allMatches = [];
        this.filteredMatches = [];
        this.currentPageItems = [];
        this.myLineItemSummaries = [];
        this.caseSummaries = [];
        this.billSummaries = [];
        this.selectedMyLineItemId = null;
        this.selectedCaseId = null;
        this.selectedBillId = null;
        this.currentPage = 1;
        this.totalItems = 0;
        this.totalPages = 0;
        this.viewMode = 'myLineItems';
        this.loadingStrategy = 'full';
        this.error = null;
        this.isLoading = false;
    }
    
    /**
     * @description Handle match type filter change
     */
    handleMatchTypeChange(event) {
        this.selectedMatchType = event.detail.value;
        this.applyFiltersAndSort();
    }
    
    /**
     * @description Handle search input change
     */
    handleSearchChange(event) {
        this.searchTerm = event.target.value;
        this.applyFiltersAndSort();
    }
    
    /**
     * @description Handle sort field change
     */
    handleSortFieldChange(event) {
        this.sortField = event.detail.value;
        this.applyFiltersAndSort();
    }
    
    /**
     * @description Handle sort direction toggle
     */
    handleSortDirectionToggle() {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        this.applyFiltersAndSort();
    }
    
    /**
     * @description Handle group by toggle
     */
    handleGroupByToggle(event) {
        this.groupByMatchType = event.target.checked;
    }
    
    /**
     * @description Handle filters toggle
     */
    handleFiltersToggle() {
        this.showFilters = !this.showFilters;
    }
    
    /**
     * @description Handle navigate to Case
     * Uses GenerateUrl + window.open to avoid frame navigation security errors
     */
    handleNavigateToCase(event) {
        const caseId = event.currentTarget.dataset.caseId;

        if (caseId) {
            // Generate URL first, then open in same window to avoid security errors
            this[NavigationMixin.GenerateUrl]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: caseId,
                    objectApiName: 'Case',
                    actionName: 'view'
                }
            }).then(url => {
                // Use window.location.href to navigate in same window
                window.location.href = url;
            });
        }
    }

    /**
     * @description Handle navigate to Bill Line Item (duplicate record)
     */
    handleNavigateToLineItem(event) {
        const recordId = event.currentTarget.dataset.recordId;
        
        if (recordId) {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: recordId,
                    objectApiName: 'Bill_Line_Item__c',
                    actionName: 'view'
                }
            });
        }
    }

    /**
     * @description Apply filters and sorting to matches
     */
    applyFiltersAndSort() {
        let filtered = [...this.allMatches];

        // Apply match type filter
        if (this.selectedMatchType !== 'All') {
            filtered = filtered.filter(match => match.matchType === this.selectedMatchType);
        }

        // Apply search filter
        if (this.searchTerm) {
            const searchLower = this.searchTerm.toLowerCase();
            filtered = filtered.filter(match =>
                (match.recordName && match.recordName.toLowerCase().includes(searchLower)) ||
                (match.billExternalId && match.billExternalId.toLowerCase().includes(searchLower)) ||
                (match.procedureCode && match.procedureCode.toLowerCase().includes(searchLower)) ||
                (match.patientId && match.patientId.toLowerCase().includes(searchLower))
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue = a[this.sortField];
            let bValue = b[this.sortField];

            // Handle null/undefined values
            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return this.sortDirection === 'asc' ? -1 : 1;
            if (bValue == null) return this.sortDirection === 'asc' ? 1 : -1;

            // Handle different data types
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            let comparison = 0;
            if (aValue < bValue) {
                comparison = -1;
            } else if (aValue > bValue) {
                comparison = 1;
            }

            return this.sortDirection === 'asc' ? comparison : -comparison;
        });

        this.filteredMatches = filtered;
    }

    /**
     * @description Handle clear all filters
     */
    handleClearFilters() {
        this.selectedMatchType = 'All';
        this.searchTerm = '';
        this.sortField = 'confidence';
        this.sortDirection = 'desc';
        this.applyFiltersAndSort();

        // Clear search input
        const searchInput = this.template.querySelector('lightning-input[data-id="search"]');
        if (searchInput) {
            searchInput.value = '';
        }
    }

    /**
     * @description Handle export to CSV
     */
    handleExportCSV() {
        if (!this.hasMatches) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'No Data',
                message: 'No duplicate matches to export',
                variant: 'warning'
            }));
            return;
        }

        try {
            // Create CSV content
            const headers = [
                'Record Name', 'Match Type', 'Confidence', 'Charge Amount',
                'Service Start Date', 'Service End Date', 'Procedure Code',
                'Patient ID', 'Bill External ID', 'Created Date', 'Created By'
            ];

            const csvRows = [headers.join(',')];

            this.filteredMatches.forEach(match => {
                const row = [
                    this.escapeCsvValue(match.recordName),
                    this.escapeCsvValue(match.matchTypeLabel),
                    this.escapeCsvValue(match.confidenceLabel),
                    this.escapeCsvValue(match.formattedChargeAmount),
                    this.escapeCsvValue(match.formattedServiceDates),
                    this.escapeCsvValue(match.serviceEndDate ? match.serviceEndDate.toISOString().split('T')[0] : ''),
                    this.escapeCsvValue(match.procedureCode),
                    this.escapeCsvValue(match.patientId),
                    this.escapeCsvValue(match.billExternalId),
                    this.escapeCsvValue(match.createdDate ? match.createdDate.toISOString() : ''),
                    this.escapeCsvValue(match.createdBy)
                ];
                csvRows.push(row.join(','));
            });

            // Create and download file
            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `case-duplicates-${this.caseId}-${new Date().toISOString().split('T')[0]}.csv`;
            link.click();

            window.URL.revokeObjectURL(url);

            this.dispatchEvent(new ShowToastEvent({
                title: 'Success',
                message: 'Duplicate matches exported successfully',
                variant: 'success'
            }));

        } catch (error) {
            console.error('TrmCaseAllDuplicatesModal: Export error', error);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'Failed to export duplicate matches: ' + error.message,
                variant: 'error'
            }));
        }
    }

    /**
     * @description Escape CSV values to handle commas and quotes
     */
    escapeCsvValue(value) {
        if (value == null) return '';

        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return '"' + stringValue.replace(/"/g, '""') + '"';
        }
        return stringValue;
    }
}