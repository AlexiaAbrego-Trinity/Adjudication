# MVADM-185: Investigación de Detección de Duplicados
## BCN/Quote – Validate Duplicate & Likely Duplicate Charge Detection

**Fecha:** 2026-01-16  
**Investigador:** Alexia Abrego  
**Estado:** Investigación Completa - Pendiente Implementación

---

## 📋 RESUMEN EJECUTIVO

### Hallazgos Principales

✅ **EXISTE** infraestructura de detección de duplicados implementada  
❌ **NO ESTÁ INTEGRADA** en el flujo de Bill Review  
⚠️ **FALTA** la clase Apex `TRM_DuplicateDetectionApi`  
🔧 **REQUIERE** integración y activación en la etapa de revisión

---

## 🔍 COMPONENTES EXISTENTES

### 1. Componentes LWC de Detección de Duplicados

#### ✅ `trmDuplicateTriangle` (Indicador Visual)
- **Ubicación:** `force-app/main/default/lwc/trmDuplicateTriangle/`
- **Propósito:** Mostrar triángulo de advertencia en line items individuales
- **Características:**
  - 🟢 **Triángulo Verde con $:** Duplicado exacto (mismo monto)
  - 🟡 **Triángulo Amarillo:** Duplicado potencial
  - Botón de verificación manual
  - Modal de comparación de duplicados
- **Estado:** ✅ Implementado pero NO integrado en el grid

#### ✅ `trmBillDuplicateSummary` (Resumen a Nivel Bill)
- **Ubicación:** `force-app/main/default/lwc/trmBillDuplicateSummary/`
- **Propósito:** Mostrar resumen de duplicados a nivel de Bill completo
- **Características:**
  - Contador de duplicados exactos vs potenciales
  - Botón "Check All Duplicates"
  - Modal con detalles de todos los matches
  - Integración con Bill__c record page
- **Estado:** ✅ Implementado para páginas de Bill__c

#### ⚠️ `duplicateTriangle` (Versión Antigua)
- **Ubicación:** `force-app/main/default/lwc/duplicateTriangle/`
- **Propósito:** Versión anterior del indicador
- **Diferencia:** Usa `BillLineItemDuplicateHandler` en lugar de `TRM_DuplicateDetectionApi`
- **Estado:** ⚠️ Posiblemente obsoleto

### 2. Campos de Salesforce en Bill_Line_Item__c

Los siguientes campos YA EXISTEN en el objeto:

```apex
Duplicate_Status__c          // Picklist: 'None', 'Exact', 'Potential'
Matching_Records__c          // Long Text Area (JSON de registros coincidentes)
Last_Duplicate_Check__c      // DateTime (última verificación)
```

**Evidencia:** Estos campos se consultan en múltiples lugares del código:
- `TRM_MedicalBillingService.cls` líneas 631-633, 802, 1008
- `customBillLineItemGrid.js` líneas 815-817, 1424-1425, 2402-2404

### 3. Integración Actual en customBillLineItemGrid

#### ✅ Columna de Duplicados Existe
```html
<!-- Línea 119 del HTML -->
<col class="duplicate-col">

<!-- Línea 182-185: Header -->
<th class="slds-text-align_center" scope="col" title="Duplicate Status">
    <lightning-icon icon-name="utility:warning" size="x-small"></lightning-icon>
</th>

<!-- Línea 489-499: Celda de datos -->
<td class="slds-text-align_center duplicate-flag-cell">
    <template if:true={item.isDuplicate}>
        <lightning-icon icon-name="utility:warning" size="small" 
                        variant="warning" title={item.duplicateStatusLabel}>
        </lightning-icon>
    </template>
</td>
```

#### ✅ Procesamiento de Datos
```javascript
// Línea 576-579 (draftRow)
isDuplicate: false,
duplicateStatus: 'None',
duplicateStatusLabel: '',

// Línea 815-817 (processLineItems)
isDuplicate: item.Duplicate_Status__c && item.Duplicate_Status__c !== 'None',
duplicateStatus: item.Duplicate_Status__c,
duplicateStatusLabel: this.getDuplicateStatusLabel(item.Duplicate_Status__c),
```

---

## ❌ COMPONENTES FALTANTES

### 1. Clase Apex: TRM_DuplicateDetectionApi

**Estado:** ❌ NO EXISTE

**Métodos Requeridos** (basado en imports de LWC):
```apex
@AuraEnabled(cacheable=true)
public static DuplicateData getDuplicateData(Id recordId) { }

@AuraEnabled
public static String triggerManualCheck(Id recordId) { }

@AuraEnabled(cacheable=true)
public static BillDuplicateSummary getBillDuplicateSummary(Id billId) { }

@AuraEnabled
public static String triggerBillDuplicateCheck(Id billId) { }

@AuraEnabled(cacheable=true)
public static List<Bill_Line_Item__c> getBillLineItemsWithMatches(Id billId) { }
```

### 2. Lógica de Matching/Detección

**Campos de Comparación Sugeridos** (basado en comentarios del ticket):
- ✅ Claimant (Member Account)
- ✅ Provider (Billing Provider)
- ✅ Service Date (Service_Start_Date__c)
- ✅ Procedure Code (CPT_HCPCS_NDC__c)
- ✅ Charge Amount (Charge__c)
- ⚠️ Rendering Practitioner (no existe campo actualmente)
- ✅ Quantity (Quantity__c)

### 3. Integración en Bill Review Stage

**Estado:** ❌ NO ACTIVA

Aunque la columna existe, NO hay:
- ❌ Detección automática al cargar line items
- ❌ Verificación al crear nuevos line items
- ❌ Componente `trmDuplicateTriangle` integrado en el grid
- ❌ Advertencias visuales durante la revisión

---

## 🎯 PROPUESTA DE SOLUCIÓN

### FASE 1: Crear TRM_DuplicateDetectionApi (CRÍTICO)

#### Estructura de la Clase

```apex
public with sharing class TRM_DuplicateDetectionApi {

    // Wrapper classes
    public class DuplicateData {
        @AuraEnabled public String duplicateStatus;
        @AuraEnabled public List<MatchRecord> matches;
        @AuraEnabled public DateTime lastCheck;
        @AuraEnabled public Integer confidence;
        @AuraEnabled public Integer totalMatches;
        @AuraEnabled public SourceRecord sourceRecord;
        @AuraEnabled public Configuration configuration;
    }

    public class MatchRecord {
        @AuraEnabled public Id recordId;
        @AuraEnabled public String recordName;
        @AuraEnabled public String matchType; // 'Exact' or 'Potential'
        @AuraEnabled public Integer confidence;
        @AuraEnabled public Decimal chargeAmount;
        @AuraEnabled public Date serviceStartDate;
        @AuraEnabled public Date serviceEndDate;
        @AuraEnabled public String procedureCode;
        @AuraEnabled public String patientId;
    }

    public class BillDuplicateSummary {
        @AuraEnabled public Boolean hasWarnings;
        @AuraEnabled public Integer totalWarnings;
        @AuraEnabled public Integer exactMatches;
        @AuraEnabled public Integer potentialMatches;
        @AuraEnabled public Integer totalLineItems;
        @AuraEnabled public String summaryMessage;
        @AuraEnabled public String billName;
        @AuraEnabled public DateTime lastCheckDate;
    }

    // Main methods
    @AuraEnabled(cacheable=true)
    public static DuplicateData getDuplicateData(Id recordId) {
        // Implementar lógica de detección
    }

    @AuraEnabled
    public static String triggerManualCheck(Id recordId) {
        // Ejecutar verificación manual
    }

    @AuraEnabled(cacheable=true)
    public static BillDuplicateSummary getBillDuplicateSummary(Id billId) {
        // Resumen a nivel Bill
    }

    @AuraEnabled
    public static String triggerBillDuplicateCheck(Id billId) {
        // Verificar todos los line items de un Bill
    }
}
```

#### Lógica de Matching

**Duplicado EXACTO (🟢 Triángulo Verde con $):**
```apex
// Todos estos campos deben coincidir 100%
- Member Account (Claimant)
- Service Start Date
- CPT/HCPCS Code
- Charge Amount (con tolerancia de $0.01)
- Quantity
- Provider (si disponible)
```

**Duplicado POTENCIAL (🟡 Triángulo Amarillo):**
```apex
// Coincidencia de 4 de 6 campos:
- Member Account (REQUERIDO)
- Service Start Date (±3 días)
- CPT/HCPCS Code
- Charge Amount (±5%)
- Quantity
- Provider
```

**Ventana de Búsqueda:**
- 5 años hacia atrás (configurable)
- Solo Bill Line Items con status != 'Deleted'
- Excluir el registro actual

### FASE 2: Integrar en customBillLineItemGrid

#### 2.1 Agregar Componente trmDuplicateTriangle

**Modificar:** `customBillLineItemGrid.html` línea 489-499

```html
<!-- ANTES: Solo icono estático -->
<td class="slds-text-align_center duplicate-flag-cell">
    <template if:true={item.isDuplicate}>
        <lightning-icon icon-name="utility:warning" size="small"
                        variant="warning" title={item.duplicateStatusLabel}>
        </lightning-icon>
    </template>
</td>

<!-- DESPUÉS: Componente interactivo -->
<td class="slds-text-align_center duplicate-flag-cell">
    <c-trm-duplicate-triangle
        record-id={item.Id}
        if:true={item.Id}>
    </c-trm-duplicate-triangle>
</td>
```

#### 2.2 Verificación Automática al Crear Line Items

**Modificar:** `customBillLineItemGrid.js` método `handleSaveDraft`

```javascript
async handleSaveDraft() {
    // ... código existente de guardado ...

    // NUEVO: Trigger duplicate check después de crear
    if (newItem && newItem.Id) {
        try {
            await triggerManualCheck({ recordId: newItem.Id });
            // Refresh para mostrar el triángulo
            await refreshApex(this.wiredLineItemsResult);
        } catch (error) {
            console.warn('Duplicate check failed:', error);
            // No bloquear el flujo si falla
        }
    }
}
```

#### 2.3 Advertencia Visual en Bill Review Stage

**Agregar:** Componente `trmBillDuplicateSummary` en la interfaz

```html
<!-- En bcnQuoteEmbeddedInterface.html o similar -->
<template if:true={showBillReviewStage}>
    <c-trm-bill-duplicate-summary
        record-id={billId}
        class="slds-m-bottom_medium">
    </c-trm-bill-duplicate-summary>
</template>
```

### FASE 3: Validación en Adjudication (Opcional)

**Agregar a:** `TRM_ValidationService.cls`

```apex
// YELLOW LINE WARNING (no bloquea)
if (lineItem.Duplicate_Status__c == 'Exact') {
    yellowLineWarnings.add(new ValidationWarning(
        'exact_duplicate_detected',
        'Exact Duplicate Detected',
        'Line #' + lineItem.Bill_Line_Item_Number__c +
        ' appears to be an exact duplicate of a previous charge',
        'Review matching records to confirm this is not a duplicate payment'
    ));
}
```

---

## 📊 COMPARACIÓN: LO QUE EXISTE vs LO QUE FALTA

| Componente | Estado | Ubicación | Acción Requerida |
|------------|--------|-----------|------------------|
| **Campos en Bill_Line_Item__c** | ✅ Existe | Salesforce Schema | Ninguna |
| **trmDuplicateTriangle LWC** | ✅ Existe | `lwc/trmDuplicateTriangle/` | Integrar en grid |
| **trmBillDuplicateSummary LWC** | ✅ Existe | `lwc/trmBillDuplicateSummary/` | Agregar a Bill Review |
| **Columna en Grid** | ✅ Existe | `customBillLineItemGrid.html` | Reemplazar con componente |
| **TRM_DuplicateDetectionApi** | ❌ NO EXISTE | N/A | **CREAR CLASE** |
| **Lógica de Matching** | ❌ NO EXISTE | N/A | **IMPLEMENTAR** |
| **Verificación Automática** | ❌ NO EXISTE | N/A | **AGREGAR** |
| **Integración Bill Review** | ❌ NO ACTIVA | N/A | **ACTIVAR** |

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Sprint 1: Fundamentos (5-8 días)
- [ ] Crear `TRM_DuplicateDetectionApi.cls`
- [ ] Implementar lógica de matching exacto
- [ ] Implementar lógica de matching potencial
- [ ] Crear tests unitarios (>75% coverage)
- [ ] Validar campos existentes en Bill_Line_Item__c

### Sprint 2: Integración UI (3-5 días)
- [ ] Integrar `trmDuplicateTriangle` en `customBillLineItemGrid`
- [ ] Agregar verificación automática al crear line items
- [ ] Integrar `trmBillDuplicateSummary` en Bill Review
- [ ] Probar flujo completo en sandbox

### Sprint 3: Validación y Refinamiento (2-3 días)
- [ ] Agregar warning en `TRM_ValidationService`
- [ ] Ajustar umbrales de matching según feedback
- [ ] Documentar comportamiento para usuarios
- [ ] Testing de aceptación con Claims team

---

## 🎨 MOCKUP: Cómo Se Verá

### En el Grid (Bill Review Stage)

```
┌─────────────────────────────────────────────────────────────┐
│ Bill Line Items                                             │
├─────────────────────────────────────────────────────────────┤
│ ☐  ⚠  #  Date       Code    Charge    Paid    Account      │
├─────────────────────────────────────────────────────────────┤
│ ☐  🟢$ 1  01/15/26  99213   $150.00   $120    Acct 001     │ ← Exact duplicate
│ ☐     2  01/16/26  99214   $200.00   $180    Acct 002     │
│ ☐  🟡  3  01/17/26  99213   $150.00   $0.00   Acct 001     │ ← Potential duplicate
└─────────────────────────────────────────────────────────────┘
```

### Al Hacer Click en el Triángulo

```
┌─────────────────────────────────────────────────────────────┐
│ Duplicate Comparison                                    [X] │
├─────────────────────────────────────────────────────────────┤
│ Current Record:                                             │
│ Line #1 • 01/15/26 • 99213 • $150.00 • John Doe           │
│                                                             │
│ Matching Records (1 exact match):                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🟢 Exact Match (100% confidence)                        │ │
│ │ Line #45 • BCN 10000123 • 12/20/25                     │ │
│ │ 99213 • $150.00 • John Doe • Dr. Smith                 │ │
│ │ Status: Paid                                            │ │
│ │ [View Record]                                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Mark as Reviewed]  [Close]                                │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### 1. Performance
- Indexar campos de búsqueda: `Member_Account__c`, `Service_Start_Date__c`, `CPT_HCPCS_NDC__c`
- Limitar búsqueda a 50 matches máximo
- Usar SOQL eficiente con filtros apropiados

### 2. Casos de Uso Legítimos (NO son duplicados)
- ✅ Múltiples enfermeras en mismo día (diferente practitioner)
- ✅ Reenvío con documentación corregida
- ✅ Disputa de pago (mismo claim, diferente contexto)
- ✅ Servicios múltiples del mismo tipo en un día

### 3. UX/UI
- **NO bloquear** el flujo - solo advertir visualmente
- Permitir "Mark as Reviewed" para silenciar advertencias
- Mostrar contexto completo en modal de comparación

---

## 📝 CONCLUSIONES

### ✅ Buenas Noticias
1. La infraestructura UI ya existe (70% completo)
2. Los campos de Salesforce ya están creados
3. Los componentes LWC están bien diseñados
4. Solo falta la lógica de backend

### ⚠️ Trabajo Pendiente
1. **CRÍTICO:** Crear `TRM_DuplicateDetectionApi.cls`
2. **IMPORTANTE:** Implementar lógica de matching
3. **NECESARIO:** Integrar componentes en Bill Review
4. **RECOMENDADO:** Agregar a validación de adjudication

### 🎯 Esfuerzo Estimado
- **Backend (Apex):** 5-8 días
- **Frontend (Integration):** 3-5 días
- **Testing & QA:** 2-3 días
- **TOTAL:** 10-16 días (2-3 sprints)

---

**Próximo Paso:** Obtener aprobación para crear `TRM_DuplicateDetectionApi.cls` y comenzar implementación.


