# Medivest Adjudication System

## Overview
This repository contains the Salesforce components for the Medivest Adjudication System, specifically focused on the Bill Line Item management and Quote Adjudication process.

## Project Structure

```
force-app/main/default/
├── classes/                    # Apex Classes
│   ├── TRM_MedicalBillingService.cls
│   └── TRM_ValidationService.cls
├── lwc/                        # Lightning Web Components
│   ├── customBillLineItemGrid/
│   ├── bcnQuoteQuickAction/
│   └── codeLookupField/
└── [other metadata folders]
```

## Key Components

### Lightning Web Components

#### 1. customBillLineItemGrid
**Purpose:** Main grid component for managing Bill Line Items  
**Features:**
- Line item creation, editing, duplication, and deletion
- Three view stages: Keying, Bill Review, and Quote View
- Excel-like column resizing
- Expandable columns for dates, codes, and remark codes
- Real-time auto-save functionality
- Duplicate detection and flagging
- Footer totals calculation

**Version:** v2.7.3-simple-date-inputs

#### 2. bcnQuoteQuickAction
**Purpose:** Quick action modal for BCN Quote Adjudication  

#### 3. codeLookupField
**Purpose:** Reusable code lookup field component  

### Apex Classes

#### 1. TRM_MedicalBillingService
**Purpose:** Main service class for Bill Line Item operations  

#### 2. TRM_ValidationService
**Purpose:** Validation service for BCN Quote Adjudication  

## Current Work

### Active Ticket: MVADM-188 - Bill Review UAT Bugs
**Status:** In Progress  
**Priority:** High

**Issues Being Addressed:**
1. Checkbox state not clearing after duplicate/delete operations
2. Missing re-sequencing after line item deletion
3. Duplication failures in delete/reset scenarios
4. Horizontal scroll behavior inconsistencies
5. Data persistence issues after duplication

## Development Setup

### Prerequisites
- Salesforce CLI (v2.114.5 or higher)
- Node.js (v22.21.1 or higher)
- Git

### Org Connection
This project is configured to work with the **eobbcnb** sandbox:
- Username: `trinity@medivest.com.eobbcnb`
- Org ID: `00DTH000005nrl32AA`

### Installation

1. Clone this repository:
```bash
git clone https://github.com/AlexiaAbrego-Trinity/Adjudication.git
cd Adjudication
```

2. Authenticate with the sandbox:
```bash
sf org login web --alias eobbcnb
sf config set target-org eobbcnb
```

3. Deploy to org:
```bash
sf project deploy start --source-dir force-app
```

## Testing

### Manual Testing Checklist
- [ ] Line item creation (manual entry)
- [ ] Line item duplication (single and multiple)
- [ ] Line item deletion
- [ ] Sequential numbering after operations
- [ ] Checkbox state management
- [ ] Data persistence after save
- [ ] Horizontal scrolling in all stages

## Deployment

### To Sandbox
```bash
sf project deploy start --source-dir force-app --target-org eobbcnb
```

### To Production
```bash
sf project deploy start --source-dir force-app --target-org production
```

## License
Proprietary - Trinity CRM

## Contact
- **Developer:** Alexia Abrego
- **Organization:** Trinity CRM
- **Project:** Medivest Adjudication System

