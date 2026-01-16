# MVADM-185: Ejemplos de Implementación
## Código de Referencia para TRM_DuplicateDetectionApi

---

## 📋 ESTRUCTURA DE LA CLASE APEX

### Wrapper Classes (Inner Classes)

```apex
/**
 * @description Wrapper class for duplicate detection data
 * Matches the structure expected by trmDuplicateTriangle LWC
 */
public class DuplicateData {
    @AuraEnabled public String duplicateStatus;      // 'None', 'Exact', 'Potential'
    @AuraEnabled public List<MatchRecord> matches;   // List of matching records
    @AuraEnabled public DateTime lastCheck;          // Last_Duplicate_Check__c
    @AuraEnabled public Integer confidence;          // 0-100 score
    @AuraEnabled public Integer totalMatches;        // Count of matches
    @AuraEnabled public SourceRecord sourceRecord;   // Current record data
    @AuraEnabled public Configuration configuration; // Detection settings
    
    public DuplicateData() {
        this.duplicateStatus = 'None';
        this.matches = new List<MatchRecord>();
        this.lastCheck = null;
        this.confidence = 0;
        this.totalMatches = 0;
        this.sourceRecord = new SourceRecord();
        this.configuration = new Configuration();
    }
}

/**
 * @description Individual matching record details
 */
public class MatchRecord {
    @AuraEnabled public Id recordId;
    @AuraEnabled public String recordName;
    @AuraEnabled public String matchType;           // 'Exact' or 'Potential'
    @AuraEnabled public Integer confidence;         // 0-100
    @AuraEnabled public Decimal chargeAmount;
    @AuraEnabled public Date serviceStartDate;
    @AuraEnabled public Date serviceEndDate;
    @AuraEnabled public String procedureCode;
    @AuraEnabled public String patientId;
    @AuraEnabled public String patientName;
    @AuraEnabled public String billExternalId;
    @AuraEnabled public String billStatus;
    @AuraEnabled public Decimal quantity;
    @AuraEnabled public String provider;
    
    // Comparison flags
    @AuraEnabled public Boolean sameDate;
    @AuraEnabled public Boolean sameCode;
    @AuraEnabled public Boolean sameCharge;
    @AuraEnabled public Boolean samePatient;
    @AuraEnabled public Boolean sameProvider;
    @AuraEnabled public Boolean sameQuantity;
}

/**
 * @description Source record being checked
 */
public class SourceRecord {
    @AuraEnabled public Id recordId;
    @AuraEnabled public String recordName;
    @AuraEnabled public String procedureCode;
    @AuraEnabled public Decimal chargeAmount;
    @AuraEnabled public Date serviceStartDate;
    @AuraEnabled public Date serviceEndDate;
    @AuraEnabled public String patientId;
    @AuraEnabled public String billExternalId;
    @AuraEnabled public Decimal quantity;
}

/**
 * @description Configuration settings for duplicate detection
 */
public class Configuration {
    @AuraEnabled public Decimal chargeTolerance;        // Default: 0.01
    @AuraEnabled public Integer dateWindowYears;        // Default: 5
    @AuraEnabled public Boolean enableBillWarnings;     // Default: true
    @AuraEnabled public Boolean enableProviderMatching; // Default: false
    @AuraEnabled public Integer maxMatchesReturned;     // Default: 50
    @AuraEnabled public Boolean enableConfidenceScoring;// Default: true
    
    public Configuration() {
        this.chargeTolerance = 0.01;
        this.dateWindowYears = 5;
        this.enableBillWarnings = true;
        this.enableProviderMatching = false;
        this.maxMatchesReturned = 50;
        this.enableConfidenceScoring = true;
    }
}

/**
 * @description Bill-level duplicate summary
 */
public class BillDuplicateSummary {
    @AuraEnabled public Boolean hasWarnings;
    @AuraEnabled public Integer totalWarnings;
    @AuraEnabled public Integer exactMatches;
    @AuraEnabled public Integer potentialMatches;
    @AuraEnabled public Integer totalLineItems;
    @AuraEnabled public String summaryMessage;
    @AuraEnabled public String billName;
    @AuraEnabled public DateTime lastCheckDate;
    @AuraEnabled public List<DuplicateLineItem> duplicateLineItems;
}

public class DuplicateLineItem {
    @AuraEnabled public Id lineItemId;
    @AuraEnabled public String lineNumber;
    @AuraEnabled public String duplicateStatus;
    @AuraEnabled public Integer matchCount;
}
```

---

## 🔍 LÓGICA DE MATCHING

### Método Principal: findDuplicates

```apex
/**
 * @description Find duplicate records for a given Bill Line Item
 * @param recordId The Bill_Line_Item__c ID to check
 * @return List of matching Bill_Line_Item__c records
 */
private static List<Bill_Line_Item__c> findDuplicates(Id recordId) {
    // 1. Get source record
    Bill_Line_Item__c sourceRecord = [
        SELECT Id, Name, 
               Member_Account__c, Member_Account__r.Name,
               Service_Start_Date__c, Service_End_Date__c,
               CPT_HCPCS_NDC__c, Charge__c, Quantity__c,
               Bill__c, Bill__r.External_ID__c,
               Billing_Provider__c, Billing_Provider__r.Name
        FROM Bill_Line_Item__c
        WHERE Id = :recordId
        LIMIT 1
    ];
    
    // 2. Calculate date range (5 years back)
    Date startDate = sourceRecord.Service_Start_Date__c.addYears(-5);
    Date endDate = Date.today();
    
    // 3. Build query for potential matches
    List<Bill_Line_Item__c> potentialMatches = [
        SELECT Id, Name,
               Member_Account__c, Member_Account__r.Name,
               Service_Start_Date__c, Service_End_Date__c,
               CPT_HCPCS_NDC__c, Charge__c, Quantity__c,
               Bill__c, Bill__r.External_ID__c, Bill__r.Status__c,
               Billing_Provider__c, Billing_Provider__r.Name,
               Duplicate_Status__c
        FROM Bill_Line_Item__c
        WHERE Id != :recordId
          AND Member_Account__c = :sourceRecord.Member_Account__c
          AND Service_Start_Date__c >= :startDate
          AND Service_Start_Date__c <= :endDate
          AND CPT_HCPCS_NDC__c = :sourceRecord.CPT_HCPCS_NDC__c
          AND Bill__r.Status__c != 'Deleted'
        ORDER BY Service_Start_Date__c DESC
        LIMIT 50
    ];
    
    // 4. Filter and score matches
    List<Bill_Line_Item__c> matches = new List<Bill_Line_Item__c>();
    
    for (Bill_Line_Item__c candidate : potentialMatches) {
        MatchScore score = calculateMatchScore(sourceRecord, candidate);
        
        if (score.isExactMatch || score.isPotentialMatch) {
            matches.add(candidate);
        }
    }
    
    return matches;
}

/**
 * @description Calculate match score between two records
 */
private class MatchScore {
    public Boolean isExactMatch = false;
    public Boolean isPotentialMatch = false;
    public Integer confidence = 0;
    public Map<String, Boolean> fieldMatches = new Map<String, Boolean>();
}

private static MatchScore calculateMatchScore(
    Bill_Line_Item__c source, 
    Bill_Line_Item__c candidate
) {
    MatchScore score = new MatchScore();
    Integer matchedFields = 0;
    
    // 1. Patient (REQUIRED for any match)
    Boolean samePatient = source.Member_Account__c == candidate.Member_Account__c;
    score.fieldMatches.put('patient', samePatient);
    if (!samePatient) return score; // Early exit
    
    // 2. Service Date (exact or ±3 days)
    Boolean exactDate = source.Service_Start_Date__c == candidate.Service_Start_Date__c;
    Boolean nearDate = Math.abs(
        source.Service_Start_Date__c.daysBetween(candidate.Service_Start_Date__c)
    ) <= 3;
    score.fieldMatches.put('date', exactDate);
    if (exactDate) matchedFields++;
    
    // 3. Procedure Code
    Boolean sameCode = source.CPT_HCPCS_NDC__c == candidate.CPT_HCPCS_NDC__c;
    score.fieldMatches.put('code', sameCode);
    if (sameCode) matchedFields++;
    
    // 4. Charge Amount (exact or ±5%)
    Decimal tolerance = source.Charge__c * 0.05;
    Boolean exactCharge = Math.abs(source.Charge__c - candidate.Charge__c) <= 0.01;
    Boolean nearCharge = Math.abs(source.Charge__c - candidate.Charge__c) <= tolerance;
    score.fieldMatches.put('charge', exactCharge);
    if (exactCharge) matchedFields++;
    
    // 5. Quantity
    Boolean sameQuantity = source.Quantity__c == candidate.Quantity__c;
    score.fieldMatches.put('quantity', sameQuantity);
    if (sameQuantity) matchedFields++;
    
    // 6. Provider (optional)
    Boolean sameProvider = source.Billing_Provider__c == candidate.Billing_Provider__c;
    score.fieldMatches.put('provider', sameProvider);
    if (sameProvider) matchedFields++;
    
    // EXACT MATCH: All core fields match exactly
    score.isExactMatch = exactDate && sameCode && exactCharge && sameQuantity;
    
    // POTENTIAL MATCH: 4+ fields match (with tolerances)
    score.isPotentialMatch = !score.isExactMatch && 
                             (matchedFields >= 4 || (nearDate && sameCode && nearCharge));
    
    // Confidence score (0-100)
    if (score.isExactMatch) {
        score.confidence = 100;
    } else if (score.isPotentialMatch) {
        score.confidence = (matchedFields * 100) / 6; // 6 total fields
    }
    
    return score;
}
```

---

## 🎯 MÉTODOS AURAENABLED

### getDuplicateData (Cacheable)

```apex
/**
 * @description Get duplicate detection data for a Bill Line Item
 * Called by trmDuplicateTriangle component on load
 * @param recordId The Bill_Line_Item__c ID
 * @return DuplicateData wrapper with all match information
 */
@AuraEnabled(cacheable=true)
public static DuplicateData getDuplicateData(Id recordId) {
    try {
        DuplicateData result = new DuplicateData();
        
        // Get current record with duplicate fields
        Bill_Line_Item__c record = [
            SELECT Id, Name,
                   Duplicate_Status__c,
                   Matching_Records__c,
                   Last_Duplicate_Check__c,
                   Member_Account__c, Member_Account__r.Name,
                   Service_Start_Date__c, Service_End_Date__c,
                   CPT_HCPCS_NDC__c, Charge__c, Quantity__c,
                   Bill__c, Bill__r.External_ID__c
            FROM Bill_Line_Item__c
            WHERE Id = :recordId
            LIMIT 1
        ];
        
        // Populate source record
        result.sourceRecord.recordId = record.Id;
        result.sourceRecord.recordName = record.Name;
        result.sourceRecord.procedureCode = record.CPT_HCPCS_NDC__c;
        result.sourceRecord.chargeAmount = record.Charge__c;
        result.sourceRecord.serviceStartDate = record.Service_Start_Date__c;
        result.sourceRecord.serviceEndDate = record.Service_End_Date__c;
        result.sourceRecord.patientId = record.Member_Account__c;
        result.sourceRecord.billExternalId = record.Bill__r.External_ID__c;
        result.sourceRecord.quantity = record.Quantity__c;
        
        // Get duplicate status
        result.duplicateStatus = record.Duplicate_Status__c ?? 'None';
        result.lastCheck = record.Last_Duplicate_Check__c;
        
        // Parse matching records JSON
        if (String.isNotBlank(record.Matching_Records__c)) {
            List<Object> matchesJson = (List<Object>) JSON.deserializeUntyped(
                record.Matching_Records__c
            );
            
            for (Object matchObj : matchesJson) {
                Map<String, Object> matchMap = (Map<String, Object>) matchObj;
                MatchRecord match = new MatchRecord();
                
                match.recordId = (Id) matchMap.get('recordId');
                match.matchType = (String) matchMap.get('matchType');
                match.confidence = (Integer) matchMap.get('confidence');
                // ... populate other fields ...
                
                result.matches.add(match);
            }
            
            result.totalMatches = result.matches.size();
        }
        
        return result;
        
    } catch (Exception e) {
        throw new AuraHandledException('Error getting duplicate data: ' + e.getMessage());
    }
}
```

### triggerManualCheck (Non-Cacheable)

```apex
/**
 * @description Manually trigger duplicate check for a record
 * Called when user clicks "Check for Duplicates" button
 * @param recordId The Bill_Line_Item__c ID to check
 * @return Status message
 */
@AuraEnabled
public static String triggerManualCheck(Id recordId) {
    try {
        // Find duplicates
        List<Bill_Line_Item__c> matches = findDuplicates(recordId);

        // Determine status
        String status = 'None';
        Integer exactCount = 0;
        Integer potentialCount = 0;
        List<Map<String, Object>> matchesJson = new List<Map<String, Object>>();

        Bill_Line_Item__c sourceRecord = [
            SELECT Id, Member_Account__c, Service_Start_Date__c,
                   CPT_HCPCS_NDC__c, Charge__c, Quantity__c
            FROM Bill_Line_Item__c
            WHERE Id = :recordId
            LIMIT 1
        ];

        for (Bill_Line_Item__c match : matches) {
            MatchScore score = calculateMatchScore(sourceRecord, match);

            if (score.isExactMatch) {
                exactCount++;
                status = 'Exact';
            } else if (score.isPotentialMatch) {
                potentialCount++;
                if (status == 'None') status = 'Potential';
            }

            // Build JSON for storage
            Map<String, Object> matchData = new Map<String, Object>{
                'recordId' => match.Id,
                'recordName' => match.Name,
                'matchType' => score.isExactMatch ? 'Exact' : 'Potential',
                'confidence' => score.confidence,
                'chargeAmount' => match.Charge__c,
                'serviceStartDate' => match.Service_Start_Date__c,
                'procedureCode' => match.CPT_HCPCS_NDC__c,
                'patientId' => match.Member_Account__c,
                'patientName' => match.Member_Account__r.Name,
                'billExternalId' => match.Bill__r.External_ID__c,
                'billStatus' => match.Bill__r.Status__c,
                'quantity' => match.Quantity__c,
                'sameDate' => score.fieldMatches.get('date'),
                'sameCode' => score.fieldMatches.get('code'),
                'sameCharge' => score.fieldMatches.get('charge'),
                'sameQuantity' => score.fieldMatches.get('quantity')
            };

            matchesJson.add(matchData);
        }

        // Update record
        Bill_Line_Item__c updateRecord = new Bill_Line_Item__c(
            Id = recordId,
            Duplicate_Status__c = status,
            Matching_Records__c = JSON.serialize(matchesJson),
            Last_Duplicate_Check__c = DateTime.now()
        );

        update updateRecord;

        // Return summary message
        if (exactCount > 0) {
            return exactCount + ' exact duplicate(s) found';
        } else if (potentialCount > 0) {
            return potentialCount + ' potential duplicate(s) found';
        } else {
            return 'No duplicates found';
        }

    } catch (Exception e) {
        throw new AuraHandledException('Error checking duplicates: ' + e.getMessage());
    }
}
```

### getBillDuplicateSummary (Cacheable)

```apex
/**
 * @description Get duplicate summary for entire Bill
 * Called by trmBillDuplicateSummary component
 * @param billId The Bill__c ID
 * @return BillDuplicateSummary wrapper
 */
@AuraEnabled(cacheable=true)
public static BillDuplicateSummary getBillDuplicateSummary(Id billId) {
    try {
        BillDuplicateSummary summary = new BillDuplicateSummary();
        summary.duplicateLineItems = new List<DuplicateLineItem>();

        // Get Bill info
        Bill__c bill = [
            SELECT Id, Name, External_ID__c
            FROM Bill__c
            WHERE Id = :billId
            LIMIT 1
        ];

        summary.billName = bill.External_ID__c ?? bill.Name;

        // Get all line items with duplicate status
        List<Bill_Line_Item__c> lineItems = [
            SELECT Id, Name, Bill_Line_Item_Number__c,
                   Duplicate_Status__c, Matching_Records__c,
                   Last_Duplicate_Check__c
            FROM Bill_Line_Item__c
            WHERE Bill__c = :billId
            ORDER BY Bill_Line_Item_Number__c ASC
        ];

        summary.totalLineItems = lineItems.size();
        summary.exactMatches = 0;
        summary.potentialMatches = 0;

        DateTime latestCheck = null;

        for (Bill_Line_Item__c item : lineItems) {
            if (item.Duplicate_Status__c == 'Exact') {
                summary.exactMatches++;

                DuplicateLineItem dupItem = new DuplicateLineItem();
                dupItem.lineItemId = item.Id;
                dupItem.lineNumber = item.Bill_Line_Item_Number__c;
                dupItem.duplicateStatus = 'Exact';
                dupItem.matchCount = getMatchCount(item.Matching_Records__c);
                summary.duplicateLineItems.add(dupItem);

            } else if (item.Duplicate_Status__c == 'Potential') {
                summary.potentialMatches++;

                DuplicateLineItem dupItem = new DuplicateLineItem();
                dupItem.lineItemId = item.Id;
                dupItem.lineNumber = item.Bill_Line_Item_Number__c;
                dupItem.duplicateStatus = 'Potential';
                dupItem.matchCount = getMatchCount(item.Matching_Records__c);
                summary.duplicateLineItems.add(dupItem);
            }

            // Track latest check
            if (item.Last_Duplicate_Check__c != null) {
                if (latestCheck == null || item.Last_Duplicate_Check__c > latestCheck) {
                    latestCheck = item.Last_Duplicate_Check__c;
                }
            }
        }

        summary.totalWarnings = summary.exactMatches + summary.potentialMatches;
        summary.hasWarnings = summary.totalWarnings > 0;
        summary.lastCheckDate = latestCheck;

        // Build summary message
        if (summary.exactMatches > 0 && summary.potentialMatches > 0) {
            summary.summaryMessage = summary.exactMatches + ' exact and ' +
                                    summary.potentialMatches + ' potential duplicates found';
        } else if (summary.exactMatches > 0) {
            summary.summaryMessage = summary.exactMatches + ' exact duplicate(s) found';
        } else if (summary.potentialMatches > 0) {
            summary.summaryMessage = summary.potentialMatches + ' potential duplicate(s) found';
        } else {
            summary.summaryMessage = 'No duplicates detected';
        }

        return summary;

    } catch (Exception e) {
        throw new AuraHandledException('Error getting bill summary: ' + e.getMessage());
    }
}

/**
 * @description Helper to count matches from JSON
 */
private static Integer getMatchCount(String matchingRecordsJson) {
    if (String.isBlank(matchingRecordsJson)) return 0;

    try {
        List<Object> matches = (List<Object>) JSON.deserializeUntyped(matchingRecordsJson);
        return matches.size();
    } catch (Exception e) {
        return 0;
    }
}
```

### triggerBillDuplicateCheck (Non-Cacheable)

```apex
/**
 * @description Check all line items in a Bill for duplicates
 * Called when user clicks "Check All Duplicates" button
 * @param billId The Bill__c ID
 * @return Status message
 */
@AuraEnabled
public static String triggerBillDuplicateCheck(Id billId) {
    try {
        List<Bill_Line_Item__c> lineItems = [
            SELECT Id
            FROM Bill_Line_Item__c
            WHERE Bill__c = :billId
        ];

        Integer checked = 0;
        Integer duplicatesFound = 0;

        for (Bill_Line_Item__c item : lineItems) {
            String result = triggerManualCheck(item.Id);
            checked++;

            if (!result.contains('No duplicates')) {
                duplicatesFound++;
            }
        }

        return 'Checked ' + checked + ' line items. Found duplicates in ' +
               duplicatesFound + ' items.';

    } catch (Exception e) {
        throw new AuraHandledException('Error checking bill duplicates: ' + e.getMessage());
    }
}
```

---

## 🧪 TEST CLASS EXAMPLE

```apex
@isTest
private class TRM_DuplicateDetectionApi_Test {

    @TestSetup
    static void setupTestData() {
        // Create test Account (Patient)
        Account patient = new Account(
            Name = 'Test Patient',
            RecordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName()
                          .get('Member').getRecordTypeId()
        );
        insert patient;

        // Create test Bill
        Bill__c bill = new Bill__c(
            External_ID__c = 'TEST-BILL-001',
            Member_Account__c = patient.Id,
            Status__c = 'In Review'
        );
        insert bill;

        // Create test Code
        Code__c code = new Code__c(
            Name = '99213',
            Description__c = 'Office Visit',
            Medicare_Covered__c = 'Yes'
        );
        insert code;

        // Create original line item
        Bill_Line_Item__c original = new Bill_Line_Item__c(
            Bill__c = bill.Id,
            Member_Account__c = patient.Id,
            Service_Start_Date__c = Date.today().addDays(-30),
            CPT_HCPCS_NDC__c = '99213',
            Code__c = code.Id,
            Charge__c = 150.00,
            Quantity__c = 1,
            Bill_Line_Item_Number__c = '1'
        );
        insert original;

        // Create exact duplicate
        Bill_Line_Item__c exactDup = new Bill_Line_Item__c(
            Bill__c = bill.Id,
            Member_Account__c = patient.Id,
            Service_Start_Date__c = Date.today().addDays(-30), // Same date
            CPT_HCPCS_NDC__c = '99213',                        // Same code
            Code__c = code.Id,
            Charge__c = 150.00,                                // Same charge
            Quantity__c = 1,                                   // Same quantity
            Bill_Line_Item_Number__c = '2'
        );
        insert exactDup;

        // Create potential duplicate (different date)
        Bill_Line_Item__c potentialDup = new Bill_Line_Item__c(
            Bill__c = bill.Id,
            Member_Account__c = patient.Id,
            Service_Start_Date__c = Date.today().addDays(-28), // 2 days different
            CPT_HCPCS_NDC__c = '99213',
            Code__c = code.Id,
            Charge__c = 150.00,
            Quantity__c = 1,
            Bill_Line_Item_Number__c = '3'
        );
        insert potentialDup;
    }

    @isTest
    static void testGetDuplicateData_ExactMatch() {
        Bill_Line_Item__c original = [
            SELECT Id FROM Bill_Line_Item__c
            WHERE Bill_Line_Item_Number__c = '1' LIMIT 1
        ];

        // Trigger check first
        Test.startTest();
        String result = TRM_DuplicateDetectionApi.triggerManualCheck(original.Id);
        Test.stopTest();

        // Verify result
        System.assert(result.contains('exact'), 'Should find exact duplicate');

        // Get duplicate data
        TRM_DuplicateDetectionApi.DuplicateData data =
            TRM_DuplicateDetectionApi.getDuplicateData(original.Id);

        System.assertEquals('Exact', data.duplicateStatus, 'Status should be Exact');
        System.assert(data.totalMatches > 0, 'Should have matches');
        System.assertEquals(100, data.confidence, 'Exact match should be 100% confidence');
    }

    @isTest
    static void testGetBillDuplicateSummary() {
        Bill__c bill = [SELECT Id FROM Bill__c LIMIT 1];

        // Trigger checks for all items
        Test.startTest();
        String result = TRM_DuplicateDetectionApi.triggerBillDuplicateCheck(bill.Id);
        Test.stopTest();

        // Get summary
        TRM_DuplicateDetectionApi.BillDuplicateSummary summary =
            TRM_DuplicateDetectionApi.getBillDuplicateSummary(bill.Id);

        System.assert(summary.hasWarnings, 'Should have warnings');
        System.assert(summary.exactMatches > 0, 'Should have exact matches');
        System.assertEquals(3, summary.totalLineItems, 'Should have 3 line items');
    }

    @isTest
    static void testNoDuplicates() {
        // Create unique line item
        Bill__c bill = [SELECT Id, Member_Account__c FROM Bill__c LIMIT 1];
        Code__c code = [SELECT Id FROM Code__c LIMIT 1];

        Bill_Line_Item__c unique = new Bill_Line_Item__c(
            Bill__c = bill.Id,
            Member_Account__c = bill.Member_Account__c,
            Service_Start_Date__c = Date.today(),
            CPT_HCPCS_NDC__c = '99214', // Different code
            Code__c = code.Id,
            Charge__c = 200.00,
            Quantity__c = 1,
            Bill_Line_Item_Number__c = '99'
        );
        insert unique;

        Test.startTest();
        String result = TRM_DuplicateDetectionApi.triggerManualCheck(unique.Id);
        Test.stopTest();

        System.assert(result.contains('No duplicates'), 'Should find no duplicates');

        TRM_DuplicateDetectionApi.DuplicateData data =
            TRM_DuplicateDetectionApi.getDuplicateData(unique.Id);

        System.assertEquals('None', data.duplicateStatus);
        System.assertEquals(0, data.totalMatches);
    }
}
```

---

## 📝 NOTAS DE IMPLEMENTACIÓN

### Performance Considerations

1. **Indexar Campos Críticos:**
   ```sql
   CREATE INDEX idx_bli_duplicate_search ON Bill_Line_Item__c (
       Member_Account__c,
       Service_Start_Date__c,
       CPT_HCPCS_NDC__c
   );
   ```

2. **Limitar Resultados:**
   - Máximo 50 matches por búsqueda
   - Ventana de 5 años (configurable)
   - Excluir Bills con Status = 'Deleted'

3. **Cacheable vs Non-Cacheable:**
   - `getDuplicateData`: Cacheable (solo lectura)
   - `triggerManualCheck`: Non-cacheable (escribe datos)
   - `getBillDuplicateSummary`: Cacheable (solo lectura)
   - `triggerBillDuplicateCheck`: Non-cacheable (escribe datos)

### Error Handling

```apex
try {
    // Logic here
} catch (QueryException e) {
    throw new AuraHandledException('Database error: ' + e.getMessage());
} catch (DmlException e) {
    throw new AuraHandledException('Update error: ' + e.getMessage());
} catch (Exception e) {
    throw new AuraHandledException('Unexpected error: ' + e.getMessage());
}
```

### JSON Storage Format

```json
[
  {
    "recordId": "a0X5e000001AbCdEFG",
    "recordName": "BLI-00123",
    "matchType": "Exact",
    "confidence": 100,
    "chargeAmount": 150.00,
    "serviceStartDate": "2025-12-15",
    "procedureCode": "99213",
    "patientId": "0015e000001XyZabc",
    "patientName": "John Doe",
    "billExternalId": "BCN-10000123",
    "billStatus": "Paid",
    "quantity": 1.0,
    "sameDate": true,
    "sameCode": true,
    "sameCharge": true,
    "sameQuantity": true
  }
]
```


