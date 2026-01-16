# Change Request: Payment Exceeds Charge Validation

**Date:** 2026-01-14  
**Requested By:** Ray (Business Stakeholder)  
**Prepared By:** Development Team  
**Status:** Pending Approval  
**Priority:** High  
**Jira Ticket:** TBD

---

## 📋 Executive Summary (For Non-Technical Stakeholders)

### What's the Problem?
Currently, the system **blocks** adjudication when a single line item has a payment amount greater than its charge amount. This prevents legitimate business scenarios like Medicare lump-sum payments.

### Real-World Example
- **Hospital bills:** $10,000 total (10 separate line items of $1,000 each)
- **Medicare pays:** $6,500 as a single lump-sum payment
- **Current behavior:** We enter $6,500 on Line 1 → System blocks with error ❌
- **Desired behavior:** We enter $6,500 on Line 1 → System shows warning but allows proceeding ✅

### Why Change This?
Medicare and other payers often issue **lump-sum payments** that don't match individual line item charges. We need to allocate the full payment to one line item (typically the first one) for accounting purposes. The current validation incorrectly treats this as an error.

### What Protection Remains?
The system will **still block** if the **total payments exceed total charges** across all line items. This prevents actual overpayment errors.

---

## 🎯 Business Requirements

### Current State
| Scenario | Line 1 Charge | Line 1 Paid | Total Charge | Total Paid | Current Result |
|----------|---------------|-------------|--------------|------------|----------------|
| Medicare Lump Sum | $500 | $6,500 | $10,000 | $6,500 | ❌ **BLOCKED** (incorrect) |
| Actual Overpayment | $500 | $11,000 | $10,000 | $11,000 | ❌ **BLOCKED** (correct) |

### Desired State
| Scenario | Line 1 Charge | Line 1 Paid | Total Charge | Total Paid | Desired Result |
|----------|---------------|-------------|--------------|------------|----------------|
| Medicare Lump Sum | $500 | $6,500 | $10,000 | $6,500 | ⚠️ **WARNING** + ✅ **ALLOW** |
| Actual Overpayment | $500 | $11,000 | $10,000 | $11,000 | ❌ **BLOCKED** (still blocked) |

### Business Rules
1. **Individual line item payment > charge** → ⚠️ **WARNING** (yellow line)
2. **Total payments > total charges** → ❌ **ERROR** (red line, blocks adjudication)

---

## 🔧 Technical Implementation

### Files to Modify
1. **`TRM_ValidationService.cls`** - Main validation logic
2. **`TRM_ValidationServiceTest.cls`** - Unit tests (if needed)

### Code Changes

#### Change 1: Update Rule 9 Logic (Lines 314-318)
**Current Code:**
```apex
// Rule 9: Payment Exceeds Charge
if (item.Charge__c != null && item.Approved_Amount__c != null &&
    item.Approved_Amount__c > item.Charge__c) {
    paymentExceedsCharge.add(lineNum);
}
```

**New Code:**
```apex
// Rule 9: Payment Exceeds Charge (WARNING - lump sum payments are legitimate)
// Individual line items CAN exceed their charge (e.g., Medicare lump-sum payments)
// Only cumulative payment vs cumulative charge is a blocker (Rule in chargeLevelValidations)
if (item.Charge__c != null && item.Approved_Amount__c != null &&
    item.Approved_Amount__c > item.Charge__c) {
    paymentExceedsCharge.add(lineNum);
}
```

#### Change 2: Convert to Warning (Lines 368-372)
**Current Code:**
```apex
if (!paymentExceedsCharge.isEmpty()) {
    failures.add(createLineItemFailure('line_payment_exceeds_charge', 'Payment Exceeds Charge',
        paymentExceedsCharge.size() + ' line item' + (paymentExceedsCharge.size() > 1 ? 's have' : ' has') + ' approved amounts exceeding charges',
        paymentExceedsCharge, 'Approved amount cannot exceed the original charge amount'));
}
```

**New Code:**
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

#### Change 3: Add Warnings List to Method (Line 257)
**Current Code:**
```apex
private static List<ValidationFailure> validateLineItems(List<Bill_Line_Item__c> lineItems) {
    List<ValidationFailure> failures = new List<ValidationFailure>();
```

**New Code:**
```apex
private static List<ValidationFailure> validateLineItems(List<Bill_Line_Item__c> lineItems) {
    List<ValidationFailure> failures = new List<ValidationFailure>();
    List<ValidationFailure> warnings = new List<ValidationFailure>();
```

#### Change 4: Return Warnings (Line 379)
**Current Code:**
```apex
    return failures;
}
```

**New Code:**
```apex
    // Combine failures and warnings
    failures.addAll(warnings);
    return failures;
}
```

#### Change 5: Remove from Passed Rules (Lines 724-726)
**Current Code:**
```apex
if (!failedRuleIds.contains('line_payment_exceeds_charge')) {
    passedRules.add(new ValidationPass('line_payment_exceeds_charge', 'Payments Within Charge', 'LINE_ITEM', 'No line item payments exceed their charges'));
}
```

**New Code:**
```apex
// REMOVED: This is now a warning, not a pass/fail rule
// Warnings don't appear in passed rules list
```

---

## 🧪 Testing Strategy

### Test Cases to Verify

#### Test Case 1: Medicare Lump-Sum Payment (Should ALLOW)
**Setup:**
- Line 1: Charge = $500, Paid = $6,500
- Line 2-10: Charge = $1,000 each, Paid = $0
- Total Charge = $10,000
- Total Paid = $6,500

**Expected Result:**
- ⚠️ WARNING: "1 line item has approved amount exceeding individual charge"
- ✅ ALLOW: `canProceed = true` (because $6,500 < $10,000 total)

#### Test Case 2: Actual Overpayment (Should BLOCK)
**Setup:**
- Line 1: Charge = $500, Paid = $11,000
- Total Charge = $10,000
- Total Paid = $11,000

**Expected Result:**
- ⚠️ WARNING: "1 line item has approved amount exceeding individual charge"
- ❌ ERROR: "Total payments ($11,000) exceed Total Claim Charge ($10,000)"
- ❌ BLOCK: `canProceed = false` (because $11,000 > $10,000 total)

#### Test Case 3: Normal Payment (Should ALLOW)
**Setup:**
- Line 1: Charge = $1,000, Paid = $800
- Total Charge = $1,000
- Total Paid = $800

**Expected Result:**
- ✅ PASS: No warnings, no errors
- ✅ ALLOW: `canProceed = true`

### Existing Protection (No Changes)
The following validation **remains unchanged** and will still block overpayments:

**File:** `TRM_ValidationService.cls`
**Lines:** 202-214
**Rule:** `cumulative_payment_exceeds_charge`

```apex
// Rule 2: Cumulative payments ≤ Total Claim Charge
if (totalClaimCharge > 0 && cumulativePayment > totalClaimCharge) {
    Decimal overpayment = cumulativePayment - totalClaimCharge;
    failures.add(new ValidationFailure(
        'cumulative_payment_exceeds_charge',
        'Payment Validation',
        'error',  // ← STILL AN ERROR (RED LINE BLOCKER)
        String.format('Total payments (${0}) exceed Total Claim Charge (${1})',
            new List<String>{formatCurrency(cumulativePayment), formatCurrency(totalClaimCharge)}),
        String.format('Overpayment: ${0}. Reduce payment amounts.',
            new List<String>{formatCurrency(overpayment)}),
        'CHARGE_LEVEL'
    ));
}
```

---

## 📊 Impact Analysis

### What Changes?
- ✅ Individual line item validation: ERROR → WARNING
- ✅ User can proceed with lump-sum payments
- ✅ Warning still alerts user to review the payment

### What Stays the Same?
- ✅ Cumulative payment validation: Still ERROR (blocks overpayment)
- ✅ All other validations: No changes
- ✅ UI behavior: Warnings show in yellow, errors in red

### Risk Assessment
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Users ignore warning and overpay | Low | Cumulative validation still blocks |
| Confusion about warning message | Low | Clear message explains lump-sum scenario |
| Breaking existing functionality | Very Low | Only changes severity, not logic |

---

## 🚀 Deployment Plan

### Pre-Deployment Checklist
- [ ] Code review approved
- [ ] Unit tests updated (if needed)
- [ ] Sandbox testing completed
- [ ] Ray's approval obtained
- [ ] Documentation updated

### Deployment Steps
1. **Backup current code** (Git commit current state)
2. **Apply changes** to `TRM_ValidationService.cls`
3. **Run unit tests** in sandbox
4. **Manual testing** with Ray's test cases
5. **Deploy to production** (if sandbox tests pass)
6. **Monitor** first few adjudications

### Rollback Plan
If issues arise:
1. Revert Git commit
2. Redeploy previous version
3. Investigate and fix issues
4. Re-test before re-deploying

---

## 📝 Validation Rules Summary

### Before Change
| Rule ID | Rule Name | Severity | Blocks Adjudication? |
|---------|-----------|----------|---------------------|
| `line_payment_exceeds_charge` | Payment Exceeds Charge | ❌ ERROR | Yes |
| `cumulative_payment_exceeds_charge` | Total Payments Exceed Charges | ❌ ERROR | Yes |

### After Change
| Rule ID | Rule Name | Severity | Blocks Adjudication? |
|---------|-----------|----------|---------------------|
| `line_payment_exceeds_charge` | Payment Exceeds Individual Charge | ⚠️ WARNING | No |
| `cumulative_payment_exceeds_charge` | Total Payments Exceed Charges | ❌ ERROR | Yes |

---

## 📞 Stakeholder Communication

### Message to Ray
> **Subject:** Payment Validation Change - Ready for Review
>
> Hi Ray,
>
> We've prepared the changes to allow lump-sum payments as you requested. The system will now:
>
> 1. ⚠️ Show a **warning** (not an error) when a line item payment exceeds its charge
> 2. ✅ **Allow** you to proceed with adjudication (no longer blocked)
> 3. ❌ **Still block** if total payments exceed total charges (protection remains)
>
> This means your Medicare lump-sum scenario ($6,500 on Line 1 with $500 charge) will work correctly.
>
> Please review the attached documentation and let us know if you'd like to test in sandbox before production deployment.

---

## 🔍 Code Review Checklist

- [ ] Logic change is minimal and focused
- [ ] Comments explain business rationale
- [ ] No breaking changes to API
- [ ] Existing cumulative validation unchanged
- [ ] Warning message is clear and actionable
- [ ] All affected line numbers are tracked
- [ ] Severity change is intentional and documented

---

## 📚 References

- **Original Request:** Ray's email (2026-01-14)
- **Related Files:**
  - `TRM_ValidationService.cls` (main logic)
  - `TRM_ValidationServiceTest.cls` (unit tests)
  - `customBillLineItemGrid.js` (UI that displays validations)
- **Related Validations:**
  - BCN-Level: 7 rules
  - Charge-Level: 3 rules (including cumulative payment check)
  - Line Item: 10 rules (including this one)
  - Relational: 2 rules

---

## ✅ Approval Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Business Owner | Ray | | |
| Technical Lead | | | |
| QA Lead | | | |
| Deployment Manager | | | |

---

**END OF DOCUMENT**

