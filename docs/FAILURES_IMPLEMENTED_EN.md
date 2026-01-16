# ❌ IMPLEMENTED FAILURES (ERRORS) - Dummies Guide

**Date:** 2026-01-14  
**System:** Medivest BCN Quote Adjudication  
**Version:** v2.3.6

---

## 🤔 What is a FAILURE (Error)?

A **FAILURE** (error) is a problem that tells you:

> "STOP. You cannot continue until you fix this."

### Failure Characteristics:
- ❌ **DO block** the adjudication process
- 🔴 **Appear in red** in the report
- 🚫 **You CANNOT proceed** until fixed
- ⚠️ **Are mandatory** to resolve

---

## 📊 EXECUTIVE SUMMARY

| Category | # Rules | What does it validate? |
|----------|---------|------------------------|
| **BCN-Level** | 6 | Case (BCN Quote) data |
| **Charge-Level** | 2 | Charge and payment totals |
| **Line Item** | 9 | Each invoice line data |
| **Relational Integrity** | 2 | Relationships between records |
| **TOTAL** | **19 rules** | - |

---

## 🏢 CATEGORY 1: BCN-LEVEL (6 Rules)

These rules validate the complete **Case** (BCN Quote).

---

### ❌ RULE 1: BCN Status On Hold

**🆔 ID:** `bcn_status_on_hold`  
**❌ Blocks:** Yes

#### 📝 What does it validate?
The Case CANNOT be in "On Hold" status.

#### 🎬 How to Reproduce:
1. Open a Case
2. Change Status to "On Hold"
3. Click "Validate for Adjudication"
4. ❌ ERROR: "BCN is currently On Hold"

#### ✅ How to Fix:
Change the Case Status to any other value (e.g., "Pending Review").

---

### ❌ RULE 2: Previously Adjudicated

**🆔 ID:** `bcn_previously_adjudicated`  
**❌ Blocks:** Yes

#### 📝 What does it validate?
The Case CANNOT already be adjudicated (Status = "Adjudicated" or "Closed").

#### 🎬 How to Reproduce:
1. Open a Case
2. Change Status to "Adjudicated"
3. Click "Validate for Adjudication"
4. ❌ ERROR: "BCN has already been adjudicated"

#### ✅ How to Fix:
Revert the Case status to "Pending Review" or "Keying".

---

### ❌ RULE 3: Received Date Required

**🆔 ID:** `bcn_missing_date_received__c`  
**❌ Blocks:** Yes

#### 📝 What does it validate?
The "Received Date" (Date_Received__c) field must have a value.

#### 🎬 How to Reproduce:
1. Open a Case
2. Clear the "Received Date" field
3. Click "Validate for Adjudication"
4. ❌ ERROR: "Required field missing: Received Date"

#### ✅ How to Fix:
Fill in the "Received Date" field with the date the invoice was received.

---

### ❌ RULE 4: Payee (Entity) Required

**🆔 ID:** `bcn_missing_payee_name__c`  
**❌ Blocks:** Yes

#### 📝 What does it validate?
The "Payee Name" (Payee_Name__c) field must have a value.

#### 🎬 How to Reproduce:
1. Open a Case
2. Clear the "Payee Name" field
3. Click "Validate for Adjudication"
4. ❌ ERROR: "Required field missing: Payee (Entity)"

#### ✅ How to Fix:
Fill in the "Payee Name" field with the name of who will receive payment.

---

### ❌ RULE 5: Payee Address Required

**🆔 ID:** `bcn_missing_payee_address__c`  
**❌ Blocks:** Yes

#### 📝 What does it validate?
The "Payee Address" (Payee_Address__c) field must have a value.

#### 🎬 How to Reproduce:
1. Open a Case
2. Clear the "Payee Address" field
3. Click "Validate for Adjudication"
4. ❌ ERROR: "Required field missing: Payee Address"

#### ✅ How to Fix:
Fill in the "Payee Address" field with the complete payee address.

---

### ❌ RULE 6: Total Claim Charge Required

**🆔 ID:** `bcn_missing_total_claim_charge__c`  
**❌ Blocks:** Yes

#### 📝 What does it validate?
The "Total Claim Charge" (Total_Claim_charge__c) field must have a value greater than $0.

#### 🎬 How to Reproduce:
1. Open a Case
2. Clear or set "Total Claim Charge" to $0
3. Make sure there are NO line items with charges
4. Click "Validate for Adjudication"
5. ❌ ERROR: "Required field missing: Total Claim Charge"

#### ✅ How to Fix:
Fill in the "Total Claim Charge" field with the invoice total.

---

## 💰 CATEGORY 2: CHARGE-LEVEL (2 Rules)

These rules validate charge and payment **totals**.

---

### ❌ RULE 7: Cumulative Charges Mismatch

**🆔 ID:** `cumulative_charge_mismatch`  
**❌ Blocks:** Yes

#### 📝 What does it validate?
The sum of all line item charges must equal "Total Claim Charge" (±$0.01 tolerance).

#### 🎬 How to Reproduce:
```
Total Claim Charge: $1,000.00

Line Items:
- Line 1: Charge $500.00
- Line 2: Charge $300.00
Total: $800.00  ← Doesn't match $1,000.00

❌ ERROR: "Line item charges ($800.00) do not equal Total Claim Charge ($1,000.00)"
```

#### ✅ How to Fix:
- Option 1: Adjust line items to sum to $1,000.00
- Option 2: Change "Total Claim Charge" to $800.00

---

### ❌ RULE 8: Cumulative Payment Exceeds Charge

**🆔 ID:** `cumulative_payment_exceeds_charge`  
**❌ Blocks:** Yes

#### 📝 What does it validate?
The sum of all payments CANNOT exceed "Total Claim Charge".

#### 🎬 How to Reproduce:
```
Total Claim Charge: $1,000.00

Line Items:
- Line 1: Charge $500, Payment $600
- Line 2: Charge $500, Payment $600
Total Payments: $1,200.00  ← Exceeds $1,000.00

❌ ERROR: "Total payments ($1,200.00) exceed Total Claim Charge ($1,000.00)"
```

#### ✅ How to Fix:
Reduce payments so they do NOT exceed $1,000.00 total.

---

## 📄 CATEGORY 3: LINE ITEM (9 Rules)

These rules validate **each line** of the invoice.

---

### ❌ RULE 9: Service Dates Required

**🆔 ID:** `line_missing_service_dates`  
**❌ Blocks:** Yes

#### 📝 What does it validate?
Each line item must have "Service Start Date" AND "Service End Date".

#### 🎬 How to Reproduce:
1. Create a line item
2. Leave "Service Start Date" or "Service End Date" empty
3. Click "Validate for Adjudication"
4. ❌ ERROR: "1 line item missing start/end dates"

#### ✅ How to Fix:
Fill in both dates on all line items.

---

### ❌ RULE 10: Revenue Code OR CPT/HCPCS/NDC Required

**🆔 ID:** `line_missing_codes`  
**❌ Blocks:** Yes

#### 📝 What does it validate?
Each line item must have AT LEAST ONE of these:
- Revenue Code, OR
- CPT/HCPCS/NDC

#### 🎬 How to Reproduce:
1. Create a line item
2. Leave BOTH fields empty: "Revenue Code" AND "CPT/HCPCS/NDC"
3. Click "Validate for Adjudication"
4. ❌ ERROR: "4 line items missing both Revenue Code and CPT/HCPCS/NDC"

#### ✅ How to Fix:
Fill in at least one of the two fields on each line item.

---

### ❌ RULE 11: Quantity Required

**🆔 ID:** `line_missing_quantity`  
**❌ Blocks:** Yes

#### 📝 What does it validate?
Each line item must have a value in "Quantity".

#### 🎬 How to Reproduce:
1. Create a line item
2. Leave "Quantity" empty
3. Click "Validate for Adjudication"
4. ❌ ERROR: "1 line item missing quantity"

#### ✅ How to Fix:
Fill in the "Quantity" field (normally 1).

---

### ❌ RULE 12: Charge Required

**🆔 ID:** `line_missing_charge`  
**❌ Blocks:** Yes

#### 📝 What does it validate?
Each line item must have a value in "Charge".

#### 🎬 How to Reproduce:
1. Create a line item
2. Leave "Charge" empty
3. Click "Validate for Adjudication"
4. ❌ ERROR: "2 line items missing charge amount"

#### ✅ How to Fix:
Fill in the "Charge" field with the charge amount.

---

### ❌ RULE 13: Negative Charge

**🆔 ID:** `line_negative_charge`  
**❌ Blocks:** Yes

#### 📝 What does it validate?
"Charge" CANNOT be negative (< 0).

#### 🎬 How to Reproduce:
1. Create a line item
2. Set "Charge" = -100
3. Click "Validate for Adjudication"
4. ❌ ERROR: "1 line item has negative charge"

#### ✅ How to Fix:
Change "Charge" to a positive value.

---

### ❌ RULE 14: Negative Payment

**🆔 ID:** `line_negative_payment`  
**❌ Blocks:** Yes

#### 📝 What does it validate?
"Approved Amount" (payment) CANNOT be negative (< 0).

#### 🎬 How to Reproduce:
1. Create a line item
2. Set "Approved Amount" = -50
3. Click "Validate for Adjudication"
4. ❌ ERROR: "1 line item has negative payment"

#### ✅ How to Fix:
Change "Approved Amount" to a positive value or $0.

---

### ❌ RULE 15: Account Required

**🆔 ID:** `line_missing_account`
**❌ Blocks:** Yes

#### 📝 What does it validate?
Each line item must have an "Account" (Member_Account__c) assigned.

#### 🎬 How to Reproduce:
1. Create a line item
2. Leave the "Account" field empty
3. Click "Validate for Adjudication"
4. ❌ ERROR: "1 line item missing account assignment"

#### ✅ How to Fix:
Assign an account (Member Account) to each line item.

---

### ❌ RULE 16: Invalid Service Date Range

**🆔 ID:** `line_invalid_service_date_range`
**❌ Blocks:** Yes

#### 📝 What does it validate?
"Service End Date" CANNOT be BEFORE "Service Start Date".

#### 🎬 How to Reproduce:
```
Line Item:
- Service Start Date: 2026-01-15
- Service End Date: 2026-01-10  ← Before start date

❌ ERROR: "1 line item has end date before start date"
```

#### ✅ How to Fix:
Make sure "Service End Date" >= "Service Start Date".

---

### ❌ RULE 17: Remark Code 1 (RC1) Required

**🆔 ID:** `line_missing_rc1`
**❌ Blocks:** Yes

#### 📝 What does it validate?
Each line item must have "Remark Code 1" (Remark_Code_1__c).

#### 🎬 How to Reproduce:
1. Create a line item
2. Leave "Remark Code 1" empty
3. Click "Validate for Adjudication"
4. ❌ ERROR: "4 line items missing RC1"

#### ✅ How to Fix:
Fill in the "Remark Code 1" field on all line items.

---

## 🔗 CATEGORY 4: RELATIONAL INTEGRITY (2 Rules)

These rules validate **relationships** between records.

---

### ❌ RULE 18: Orphaned Line Items

**🆔 ID:** `relational_orphaned_line_items`
**❌ Blocks:** Yes

#### 📝 What does it validate?
All line items must be linked to the correct Case.

#### 🎬 How to Reproduce:
This error is rare - occurs if there's a data integrity issue in Salesforce.

#### ✅ How to Fix:
Contact Salesforce administrator - it's a technical issue.

---

### ❌ RULE 19: Account Mismatch

**🆔 ID:** `relational_account_mismatch`
**❌ Blocks:** Yes

#### 📝 What does it validate?
Accounts (Member_Account__c) assigned to line items must belong to the Case member.

#### 🎬 How to Reproduce:
```
Case Member: "ABC Corporation"

Line Item:
- Account: "XYZ Insurance"  ← Account that does NOT belong to ABC Corp

❌ ERROR: "Line items have accounts that don't belong to case member"
```

#### ✅ How to Fix:
Assign accounts that belong to the correct Case member.

---

## 📊 SUMMARY TABLE OF ALL RULES

| # | Rule ID | Name | Category | Blocks |
|---|---------|------|----------|--------|
| 1 | `bcn_status_on_hold` | Status On Hold | BCN | ❌ Yes |
| 2 | `bcn_previously_adjudicated` | Previously Adjudicated | BCN | ❌ Yes |
| 3 | `bcn_missing_date_received__c` | Received Date Required | BCN | ❌ Yes |
| 4 | `bcn_missing_payee_name__c` | Payee Required | BCN | ❌ Yes |
| 5 | `bcn_missing_payee_address__c` | Payee Address Required | BCN | ❌ Yes |
| 6 | `bcn_missing_total_claim_charge__c` | Total Claim Charge Required | BCN | ❌ Yes |
| 7 | `cumulative_charge_mismatch` | Cumulative Charges Mismatch | Charge | ❌ Yes |
| 8 | `cumulative_payment_exceeds_charge` | Payment Exceeds Total Charge | Charge | ❌ Yes |
| 9 | `line_missing_service_dates` | Service Dates Required | Line Item | ❌ Yes |
| 10 | `line_missing_codes` | Revenue/CPT Code Required | Line Item | ❌ Yes |
| 11 | `line_missing_quantity` | Quantity Required | Line Item | ❌ Yes |
| 12 | `line_missing_charge` | Charge Required | Line Item | ❌ Yes |
| 13 | `line_negative_charge` | Negative Charge | Line Item | ❌ Yes |
| 14 | `line_negative_payment` | Negative Payment | Line Item | ❌ Yes |
| 15 | `line_missing_account` | Account Required | Line Item | ❌ Yes |
| 16 | `line_invalid_service_date_range` | Invalid Date Range | Line Item | ❌ Yes |
| 17 | `line_missing_rc1` | RC1 Required | Line Item | ❌ Yes |
| 18 | `relational_orphaned_line_items` | Orphaned Line Items | Relational | ❌ Yes |
| 19 | `relational_account_mismatch` | Account Mismatch | Relational | ❌ Yes |

---

## 🔍 How do they look in the system?

### In the Toast (popup message):
```
❌ Validation Complete
Found 7 error(s) and 0 warning(s). Click "View Report" to see details.
```

### In the Validation Report:
```
┌─────────────────────────────────────────┐
│ ❌ Validation Failed - Issues Must Be   │
│    Resolved                             │
├─────────────────────────────────────────┤
│ ❌ BCN-Level Requirements (1)           │
│   ✗ Received Date Required              │
│     Required field missing              │
├─────────────────────────────────────────┤
│ ❌ Line Item Requirements (3)           │
│   ✗ Service Dates Required              │
│     4 line items missing start/end dates│
│     Lines: 1, 2, 3, 4                   │
└─────────────────────────────────────────┘

[Close]  [Fix Issues] ← "Proceed" button DISABLED
```

---

## ❓ FAQ For Dummies

**Q: Do failures block me?**
A: ✅ YES. You CANNOT click "Proceed with Adjudication".

**Q: Must I fix ALL failures?**
A: ✅ YES. All are mandatory.

**Q: What happens if I don't fix a failure?**
A: The system will NOT let you proceed with adjudication.

**Q: Can I ignore a failure?**
A: ❌ NO. They are mandatory validations.

**Q: How many failures can I have?**
A: You can have multiple failures. You must fix them ALL.

---

## 🎯 QUICK CHECKLIST BEFORE ADJUDICATING

Before clicking "Validate for Adjudication", verify:

### ✅ BCN-Level:
- [ ] Status is NOT "On Hold" or "Adjudicated"
- [ ] Received Date is filled
- [ ] Payee Name is filled
- [ ] Payee Address is filled
- [ ] Total Claim Charge > $0

### ✅ Charge-Level:
- [ ] Sum of line items = Total Claim Charge
- [ ] Sum of payments ≤ Total Claim Charge

### ✅ Line Items (EACH ONE):
- [ ] Service Start Date and End Date filled
- [ ] Revenue Code OR CPT/HCPCS/NDC filled
- [ ] Quantity filled
- [ ] Charge filled and positive
- [ ] Approved Amount positive (or $0)
- [ ] Account assigned
- [ ] End Date >= Start Date
- [ ] Remark Code 1 filled

### ✅ Relational:
- [ ] All line items linked to Case
- [ ] Accounts belong to correct member

---

## 📞 Need Help?

If you see a failure and don't know how to fix it:
1. Read the complete error message
2. Review this guide to find the rule
3. Follow the "How to Fix" steps
4. If still unsure, ask your supervisor

---

**End of document - Implemented Failures**


