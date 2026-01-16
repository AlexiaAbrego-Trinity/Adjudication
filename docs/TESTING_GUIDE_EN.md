# 🧪 TESTING GUIDE - BCN Quote Validations

**Date:** 2026-01-14  
**System:** Medivest BCN Quote Adjudication  
**Version:** v2.3.6

---

## 🎯 OBJECTIVE

This guide helps you **test all validations** in the system to ensure they work correctly.

---

## 🛠️ INITIAL SETUP

### Prerequisites:

1. Access to Salesforce sandbox (eobbcnb)
2. Permissions to create/edit Cases and Bill Line Items
3. A Case of type "BCN Quote" in status "Keying" or "Pending Review"

### Create a Test Case:

```
1. Go to Cases → New
2. Record Type: BCN Quote
3. Fill minimum fields:
   - Status: Keying
   - Date Received: Today
   - Payee Name: Test Payee
   - Payee Address: 123 Test St
   - Total Claim Charge: $1,000.00
4. Save
```

---

## ✅ TESTING WARNINGS (2 Rules)

### ⚠️ TEST 1: Payment Exceeds Individual Charge

**Objective:** Verify warning appears when payment > charge on a line item.

**Steps:**
1. Open your test Case
2. Create a Bill Line Item:
   ```
   Service Start Date: 2026-01-01
   Service End Date: 2026-01-01
   Revenue Code: 0450
   Quantity: 1
   Charge: 100.00
   Approved Amount: 150.00  ← Greater than charge
   Account: [Any account]
   Remark Code 1: N123
   ```
3. Save
4. Click "Validate for Adjudication"

**Expected Result:**
- ✅ Toast: "Found 0 error(s) and 1 warning(s)"
- ✅ Modal: Section "⚠️ Warnings (Non-blocking) (1)"
- ✅ Warning: "Payment Exceeds Individual Charge"
- ✅ "Proceed with Adjudication" button ENABLED

**How to Fix:**
- Change Approved Amount to 100 or less
- Or leave it if intentional (lump-sum)

---

### ⚠️ TEST 2: Account Payment Exceeds Balance

**Objective:** Verify warning appears when account payments > balance.

**Steps:**
1. Find a Member Account with known balance:
   ```sql
   SELECT Id, Name, BalanceAccrued__c 
   FROM Member_Account__c 
   WHERE BalanceAccrued__c > 0 
   LIMIT 1
   ```
   Example: Account "ABC" has $500 balance

2. Create 2 Bill Line Items assigned to that account:
   ```
   Line Item 1:
   - Account: ABC
   - Charge: 300
   - Approved Amount: 300
   - [Other required fields]
   
   Line Item 2:
   - Account: ABC
   - Charge: 300
   - Approved Amount: 400  ← Total = $700 > $500
   - [Other required fields]
   ```

3. Click "Validate for Adjudication"

**Expected Result:**
- ✅ Toast: "Found 0 error(s) and 1 warning(s)"
- ✅ Modal: Warning "Account Payment Exceeds Balance"
- ✅ Message: "Payments from ABC ($700.00) exceed accrued balance ($500.00)"
- ✅ "Proceed" button ENABLED

**How to Fix:**
- Reduce payments to $500 total
- Or leave it if additional funds confirmed

---

## ❌ TESTING FAILURES - BCN LEVEL (6 Rules)

### ❌ TEST 3: BCN Status On Hold

**Steps:**
1. Open your Case
2. Change Status to "On Hold"
3. Save
4. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Toast: "Found 1 error(s)"
- ❌ Modal: "BCN is currently On Hold"
- ❌ "Proceed" button DISABLED

---

### ❌ TEST 4: Previously Adjudicated

**Steps:**
1. Open your Case
2. Change Status to "Adjudicated"
3. Save
4. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "BCN has already been adjudicated"

---

### ❌ TEST 5: Received Date Required

**Steps:**
1. Open your Case
2. Clear "Date Received"
3. Save
4. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "Required field missing: Received Date"

---

### ❌ TEST 6: Payee Required

**Steps:**
1. Open your Case
2. Clear "Payee Name"
3. Save
4. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "Required field missing: Payee (Entity)"

---

### ❌ TEST 7: Payee Address Required

**Steps:**
1. Open your Case
2. Clear "Payee Address"
3. Save
4. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "Required field missing: Payee Address"

---

### ❌ TEST 8: Total Claim Charge Required

**Steps:**
1. Open your Case
2. Set "Total Claim Charge" = 0
3. Make sure there are NO line items with charges
4. Save
5. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "Required field missing: Total Claim Charge"

---

## ❌ TESTING FAILURES - CHARGE LEVEL (2 Rules)

### ❌ TEST 9: Cumulative Charges Mismatch

**Steps:**
1. Open your Case
2. Set "Total Claim Charge" = $1,000.00
3. Create line items that sum differently:
   ```
   Line 1: Charge $500
   Line 2: Charge $300
   Total: $800  ← Doesn't match $1,000
   ```
4. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "Line item charges ($800.00) do not equal Total Claim Charge ($1,000.00)"
- ❌ Details: "Difference: $200.00"

---

### ❌ TEST 10: Cumulative Payment Exceeds Charge

**Steps:**
1. Open your Case
2. Total Claim Charge = $1,000.00
3. Create line items with payments that exceed:
   ```
   Line 1: Charge $500, Payment $700
   Line 2: Charge $500, Payment $600
   Total Payments: $1,300  ← Exceeds $1,000
   ```
4. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "Total payments ($1,300.00) exceed Total Claim Charge ($1,000.00)"
- ❌ Details: "Overpayment: $300.00"

---

## ❌ TESTING FAILURES - LINE ITEM (9 Rules)

### ❌ TEST 11: Service Dates Required

**Steps:**
1. Create a line item
2. Leave "Service Start Date" or "Service End Date" empty
3. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "1 line item missing start/end dates"

---

### ❌ TEST 12: Revenue Code OR CPT Required

**Steps:**
1. Create a line item
2. Leave BOTH empty: "Revenue Code" AND "CPT/HCPCS/NDC"
3. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "1 line item missing both Revenue Code and CPT/HCPCS/NDC"

---

### ❌ TEST 13: Quantity Required

**Steps:**
1. Create a line item
2. Leave "Quantity" empty
3. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "1 line item missing quantity"

---

### ❌ TEST 14: Charge Required

**Steps:**
1. Create a line item
2. Leave "Charge" empty
3. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "1 line item missing charge amount"

---

### ❌ TEST 15: Negative Charge

**Steps:**
1. Create a line item
2. Set "Charge" = -100
3. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "1 line item has negative charge"

---

### ❌ TEST 16: Negative Payment

**Steps:**
1. Create a line item
2. Set "Approved Amount" = -50
3. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "1 line item has negative payment"

---

### ❌ TEST 17: Account Required

**Steps:**
1. Create a line item
2. Leave "Account" empty
3. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "1 line item missing account assignment"

---

### ❌ TEST 18: Invalid Service Date Range

**Steps:**
1. Create a line item
2. Set:
   ```
   Service Start Date: 2026-01-15
   Service End Date: 2026-01-10  ← Before start
   ```
3. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "1 line item has end date before start date"

---

### ❌ TEST 19: Remark Code 1 Required

**Steps:**
1. Create a line item
2. Leave "Remark Code 1" empty
3. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "1 line item missing RC1"

---

## ❌ TESTING FAILURES - RELATIONAL (2 Rules)

### ❌ TEST 20: Orphaned Line Items

**Note:** This error is difficult to reproduce manually - requires data corruption.

**How to Simulate (Apex):**
```apex
// Create line item without Case
Bill_Line_Item__c orphan = new Bill_Line_Item__c(
    Case__c = null,  // No Case
    Charge__c = 100
);
insert orphan;
```

**Expected Result:**
- ❌ Error: "Line items are not properly linked to BCN"

---

### ❌ TEST 21: Account Mismatch

**Note:** This error requires specific Member Account configuration.

**Steps:**
1. Identify the Case Member
2. Find an account that does NOT belong to that Member
3. Assign that account to a line item
4. Click "Validate for Adjudication"

**Expected Result:**
- ❌ Error: "Line items have accounts that don't belong to case member"

---

## 🎯 COMPLETE TEST - HAPPY PATH

**Objective:** Verify that a valid Case passes all validations.

**Setup:**
```
Case:
- Status: Keying
- Date Received: 2026-01-14
- Payee Name: Test Hospital
- Payee Address: 123 Main St, City, ST 12345
- Total Claim Charge: $1,000.00

Line Item 1:
- Service Start Date: 2026-01-01
- Service End Date: 2026-01-01
- Revenue Code: 0450
- Quantity: 1
- Charge: 500.00
- Approved Amount: 400.00
- Account: [Valid account]
- Remark Code 1: N123

Line Item 2:
- Service Start Date: 2026-01-02
- Service End Date: 2026-01-02
- CPT/HCPCS/NDC: 99213
- Quantity: 1
- Charge: 500.00
- Approved Amount: 500.00
- Account: [Valid account]
- Remark Code 1: N456

Total Charges: $1,000.00 ✓
Total Payments: $900.00 ✓
```

**Expected Result:**
- ✅ Toast: "Found 0 error(s) and 0 warning(s)"
- ✅ Modal: "✅ Validation Passed"
- ✅ Section: "Passed Validation Rules (19)"
- ✅ "Proceed with Adjudication" button ENABLED

---

## 🧪 COMPLETE TEST - MIXED SCENARIO

**Objective:** Verify system handles multiple errors and warnings.

**Setup:**
```
Case:
- Status: Keying
- Date Received: [EMPTY]  ← ERROR
- Payee Name: Test Hospital
- Payee Address: Test Address
- Total Claim Charge: $1,000.00

Line Item 1:
- Service Start Date: [EMPTY]  ← ERROR
- Service End Date: 2026-01-01
- Revenue Code: 0450
- Quantity: 1
- Charge: 600.00
- Approved Amount: 800.00  ← WARNING (payment > charge)
- Account: [Valid account]
- Remark Code 1: N123

Line Item 2:
- Service Start Date: 2026-01-02
- Service End Date: 2026-01-02
- Revenue Code: [EMPTY]
- CPT/HCPCS/NDC: [EMPTY]  ← ERROR
- Quantity: 1
- Charge: 400.00
- Approved Amount: 300.00
- Account: [Valid account]
- Remark Code 1: N456

Total Charges: $1,000.00 ✓
Total Payments: $1,100.00  ← ERROR (exceeds total)
```

**Expected Result:**
- ❌ Toast: "Found 4 error(s) and 1 warning(s)"
- ❌ Modal: "Validation Failed - Issues Must Be Resolved"
- ❌ BCN-Level Failures (1): Received Date Required
- ❌ Charge-Level Failures (1): Payment Exceeds Total Charge
- ❌ Line Item Failures (2): Service Dates Required, Revenue/CPT Required
- ⚠️ Warnings (1): Payment Exceeds Individual Charge
- ❌ "Proceed" button DISABLED

---

## 📊 TESTING CHECKLIST

Use this checklist to verify all validations work:

### ✅ Warnings (2):
- [ ] Payment Exceeds Individual Charge
- [ ] Account Payment Exceeds Balance

### ✅ BCN-Level Failures (6):
- [ ] Status On Hold
- [ ] Previously Adjudicated
- [ ] Received Date Required
- [ ] Payee Required
- [ ] Payee Address Required
- [ ] Total Claim Charge Required

### ✅ Charge-Level Failures (2):
- [ ] Cumulative Charges Mismatch
- [ ] Cumulative Payment Exceeds Charge

### ✅ Line Item Failures (9):
- [ ] Service Dates Required
- [ ] Revenue Code OR CPT Required
- [ ] Quantity Required
- [ ] Charge Required
- [ ] Negative Charge
- [ ] Negative Payment
- [ ] Account Required
- [ ] Invalid Service Date Range
- [ ] Remark Code 1 Required

### ✅ Relational Failures (2):
- [ ] Orphaned Line Items
- [ ] Account Mismatch

### ✅ Integration Tests:
- [ ] Happy Path (all valid)
- [ ] Mixed Scenario (errors + warnings)
- [ ] UI shows errors correctly
- [ ] UI shows warnings correctly
- [ ] "Proceed" button enables/disables correctly

---

## 🐛 DEBUGGING TIPS

### If a test fails:

1. **Open browser console (F12)**
2. **Look for TRINITY logs:**
   ```javascript
   TRINITY DEBUG - Warnings Array: [...]
   TRINITY DEBUG - Has Warnings: true
   TRINITY: Failed Rule IDs: [...]
   ```

3. **Verify Apex result:**
   - Open Developer Console
   - Debug Logs
   - Search for: `TRM_ValidationService`

4. **Verify modal:**
   - Do correct sections appear?
   - Are counters correct?
   - Is "Proceed" button in correct state?

### Common Issues:

| Problem | Cause | Solution |
|---------|-------|----------|
| Warning doesn't appear | Not separated from failures array | Verify lines 38-67 in TRM_ValidationService.cls |
| "Proceed" button disabled with only warnings | `canProceed` includes warnings | Verify lines 58-63 in TRM_ValidationService.cls |
| Warnings section doesn't appear | `hasWarnings` getter fails | Verify validationReportModal.js |
| Incorrect counters | Duplicates in arrays | Verify warning separation |

---

## 📞 SUPPORT

**Documentation:**
- `FAILURES_IMPLEMENTED_EN.md` - Complete list of errors
- `WARNINGS_IMPLEMENTED_EN.md` - Complete list of warnings
- `VALIDATION_SUMMARY_EN.md` - Executive summary

**Code:**
- Backend: `TRM_ValidationService.cls`
- Frontend: `validationReportModal` LWC
- Tests: `TRM_ValidationServiceTest.cls`

**Questions:**
- Report bugs in Jira
- Contact development team

---

**End of document - Testing Guide**


