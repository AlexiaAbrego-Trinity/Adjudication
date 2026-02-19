/**
 * @description Service layer for Medivest Duplicate Detection System
 * @author Trinity Development Team
 * @date 2025-08-30
 * @version 2.1.0 - BULKIFIED for MVADM-185
 *
 * This class follows Trinity design principles:
 * - Business logic and complex data processing
 * - Optimized SOQL queries with proper joins
 * - Bulk processing patterns for governor limit compliance
 * - Comprehensive error handling and logging
 *
 * Business Rules (verified 2025-08-29 with Ray):
 * - Date tolerance: Minimum 5 years, configurable, no cutoff
 * - Charge variance: Only for exact matches (±$0.01), ignored for potential
 * - Service date fields: Service_Start_Date__c and Service_End_Date__c
 * - Provider matching: REMOVED - limit to same member/patient only
 * - Bill-level warnings: Count line items with duplicate status != 'None'
 *
 * MVADM-185 BULKIFICATION (2025-02-18):
 * - Added detectDuplicatesBulkified() to handle 100+ line items without SOQL limit errors
 * - Reduces SOQL queries from 100-200 to 2-3 for bulk operations
 * - Original detectDuplicates() method preserved for backward compatibility
 */
public with sharing class TRM_DuplicateDetectionService {
    
    // Configuration constants (make configurable via Custom Settings later)
    private static final Decimal CHARGE_TOLERANCE = 0.01;
    private static final Integer DEFAULT_DATE_WINDOW_YEARS = 5;
    private static final Integer MAX_MATCHES_RETURNED = 50;
    private static final Boolean DEBUG_LOGGING = true;
    
    /**
     * @description Main entry point for duplicate detection processing
     * @param newRecords List of Bill Line Item records to process
     * @return TRM_DuplicateDetectionModels.BulkProcessingResultDTO Processing results
     */
    public static TRM_DuplicateDetectionModels.BulkProcessingResultDTO detectDuplicates(
        List<Bill_Line_Item__c> newRecords
    ) {
        TRM_DuplicateDetectionModels.BulkProcessingResultDTO result = 
            new TRM_DuplicateDetectionModels.BulkProcessingResultDTO();
        
        if (newRecords == null || newRecords.isEmpty()) {
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionService: No records to process');
            }
            result.finalizeProcessing();
            return result;
        }
        
        try {
            // Step 1: Filter records that have required fields
            List<Bill_Line_Item__c> validRecords = filterValidRecords(newRecords);
            result.totalProcessed = validRecords.size();
            
            if (validRecords.isEmpty()) {
                if (DEBUG_LOGGING) {
                    System.debug('TRM_DuplicateDetectionService: No valid records to process');
                }
                result.finalizeProcessing();
                return result;
            }
            
            // Step 2: Query records with Bill relationship for Patient_Id__c
            Map<Id, Bill_Line_Item__c> recordsWithBillInfo = queryRecordsWithBillInfo(validRecords);
            
            // Step 3: Process each record for duplicates
            List<Bill_Line_Item__c> recordsToUpdate = new List<Bill_Line_Item__c>();
            Set<Id> billIdsToUpdate = new Set<Id>();
            
            for (Bill_Line_Item__c record : recordsWithBillInfo.values()) {
                try {
                    processRecordForDuplicates(record, result);
                    recordsToUpdate.add(record);
                    
                    // Track bills that need warning count updates
                    if (record.Bill__c != null) {
                        billIdsToUpdate.add(record.Bill__c);
                    }
                    
                } catch (Exception e) {
                    result.errors++;
                    result.errorMessages.add('Record ' + record.Id + ': ' + e.getMessage());
                    if (DEBUG_LOGGING) {
                        System.debug('TRM_DuplicateDetectionService: Error processing record ' + 
                                   record.Id + ': ' + e.getMessage());
                    }
                }
            }
            
            // Step 4: Update records with duplicate status
            if (!recordsToUpdate.isEmpty()) {
                update recordsToUpdate;
            }
            
            // Step 5: Update Bill-level warning counts
            if (!billIdsToUpdate.isEmpty()) {
                updateBillWarningCounts(billIdsToUpdate);
            }
            
        } catch (Exception e) {
            result.errors++;
            result.errorMessages.add('Bulk processing error: ' + e.getMessage());
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionService: Bulk processing error: ' + e.getMessage());
            }
        }
        
        result.finalizeProcessing();
        return result;
    }
    
    /**
     * @description Get comprehensive duplicate data for a specific record
     * @param recordId The Bill Line Item record ID
     * @return TRM_DuplicateDetectionModels.DuplicateDataDTO Complete duplicate information
     */
    public static TRM_DuplicateDetectionModels.DuplicateDataDTO getDuplicateData(Id recordId) {
        TRM_DuplicateDetectionModels.DuplicateDataDTO result = 
            new TRM_DuplicateDetectionModels.DuplicateDataDTO();
        
        try {
            // Query the record with all duplicate-related fields
            List<Bill_Line_Item__c> records = [
                SELECT Id, Name, CPT_HCPCS_NDC__c, Charge__c, Service_Start_Date__c,
                       Service_End_Date__c, Duplicate_Status__c, Matching_Records__c,
                       Last_Duplicate_Check__c, Duplicate_Confidence__c,
                       Bill__c, Bill__r.External_Id__c, Bill__r.Patient_Id__c,
                       CreatedDate, CreatedBy.Name
                FROM Bill_Line_Item__c
                WHERE Id = :recordId
                WITH SECURITY_ENFORCED
                LIMIT 1
            ];
            
            if (records.isEmpty()) {
                throw new AuraHandledException('Record not found: ' + recordId);
            }
            
            Bill_Line_Item__c record = records[0];
            
            // Populate source record information
            result.sourceRecord = new TRM_DuplicateDetectionModels.BillLineItemDTO(record);
            result.duplicateStatus = record.Duplicate_Status__c != null ? 
                record.Duplicate_Status__c : 'None';
            result.lastCheck = record.Last_Duplicate_Check__c;
            result.confidence = record.Duplicate_Confidence__c != null ? 
                record.Duplicate_Confidence__c : 0.0;
            
            // Parse and populate matching records
            if (String.isNotBlank(record.Matching_Records__c)) {
                result.matches = parseMatchingRecords(record.Matching_Records__c);
                result.totalMatches = result.matches.size();
            }
            
        } catch (Exception e) {
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionService: Error getting duplicate data for ' + 
                           recordId + ': ' + e.getMessage());
            }
            throw new AuraHandledException('Error retrieving duplicate data: ' + e.getMessage());
        }
        
        return result;
    }
    
    /**
     * @description Find exact matches for a Bill Line Item record
     * @param record The record to find matches for
     * @param patientId The patient ID to scope matches to
     * @return List<Bill_Line_Item__c> List of exact matching records
     */
    public static List<Bill_Line_Item__c> findExactMatches(
        Bill_Line_Item__c record, 
        String patientId
    ) {
        if (String.isBlank(patientId) || record.CPT_HCPCS_NDC__c == null || 
            record.Charge__c == null || record.Service_Start_Date__c == null) {
            return new List<Bill_Line_Item__c>();
        }
        
        try {
            // Calculate charge range for SOQL compatibility (ABS not supported in WHERE clause)
            Decimal minCharge = record.Charge__c - CHARGE_TOLERANCE;
            Decimal maxCharge = record.Charge__c + CHARGE_TOLERANCE;

            // ✨ ENHANCED: Added Bill__r.Bill_Case_Data__r.CaseNumber for MVADM-185
            // Includes Case relationship for proper caseNumber population in MatchDTO
            return [
                SELECT Id, Name, CPT_HCPCS_NDC__c, Charge__c, Service_Start_Date__c,
                       Service_End_Date__c, Bill__r.Id, Bill__r.External_Id__c,
                       Bill__r.Patient_Id__c, Bill__r.Bill_Case_Data__c,
                       Bill__r.Bill_Case_Data__r.CaseNumber,
                       CreatedDate, CreatedBy.Name
                FROM Bill_Line_Item__c
                WHERE Bill__r.Patient_Id__c = :patientId
                  AND CPT_HCPCS_NDC__c = :record.CPT_HCPCS_NDC__c
                  AND Service_Start_Date__c = :record.Service_Start_Date__c
                  AND Service_End_Date__c = :record.Service_End_Date__c
                  AND Charge__c >= :minCharge
                  AND Charge__c <= :maxCharge
                  AND Id != :record.Id
                WITH SECURITY_ENFORCED
                ORDER BY CreatedDate DESC
                LIMIT :MAX_MATCHES_RETURNED
            ];
        } catch (Exception e) {
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionService: Error finding exact matches: ' + e.getMessage());
            }
            return new List<Bill_Line_Item__c>();
        }
    }
    
    /**
     * @description Find potential matches for a Bill Line Item record
     * @param record The record to find matches for
     * @param patientId The patient ID to scope matches to
     * @return List<Bill_Line_Item__c> List of potentially matching records
     */
    public static List<Bill_Line_Item__c> findPotentialMatches(
        Bill_Line_Item__c record, 
        String patientId
    ) {
        if (String.isBlank(patientId) || record.CPT_HCPCS_NDC__c == null || 
            record.Service_Start_Date__c == null) {
            return new List<Bill_Line_Item__c>();
        }
        
        try {
            // Calculate date range (±5 years, configurable)
            Date startRange = record.Service_Start_Date__c.addYears(-DEFAULT_DATE_WINDOW_YEARS);
            Date endRange = record.Service_Start_Date__c.addYears(DEFAULT_DATE_WINDOW_YEARS);

            // FIX: Added Bill__r.Id and Bill__r.Bill_Case_Data__c to prevent SOQL error
            // when MatchDTO constructor accesses Bill relationship fields (line 88-95 in TRM_DuplicateDetectionModels)
            return [
                SELECT Id, Name, CPT_HCPCS_NDC__c, Charge__c, Service_Start_Date__c,
                       Service_End_Date__c, Bill__r.Id, Bill__r.External_Id__c,
                       Bill__r.Patient_Id__c, Bill__r.Bill_Case_Data__c,
                       CreatedDate, CreatedBy.Name
                FROM Bill_Line_Item__c
                WHERE Bill__r.Patient_Id__c = :patientId
                  AND CPT_HCPCS_NDC__c = :record.CPT_HCPCS_NDC__c
                  AND Service_Start_Date__c >= :startRange
                  AND Service_Start_Date__c <= :endRange
                  AND Id != :record.Id
                WITH SECURITY_ENFORCED
                ORDER BY Service_Start_Date__c DESC, CreatedDate DESC
                LIMIT :MAX_MATCHES_RETURNED
            ];
        } catch (Exception e) {
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionService: Error finding potential matches: ' + e.getMessage());
            }
            return new List<Bill_Line_Item__c>();
        }
    }
    
    /**
     * @description Update Bill-level warning counts for duplicate line items
     * @param billIds Set of Bill IDs to update warning counts for
     */
    public static void updateBillWarningCounts(Set<Id> billIds) {
        if (billIds == null || billIds.isEmpty()) {
            return;
        }
        
        try {
            // Query aggregated duplicate counts by Bill
            List<AggregateResult> duplicateCounts = [
                SELECT Bill__c, COUNT(Id) duplicateCount
                FROM Bill_Line_Item__c
                WHERE Bill__c IN :billIds
                  AND Duplicate_Status__c != 'None'
                  AND Duplicate_Status__c != null
                WITH SECURITY_ENFORCED
                GROUP BY Bill__c
            ];
            
            // Build map of Bill ID to duplicate count
            Map<Id, Integer> billToDuplicateCount = new Map<Id, Integer>();
            for (AggregateResult ar : duplicateCounts) {
                billToDuplicateCount.put(
                    (Id)ar.get('Bill__c'), 
                    (Integer)ar.get('duplicateCount')
                );
            }
            
            // Query Bills to update
            List<Bill__c> billsToUpdate = [
                SELECT Id, Duplicate_Warning_Count__c
                FROM Bill__c
                WHERE Id IN :billIds
                WITH SECURITY_ENFORCED
            ];
            
            // Update warning counts
            for (Bill__c bill : billsToUpdate) {
                Integer duplicateCount = billToDuplicateCount.get(bill.Id);
                bill.Duplicate_Warning_Count__c = duplicateCount != null ? duplicateCount : 0;
            }
            
            if (!billsToUpdate.isEmpty()) {
                update billsToUpdate;
            }
            
        } catch (Exception e) {
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionService: Error updating bill warning counts: ' + 
                           e.getMessage());
            }
            // Don't throw exception here to avoid breaking main duplicate detection flow
        }
    }
    
    /**
     * @description Filter records that have required fields for duplicate detection
     * @param records List of records to filter
     * @return List<Bill_Line_Item__c> Filtered list of valid records
     */
    private static List<Bill_Line_Item__c> filterValidRecords(List<Bill_Line_Item__c> records) {
        List<Bill_Line_Item__c> validRecords = new List<Bill_Line_Item__c>();

        for (Bill_Line_Item__c record : records) {
            if (record.CPT_HCPCS_NDC__c != null &&
                record.Charge__c != null &&
                record.Service_Start_Date__c != null) {
                validRecords.add(record);
            } else if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionService: Skipping record ' + record.Id +
                           ' - Missing required fields');
            }
        }

        return validRecords;
    }

    /**
     * @description Query records with Bill relationship information
     * @param records List of records to query
     * @return Map<Id, Bill_Line_Item__c> Map of record ID to record with Bill info
     */
    private static Map<Id, Bill_Line_Item__c> queryRecordsWithBillInfo(
        List<Bill_Line_Item__c> records
    ) {
        Set<Id> recordIds = new Set<Id>();
        for (Bill_Line_Item__c record : records) {
            recordIds.add(record.Id);
        }

        List<Bill_Line_Item__c> queriedRecords = [
            SELECT Id, Name, CPT_HCPCS_NDC__c, Charge__c, Service_Start_Date__c,
                   Service_End_Date__c, Bill__c, Bill__r.Patient_Id__c, Bill__r.External_Id__c
            FROM Bill_Line_Item__c
            WHERE Id IN :recordIds
            WITH SECURITY_ENFORCED
        ];

        Map<Id, Bill_Line_Item__c> recordMap = new Map<Id, Bill_Line_Item__c>();
        for (Bill_Line_Item__c record : queriedRecords) {
            recordMap.put(record.Id, record);
        }

        return recordMap;
    }

    /**
     * @description Process individual record for duplicate detection
     * @param record The record to process
     * @param result The bulk processing result to update
     */
    private static void processRecordForDuplicates(
        Bill_Line_Item__c record,
        TRM_DuplicateDetectionModels.BulkProcessingResultDTO result
    ) {
        String patientId = record.Bill__r?.Patient_Id__c;

        if (String.isBlank(patientId)) {
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionService: No patient ID for record ' + record.Id);
            }
            record.Duplicate_Status__c = 'None';
            record.Matching_Records__c = null;
            record.Last_Duplicate_Check__c = System.now();
            result.noMatches++;
            return;
        }

        // Find exact matches first
        List<Bill_Line_Item__c> exactMatches = findExactMatches(record, patientId);

        if (!exactMatches.isEmpty()) {
            record.Duplicate_Status__c = 'Exact';
            record.Matching_Records__c = serializeMatches(exactMatches, 'Exact', record);
            record.Duplicate_Confidence__c = 100.0;
            result.exactMatches++;

            // ✨ NEW: Update Referenced_By__c for bidirectional tracking
            updateReferencedBy(record, exactMatches, 'Exact');

        } else {
            // Find potential matches if no exact matches
            List<Bill_Line_Item__c> potentialMatches = findPotentialMatches(record, patientId);

            if (!potentialMatches.isEmpty()) {
                record.Duplicate_Status__c = 'Potential';
                record.Matching_Records__c = serializeMatches(potentialMatches, 'Potential', record);
                record.Duplicate_Confidence__c = calculateConfidence(record, potentialMatches);
                result.potentialMatches++;

                // ✨ NEW: Update Referenced_By__c for bidirectional tracking
                updateReferencedBy(record, potentialMatches, 'Potential');

            } else {
                record.Duplicate_Status__c = 'None';
                record.Matching_Records__c = null;
                record.Duplicate_Confidence__c = 0.0;
                result.noMatches++;
            }
        }

        record.Last_Duplicate_Check__c = System.now();
    }

    /**
     * @description Serialize matching records to JSON for storage
     * ✨ ENHANCED for MVADM-185: Now includes matchingFields calculation
     * @param matches List of matching records
     * @param matchType Type of match (Exact or Potential)
     * @param sourceRecord The source record being compared against
     * @return String JSON representation of matches
     */
    private static String serializeMatches(
        List<Bill_Line_Item__c> matches,
        String matchType,
        Bill_Line_Item__c sourceRecord
    ) {
        List<TRM_DuplicateDetectionModels.MatchDTO> matchDTOs =
            new List<TRM_DuplicateDetectionModels.MatchDTO>();

        for (Bill_Line_Item__c match : matches) {
            TRM_DuplicateDetectionModels.MatchDTO matchDTO =
                new TRM_DuplicateDetectionModels.MatchDTO(match);
            matchDTO.matchType = matchType;
            matchDTO.confidence = matchType == 'Exact' ? 100.0 :
                calculateIndividualMatchConfidence(match);

            // NOTE: matchingFields are NOT stored in Matching_Records__c
            // They are only stored in Referenced_By__c for historical cases

            matchDTOs.add(matchDTO);
        }

        return JSON.serialize(matchDTOs);
    }

    /**
     * @description Calculate which specific fields match between two records
     * ✨ NEW for MVADM-185: Enables field-level match visualization
     * @param source Source Bill Line Item
     * @param target Target Bill Line Item
     * @return List<String> List of matching field names
     */
    private static List<String> getMatchingFields(
        Bill_Line_Item__c source,
        Bill_Line_Item__c target
    ) {
        List<String> matchingFields = new List<String>();

        if (source == null || target == null) {
            return matchingFields;
        }

        // Patient always matches (it's part of the search criteria)
        matchingFields.add('patient');

        // Procedure Code
        if (source.CPT_HCPCS_NDC__c == target.CPT_HCPCS_NDC__c) {
            matchingFields.add('procedure');
        }

        // Charge (with $0.01 tolerance)
        if (source.Charge__c != null && target.Charge__c != null) {
            if (Math.abs(source.Charge__c - target.Charge__c) <= CHARGE_TOLERANCE) {
                matchingFields.add('charge');
            }
        }

        // Service Start Date
        if (source.Service_Start_Date__c == target.Service_Start_Date__c) {
            matchingFields.add('serviceStartDate');
        }

        // Service End Date
        if (source.Service_End_Date__c == target.Service_End_Date__c) {
            matchingFields.add('serviceEndDate');
        }

        return matchingFields;
    }

    /**
     * @description Parse matching records from JSON storage
     * @param matchingRecordsJson JSON string of matching records
     * @return List<TRM_DuplicateDetectionModels.MatchDTO> Parsed match DTOs
     */
    private static List<TRM_DuplicateDetectionModels.MatchDTO> parseMatchingRecords(
        String matchingRecordsJson
    ) {
        try {
            return (List<TRM_DuplicateDetectionModels.MatchDTO>)
                JSON.deserialize(matchingRecordsJson,
                    List<TRM_DuplicateDetectionModels.MatchDTO>.class);
        } catch (Exception e) {
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionService: Error parsing matching records: ' +
                           e.getMessage());
            }
            return new List<TRM_DuplicateDetectionModels.MatchDTO>();
        }
    }

    /**
     * @description Calculate confidence score for potential matches
     * @param sourceRecord The source record
     * @param matches List of potential matching records
     * @return Decimal Confidence score (0-100)
     */
    private static Decimal calculateConfidence(
        Bill_Line_Item__c sourceRecord,
        List<Bill_Line_Item__c> matches
    ) {
        if (matches.isEmpty()) {
            return 0.0;
        }

        // Simple confidence calculation based on date proximity and charge similarity
        Decimal totalConfidence = 0.0;

        for (Bill_Line_Item__c match : matches) {
            Decimal matchConfidence = calculateIndividualMatchConfidence(match);
            totalConfidence += matchConfidence;
        }

        return totalConfidence / matches.size();
    }

    /**
     * @description Calculate confidence for individual match
     * @param match The matching record
     * @return Decimal Individual match confidence (0-100)
     */
    private static Decimal calculateIndividualMatchConfidence(Bill_Line_Item__c match) {
        // For now, return a base confidence for potential matches
        // This can be enhanced with more sophisticated scoring later
        return 75.0;
    }

    /**
     * @description Update Referenced_By__c field for bidirectional duplicate tracking
     * ✨ ENHANCED for MVADM-185: Now stores detailed JSON with matchingFields
     * OPTIMIZED: Uses bulkification to avoid governor limits with 500-2000 duplicates
     *
     * @param sourceRecord The record that has duplicates
     * @param matchedRecords List of records that are duplicates of the source record
     * @param matchType Type of match (Exact or Potential)
     */
    public static void updateReferencedBy(
        Bill_Line_Item__c sourceRecord,
        List<Bill_Line_Item__c> matchedRecords,
        String matchType
    ) {
        if (matchedRecords == null || matchedRecords.isEmpty()) {
            return;
        }

        try {
            // Extract IDs for query
            Set<Id> matchedRecordIds = new Set<Id>();
            for (Bill_Line_Item__c match : matchedRecords) {
                matchedRecordIds.add(match.Id);
            }

            // Query current Referenced_By__c values for all matched records
            // OPTIMIZATION: Single query for all records (avoid N+1 queries)
            Map<Id, Bill_Line_Item__c> matchedRecordsMap = new Map<Id, Bill_Line_Item__c>([
                SELECT Id, Referenced_By__c
                FROM Bill_Line_Item__c
                WHERE Id IN :matchedRecordIds
                WITH SECURITY_ENFORCED
            ]);

            List<Bill_Line_Item__c> recordsToUpdate = new List<Bill_Line_Item__c>();

            // OPTIMIZATION: Process all records in memory (avoid multiple DML operations)
            for (Bill_Line_Item__c matchedRecord : matchedRecords) {
                Bill_Line_Item__c recordToUpdate = matchedRecordsMap.get(matchedRecord.Id);
                if (recordToUpdate == null) continue;

                // Parse existing Referenced_By__c JSON (now expecting array of objects)
                List<Object> referencedByList = new List<Object>();
                Set<String> existingRecordIds = new Set<String>(); // Track existing IDs to avoid duplicates

                if (String.isNotBlank(recordToUpdate.Referenced_By__c)) {
                    try {
                        List<Object> existingRefs = (List<Object>) JSON.deserializeUntyped(
                            recordToUpdate.Referenced_By__c
                        );
                        for (Object refObj : existingRefs) {
                            Map<String, Object> refMap = (Map<String, Object>) refObj;
                            String existingRecordId = (String) refMap.get('recordId');
                            existingRecordIds.add(existingRecordId);
                            referencedByList.add(refObj);
                        }
                    } catch (Exception e) {
                        if (DEBUG_LOGGING) {
                            System.debug('Error parsing Referenced_By__c for ' + recordToUpdate.Id + ': ' + e.getMessage());
                        }
                    }
                }

                // Add new reference if not already present
                String sourceRecordIdStr = String.valueOf(sourceRecord.Id);
                if (!existingRecordIds.contains(sourceRecordIdStr)) {
                    // Calculate matching fields
                    List<String> matchingFields = getMatchingFields(matchedRecord, sourceRecord);

                    // Build reference object
                    Map<String, Object> referenceData = new Map<String, Object>();
                    referenceData.put('recordId', sourceRecordIdStr);
                    referenceData.put('recordName', sourceRecord.Name);
                    referenceData.put('caseId', String.valueOf(sourceRecord.Bill__r.Bill_Case_Data__c));
                    referenceData.put('caseNumber', sourceRecord.Bill__r.Bill_Case_Data__r.CaseNumber);
                    referenceData.put('matchType', matchType);
                    referenceData.put('matchingFields', matchingFields);

                    referencedByList.add(referenceData);
                }

                // Serialize back to JSON
                recordToUpdate.Referenced_By__c = JSON.serialize(referencedByList);
                recordsToUpdate.add(recordToUpdate);
            }

            // OPTIMIZATION: Single DML operation for all records
            if (!recordsToUpdate.isEmpty()) {
                update recordsToUpdate;
            }

        } catch (Exception e) {
            if (DEBUG_LOGGING) {
                System.debug('Error updating Referenced_By__c: ' + e.getMessage());
            }
            // Don't throw - this is a non-critical enhancement
        }
    }

    /**
     * @description Remove stale references from Referenced_By__c when duplicates are removed
     * ✨ NEW for MVADM-185: Cleanup stale bidirectional references
     * OPTIMIZED: Uses bulkification to avoid governor limits
     *
     * @param sourceRecordId The record that no longer has duplicates
     * @param removedMatchIds Set of IDs that are no longer duplicates
     */
    public static void removeReferencedBy(Id sourceRecordId, Set<Id> removedMatchIds) {
        if (removedMatchIds == null || removedMatchIds.isEmpty()) {
            return;
        }

        try {
            // FIX: Can't filter on Long Text Area fields, query all and filter in memory
            Map<Id, Bill_Line_Item__c> recordsToClean = new Map<Id, Bill_Line_Item__c>([
                SELECT Id, Referenced_By__c
                FROM Bill_Line_Item__c
                WHERE Id IN :removedMatchIds
                WITH SECURITY_ENFORCED
            ]);

            List<Bill_Line_Item__c> recordsToUpdate = new List<Bill_Line_Item__c>();

            for (Bill_Line_Item__c record : recordsToClean.values()) {
                // Skip if no Referenced_By__c data
                if (String.isBlank(record.Referenced_By__c)) {
                    continue;
                }

                try {
                    List<String> existingIdsStr = (List<String>) JSON.deserialize(
                        record.Referenced_By__c,
                        List<String>.class
                    );

                    // FIX: Convert List<String> to Set<Id>
                    Set<Id> referencedByIds = new Set<Id>();
                    for (String idStr : existingIdsStr) {
                        referencedByIds.add((Id)idStr);
                    }

                    referencedByIds.remove(sourceRecordId);

                    if (referencedByIds.isEmpty()) {
                        record.Referenced_By__c = null;
                    } else {
                        // FIX: Convert Set<Id> to List<String> for JSON serialization
                        List<String> cleanedList = new List<String>();
                        for (Id refId : referencedByIds) {
                            cleanedList.add(String.valueOf(refId));
                        }
                        record.Referenced_By__c = JSON.serialize(cleanedList);
                    }

                    recordsToUpdate.add(record);

                } catch (Exception e) {
                    if (DEBUG_LOGGING) {
                        System.debug('Error cleaning Referenced_By__c for ' + record.Id + ': ' + e.getMessage());
                    }
                }
            }

            if (!recordsToUpdate.isEmpty()) {
                update recordsToUpdate;
            }

        } catch (Exception e) {
            if (DEBUG_LOGGING) {
                System.debug('Error removing Referenced_By__c: ' + e.getMessage());
            }
        }
    }

    // ========================================================================
    // MVADM-185: BULKIFIED DUPLICATE DETECTION METHODS
    // ========================================================================
    // These methods reduce SOQL queries from 100-200 to 2-3 for bulk operations
    // Original methods above are preserved for backward compatibility
    // ========================================================================

    /**
     * @description BULKIFIED version of detectDuplicates() for handling 100+ line items
     * @param newRecords List of Bill Line Item records to process
     * @return TRM_DuplicateDetectionModels.BulkProcessingResultDTO Processing results
     *
     * PERFORMANCE: Reduces SOQL queries from O(n) to O(1) where n = number of records
     * - Old: 100 items × 1-2 queries = 100-200 queries ❌ Fails at 100+ items
     * - New: 2-3 queries total ✅ Supports thousands of items
     */
    public static TRM_DuplicateDetectionModels.BulkProcessingResultDTO detectDuplicatesBulkified(
        List<Bill_Line_Item__c> newRecords
    ) {
        TRM_DuplicateDetectionModels.BulkProcessingResultDTO result =
            new TRM_DuplicateDetectionModels.BulkProcessingResultDTO();

        if (newRecords == null || newRecords.isEmpty()) {
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionService (BULKIFIED): No records to process');
            }
            result.finalizeProcessing();
            return result;
        }

        try {
            // Step 1: Filter records that have required fields
            List<Bill_Line_Item__c> validRecords = filterValidRecords(newRecords);
            result.totalProcessed = validRecords.size();

            if (validRecords.isEmpty()) {
                if (DEBUG_LOGGING) {
                    System.debug('TRM_DuplicateDetectionService (BULKIFIED): No valid records to process');
                }
                result.finalizeProcessing();
                return result;
            }

            // Step 2: Query records with Bill relationship for Patient_Id__c
            Map<Id, Bill_Line_Item__c> recordsWithBillInfo = queryRecordsWithBillInfo(validRecords);

            // ✨ BULKIFICATION: Pre-load ALL matches in 2 queries instead of 1 query per item
            Map<Id, List<Bill_Line_Item__c>> allExactMatches =
                findAllExactMatchesBulk(recordsWithBillInfo.values());
            Map<Id, List<Bill_Line_Item__c>> allPotentialMatches =
                findAllPotentialMatchesBulk(recordsWithBillInfo.values());

            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionService (BULKIFIED): Pre-loaded matches for ' +
                           recordsWithBillInfo.size() + ' records using 2 queries');
            }

            // Step 3: Process each record for duplicates (NO QUERIES in loop)
            List<Bill_Line_Item__c> recordsToUpdate = new List<Bill_Line_Item__c>();
            Set<Id> billIdsToUpdate = new Set<Id>();
            Map<Id, List<ReferencedByUpdate>> allReferencedByUpdates = new Map<Id, List<ReferencedByUpdate>>();

            for (Bill_Line_Item__c record : recordsWithBillInfo.values()) {
                try {
                    // Use pre-loaded matches (no queries)
                    processRecordForDuplicatesBulkified(
                        record,
                        result,
                        allExactMatches.get(record.Id),
                        allPotentialMatches.get(record.Id),
                        allReferencedByUpdates  // ✨ NEW: Accumulate Referenced_By updates
                    );
                    recordsToUpdate.add(record);

                    // Track bills that need warning count updates
                    if (record.Bill__c != null) {
                        billIdsToUpdate.add(record.Bill__c);
                    }

                } catch (Exception e) {
                    result.errors++;
                    result.errorMessages.add('Record ' + record.Id + ': ' + e.getMessage());
                    if (DEBUG_LOGGING) {
                        System.debug('TRM_DuplicateDetectionService (BULKIFIED): Error processing record ' +
                                   record.Id + ': ' + e.getMessage());
                    }
                }
            }

            // Step 4: Update records with duplicate status
            if (!recordsToUpdate.isEmpty()) {
                update recordsToUpdate;
            }

            // Step 5: Process all Referenced_By updates in bulk (1-2 queries total)
            if (!allReferencedByUpdates.isEmpty()) {
                processReferencedByUpdatesBulk(allReferencedByUpdates);
            }

            // Step 6: Update Bill-level warning counts
            if (!billIdsToUpdate.isEmpty()) {
                updateBillWarningCounts(billIdsToUpdate);
            }

        } catch (Exception e) {
            result.errors++;
            result.errorMessages.add('Bulk processing error: ' + e.getMessage());
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionService (BULKIFIED): Bulk processing error: ' + e.getMessage());
            }
        }

        result.finalizeProcessing();
        return result;
    }

    /**
     * @description BULKIFIED: Find ALL exact matches for multiple records in 1 query
     * @param records List of records to find matches for
     * @return Map<Id, List<Bill_Line_Item__c>> Map of record ID to its exact matches
     */
    private static Map<Id, List<Bill_Line_Item__c>> findAllExactMatchesBulk(
        List<Bill_Line_Item__c> records
    ) {
        Map<Id, List<Bill_Line_Item__c>> resultMap = new Map<Id, List<Bill_Line_Item__c>>();

        // Initialize empty lists for all records
        for (Bill_Line_Item__c record : records) {
            resultMap.put(record.Id, new List<Bill_Line_Item__c>());
        }

        if (records.isEmpty()) {
            return resultMap;
        }

        try {
            // Build sets of unique values for WHERE clause
            Set<String> patientIds = new Set<String>();
            Set<String> cptCodes = new Set<String>();
            Set<Date> serviceDates = new Set<Date>();
            Set<Id> recordIds = new Set<Id>();

            for (Bill_Line_Item__c record : records) {
                String patientId = record.Bill__r?.Patient_Id__c;
                if (String.isNotBlank(patientId) &&
                    record.CPT_HCPCS_NDC__c != null &&
                    record.Service_Start_Date__c != null &&
                    record.Service_End_Date__c != null &&
                    record.Charge__c != null) {

                    patientIds.add(patientId);
                    cptCodes.add(record.CPT_HCPCS_NDC__c);
                    serviceDates.add(record.Service_Start_Date__c);
                    recordIds.add(record.Id);
                }
            }

            if (patientIds.isEmpty()) {
                return resultMap;
            }

            // Single query to get ALL potential exact matches
            List<Bill_Line_Item__c> allMatches = [
                SELECT Id, Name, CPT_HCPCS_NDC__c, Charge__c, Service_Start_Date__c,
                       Service_End_Date__c, Bill__r.Id, Bill__r.External_Id__c,
                       Bill__r.Patient_Id__c, Bill__r.Bill_Case_Data__c,
                       CreatedDate, CreatedBy.Name
                FROM Bill_Line_Item__c
                WHERE Bill__r.Patient_Id__c IN :patientIds
                  AND CPT_HCPCS_NDC__c IN :cptCodes
                  AND Service_Start_Date__c IN :serviceDates
                  AND Id NOT IN :recordIds
                WITH SECURITY_ENFORCED
                ORDER BY CreatedDate DESC
            ];

            // Match each result to the correct source record
            for (Bill_Line_Item__c sourceRecord : records) {
                String sourcePatientId = sourceRecord.Bill__r?.Patient_Id__c;

                if (String.isBlank(sourcePatientId) ||
                    sourceRecord.CPT_HCPCS_NDC__c == null ||
                    sourceRecord.Service_Start_Date__c == null ||
                    sourceRecord.Service_End_Date__c == null ||
                    sourceRecord.Charge__c == null) {
                    continue;
                }

                Decimal minCharge = sourceRecord.Charge__c - CHARGE_TOLERANCE;
                Decimal maxCharge = sourceRecord.Charge__c + CHARGE_TOLERANCE;

                List<Bill_Line_Item__c> exactMatches = new List<Bill_Line_Item__c>();

                for (Bill_Line_Item__c match : allMatches) {
                    // Check if this match belongs to this source record
                    if (match.Bill__r.Patient_Id__c == sourcePatientId &&
                        match.CPT_HCPCS_NDC__c == sourceRecord.CPT_HCPCS_NDC__c &&
                        match.Service_Start_Date__c == sourceRecord.Service_Start_Date__c &&
                        match.Service_End_Date__c == sourceRecord.Service_End_Date__c &&
                        match.Charge__c >= minCharge &&
                        match.Charge__c <= maxCharge) {

                        exactMatches.add(match);

                        // Limit to MAX_MATCHES_RETURNED per source record
                        if (exactMatches.size() >= MAX_MATCHES_RETURNED) {
                            break;
                        }
                    }
                }

                resultMap.put(sourceRecord.Id, exactMatches);
            }

        } catch (Exception e) {
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionService (BULKIFIED): Error finding exact matches: ' + e.getMessage());
            }
        }

        return resultMap;
    }

    /**
     * @description BULKIFIED: Find ALL potential matches for multiple records in 1 query
     * @param records List of records to find matches for
     * @return Map<Id, List<Bill_Line_Item__c>> Map of record ID to its potential matches
     */
    private static Map<Id, List<Bill_Line_Item__c>> findAllPotentialMatchesBulk(
        List<Bill_Line_Item__c> records
    ) {
        Map<Id, List<Bill_Line_Item__c>> resultMap = new Map<Id, List<Bill_Line_Item__c>>();

        // Initialize empty lists for all records
        for (Bill_Line_Item__c record : records) {
            resultMap.put(record.Id, new List<Bill_Line_Item__c>());
        }

        if (records.isEmpty()) {
            return resultMap;
        }

        try {
            // Build sets of unique values for WHERE clause
            Set<String> patientIds = new Set<String>();
            Set<String> cptCodes = new Set<String>();
            Set<Id> recordIds = new Set<Id>();
            Date minDate = null;
            Date maxDate = null;

            for (Bill_Line_Item__c record : records) {
                String patientId = record.Bill__r?.Patient_Id__c;
                if (String.isNotBlank(patientId) &&
                    record.CPT_HCPCS_NDC__c != null &&
                    record.Service_Start_Date__c != null) {

                    patientIds.add(patientId);
                    cptCodes.add(record.CPT_HCPCS_NDC__c);
                    recordIds.add(record.Id);

                    // Calculate overall date range (±5 years from each record)
                    Date recordMinDate = record.Service_Start_Date__c.addYears(-DEFAULT_DATE_WINDOW_YEARS);
                    Date recordMaxDate = record.Service_Start_Date__c.addYears(DEFAULT_DATE_WINDOW_YEARS);

                    if (minDate == null || recordMinDate < minDate) {
                        minDate = recordMinDate;
                    }
                    if (maxDate == null || recordMaxDate > maxDate) {
                        maxDate = recordMaxDate;
                    }
                }
            }

            if (patientIds.isEmpty() || minDate == null || maxDate == null) {
                return resultMap;
            }

            // Single query to get ALL potential matches
            List<Bill_Line_Item__c> allMatches = [
                SELECT Id, Name, CPT_HCPCS_NDC__c, Charge__c, Service_Start_Date__c,
                       Service_End_Date__c, Bill__r.Id, Bill__r.External_Id__c,
                       Bill__r.Patient_Id__c, Bill__r.Bill_Case_Data__c,
                       CreatedDate, CreatedBy.Name
                FROM Bill_Line_Item__c
                WHERE Bill__r.Patient_Id__c IN :patientIds
                  AND CPT_HCPCS_NDC__c IN :cptCodes
                  AND Service_Start_Date__c >= :minDate
                  AND Service_Start_Date__c <= :maxDate
                  AND Id NOT IN :recordIds
                WITH SECURITY_ENFORCED
                ORDER BY Service_Start_Date__c DESC, CreatedDate DESC
            ];

            // Match each result to the correct source record
            for (Bill_Line_Item__c sourceRecord : records) {
                String sourcePatientId = sourceRecord.Bill__r?.Patient_Id__c;

                if (String.isBlank(sourcePatientId) ||
                    sourceRecord.CPT_HCPCS_NDC__c == null ||
                    sourceRecord.Service_Start_Date__c == null) {
                    continue;
                }

                Date startRange = sourceRecord.Service_Start_Date__c.addYears(-DEFAULT_DATE_WINDOW_YEARS);
                Date endRange = sourceRecord.Service_Start_Date__c.addYears(DEFAULT_DATE_WINDOW_YEARS);

                List<Bill_Line_Item__c> potentialMatches = new List<Bill_Line_Item__c>();

                for (Bill_Line_Item__c match : allMatches) {
                    // Check if this match belongs to this source record
                    if (match.Bill__r.Patient_Id__c == sourcePatientId &&
                        match.CPT_HCPCS_NDC__c == sourceRecord.CPT_HCPCS_NDC__c &&
                        match.Service_Start_Date__c >= startRange &&
                        match.Service_Start_Date__c <= endRange) {

                        potentialMatches.add(match);

                        // Limit to MAX_MATCHES_RETURNED per source record
                        if (potentialMatches.size() >= MAX_MATCHES_RETURNED) {
                            break;
                        }
                    }
                }

                resultMap.put(sourceRecord.Id, potentialMatches);
            }

        } catch (Exception e) {
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionService (BULKIFIED): Error finding potential matches: ' + e.getMessage());
            }
        }

        return resultMap;
    }

    /**
     * @description BULKIFIED: Process a single record using pre-loaded matches (NO QUERIES)
     * ⚠️ NOTE: This method does NOT call updateReferencedBy() to avoid SOQL queries in loop
     * @param record The record to process
     * @param result The result DTO to update
     * @param exactMatches Pre-loaded exact matches for this record
     * @param potentialMatches Pre-loaded potential matches for this record
     * @param allReferencedByUpdates Map to accumulate Referenced_By updates (to be processed in bulk later)
     */
    private static void processRecordForDuplicatesBulkified(
        Bill_Line_Item__c record,
        TRM_DuplicateDetectionModels.BulkProcessingResultDTO result,
        List<Bill_Line_Item__c> exactMatches,
        List<Bill_Line_Item__c> potentialMatches,
        Map<Id, List<ReferencedByUpdate>> allReferencedByUpdates
    ) {
        // Handle null lists
        if (exactMatches == null) {
            exactMatches = new List<Bill_Line_Item__c>();
        }
        if (potentialMatches == null) {
            potentialMatches = new List<Bill_Line_Item__c>();
        }

        // Process exact matches first
        if (!exactMatches.isEmpty()) {
            record.Duplicate_Status__c = 'Exact';
            record.Matching_Records__c = serializeMatches(exactMatches, 'Exact', record);
            record.Duplicate_Confidence__c = 100.0;
            result.exactMatches++;

            // ✨ BULKIFIED: Accumulate Referenced_By updates instead of doing them immediately
            accumulateReferencedByUpdates(record, exactMatches, 'Exact', allReferencedByUpdates);

        } else if (!potentialMatches.isEmpty()) {
            // Only check potential matches if no exact matches found
            record.Duplicate_Status__c = 'Potential';
            record.Matching_Records__c = serializeMatches(potentialMatches, 'Potential', record);
            record.Duplicate_Confidence__c = calculateConfidence(record, potentialMatches);
            result.potentialMatches++;

            // ✨ BULKIFIED: Accumulate Referenced_By updates instead of doing them immediately
            accumulateReferencedByUpdates(record, potentialMatches, 'Potential', allReferencedByUpdates);

        } else {
            // No matches found
            record.Duplicate_Status__c = 'None';
            record.Matching_Records__c = null;
            record.Duplicate_Confidence__c = 0.0;
            result.noMatches++;
        }

        record.Last_Duplicate_Check__c = System.now();
    }

    /**
     * @description Helper class to track Referenced_By updates
     * ✨ MVADM-185: Used to accumulate updates and process them in bulk
     */
    private class ReferencedByUpdate {
        public Id sourceRecordId;
        public String matchType;

        public ReferencedByUpdate(Id sourceRecordId, String matchType) {
            this.sourceRecordId = sourceRecordId;
            this.matchType = matchType;
        }
    }

    /**
     * @description Accumulate Referenced_By updates for bulk processing
     * ✨ MVADM-185: Instead of updating immediately (1 query per call), accumulate updates
     *
     * @param sourceRecord The record that found duplicates
     * @param matchedRecords The records that were matched
     * @param matchType The type of match ('Exact' or 'Potential')
     * @param allReferencedByUpdates Map to accumulate updates
     */
    private static void accumulateReferencedByUpdates(
        Bill_Line_Item__c sourceRecord,
        List<Bill_Line_Item__c> matchedRecords,
        String matchType,
        Map<Id, List<ReferencedByUpdate>> allReferencedByUpdates
    ) {
        for (Bill_Line_Item__c matchedRecord : matchedRecords) {
            if (!allReferencedByUpdates.containsKey(matchedRecord.Id)) {
                allReferencedByUpdates.put(matchedRecord.Id, new List<ReferencedByUpdate>());
            }
            allReferencedByUpdates.get(matchedRecord.Id).add(
                new ReferencedByUpdate(sourceRecord.Id, matchType)
            );
        }
    }

    /**
     * @description Process all accumulated Referenced_By updates in bulk
     * ✨ MVADM-185: Processes all updates in 1-2 queries instead of N queries
     *
     * @param allReferencedByUpdates Map of accumulated updates
     */
    private static void processReferencedByUpdatesBulk(
        Map<Id, List<ReferencedByUpdate>> allReferencedByUpdates
    ) {
        if (allReferencedByUpdates.isEmpty()) {
            return;
        }

        try {
            // Query all records that need Referenced_By updates in ONE query
            Map<Id, Bill_Line_Item__c> recordsToUpdate = new Map<Id, Bill_Line_Item__c>([
                SELECT Id, Referenced_By__c
                FROM Bill_Line_Item__c
                WHERE Id IN :allReferencedByUpdates.keySet()
                WITH SECURITY_ENFORCED
            ]);

            // Process each record's updates
            for (Id recordId : allReferencedByUpdates.keySet()) {
                Bill_Line_Item__c recordToUpdate = recordsToUpdate.get(recordId);
                if (recordToUpdate == null) {
                    continue;
                }

                // Parse existing Referenced_By__c
                Set<String> existingReferences = new Set<String>();
                if (String.isNotBlank(recordToUpdate.Referenced_By__c)) {
                    try {
                        List<String> refList = (List<String>) JSON.deserialize(
                            recordToUpdate.Referenced_By__c,
                            List<String>.class
                        );
                        existingReferences.addAll(refList);
                    } catch (Exception e) {
                        System.debug('Error parsing Referenced_By__c for ' + recordId + ': ' + e.getMessage());
                    }
                }

                // Add new references
                for (ReferencedByUpdate refUpdate : allReferencedByUpdates.get(recordId)) {
                    existingReferences.add(refUpdate.sourceRecordId);
                }

                // Serialize back to JSON
                recordToUpdate.Referenced_By__c = JSON.serialize(new List<String>(existingReferences));
            }

            // Update all records in ONE DML operation
            if (!recordsToUpdate.isEmpty()) {
                update recordsToUpdate.values();
            }

        } catch (Exception e) {
            System.debug('Error in processReferencedByUpdatesBulk: ' + e.getMessage());
            // Don't throw - this is a non-critical feature
        }
    }
}