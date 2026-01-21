# Stage Retention - Implementation Checklist

## 📋 Overview

Use this checklist to track progress when implementing Stage Retention functionality.

---

## ✅ Phase 1: Preparation (COMPLETED)

- [x] **Create Salesforce field** `Current_Adjudication_Stage__c` on Case object
- [x] **Deploy field** to `trinity@medivest.com.eobbcnb`
- [x] **Document implementation plan** (`STAGE_RETENTION_IMPLEMENTATION.md`)
- [x] **Document code changes** (`STAGE_RETENTION_CODE_CHANGES.md`)
- [x] **Create visual guide** (`STAGE_RETENTION_VISUAL_GUIDE.md`)
- [x] **Create workflow diagram** (Mermaid state diagram)

**Status:** ✅ Complete

---

## 📝 Phase 2: Code Implementation (PENDING)

### File: `customBillLineItemGrid.js`

- [ ] **Change 1:** Import required modules (`getRecord`, `updateRecord`, `CURRENT_STAGE_FIELD`)
  - Location: Top of file, after existing imports
  - Lines: ~3 new lines

- [ ] **Change 2:** Add wire adapter to read stage from Salesforce
  - Location: After line 94 (after `currentStage` declaration)
  - Lines: ~25 new lines

- [ ] **Change 3:** Add "Adjudicated" option to stage selector
  - Location: Lines 234-240 (modify `stageOptions` getter)
  - Lines: ~1 new line

- [ ] **Change 4:** Add computed properties for locking logic
  - Location: After line 275 (after existing computed properties)
  - Lines: ~12 new lines

- [ ] **Change 5:** Modify `handleStageChange` to save to Salesforce
  - Location: Lines 1197-1199 (replace existing method)
  - Lines: ~35 new lines (replace 3 existing)

- [ ] **Change 6:** Auto-set stage to "Adjudicated" after successful adjudication
  - Location: Line 2770 (inside `handleProceedWithAdjudication`)
  - Lines: ~15 new lines

- [ ] **Change 7:** Add getters to hide buttons when adjudicated
  - Location: After line 305 (after `showAdjudicateButton`)
  - Lines: ~16 new lines

- [ ] **Change 8:** Update `showAdjudicateButton` to hide when adjudicated
  - Location: Lines 305-307 (modify existing getter)
  - Lines: ~1 modified line

- [ ] **Change 11:** Add check in `handleCellClick` to prevent editing when adjudicated
  - Location: Around line 1400 (beginning of `handleCellClick` method)
  - Lines: ~5 new lines

**Subtotal:** ~9 changes, ~113 new/modified lines

---

### File: `customBillLineItemGrid.html`

- [ ] **Change 9:** Add locked state banner
  - Location: After header, before grid table (around line 40)
  - Lines: ~10 new lines

- [ ] **Change 10:** Disable stage selector when adjudicated
  - Location: Stage selector `<lightning-combobox>` (around line 30)
  - Lines: ~1 modified line

- [ ] **Change 12:** Update button visibility with conditional templates
  - Location: Action buttons section (around lines 50-60)
  - Lines: ~4 modified sections

**Subtotal:** ~3 changes, ~15 new/modified lines

---

**Total Code Changes:** 12 changes, ~128 lines

---

## 🧪 Phase 3: Testing (PENDING)

### Stage Retention Tests

- [ ] **Test 1.1:** Open Case → Change to "Bill Review" → Close modal → Reopen
  - Expected: Stage is "Bill Review" ✅
  
- [ ] **Test 1.2:** Open Case → Change to "Quote View" → Close modal → Reopen
  - Expected: Stage is "Quote View" ✅
  
- [ ] **Test 1.3:** Change stage → Close browser completely → Reopen
  - Expected: Stage is still preserved ✅
  
- [ ] **Test 1.4:** User A changes stage → User B opens same case
  - Expected: Both see same stage ✅

---

### Adjudication Locking Tests

- [ ] **Test 2.1:** Change to "Bill Review" → Click "Adjudicate" → Validation passes → Click "Proceed"
  - Expected: Stage automatically changes to "Adjudicated" ✅
  
- [ ] **Test 2.2:** After adjudication, check locked banner
  - Expected: Banner appears at top: "This case has been adjudicated and is locked for editing" ✅
  
- [ ] **Test 2.3:** After adjudication, try to change stage selector
  - Expected: Stage selector is disabled (grayed out) ✅
  
- [ ] **Test 2.4:** After adjudication, try to click any cell to edit
  - Expected: Shows toast: "This case is locked for editing" ✅
  
- [ ] **Test 2.5:** After adjudication, check button visibility
  - Expected: "Add Row", "Adjudicate", bulk operation buttons are hidden ✅
  
- [ ] **Test 2.6:** After adjudication, try to add a row
  - Expected: "Add Row" button is not visible ✅

---

### Error Handling Tests

- [ ] **Test 3.1:** Disconnect network → Try to change stage
  - Expected: Shows error toast, stage doesn't change ✅
  
- [ ] **Test 3.2:** Manually set invalid stage value in Salesforce
  - Expected: Defaults to "Keying", shows warning in console ✅
  
- [ ] **Test 3.3:** Remove field access for user → Open modal
  - Expected: Shows error in console, keeps default "Keying" stage ✅

---

### Field History Tracking Tests

- [ ] **Test 4.1:** Change stage from "Keying" to "Bill Review"
  - Expected: Field History shows change with user and timestamp ✅
  
- [ ] **Test 4.2:** Adjudicate case
  - Expected: Field History shows change to "Adjudicated" ✅
  
- [ ] **Test 4.3:** View Field History on Case
  - Expected: All stage changes are tracked ✅

---

## 🚀 Phase 4: Deployment (PENDING)

### Sandbox Deployment

- [ ] **Deploy code** to sandbox org
- [ ] **Run all tests** in sandbox
- [ ] **UAT with stakeholders** (Alexia, Chris, Ray)
- [ ] **Fix any issues** found during UAT
- [ ] **Get approval** from stakeholders

---

### Production Deployment

- [ ] **Create deployment package**
- [ ] **Schedule deployment window**
- [ ] **Deploy to production**
- [ ] **Verify deployment** successful
- [ ] **Smoke test** in production
- [ ] **Monitor for errors** (first 24 hours)
- [ ] **Communicate to users** (email/Slack)

---

## 📊 Progress Tracking

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Preparation | ✅ Complete | 100% |
| Phase 2: Code Implementation | ⏸️ Pending | 0% |
| Phase 3: Testing | ⏸️ Pending | 0% |
| Phase 4: Deployment | ⏸️ Pending | 0% |
| **OVERALL** | **⏸️ Pending** | **25%** |

---

## 🎯 Estimated Time

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Preparation | ✅ 2 hours (DONE) |
| Phase 2: Code Implementation | ⏸️ 2-3 hours |
| Phase 3: Testing | ⏸️ 1-2 hours |
| Phase 4: Deployment | ⏸️ 1 hour |
| **TOTAL** | **6-8 hours** |

---

## 📝 Notes

- Field `Current_Adjudication_Stage__c` is already deployed ✅
- All documentation is complete ✅
- Ready to start code implementation when approved
- Consider adding "Unlock" button for admins (future enhancement)
- Consider adding validation rule to prevent unlocking at database level (future enhancement)

---

## ⚠️ Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Users accidentally lock cases | Add confirmation dialog before adjudication |
| Need to unlock adjudicated case | Create admin-only "Unlock" button (future) |
| Field History grows large | Archive old history periodically |
| Performance impact | Field is indexed, minimal impact expected |

---

**Last Updated:** 2026-01-21  
**Status:** Ready for Implementation  
**Next Step:** Begin Phase 2 (Code Implementation)

