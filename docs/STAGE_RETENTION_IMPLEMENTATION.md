# Stage Retention Implementation Plan

## 📋 Overview

This document outlines the implementation plan for **Stage Retention** - maintaining the correct adjudication stage (Keying, Bill Review, Quote View, Adjudicated) when closing and reopening a Case.

---

## ✅ Field Created

**Field Name:** `Current_Adjudication_Stage__c`  
**Object:** Case  
**Type:** Picklist  
**Status:** ✅ Deployed to `trinity@medivest.com.eobbcnb`

**Picklist Values:**
1. **Keying** (default) - Data entry stage
2. **Bill Review** - Adjudication review stage
3. **Quote View** - Read-only view
4. **Adjudicated** - Final locked state (prevents editing)

---

## 🎯 Implementation Requirements

### 1. **Read Stage from Salesforce on Component Load**

**File:** `customBillLineItemGrid.js`

**What to do:**
- Add `@wire(getRecord)` to read `Case.Current_Adjudication_Stage__c`
- Map Salesforce picklist values to component values:
  - `"Keying"` → `"keying"`
  - `"Bill Review"` → `"billReview"`
  - `"Quote View"` → `"quote"`
  - `"Adjudicated"` → `"adjudicated"` (new)
- Set `this.currentStage` based on the field value

**Code Location:** After line 94 (where `currentStage` is declared)

---

### 2. **Save Stage to Salesforce on Change**

**File:** `customBillLineItemGrid.js`

**What to do:**
- Modify `handleStageChange()` method (line 1197)
- Use `updateRecord()` to save the new stage to `Case.Current_Adjudication_Stage__c`
- Map component values back to Salesforce picklist values
- Handle errors gracefully with toast messages

**Code Location:** Line 1197-1199 (existing `handleStageChange` method)

---

### 3. **Add "Adjudicated" Stage to Stage Selector**

**File:** `customBillLineItemGrid.js`

**What to do:**
- Add new option to `stageOptions` getter (line 234-240):
  ```javascript
  { label: 'Adjudicated (Locked)', value: 'adjudicated' }
  ```

**Code Location:** Line 234-240 (existing `stageOptions` getter)

---

### 4. **Implement Locking Logic for "Adjudicated" Stage**

**File:** `customBillLineItemGrid.js`

**What to do:**
- Add computed property `isAdjudicated`:
  ```javascript
  get isAdjudicated() {
      return this.currentStage === 'adjudicated';
  }
  ```
- Add computed property `isEditable`:
  ```javascript
  get isEditable() {
      return !this.isAdjudicated;
  }
  ```
- Disable all editing when `isAdjudicated === true`:
  - Disable inline editing
  - Hide "Add Row" button
  - Hide "Adjudicate" button
  - Hide bulk operations
  - Show read-only message

**Code Location:** After line 275 (after existing computed properties)

---

### 5. **Auto-Set Stage to "Adjudicated" After Successful Adjudication**

**File:** `customBillLineItemGrid.js`

**What to do:**
- Modify `handleProceedWithAdjudication()` method (line 2766)
- After successful adjudication, update stage to "Adjudicated":
  ```javascript
  await updateRecord({
      fields: {
          Id: this.recordId,
          Current_Adjudication_Stage__c: 'Adjudicated'
      }
  });
  this.currentStage = 'adjudicated';
  ```

**Code Location:** Line 2766-2790 (existing `handleProceedWithAdjudication` method)

---

### 6. **Add UI Indicators for Locked State**

**File:** `customBillLineItemGrid.html`

**What to do:**
- Add banner at top of grid when `isAdjudicated === true`:
  ```html
  <template if:true={isAdjudicated}>
      <div class="slds-notify slds-notify_alert slds-theme_info">
          <span class="slds-icon_container slds-icon-utility-lock">
              <lightning-icon icon-name="utility:lock" size="x-small"></lightning-icon>
          </span>
          <h2>This case has been adjudicated and is locked for editing.</h2>
      </div>
  </template>
  ```
- Disable stage selector when adjudicated (prevent changing back)
- Add `disabled` attribute to all input fields when `isAdjudicated`

**Code Location:** Top of grid section (after header, before table)

---

## 🔒 Locking Behavior

### When `Current_Adjudication_Stage__c = "Adjudicated"`:

| Feature | Behavior |
|---------|----------|
| **Inline Editing** | ❌ Disabled |
| **Add Row Button** | ❌ Hidden |
| **Duplicate Row** | ❌ Hidden |
| **Delete Row** | ❌ Hidden |
| **Bulk Operations** | ❌ Hidden |
| **Adjudicate Button** | ❌ Hidden |
| **Stage Selector** | ❌ Disabled (locked on "Adjudicated") |
| **Grid Display** | ✅ Read-only (Quote View mode) |
| **Validation** | ✅ Can still view validation report |

---

## 🧪 Testing Scenarios

### Scenario 1: Stage Retention
1. Open Case → Change to "Bill Review" → Close modal
2. Reopen modal → **Should be in "Bill Review"** ✅
3. Close browser → Reopen → **Should still be in "Bill Review"** ✅

### Scenario 2: Multi-User Consistency
1. User A opens Case → Changes to "Bill Review"
2. User B opens same Case → **Should see "Bill Review"** ✅

### Scenario 3: Adjudication Locking
1. Open Case → Change to "Bill Review" → Click "Adjudicate"
2. Validation passes → Click "Proceed with Adjudication"
3. **Stage should auto-change to "Adjudicated"** ✅
4. **All editing should be disabled** ✅
5. **Banner should show "locked for editing"** ✅

### Scenario 4: Prevent Unlocking
1. Case in "Adjudicated" stage
2. Try to change stage selector → **Should be disabled** ✅
3. Try to edit any field → **Should be disabled** ✅

---

## 📝 Code Changes Summary

| File | Lines | Change |
|------|-------|--------|
| `customBillLineItemGrid.js` | ~94 | Add `@wire(getRecord)` for Case field |
| `customBillLineItemGrid.js` | ~234-240 | Add "Adjudicated" to stage options |
| `customBillLineItemGrid.js` | ~275 | Add `isAdjudicated` and `isEditable` getters |
| `customBillLineItemGrid.js` | ~1197 | Modify `handleStageChange()` to save to Salesforce |
| `customBillLineItemGrid.js` | ~2766 | Auto-set "Adjudicated" after successful adjudication |
| `customBillLineItemGrid.html` | Top of grid | Add locked state banner |
| `customBillLineItemGrid.html` | Throughout | Add `disabled={isAdjudicated}` to inputs |

**Estimated Lines of Code:** ~100 lines (mostly conditional logic and UI updates)

---

## 🎯 Benefits

1. ✅ **Stage persists** between sessions
2. ✅ **Multi-user consistency** - all users see same stage
3. ✅ **Audit trail** - Field History Tracking enabled
4. ✅ **Prevents accidental edits** after adjudication
5. ✅ **Clear workflow progression** - Keying → Bill Review → Adjudicated
6. ✅ **Reportable** - Can create reports on cases by stage

---

## ⚠️ Important Notes

- **Do NOT implement yet** - this is analysis only
- Field has been created and deployed ✅
- Code changes require careful testing
- Consider adding validation rule to prevent changing from "Adjudicated" back to other stages
- Consider adding permission set to allow "unlocking" for admins if needed

---

## 🚀 Next Steps (When Ready to Implement)

1. Review this plan with team
2. Get approval for locking behavior
3. Implement code changes in `customBillLineItemGrid.js`
4. Add UI indicators in `customBillLineItemGrid.html`
5. Test all scenarios
6. Deploy to sandbox for UAT
7. Deploy to production

---

**Status:** ✅ Field Created | 📋 Implementation Plan Ready | ⏸️ Awaiting Approval

