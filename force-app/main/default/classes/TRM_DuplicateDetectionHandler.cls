/**
 * @description Handler class for Bill Line Item duplicate detection triggers
 * @author Trinity Development Team
 * @date 2025-08-30
 * @version 2.0.0
 * 
 * This class follows Trinity design principles:
 * - Trigger handler pattern with clear separation from business logic
 * - Recursive execution prevention
 * - Comprehensive error handling and logging
 * - Delegation to service layer for processing
 * - Bulk processing support for governor limit compliance
 */
public with sharing class TRM_DuplicateDetectionHandler {
    
    // Prevent recursive trigger execution
    private static Boolean isProcessing = false;
    
    // Debug logging toggle - can be controlled via Custom Settings later
    private static Boolean DEBUG_LOGGING = true;
    
    /**
     * @description Main entry point for duplicate detection from triggers
     * @param newRecords List of new or updated Bill Line Item records
     */
    public static void detectDuplicates(List<Bill_Line_Item__c> newRecords) {
        // Prevent recursive execution
        if (isProcessing) {
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionHandler: Skipping recursive execution');
            }
            return;
        }
        
        // Validate input
        if (newRecords == null || newRecords.isEmpty()) {
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionHandler: No records to process');
            }
            return;
        }
        
        try {
            // Set processing flag to prevent recursion
            isProcessing = true;

            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionHandler: Starting duplicate detection for ' +
                           newRecords.size() + ' records');
            }

            // ✨ MVADM-185: Use bulkified version for large batches to avoid SOQL query limits
            TRM_DuplicateDetectionModels.BulkProcessingResultDTO result;

            if (newRecords.size() > 50) {
                // Use bulkified version to avoid SOQL query limits (100 queries per transaction)
                // Bulkified version uses 2-3 queries total instead of 1-2 queries per record
                if (DEBUG_LOGGING) {
                    System.debug('TRM_DuplicateDetectionHandler: Using BULKIFIED version for ' +
                               newRecords.size() + ' records');
                }
                result = TRM_DuplicateDetectionService.detectDuplicatesBulkified(newRecords);
            } else {
                // Use original version for small batches (simpler, already tested in production)
                if (DEBUG_LOGGING) {
                    System.debug('TRM_DuplicateDetectionHandler: Using ORIGINAL version for ' +
                               newRecords.size() + ' records');
                }
                result = TRM_DuplicateDetectionService.detectDuplicates(newRecords);
            }

            // Log processing results
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionHandler: Processing completed. ' +
                           'Total: ' + result.totalProcessed +
                           ', Exact: ' + result.exactMatches +
                           ', Potential: ' + result.potentialMatches +
                           ', None: ' + result.noMatches +
                           ', Errors: ' + result.errors +
                           ', Time: ' + result.processingTimeMs + 'ms');
            }
            
            // Log any errors that occurred during processing
            if (result.errors > 0) {
                System.debug('TRM_DuplicateDetectionHandler: Errors occurred during processing:');
                for (String errorMessage : result.errorMessages) {
                    System.debug('  - ' + errorMessage);
                }
            }
            
        } catch (Exception e) {
            // Log the error but don't throw to avoid breaking the transaction
            System.debug('TRM_DuplicateDetectionHandler: Unexpected error during duplicate detection: ' + 
                       e.getMessage());
            System.debug('Stack trace: ' + e.getStackTraceString());
            
            // In production, you might want to create a custom error log record
            // or send an alert to administrators
            
        } finally {
            // Always reset the processing flag
            isProcessing = false;
        }
    }
    
    /**
     * @description Handle after insert trigger events
     * @param newRecords List of newly inserted Bill Line Item records
     */
    public static void handleAfterInsert(List<Bill_Line_Item__c> newRecords) {
        if (DEBUG_LOGGING) {
            System.debug('TRM_DuplicateDetectionHandler: Handling after insert for ' + 
                       newRecords.size() + ' records');
        }
        
        detectDuplicates(newRecords);
    }
    
    /**
     * @description Handle after update trigger events
     * ✨ ENHANCED for MVADM-185: Now includes cleanup of stale Referenced_By__c references
     * @param newRecords List of updated Bill Line Item records
     * @param oldRecords Map of old Bill Line Item records
     */
    public static void handleAfterUpdate(
        List<Bill_Line_Item__c> newRecords,
        Map<Id, Bill_Line_Item__c> oldRecords
    ) {
        if (DEBUG_LOGGING) {
            System.debug('TRM_DuplicateDetectionHandler: Handling after update for ' +
                       newRecords.size() + ' records');
        }

        // Filter records that have changes in fields relevant to duplicate detection
        List<Bill_Line_Item__c> recordsToProcess = new List<Bill_Line_Item__c>();

        for (Bill_Line_Item__c newRecord : newRecords) {
            Bill_Line_Item__c oldRecord = oldRecords.get(newRecord.Id);

            if (oldRecord != null && hasRelevantChanges(newRecord, oldRecord)) {
                recordsToProcess.add(newRecord);
            }
        }

        if (!recordsToProcess.isEmpty()) {
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionHandler: Processing ' + recordsToProcess.size() +
                           ' records with relevant changes');
            }
            detectDuplicates(recordsToProcess);

            // ✨ NEW: Clean up stale Referenced_By__c references
            // IMPORTANT: detectDuplicates() updates Matching_Records__c in the database,
            // but newRecords still contains the OLD values from Trigger.new.
            // We need to re-query to get the UPDATED values for proper change detection.
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionHandler: Re-querying ' + newRecords.size() +
                           ' records to get updated Matching_Records__c values for cleanup');
            }

            // Re-query to get updated Matching_Records__c values
            Map<Id, Bill_Line_Item__c> updatedRecords = new Map<Id, Bill_Line_Item__c>([
                SELECT Id, Matching_Records__c
                FROM Bill_Line_Item__c
                WHERE Id IN :newRecords
            ]);

            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionHandler: Re-queried ' + updatedRecords.size() +
                           ' records successfully');
            }

            // Build list with updated values, maintaining original order
            List<Bill_Line_Item__c> updatedRecordsList = new List<Bill_Line_Item__c>();
            for (Bill_Line_Item__c newRec : newRecords) {
                Bill_Line_Item__c updated = updatedRecords.get(newRec.Id);
                if (updated != null) {
                    updatedRecordsList.add(updated);
                } else if (DEBUG_LOGGING) {
                    System.debug('TRM_DuplicateDetectionHandler: WARNING - Record ' + newRec.Id +
                               ' not found in re-query results');
                }
            }

            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionHandler: Calling cleanupStaleReferences with ' +
                           updatedRecordsList.size() + ' updated records');
            }

            // Clean up stale references using updated values
            // This runs asynchronously to avoid governor limits with large datasets
            cleanupStaleReferences(updatedRecordsList, oldRecords);

        } else if (DEBUG_LOGGING) {
            System.debug('TRM_DuplicateDetectionHandler: No records with relevant changes to process');
        }
    }
    
    /**
     * @description Check if a record has changes relevant to duplicate detection
     * ⚠️ IMPORTANT: Changes to Referenced_By__c should NOT trigger re-detection
     * @param newRecord The updated record
     * @param oldRecord The previous version of the record
     * @return Boolean True if relevant changes are detected
     */
    private static Boolean hasRelevantChanges(
        Bill_Line_Item__c newRecord,
        Bill_Line_Item__c oldRecord
    ) {
        // ✨ MVADM-185 FIX: Only re-detect if fields used for MATCHING change
        // Changes to Referenced_By__c, Duplicate_Status__c, etc. should NOT trigger re-detection
        // to prevent infinite recursion when updating bidirectional references
        return (
            newRecord.CPT_HCPCS_NDC__c != oldRecord.CPT_HCPCS_NDC__c ||
            newRecord.Charge__c != oldRecord.Charge__c ||
            newRecord.Service_Start_Date__c != oldRecord.Service_Start_Date__c ||
            newRecord.Service_End_Date__c != oldRecord.Service_End_Date__c ||
            newRecord.Bill__c != oldRecord.Bill__c
        );
        // NOTE: Referenced_By__c is intentionally NOT checked here
        // NOTE: Duplicate_Status__c, Matching_Records__c, Last_Duplicate_Check__c are also NOT checked
    }
    
    /**
     * @description Get current processing status (for testing and monitoring)
     * @return Boolean True if duplicate detection is currently processing
     */
    @TestVisible
    private static Boolean getProcessingStatus() {
        return isProcessing;
    }
    
    /**
     * @description Reset processing status (for testing purposes)
     */
    @TestVisible
    private static void resetProcessingStatus() {
        isProcessing = false;
    }
    
    /**
     * @description Enable or disable debug logging (for testing purposes)
     * @param enabled True to enable debug logging, false to disable
     */
    @TestVisible
    private static void setDebugLogging(Boolean enabled) {
        DEBUG_LOGGING = enabled;
    }

    /**
     * @description Clean up stale Referenced_By__c references when records are updated
     * ✨ NEW for MVADM-185: Maintains bidirectional duplicate relationship integrity
     * OPTIMIZED: Uses async processing to avoid governor limits with 500-2000 duplicates
     *
     * @param newRecords Updated records
     * @param oldRecords Previous version of records
     */
    private static void cleanupStaleReferences(
        List<Bill_Line_Item__c> newRecords,
        Map<Id, Bill_Line_Item__c> oldRecords
    ) {
        if (DEBUG_LOGGING) {
            System.debug('TRM_DuplicateDetectionHandler.cleanupStaleReferences: Starting cleanup check for ' +
                       newRecords.size() + ' records');
        }

        Set<Id> recordsWithChanges = new Set<Id>();
        Map<Id, Set<Id>> oldMatchesByRecord = new Map<Id, Set<Id>>();

        Integer changesDetected = 0;
        Integer noChanges = 0;

        for (Bill_Line_Item__c newRecord : newRecords) {
            Bill_Line_Item__c oldRecord = oldRecords.get(newRecord.Id);

            // Check if Matching_Records__c changed
            if (oldRecord.Matching_Records__c != newRecord.Matching_Records__c) {
                recordsWithChanges.add(newRecord.Id);
                changesDetected++;

                if (DEBUG_LOGGING) {
                    String oldValue = oldRecord.Matching_Records__c != null ?
                        'POPULATED (' + oldRecord.Matching_Records__c.length() + ' chars)' : 'null';
                    String newValue = newRecord.Matching_Records__c != null ?
                        'POPULATED (' + newRecord.Matching_Records__c.length() + ' chars)' : 'null';
                    System.debug('TRM_DuplicateDetectionHandler.cleanupStaleReferences: CHANGE DETECTED for ' +
                               newRecord.Id + ' | OLD: ' + oldValue + ' → NEW: ' + newValue);
                }

                // Parse old matches to identify which references need cleanup
                if (String.isNotBlank(oldRecord.Matching_Records__c)) {
                    try {
                        List<TRM_DuplicateDetectionModels.MatchDTO> oldMatches =
                            (List<TRM_DuplicateDetectionModels.MatchDTO>) JSON.deserialize(
                                oldRecord.Matching_Records__c,
                                List<TRM_DuplicateDetectionModels.MatchDTO>.class
                            );

                        Set<Id> oldMatchIds = new Set<Id>();
                        for (TRM_DuplicateDetectionModels.MatchDTO match : oldMatches) {
                            oldMatchIds.add(match.recordId);
                        }
                        oldMatchesByRecord.put(newRecord.Id, oldMatchIds);

                        if (DEBUG_LOGGING) {
                            System.debug('TRM_DuplicateDetectionHandler.cleanupStaleReferences: Extracted ' +
                                       oldMatchIds.size() + ' old match IDs from record ' + newRecord.Id);
                        }

                    } catch (Exception e) {
                        if (DEBUG_LOGGING) {
                            System.debug('TRM_DuplicateDetectionHandler.cleanupStaleReferences: Error parsing old Matching_Records__c for ' +
                                       newRecord.Id + ': ' + e.getMessage());
                        }
                    }
                } else if (DEBUG_LOGGING) {
                    System.debug('TRM_DuplicateDetectionHandler.cleanupStaleReferences: Record ' + newRecord.Id +
                               ' changed from null to ' + (newRecord.Matching_Records__c != null ? 'POPULATED' : 'null') +
                               ' - no cleanup needed');
                }
            } else {
                noChanges++;
            }
        }

        if (DEBUG_LOGGING) {
            System.debug('TRM_DuplicateDetectionHandler.cleanupStaleReferences: Summary - ' +
                       'Changes detected: ' + changesDetected + ', No changes: ' + noChanges);
        }

        if (!recordsWithChanges.isEmpty()) {
            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionHandler.cleanupStaleReferences: Cleaning up stale references for ' +
                           recordsWithChanges.size() + ' records');
            }

            // Collect all old match IDs
            Set<Id> allOldMatchIds = new Set<Id>();
            for (Set<Id> matchIds : oldMatchesByRecord.values()) {
                allOldMatchIds.addAll(matchIds);
            }

            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionHandler.cleanupStaleReferences: Total old match IDs to clean: ' +
                           allOldMatchIds.size());
                System.debug('TRM_DuplicateDetectionHandler.cleanupStaleReferences: Calling @future method removeStaleReferencesAsync()');
            }

            // Call async method to avoid governor limits
            // OPTIMIZATION: Runs in separate transaction with higher limits
            // FIX: Serialize complex types to JSON for @future method
            Set<String> changedRecordIdsStr = new Set<String>();
            for (Id recordId : recordsWithChanges) {
                changedRecordIdsStr.add(String.valueOf(recordId));
            }

            Set<String> allOldMatchIdsStr = new Set<String>();
            for (Id matchId : allOldMatchIds) {
                allOldMatchIdsStr.add(String.valueOf(matchId));
            }

            removeStaleReferencesAsync(
                JSON.serialize(changedRecordIdsStr),
                JSON.serialize(allOldMatchIdsStr)
            );

            if (DEBUG_LOGGING) {
                System.debug('TRM_DuplicateDetectionHandler.cleanupStaleReferences: @future method queued successfully');
            }
        } else if (DEBUG_LOGGING) {
            System.debug('TRM_DuplicateDetectionHandler.cleanupStaleReferences: No changes detected - cleanup not needed');
        }
    }

    /**
     * @description Async method to remove stale references from Referenced_By__c
     * ✨ NEW for MVADM-185: Async processing for governor limit compliance
     * OPTIMIZED: Processes up to 10,000 records per execution
     * FIX: Uses JSON serialization for complex types (@future only supports primitives)
     *
     * @param changedRecordIdsJson JSON serialized Set<Id> of records that changed
     * @param allOldMatchIdsJson JSON serialized Set<Id> of all old match IDs
     */
    @future
    private static void removeStaleReferencesAsync(
        String changedRecordIdsJson,
        String allOldMatchIdsJson
    ) {
        System.debug('=== TRM_DuplicateDetectionHandler.removeStaleReferencesAsync: STARTING ===');

        try {
            // Deserialize parameters
            Set<String> changedRecordIdsStr = (Set<String>) JSON.deserialize(
                changedRecordIdsJson,
                Set<String>.class
            );
            Set<String> allOldMatchIdsStr = (Set<String>) JSON.deserialize(
                allOldMatchIdsJson,
                Set<String>.class
            );

            System.debug('removeStaleReferencesAsync: Deserialized parameters');
            System.debug('  - Changed record IDs: ' + changedRecordIdsStr.size());
            System.debug('  - Old match IDs to clean: ' + allOldMatchIdsStr.size());

            // Convert to Set<Id>
            Set<Id> changedRecordIds = new Set<Id>();
            for (String idStr : changedRecordIdsStr) {
                changedRecordIds.add((Id)idStr);
            }

            Set<Id> allOldMatchIds = new Set<Id>();
            for (String idStr : allOldMatchIdsStr) {
                allOldMatchIds.add((Id)idStr);
            }

            if (allOldMatchIds.isEmpty()) {
                System.debug('removeStaleReferencesAsync: No old match IDs to process - exiting');
                return;
            }

            System.debug('removeStaleReferencesAsync: Querying ' + allOldMatchIds.size() +
                       ' potentially affected records...');

            // FIX: Can't filter on Long Text Area fields, query all and filter in memory
            Map<Id, Bill_Line_Item__c> potentiallyAffected = new Map<Id, Bill_Line_Item__c>([
                SELECT Id, Referenced_By__c
                FROM Bill_Line_Item__c
                WHERE Id IN :allOldMatchIds
                LIMIT 10000
            ]);

            System.debug('removeStaleReferencesAsync: Found ' + potentiallyAffected.size() +
                       ' records to check');

            List<Bill_Line_Item__c> toUpdate = new List<Bill_Line_Item__c>();
            Integer skippedBlank = 0;
            Integer processedWithReferences = 0;

            // OPTIMIZATION: Process all records in memory (single DML operation)
            for (Bill_Line_Item__c item : potentiallyAffected.values()) {
                // Skip if no Referenced_By__c data
                if (String.isBlank(item.Referenced_By__c)) {
                    skippedBlank++;
                    continue;
                }

                processedWithReferences++;

                try {
                    // ✨ ENHANCED: Handle both old format (array of strings) and new format (array of objects)
                    List<Object> referencedByList = new List<Object>();
                    Boolean needsUpdate = false;
                    Integer originalRefCount = 0;
                    Integer removedRefCount = 0;

                    // Try to parse as new format (array of objects) first
                    try {
                        List<Object> existingRefs = (List<Object>) JSON.deserializeUntyped(
                            item.Referenced_By__c
                        );
                        originalRefCount = existingRefs.size();

                        for (Object refObj : existingRefs) {
                            if (refObj instanceof Map<String, Object>) {
                                // New format: object with recordId, matchingFields, etc.
                                Map<String, Object> refMap = (Map<String, Object>) refObj;
                                String recordId = (String) refMap.get('recordId');

                                // Keep reference if it's not in the changed records
                                if (!changedRecordIdsStr.contains(recordId)) {
                                    referencedByList.add(refObj);
                                } else {
                                    needsUpdate = true;
                                    removedRefCount++;
                                }
                            } else if (refObj instanceof String) {
                                // Old format: simple string ID
                                String recordId = (String) refObj;

                                // Keep reference if it's not in the changed records
                                if (!changedRecordIdsStr.contains(recordId)) {
                                    referencedByList.add(refObj);
                                } else {
                                    needsUpdate = true;
                                    removedRefCount++;
                                }
                            }
                        }
                    } catch (Exception parseEx) {
                        // Fallback: try old format (array of strings)
                        List<String> referencedByIdsStr = (List<String>) JSON.deserialize(
                            item.Referenced_By__c,
                            List<String>.class
                        );
                        originalRefCount = referencedByIdsStr.size();

                        for (String recordId : referencedByIdsStr) {
                            if (!changedRecordIdsStr.contains(recordId)) {
                                referencedByList.add(recordId);
                            } else {
                                needsUpdate = true;
                                removedRefCount++;
                            }
                        }
                    }

                    if (needsUpdate) {
                        if (referencedByList.isEmpty()) {
                            item.Referenced_By__c = null;
                            System.debug('removeStaleReferencesAsync: Record ' + item.Id +
                                       ' - Removed ALL ' + removedRefCount + ' stale references → Setting to null');
                        } else {
                            item.Referenced_By__c = JSON.serialize(referencedByList);
                            System.debug('removeStaleReferencesAsync: Record ' + item.Id +
                                       ' - Removed ' + removedRefCount + ' stale references, kept ' +
                                       referencedByList.size() + ' valid references');
                        }
                        toUpdate.add(item);
                    }

                } catch (Exception e) {
                    System.debug('removeStaleReferencesAsync: Error cleaning references for ' +
                               item.Id + ': ' + e.getMessage());
                }
            }

            System.debug('removeStaleReferencesAsync: Processing summary:');
            System.debug('  - Records checked: ' + potentiallyAffected.size());
            System.debug('  - Skipped (blank Referenced_By__c): ' + skippedBlank);
            System.debug('  - Processed (has references): ' + processedWithReferences);
            System.debug('  - Records to update: ' + toUpdate.size());

            // OPTIMIZATION: Single DML operation for all updates
            if (!toUpdate.isEmpty()) {
                System.debug('removeStaleReferencesAsync: Updating ' + toUpdate.size() + ' records...');

                update toUpdate;

                System.debug('removeStaleReferencesAsync: ✅ SUCCESS - Cleaned stale references in ' +
                           toUpdate.size() + ' records');
            } else {
                System.debug('removeStaleReferencesAsync: No records needed updates - all references were valid');
            }

            System.debug('=== TRM_DuplicateDetectionHandler.removeStaleReferencesAsync: COMPLETED ===');

        } catch (Exception e) {
            System.debug('❌ ERROR in removeStaleReferencesAsync: ' + e.getMessage());
            System.debug('Stack trace: ' + e.getStackTraceString());
        }
    }
}