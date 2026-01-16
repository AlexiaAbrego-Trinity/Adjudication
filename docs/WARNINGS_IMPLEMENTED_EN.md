# ⚠️ IMPLEMENTED WARNINGS - Dummies Guide

**Date:** 2026-01-14  
**System:** Medivest BCN Quote Adjudication  
**Version:** v2.3.6

---

## 🤔 What is a WARNING?

A **WARNING** is an alert that tells you:

> "Hey, this looks odd, but I won't block you. Review it and decide if it's okay or not."

### Warning Characteristics:
- ✅ **DO NOT block** the adjudication process
- ⚠️ **Appear in yellow** in the report
- 🔔 **Alert you** to something that may be intentional or an error
- 🚀 **You can proceed** with "Proceed with Adjudication"

---

## 📋 IMPLEMENTED WARNINGS (2 Total)

---

### ⚠️ WARNING #1: Payment Exceeds Individual Charge

**🏷️ Technical Name:** `line_payment_exceeds_charge`  
**📂 Category:** Line Item  
**🎯 What does it detect?** A line item has a payment greater than its charge

#### 🧐 Why is it a WARNING and not an ERROR?

Because **Medicare makes lump-sum payments**. Example:

```
$10,000 invoice with 3 lines:
- Line 1: Charge $500   → Payment $6,500  ← Looks odd, but valid
- Line 2: Charge $3,000 → Payment $0
- Line 3: Charge $6,500 → Payment $0
─────────────────────────────────────
Total:    Charge $10,000 → Payment $6,500  ← Total OK
```

Medicare paid everything on the first line. It's unusual, but **legitimate**.

#### 📝 Simple Example:

```
Line Item #5:
- Charge (Charge__c): $100.00
- Approved Payment (Approved_Amount__c): $150.00

⚠️ WARNING: "Payment ($150) is greater than charge ($100)"
```

#### 🎬 How to Reproduce:

1. Open a Case (BCN Quote)
2. Edit a line item:
   - Charge: `100`
   - Approved Amount: `150`
3. Save
4. Click "Validate for Adjudication"
5. You'll see: ⚠️ "1 warning(s)"
6. Click "View Report"
7. You'll see yellow section: "Warnings (Non-blocking)"

#### ✅ When is it OK to ignore it?

- Medicare/Medicaid lump-sum payments
- Consolidated billing adjustments
- Payments covering multiple lines

#### ❌ When should you fix it?

- Data entry error (you typed $150 instead of $15)
- Duplicate payment by mistake
- Total payments also exceed total charges

---

### ⚠️ WARNING #2: Account Payment Exceeds Balance

**🏷️ Technical Name:** `account_payment_exceeds_balance`  
**📂 Category:** Charge Level  
**🎯 What does it detect?** Payments from an account exceed its available balance

#### 🧐 Why is it a WARNING and not an ERROR?

Because there may be **additional funds** not yet reflected in the system, or it may be a **legitimate adjustment**.

#### 📝 Simple Example:

```
Account: "ABC Insurance"
- Available Balance (BalanceAccrued__c): $500.00

Line Items assigned to ABC Insurance:
- Line 1: Payment $300.00
- Line 2: Payment $400.00
─────────────────────
Total payments: $700.00

⚠️ WARNING: "Payments ($700) exceed balance ($500) by $200"
```

#### 🎬 How to Reproduce:

1. Find an account with known balance:
   - Example: "XYZ Corp" has $500 balance
2. Create line items assigned to that account:
   - Line 1: Account = XYZ Corp, Approved Amount = $300
   - Line 2: Account = XYZ Corp, Approved Amount = $400
3. Total = $700 (exceeds $500)
4. Click "Validate for Adjudication"
5. You'll see: ⚠️ "1 warning(s)"

#### ✅ When is it OK to ignore it?

- Additional funds will be deposited soon
- It's an adjustment approved by finance
- The account has extended credit

#### ❌ When should you fix it?

- No additional funds confirmed
- It's an account assignment error
- You need to reallocate payments to another account

---

## 🎯 QUICK SUMMARY

| # | Warning | What does it mean? | Can I proceed? |
|---|---------|-------------------|----------------|
| 1 | Payment Exceeds Individual Charge | A line item has payment > charge | ✅ Yes |
| 2 | Account Payment Exceeds Balance | Account payments > available balance | ✅ Yes |

---

## 🔍 How do they look in the system?

### In the Toast (popup message):
```
⚠️ Validation Complete
Found 0 error(s) and 1 warning(s). Click "View Report" to see details.
```

### In the Validation Report:
```
┌─────────────────────────────────────────┐
│ ⚠️ Warnings (Non-blocking) (1)          │
├─────────────────────────────────────────┤
│ ⚠ Payment Exceeds Individual Charge    │
│   1 line item has approved amounts      │
│   exceeding individual charges          │
│   Lines: 5                              │
└─────────────────────────────────────────┘

[Close]  [Proceed with Adjudication] ← Button enabled
```

---

## ❓ FAQ For Dummies

**Q: Do warnings block me?**  
A: ❌ NO. You can click "Proceed with Adjudication".

**Q: Should I fix warnings?**  
A: It depends. Review if it's intentional or an error.

**Q: What happens if I ignore a warning?**  
A: The system lets you proceed. You decide if it's correct.

**Q: How do I know if a warning is serious?**  
A: Read the message and details. If unsure, ask your supervisor.

---

## 📞 Need Help?

If you see a warning and don't know what to do:
1. Read the complete message
2. Review the affected line items
3. Ask your supervisor or finance team
4. Document your decision

---

**End of document - Implemented Warnings**

