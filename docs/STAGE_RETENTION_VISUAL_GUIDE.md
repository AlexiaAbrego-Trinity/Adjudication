# Stage Retention - Visual Guide

## 📋 Overview

This document provides **visual examples** of how the Stage Retention feature will look and behave.

---

## 🎯 Current Behavior (BEFORE Implementation)

### Problem: Stage is Lost When Modal Closes

```
User Action                          Current Stage (in memory)
─────────────────────────────────────────────────────────────
1. Open modal                        → "Keying" (default)
2. Change to "Bill Review"           → "Bill Review" ✅
3. Edit some line items              → "Bill Review" ✅
4. Close modal                       → Component destroyed ❌
5. Reopen modal                      → "Keying" (reset to default) ❌
```

**Result:** User has to manually change back to "Bill Review" every time they reopen the modal. 😞

---

## ✅ New Behavior (AFTER Implementation)

### Solution: Stage is Saved to Salesforce

```
User Action                          Current Stage (in Salesforce)
─────────────────────────────────────────────────────────────
1. Open modal                        → "Keying" (from Case field)
2. Change to "Bill Review"           → "Bill Review" (saved to Case) ✅
3. Edit some line items              → "Bill Review" ✅
4. Close modal                       → "Bill Review" (persisted) ✅
5. Reopen modal                      → "Bill Review" (loaded from Case) ✅
6. Close browser                     → "Bill Review" (still in Salesforce) ✅
7. Open next day                     → "Bill Review" (still there!) ✅
```

**Result:** Stage is always preserved, no matter what! 🎉

---

## 🔒 Adjudication Locking Workflow

### Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Keying Stage                                        │
├─────────────────────────────────────────────────────────────┤
│ Stage: [Keying Stage ▼]                                     │
│                                                              │
│ ✅ All fields editable                                       │
│ ✅ Can add/delete rows                                       │
│ ❌ No adjudication columns visible                           │
│ ❌ No "Adjudicate" button                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
                User clicks "Bill Review Stage"
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Bill Review Stage                                   │
├─────────────────────────────────────────────────────────────┤
│ Stage: [Bill Review Stage ▼]                                │
│                                                              │
│ ✅ All fields editable                                       │
│ ✅ Adjudication columns visible (Approved Amount, etc.)      │
│ ✅ "Adjudicate" button shown                                 │
│ ✅ Can validate and adjudicate                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
            User clicks "Adjudicate" → Validation Passes
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Adjudicated (LOCKED)                                │
├─────────────────────────────────────────────────────────────┤
│ 🔒 Stage: [Adjudicated (Locked) ▼] (DISABLED)               │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 🔒 This case has been adjudicated and is locked for   │   │
│ │    editing. All fields are read-only to prevent       │   │
│ │    accidental changes.                                │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ ❌ All fields read-only (no inline editing)                  │
│ ❌ No "Add Row" button                                       │
│ ❌ No "Delete" button                                        │
│ ❌ No "Adjudicate" button                                    │
│ ❌ Cannot change stage back                                  │
│ ✅ Can still view data (read-only)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 UI Changes

### Stage Selector - Normal State

**Before:**
```
┌─────────────────────────────┐
│ Stage: [Keying Stage ▼]     │
└─────────────────────────────┘

Options:
• Keying Stage
• Bill Review Stage
• Quote View
```

**After:**
```
┌─────────────────────────────┐
│ Stage: [Keying Stage ▼]     │
└─────────────────────────────┘

Options:
• Keying Stage
• Bill Review Stage
• Quote View
• Adjudicated (Locked)  ← NEW
```

---

### Stage Selector - Locked State

**When stage = "Adjudicated":**

```
┌─────────────────────────────────────┐
│ Stage: [Adjudicated (Locked) ▼]     │  ← DISABLED (grayed out)
└─────────────────────────────────────┘

User cannot change this dropdown!
```

---

### Locked Banner

**New banner appears at top of grid when adjudicated:**

```
┌────────────────────────────────────────────────────────────┐
│ 🔒 This case has been adjudicated and is locked for        │
│    editing. All fields are read-only to prevent            │
│    accidental changes.                                     │
└────────────────────────────────────────────────────────────┘
```

**Styling:**
- Yellow/warning background
- Lock icon
- Bold text
- Prominent placement

---

### Button Visibility Changes

**Keying Stage:**
```
[Add Row] [Duplicate] [Delete] [Bulk Operations]
```

**Bill Review Stage:**
```
[Add Row] [Duplicate] [Delete] [Bulk Operations] [Adjudicate]
```

**Adjudicated Stage:**
```
(No buttons shown - all hidden)
```

---

## 📊 Field History Tracking

### Audit Trail Example

When you view the Case's Field History, you'll see:

```
Field: Current Adjudication Stage

Date/Time            User              Old Value      New Value
─────────────────────────────────────────────────────────────────
2026-01-21 10:30 AM  Alexia Abrego    Keying         Bill Review
2026-01-21 10:45 AM  Alexia Abrego    Bill Review    Adjudicated
```

**Benefits:**
- ✅ See who changed the stage
- ✅ See when it was changed
- ✅ See what it was changed from/to
- ✅ Compliance and auditing

---

## 🧪 User Experience Scenarios

### Scenario 1: Normal Workflow

```
Day 1, 9:00 AM - Alexia starts keying
├─ Opens Case #12345
├─ Modal opens in "Keying" stage (default)
├─ Enters 10 line items
├─ Closes modal
└─ Stage saved: "Keying" ✅

Day 1, 2:00 PM - Alexia continues keying
├─ Opens Case #12345 again
├─ Modal opens in "Keying" stage (loaded from Salesforce) ✅
├─ Adds 5 more line items
├─ Changes to "Bill Review" stage
├─ Closes modal
└─ Stage saved: "Bill Review" ✅

Day 2, 9:00 AM - Alexia reviews and adjudicates
├─ Opens Case #12345
├─ Modal opens in "Bill Review" stage (loaded from Salesforce) ✅
├─ Reviews all line items
├─ Clicks "Adjudicate" → Validation passes
├─ Clicks "Proceed with Adjudication"
├─ Stage automatically changes to "Adjudicated" ✅
├─ Banner appears: "Case is locked" ✅
└─ All editing disabled ✅

Day 3, 9:00 AM - Alexia tries to edit (accidentally)
├─ Opens Case #12345
├─ Modal opens in "Adjudicated" stage ✅
├─ Sees locked banner ✅
├─ Tries to click a cell → "This case is locked for editing" ✅
└─ Cannot make any changes (protected!) ✅
```

---

### Scenario 2: Multi-User Consistency

```
User A (Alexia)                    User B (Chris)
─────────────────────────────────────────────────────────────
Opens Case #12345
Stage: "Keying"

Changes to "Bill Review"
Stage saved to Salesforce ✅
                                   Opens Case #12345
                                   Stage: "Bill Review" ✅
                                   (Sees same stage as Alexia!)

Closes modal
                                   Continues working
                                   Changes to "Quote View"
                                   Stage saved to Salesforce ✅

Opens Case #12345 again
Stage: "Quote View" ✅
(Sees Chris's change!)
```

**Result:** Both users always see the same stage - no confusion! 🎯

---

## 🎯 Key Benefits Summary

| Benefit | Description |
|---------|-------------|
| **Persistence** | Stage never resets - always loads from Salesforce |
| **Multi-User** | All users see the same stage for the same Case |
| **Audit Trail** | Field History shows who changed stage and when |
| **Auto-Lock** | Cases automatically lock after adjudication |
| **Safety** | Prevents accidental edits to adjudicated cases |
| **Clarity** | Clear visual indicators (banner, disabled fields) |

---

**Status:** 📋 Visual Guide Complete | Ready for Implementation

