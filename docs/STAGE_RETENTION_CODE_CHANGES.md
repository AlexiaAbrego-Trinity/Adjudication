# Stage Retention - Detailed Code Changes

## 📋 Overview

This document provides **exact code changes** needed to implement Stage Retention functionality in the Quote Adjudication modal.

**Goal:** Maintain the correct adjudication stage (Keying, Bill Review, Quote View, Adjudicated) when closing and reopening a Case.

---

## 🎯 Files to Modify

1. `customBillLineItemGrid.js` - Main grid component logic
2. `customBillLineItemGrid.html` - Grid UI template

---

## 📝 CHANGE 1: Import Required Modules

**File:** `customBillLineItemGrid.js`  
**Location:** Top of file (after existing imports, around line 10)

### Add These Imports:

```javascript
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import CURRENT_STAGE_FIELD from '@salesforce/schema/Case.Current_Adjudication_Stage__c';
```

**Why:** 
- `getRecord` - Read the current stage from Salesforce
- `updateRecord` - Save the stage when user changes it
- `CURRENT_STAGE_FIELD` - Reference to the custom field

---

## 📝 CHANGE 2: Add Wire Adapter to Read Stage from Salesforce

**File:** `customBillLineItemGrid.js`  
**Location:** After line 94 (after `currentStage` declaration)

### Add This Code:

```javascript
// STAGE RETENTION: Wire adapter to read current stage from Case
@wire(getRecord, { recordId: '$recordId', fields: [CURRENT_STAGE_FIELD] })
wiredCaseStage({ data, error }) {
    if (data) {
        const savedStage = data.fields.Current_Adjudication_Stage__c.value;
        
        // Map Salesforce picklist values to component values
        const stageMap = {
            'Keying': 'keying',
            'Bill Review': 'billReview',
            'Quote View': 'quote',
            'Adjudicated': 'adjudicated'
        };
        
        const mappedStage = stageMap[savedStage];
        if (mappedStage) {
            this.currentStage = mappedStage;
            console.log('STAGE RETENTION: Loaded stage from Salesforce:', savedStage, '→', mappedStage);
        } else {
            // Default to keying if invalid value
            this.currentStage = 'keying';
            console.warn('STAGE RETENTION: Invalid stage value, defaulting to keying:', savedStage);
        }
    } else if (error) {
        console.error('STAGE RETENTION: Error loading stage from Salesforce:', error);
        // Keep default 'keying' stage on error
    }
}
```

**Why:** This reads the saved stage from Salesforce when the component loads, ensuring the correct stage is displayed.

---

## 📝 CHANGE 3: Add "Adjudicated" Option to Stage Selector

**File:** `customBillLineItemGrid.js`  
**Location:** Lines 234-240 (existing `stageOptions` getter)

### Replace This:

```javascript
get stageOptions() {
    return [
        { label: 'Keying Stage', value: 'keying' },
        { label: 'Bill Review Stage', value: 'billReview' },
        { label: 'Quote View', value: 'quote' }
    ];
}
```

### With This:

```javascript
get stageOptions() {
    return [
        { label: 'Keying Stage', value: 'keying' },
        { label: 'Bill Review Stage', value: 'billReview' },
        { label: 'Quote View', value: 'quote' },
        { label: 'Adjudicated (Locked)', value: 'adjudicated' }
    ];
}
```

**Why:** Adds the new "Adjudicated" stage to the dropdown selector.

---

## 📝 CHANGE 4: Add Computed Properties for Locking Logic

**File:** `customBillLineItemGrid.js`  
**Location:** After line 275 (after existing computed properties)

### Add These Getters:

```javascript
// STAGE RETENTION: Computed properties for adjudicated state
get isAdjudicated() {
    return this.currentStage === 'adjudicated';
}

get isEditable() {
    return !this.isAdjudicated;
}

get stageSelectorDisabled() {
    // Disable stage selector when adjudicated to prevent unlocking
    return this.isAdjudicated;
}
```

**Why:** These properties control the locking behavior when the case is adjudicated.

---

## 📝 CHANGE 5: Modify handleStageChange to Save to Salesforce

**File:** `customBillLineItemGrid.js`  
**Location:** Lines 1197-1199 (existing `handleStageChange` method)

### Replace This:

```javascript
handleStageChange(event) {
    this.currentStage = event.detail.value;
}
```

### With This:

```javascript
async handleStageChange(event) {
    const newStage = event.detail.value;
    
    // Map component values to Salesforce picklist values
    const stageMap = {
        'keying': 'Keying',
        'billReview': 'Bill Review',
        'quote': 'Quote View',
        'adjudicated': 'Adjudicated'
    };
    
    const salesforceValue = stageMap[newStage];
    
    if (!salesforceValue) {
        console.error('STAGE RETENTION: Invalid stage value:', newStage);
        return;
    }
    
    try {
        // Update Case field in Salesforce
        const fields = {};
        fields[CURRENT_STAGE_FIELD.fieldApiName] = salesforceValue;
        fields.Id = this.recordId;
        
        await updateRecord({ fields });
        
        // Update local state only after successful save
        this.currentStage = newStage;
        
        console.log('STAGE RETENTION: Saved stage to Salesforce:', salesforceValue);
        
        this.showToast('Success', `Stage changed to ${salesforceValue}`, 'success');
        
    } catch (error) {
        console.error('STAGE RETENTION: Error saving stage:', error);
        this.showToast('Error', 'Failed to save stage: ' + this.getErrorMessage(error), 'error');
    }
}
```

**Why:** Saves the stage to Salesforce whenever the user changes it, ensuring persistence.

---

## 📝 CHANGE 6: Auto-Set Stage to "Adjudicated" After Successful Adjudication

**File:** `customBillLineItemGrid.js`  
**Location:** Line 2766 (inside `handleProceedWithAdjudication` method, after line items are marked as processed)

### Find This Section (around line 2770):

```javascript
// TRINITY: Mark all Bill Line Items as Processed
await markLineItemsAsProcessed({ caseId: this.recordId });

// Refresh the grid to show the updated status
await refreshApex(this.wiredLineItemsResult);
```

### Add This Code After It:

```javascript
// STAGE RETENTION: Auto-set stage to "Adjudicated" after successful adjudication
try {
    const fields = {};
    fields[CURRENT_STAGE_FIELD.fieldApiName] = 'Adjudicated';
    fields.Id = this.recordId;
    
    await updateRecord({ fields });
    
    this.currentStage = 'adjudicated';
    
    console.log('STAGE RETENTION: Case automatically locked after adjudication');
    
} catch (error) {
    console.error('STAGE RETENTION: Error setting adjudicated stage:', error);
    // Don't fail the whole adjudication if stage update fails
}
```

**Why:** Automatically locks the case after successful adjudication to prevent accidental edits.

---

## 📝 CHANGE 7: Hide Buttons When Adjudicated

**File:** `customBillLineItemGrid.js`
**Location:** After line 305 (after `showAdjudicateButton` getter)

### Add These Getters:

```javascript
// STAGE RETENTION: Hide action buttons when adjudicated
get showAddRowButton() {
    return this.isEditable && this.draftRow !== null;
}

get showBulkOperations() {
    return this.isEditable && this.hasSelectedItems;
}

get showDeleteButton() {
    return this.isEditable;
}

get showDuplicateButton() {
    return this.isEditable;
}
```

**Why:** Hides all editing buttons when the case is in "Adjudicated" state.

---

## 📝 CHANGE 8: Update showAdjudicateButton to Hide When Adjudicated

**File:** `customBillLineItemGrid.js`
**Location:** Lines 305-307 (existing `showAdjudicateButton` getter)

### Replace This:

```javascript
get showAdjudicateButton() {
    return this.currentStage === 'billReview';
}
```

### With This:

```javascript
get showAdjudicateButton() {
    return this.currentStage === 'billReview' && this.isEditable;
}
```

**Why:** Hides the "Adjudicate" button when the case is already adjudicated.

---

## 📝 CHANGE 9: Add Locked State Banner to HTML

**File:** `customBillLineItemGrid.html`
**Location:** After the header section, before the grid table (around line 40)

### Add This HTML:

```html
<!-- STAGE RETENTION: Locked state banner -->
<template if:true={isAdjudicated}>
    <div class="slds-notify slds-notify_alert slds-theme_warning slds-m-bottom_small">
        <span class="slds-icon_container slds-icon-utility-lock slds-m-right_x-small">
            <lightning-icon icon-name="utility:lock" size="x-small" alternative-text="Locked"></lightning-icon>
        </span>
        <h2 class="slds-text-heading_small">
            <strong>This case has been adjudicated and is locked for editing.</strong>
            All fields are read-only to prevent accidental changes.
        </h2>
    </div>
</template>
```

**Why:** Provides clear visual feedback that the case is locked.

---

## 📝 CHANGE 10: Disable Stage Selector When Adjudicated

**File:** `customBillLineItemGrid.html`
**Location:** Find the stage selector `<lightning-combobox>` (around line 30)

### Find This:

```html
<lightning-combobox
    label="Stage"
    value={currentStage}
    options={stageOptions}
    onchange={handleStageChange}>
</lightning-combobox>
```

### Replace With This:

```html
<lightning-combobox
    label="Stage"
    value={currentStage}
    options={stageOptions}
    onchange={handleStageChange}
    disabled={stageSelectorDisabled}>
</lightning-combobox>
```

**Why:** Prevents users from changing the stage back from "Adjudicated" to another stage.

---

## 📝 CHANGE 11: Disable Inline Editing When Adjudicated

**File:** `customBillLineItemGrid.html`
**Location:** Find all `onclick={handleCellClick}` attributes in the table cells

### Find Patterns Like This:

```html
<td onclick={handleCellClick} data-field="Service_Start_Date__c" data-row-id={item.Id}>
```

### Replace With This:

```html
<td onclick={handleCellClick} data-field="Service_Start_Date__c" data-row-id={item.Id} data-editable={isEditable}>
```

**Then in JavaScript (customBillLineItemGrid.js), modify `handleCellClick` method:**

### Find This (around line 1400):

```javascript
handleCellClick(event) {
    const field = event.currentTarget.dataset.field;
    const rowId = event.currentTarget.dataset.rowId;

    // ... existing code ...
}
```

### Add This Check at the Beginning:

```javascript
handleCellClick(event) {
    // STAGE RETENTION: Prevent editing when adjudicated
    if (this.isAdjudicated) {
        this.showToast('Info', 'This case is locked for editing', 'info');
        return;
    }

    const field = event.currentTarget.dataset.field;
    const rowId = event.currentTarget.dataset.rowId;

    // ... existing code ...
}
```

**Why:** Prevents inline editing when the case is adjudicated.

---

## 📝 CHANGE 12: Update Button Visibility in HTML

**File:** `customBillLineItemGrid.html`
**Location:** Find the action buttons section (around line 50-60)

### Find Buttons Like This:

```html
<lightning-button
    label="Add Row"
    onclick={handleAddRow}
    icon-name="utility:add">
</lightning-button>
```

### Update to Use New Getters:

```html
<template if:true={showAddRowButton}>
    <lightning-button
        label="Add Row"
        onclick={handleAddRow}
        icon-name="utility:add">
    </lightning-button>
</template>

<template if:true={showBulkOperations}>
    <!-- Bulk operation buttons here -->
</template>
```

**Why:** Conditionally shows/hides buttons based on adjudicated state.

---

## 📊 Summary of Changes

| File | Changes | Lines Added | Lines Modified |
|------|---------|-------------|----------------|
| `customBillLineItemGrid.js` | 8 changes | ~80 | ~10 |
| `customBillLineItemGrid.html` | 4 changes | ~15 | ~5 |
| **TOTAL** | **12 changes** | **~95 lines** | **~15 lines** |

---

## 🧪 Testing Checklist

After implementing these changes, test the following:

### ✅ Stage Retention Tests

- [ ] Open Case → Change to "Bill Review" → Close modal → Reopen → Stage is "Bill Review"
- [ ] Open Case → Change to "Quote View" → Close modal → Reopen → Stage is "Quote View"
- [ ] Close browser completely → Reopen → Stage is still preserved
- [ ] User A changes stage → User B opens same case → Both see same stage

### ✅ Adjudication Locking Tests

- [ ] Change to "Bill Review" → Click "Adjudicate" → Validation passes → Click "Proceed"
- [ ] Stage automatically changes to "Adjudicated"
- [ ] Locked banner appears at top of grid
- [ ] Stage selector is disabled (cannot change back)
- [ ] All inline editing is disabled
- [ ] "Add Row" button is hidden
- [ ] "Adjudicate" button is hidden
- [ ] Bulk operation buttons are hidden
- [ ] Clicking any cell shows "This case is locked for editing" message

### ✅ Error Handling Tests

- [ ] Network error when saving stage → Shows error toast
- [ ] Invalid stage value → Defaults to "Keying"
- [ ] Field not accessible → Shows error in console, keeps default stage

---

## 🚀 Deployment Steps

1. **Review all changes** in this document
2. **Implement changes** in the order listed (1-12)
3. **Test locally** using all test scenarios above
4. **Deploy to sandbox** for UAT
5. **Get approval** from stakeholders
6. **Deploy to production**

---

## 📝 Rollback Plan

If issues occur after deployment:

1. **Quick fix:** Set all Cases to `Current_Adjudication_Stage__c = 'Keying'`
2. **Code rollback:** Revert changes to `customBillLineItemGrid.js` and `.html`
3. **Field removal:** Delete `Current_Adjudication_Stage__c` field (only if necessary)

---

## ⚠️ Important Notes

- **Field History Tracking** is enabled on `Current_Adjudication_Stage__c` - you can audit all stage changes
- **Admins may need "unlock" capability** - consider adding a permission set or button to unlock adjudicated cases
- **Validation rule** could be added to prevent changing from "Adjudicated" back to other stages at the database level
- **Process Builder/Flow** could be triggered when stage changes to "Adjudicated" (e.g., send email notification)

---

**Status:** 📋 Documentation Complete | ⏸️ Implementation Pending | 🧪 Testing Pending

