# Implementation Plan: Payment Exceeds Charge Validation

**Date:** 2026-01-14  
**Developer:** Development Team  
**Estimated Time:** 2-3 hours (including testing)

---

## 📋 Pre-Implementation Checklist

- [ ] Read and understand business requirements (Ray's request)
- [ ] Review technical documentation
- [ ] Verify no uncommitted changes in `TRM_ValidationService.cls`
- [ ] Create feature branch in Git
- [ ] Notify stakeholders of planned change

---

## 🔧 Step-by-Step Implementation

### Step 1: Create Git Branch (5 minutes)

```bash
cd salesforce-project
git checkout -b feature/payment-exceeds-charge-warning
git status  # Verify clean working directory
```

**Expected Output:**
```
On branch feature/payment-exceeds-charge-warning
nothing to commit, working tree clean
```

---

### Step 2: Backup Current Code (2 minutes)

```bash
# Create backup of current file
cp force-app/main/default/classes/TRM_ValidationService.cls \
   force-app/main/default/classes/TRM_ValidationService.cls.backup

# Verify backup exists
ls -la force-app/main/default/classes/TRM_ValidationService.cls*
```

---

### Step 3: Modify TRM_ValidationService.cls (30 minutes)

#### Change 3.1: Add Warnings List (Line 257)

**Location:** Inside `validateLineItems()` method  
**Line:** 257

**Find:**
```apex
private static List<ValidationFailure> validateLineItems(List<Bill_Line_Item__c> lineItems) {
    List<ValidationFailure> failures = new List<ValidationFailure>();
```

**Replace with:**
```apex
private static List<ValidationFailure> validateLineItems(List<Bill_Line_Item__c> lineItems) {
    List<ValidationFailure> failures = new List<ValidationFailure>();
    List<ValidationFailure> warnings = new List<ValidationFailure>();
```

---

#### Change 3.2: Update Comment (Lines 314-318)

**Location:** Rule 9 detection logic  
**Lines:** 314-318

**Find:**
```apex
            // Rule 9: Payment Exceeds Charge
            if (item.Charge__c != null && item.Approved_Amount__c != null &&
                item.Approved_Amount__c > item.Charge__c) {
                paymentExceedsCharge.add(lineNum);
            }
```

**Replace with:**
```apex
            // Rule 9: Payment Exceeds Charge (WARNING - lump sum payments are legitimate)
            // Individual line items CAN exceed their charge (e.g., Medicare lump-sum payments)
            // Only cumulative payment vs cumulative charge is a blocker (Rule in chargeLevelValidations)
            if (item.Charge__c != null && item.Approved_Amount__c != null &&
                item.Approved_Amount__c > item.Charge__c) {
                paymentExceedsCharge.add(lineNum);
            }
```

---

#### Change 3.3: Convert to Warning (Lines 368-372)

**Location:** Rule 9 failure creation  
**Lines:** 368-372

**Find:**
```apex
        if (!paymentExceedsCharge.isEmpty()) {
            failures.add(createLineItemFailure('line_payment_exceeds_charge', 'Payment Exceeds Charge',
                paymentExceedsCharge.size() + ' line item' + (paymentExceedsCharge.size() > 1 ? 's have' : ' has') + ' approved amounts exceeding charges',
                paymentExceedsCharge, 'Approved amount cannot exceed the original charge amount'));
        }
```

**Replace with:**
```apex
        if (!paymentExceedsCharge.isEmpty()) {
            warnings.add(new ValidationFailure(
                'line_payment_exceeds_charge',
                'Payment Exceeds Individual Charge',
                'warning',  // Changed from 'error' to 'warning'
                paymentExceedsCharge.size() + ' line item' + (paymentExceedsCharge.size() > 1 ? 's have' : ' has') + ' approved amounts exceeding individual charges',
                'Line payment exceeds individual charge. Verify this is intentional or adjust payment amount.',
                'LINE_ITEM',
                String.join(paymentExceedsCharge, ', ')
            ));
        }
```

---

#### Change 3.4: Return Warnings (Line 379)

**Location:** End of `validateLineItems()` method  
**Line:** 379

**Find:**
```apex
        return failures;
    }
```

**Replace with:**
```apex
        // Combine failures and warnings
        failures.addAll(warnings);
        return failures;
    }
```

---

#### Change 3.5: Remove from Passed Rules (Lines 724-726)

**Location:** Inside `getPassedRules()` method  
**Lines:** 724-726

**Find:**
```apex
        if (!failedRuleIds.contains('line_payment_exceeds_charge')) {
            passedRules.add(new ValidationPass('line_payment_exceeds_charge', 'Payments Within Charge', 'LINE_ITEM', 'No line item payments exceed their charges'));
        }
```

**Replace with:**
```apex
        // REMOVED: This is now a warning, not a pass/fail rule
        // Warnings don't appear in passed rules list
```

---

### Step 4: Save and Verify (5 minutes)

```bash
# Check file for syntax errors (if using VS Code with Salesforce extensions)
# The IDE should show no errors

# Verify changes
git diff force-app/main/default/classes/TRM_ValidationService.cls
```

**Expected:** Should see 5 sections of changes as documented above

---

### Step 5: Deploy to Sandbox (10 minutes)

```bash
# Using Salesforce CLI
sfdx force:source:deploy -p force-app/main/default/classes/TRM_ValidationService.cls -u sandbox-alias

# Or using VS Code
# Right-click on TRM_ValidationService.cls → Deploy Source to Org
```

**Expected Output:**
```
=== Deployed Source
FULL NAME                    TYPE         PROJECT PATH
TRM_ValidationService        ApexClass    force-app/main/default/classes/TRM_ValidationService.cls
```

---

### Step 6: Run Unit Tests (15 minutes)

```bash
# Run all validation service tests
sfdx force:apex:test:run -n TRM_ValidationServiceTest -u sandbox-alias -r human

# Or run all tests
sfdx force:apex:test:run -u sandbox-alias -r human
```

**Expected:** All tests should pass (or identify which tests need updating)

---

### Step 7: Manual Testing in Sandbox (30 minutes)

#### Test Case 1: Medicare Lump-Sum (Should ALLOW)
1. Open BCN Quote Case in sandbox
2. Add line items:
   - Line 1: Charge = $500
   - Lines 2-10: Charge = $1,000 each
3. Enter payments:
   - Line 1: Paid = $6,500
   - Lines 2-10: Paid = $0
4. Click "Validate for Adjudication"

**Expected Result:**
- ⚠️ Yellow warning: "1 line item has approved amount exceeding individual charge"
- ✅ Green: "Total payments within limits"
- ✅ "Proceed with Adjudication" button is enabled

---

#### Test Case 2: Actual Overpayment (Should BLOCK)
1. Open BCN Quote Case in sandbox
2. Add line item:
   - Line 1: Charge = $500
3. Enter payment:
   - Line 1: Paid = $11,000
4. Set Total Claim Charge = $10,000
5. Click "Validate for Adjudication"

**Expected Result:**
- ⚠️ Yellow warning: "1 line item has approved amount exceeding individual charge"
- ❌ Red error: "Total payments ($11,000) exceed Total Claim Charge ($10,000)"
- ❌ "Proceed with Adjudication" button is disabled

---

#### Test Case 3: Normal Payment (Should ALLOW)
1. Open BCN Quote Case in sandbox
2. Add line item:
   - Line 1: Charge = $1,000
3. Enter payment:
   - Line 1: Paid = $800
4. Click "Validate for Adjudication"

**Expected Result:**
- ✅ No warnings
- ✅ No errors
- ✅ "Proceed with Adjudication" button is enabled

---

### Step 8: Stakeholder Review (1 hour)

1. Schedule demo with Ray
2. Walk through all 3 test cases
3. Get approval to proceed
4. Document any feedback

---

### Step 9: Commit Changes (5 minutes)

```bash
cd salesforce-project
git add force-app/main/default/classes/TRM_ValidationService.cls
git commit -m "feat: Convert individual line payment validation from error to warning

- Changed Rule 9 (Payment Exceeds Charge) from ERROR to WARNING
- Allows legitimate lump-sum payments (e.g., Medicare)
- Cumulative payment validation still blocks overpayments
- Addresses Ray's business requirement for lump-sum scenarios

BREAKING CHANGE: line_payment_exceeds_charge now returns warning instead of error
"
```

---

### Step 10: Deploy to Production (15 minutes)

**Only after:**
- [ ] All tests pass
- [ ] Manual testing complete
- [ ] Ray's approval obtained
- [ ] Change request approved

```bash
# Deploy to production
sfdx force:source:deploy -p force-app/main/default/classes/TRM_ValidationService.cls -u production-alias

# Run tests in production
sfdx force:apex:test:run -n TRM_ValidationServiceTest -u production-alias -r human
```

---

## 🔄 Rollback Plan

If issues are discovered:

```bash
# Revert to previous version
git revert HEAD

# Redeploy old version
sfdx force:source:deploy -p force-app/main/default/classes/TRM_ValidationService.cls -u production-alias
```

---

## 📊 Post-Deployment Monitoring

- [ ] Monitor first 5 adjudications
- [ ] Check for unexpected warnings
- [ ] Verify cumulative validation still works
- [ ] Collect user feedback
- [ ] Document any issues

---

**END OF IMPLEMENTATION PLAN**
