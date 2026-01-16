# Salesforce Project Documentation

This folder contains comprehensive documentation for change requests, technical specifications, and implementation guides.

---

## 📂 Current Documentation

---

### 🎯 VALIDATION SYSTEM DOCUMENTATION (2026-01-14) ⭐ NEW

**Complete guide to all validation rules (failures and warnings) in the BCN Quote Adjudication system.**

**Quick Start (Spanish):**
- 📋 **Start here:** [VALIDATION_SUMMARY.md](VALIDATION_SUMMARY.md) - Overview of all 21 rules
- ❌ **Errors:** [FAILURES_IMPLEMENTED.md](FAILURES_IMPLEMENTED.md) - 19 rules that block adjudication
- ⚠️ **Warnings:** [WARNINGS_IMPLEMENTED.md](WARNINGS_IMPLEMENTED.md) - 2 rules that don't block
- 🧪 **Testing:** [TESTING_GUIDE.md](TESTING_GUIDE.md) - How to test all validations

**Quick Start (English):**
- 📋 **Start here:** [VALIDATION_SUMMARY_EN.md](VALIDATION_SUMMARY_EN.md) - Overview of all 21 rules
- ❌ **Errors:** [FAILURES_IMPLEMENTED_EN.md](FAILURES_IMPLEMENTED_EN.md) - 19 rules that block adjudication
- ⚠️ **Warnings:** [WARNINGS_IMPLEMENTED_EN.md](WARNINGS_IMPLEMENTED_EN.md) - 2 rules that don't block
- 🧪 **Testing:** [TESTING_GUIDE_EN.md](TESTING_GUIDE_EN.md) - How to test all validations

**All Documents:**

| Document (Spanish) | Document (English) | Audience | Purpose |
|-------------------|-------------------|----------|---------|
| [VALIDATION_SUMMARY.md](VALIDATION_SUMMARY.md) | [VALIDATION_SUMMARY_EN.md](VALIDATION_SUMMARY_EN.md) | Everyone | Executive summary of all 21 validation rules |
| [FAILURES_IMPLEMENTED.md](FAILURES_IMPLEMENTED.md) | [FAILURES_IMPLEMENTED_EN.md](FAILURES_IMPLEMENTED_EN.md) | Users, Keyers | 19 errors that block adjudication (with fixes) |
| [WARNINGS_IMPLEMENTED.md](WARNINGS_IMPLEMENTED.md) | [WARNINGS_IMPLEMENTED_EN.md](WARNINGS_IMPLEMENTED_EN.md) | Users, Keyers | 2 warnings that don't block (with guidance) |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | [TESTING_GUIDE_EN.md](TESTING_GUIDE_EN.md) | QA, Developers | How to test each validation rule |

---

### 📝 Payment Validation Change Request (2026-01-14)

A complete documentation suite for changing the "Payment Exceeds Charge" validation from an error to a warning.

**Quick Start:**
- 📋 **Start here:** [CHANGE_REQUEST_PAYMENT_EXCEEDS_CHARGE_SUMMARY.md](CHANGE_REQUEST_PAYMENT_EXCEEDS_CHARGE_SUMMARY.md)
- 📑 **Full index:** [CHANGE_REQUEST_PAYMENT_EXCEEDS_CHARGE_INDEX.md](CHANGE_REQUEST_PAYMENT_EXCEEDS_CHARGE_INDEX.md)

**All Documents:**

| Document | Audience | Purpose |
|----------|----------|---------|
| [SUMMARY.md](CHANGE_REQUEST_PAYMENT_EXCEEDS_CHARGE_SUMMARY.md) | Everyone | Executive summary and quick overview |
| [INDEX.md](CHANGE_REQUEST_PAYMENT_EXCEEDS_CHARGE_INDEX.md) | Everyone | Navigation guide for all documents |
| [SIMPLE.md](CHANGE_REQUEST_PAYMENT_EXCEEDS_CHARGE_SIMPLE.md) | Business Users | Plain English explanation |
| [DIAGRAM.md](CHANGE_REQUEST_PAYMENT_EXCEEDS_CHARGE_DIAGRAM.md) | Visual Learners | Flow diagrams and visual aids |
| [Main Doc](CHANGE_REQUEST_PAYMENT_EXCEEDS_CHARGE.md) | Developers | Technical specification |
| [IMPLEMENTATION.md](CHANGE_REQUEST_PAYMENT_EXCEEDS_CHARGE_IMPLEMENTATION.md) | Developers | Step-by-step implementation guide |

---

## 🎯 How to Use This Documentation

**Note:** All documents are available in **Spanish** and **English** (files ending with `_EN.md`)

### If you're a User/Keyer/Adjudicator
**Goal:** Understand validation rules and fix errors/warnings

**Spanish:**
1. Read: [VALIDATION_SUMMARY.md](VALIDATION_SUMMARY.md) (5 min overview)
2. Bookmark: [FAILURES_IMPLEMENTED.md](FAILURES_IMPLEMENTED.md) (for when you see errors)
3. Bookmark: [WARNINGS_IMPLEMENTED.md](WARNINGS_IMPLEMENTED.md) (for when you see warnings)

**English:**
1. Read: [VALIDATION_SUMMARY_EN.md](VALIDATION_SUMMARY_EN.md) (5 min overview)
2. Bookmark: [FAILURES_IMPLEMENTED_EN.md](FAILURES_IMPLEMENTED_EN.md) (for when you see errors)
3. Bookmark: [WARNINGS_IMPLEMENTED_EN.md](WARNINGS_IMPLEMENTED_EN.md) (for when you see warnings)

### If you're a Manager/Supervisor
**Goal:** Understand business rules and approve decisions

**Spanish:**
1. Read: [VALIDATION_SUMMARY.md](VALIDATION_SUMMARY.md) (5 min overview)
2. Read: [WARNINGS_IMPLEMENTED.md](WARNINGS_IMPLEMENTED.md) (10 min - important for approvals)
3. Optional: [FAILURES_IMPLEMENTED.md](FAILURES_IMPLEMENTED.md) (understand business rules)

**English:**
1. Read: [VALIDATION_SUMMARY_EN.md](VALIDATION_SUMMARY_EN.md) (5 min overview)
2. Read: [WARNINGS_IMPLEMENTED_EN.md](WARNINGS_IMPLEMENTED_EN.md) (10 min - important for approvals)
3. Optional: [FAILURES_IMPLEMENTED_EN.md](FAILURES_IMPLEMENTED_EN.md) (understand business rules)

### If you're a Developer
**Goal:** Implement, maintain, and extend validation system

**Spanish:**
1. Read: [VALIDATION_SUMMARY.md](VALIDATION_SUMMARY.md) (5 min overview)
2. Read: [TESTING_GUIDE.md](TESTING_GUIDE.md) (15 min - how to test)
3. Review code: `TRM_ValidationService.cls` and `validationReportModal` LWC
4. For changes: [CHANGE_REQUEST_PAYMENT_EXCEEDS_CHARGE_IMPLEMENTATION.md](CHANGE_REQUEST_PAYMENT_EXCEEDS_CHARGE_IMPLEMENTATION.md)

**English:**
1. Read: [VALIDATION_SUMMARY_EN.md](VALIDATION_SUMMARY_EN.md) (5 min overview)
2. Read: [TESTING_GUIDE_EN.md](TESTING_GUIDE_EN.md) (15 min - how to test)
3. Review code: `TRM_ValidationService.cls` and `validationReportModal` LWC
4. For changes: [CHANGE_REQUEST_PAYMENT_EXCEEDS_CHARGE_IMPLEMENTATION.md](CHANGE_REQUEST_PAYMENT_EXCEEDS_CHARGE_IMPLEMENTATION.md)

### If you're QA/Tester
**Goal:** Verify all validations work correctly

**Spanish:**
1. Read: [VALIDATION_SUMMARY.md](VALIDATION_SUMMARY.md) (5 min overview)
2. Read: [TESTING_GUIDE.md](TESTING_GUIDE.md) (15 min - your main guide)
3. Use the checklist to verify all 21 rules

**English:**
1. Read: [VALIDATION_SUMMARY_EN.md](VALIDATION_SUMMARY_EN.md) (5 min overview)
2. Read: [TESTING_GUIDE_EN.md](TESTING_GUIDE_EN.md) (15 min - your main guide)
3. Use the checklist to verify all 21 rules

---

## 📊 Documentation Standards

All change request documentation should include:

- ✅ Executive summary
- ✅ Business justification
- ✅ Technical specification
- ✅ Implementation plan
- ✅ Testing strategy
- ✅ Risk assessment
- ✅ Rollback plan
- ✅ Approval sign-off

---

## 🔗 Related Resources

- **Git Repository:** `salesforce-project/`
- **Source Code:** `force-app/main/default/`
- **Test Classes:** `force-app/main/default/classes/*Test.cls`

---

**Last Updated:** 2026-01-14  
**Maintained By:** Development Team

