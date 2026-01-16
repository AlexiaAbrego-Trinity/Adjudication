# 🔍 MVADM-185: Investigación Frontend - Código Comentado y Deshabilitado

**Fecha:** 2026-01-16  
**Investigador:** Alexia Abrego  
**Objetivo:** Encontrar código comentado o deshabilitado relacionado con duplicate detection

---

## 🎯 HALLAZGOS PRINCIPALES

### ✅ DESCUBRIMIENTO CRÍTICO

**El grid `customBillLineItemGrid` YA TIENE la columna de duplicados implementada**, pero usa un **icono estático simple** en lugar del **componente interactivo `trmDuplicateTriangle`**.

---

## 📍 UBICACIÓN EXACTA DEL CÓDIGO ACTIVO

### 1. **Columna de Duplicados en el Grid** ✅ EXISTE

**Archivo:** `customBillLineItemGrid.html`

#### Header de la Columna (Línea 182-185)
```html
<!-- Duplicate Flag column -->
<th class="slds-text-align_center" scope="col" title="Duplicate Status">
    <lightning-icon icon-name="utility:warning" size="x-small"></lightning-icon>
</th>
```

#### Celda de Datos (Línea 489-499)
```html
<!-- Duplicate Flag -->
<td class="slds-text-align_center duplicate-flag-cell">
    <template if:true={item.isDuplicate}>
        <lightning-icon
            icon-name="utility:warning"
            size="small"
            variant="warning"
            title={item.duplicateStatusLabel}>
        </lightning-icon>
    </template>
</td>
```

**Estado:** ✅ **ACTIVO** - Muestra icono de warning amarillo simple

---

### 2. **Lógica JavaScript de Duplicados** ✅ EXISTE

**Archivo:** `customBillLineItemGrid.js`

#### Procesamiento de Datos (Líneas 814-817)
```javascript
// Duplicate detection flag
isDuplicate: item.Duplicate_Status__c && item.Duplicate_Status__c !== 'None',
duplicateStatus: item.Duplicate_Status__c,
duplicateStatusLabel: this.getDuplicateStatusLabel(item.Duplicate_Status__c),
```

#### Helper Method (Líneas 369-378)
```javascript
getDuplicateStatusLabel(status) {
    switch(status) {
        case 'Potential':
            return 'Potential Duplicate';
        case 'Exact':
            return 'Exact Duplicate';
        default:
            return '';
    }
}
```

**Estado:** ✅ **ACTIVO** - Procesa correctamente el campo `Duplicate_Status__c`

---

### 3. **Validación de Duplicados en Bill Review** ✅ EXISTE

**Archivo:** `customBillLineItemGrid.js` (Líneas 2844-2865)

```javascript
// YELLOW LINE: Check for potential duplicate procedures
const procedureCounts = {};
this.lineItems.forEach(item => {
    const key = `${item.CPT_HCPCS_NDC__c}_${item.Charge__c}`;
    if (!procedureCounts[key]) {
        procedureCounts[key] = [];
    }
    procedureCounts[key].push(item);
});

Object.values(procedureCounts).forEach(items => {
    if (items.length > 1) {
        yellowLineWarnings.push({
            ruleId: 'duplicate_procedures',
            ruleName: 'Potential Duplicate Procedures',
            severity: 'warning',
            message: `Lines ${items.map(i => '#' + i.Bill_Line_Item_Number__c).join(' and ')} both have procedure ${items[0].CPT_HCPCS_NDC__c} with $${items[0].Charge__c} charge`,
            affectedLineItems: items.map(i => i.Bill_Line_Item_Number__c).join(', '),
            details: 'May be legitimate multiple administrations or potential duplicate - review for accuracy'
        });
    }
});
```

**Estado:** ✅ **ACTIVO** - Genera warnings en validación pre-adjudication

---

## 🔄 COMPARACIÓN: Implementación Actual vs. Objetivo

### ACTUAL (Icono Estático)
```html
<td class="slds-text-align_center duplicate-flag-cell">
    <template if:true={item.isDuplicate}>
        <lightning-icon
            icon-name="utility:warning"
            size="small"
            variant="warning"
            title={item.duplicateStatusLabel}>
        </lightning-icon>
    </template>
</td>
```

**Limitaciones:**
- ❌ No es clickeable
- ❌ No muestra modal de comparación
- ❌ No permite "Check for Duplicates" manual
- ❌ No distingue entre Exact vs. Potential (ambos son amarillos)

---

### OBJETIVO (Componente Interactivo)
```html
<td class="slds-text-align_center duplicate-flag-cell">
    <c-trm-duplicate-triangle
        record-id={item.Id}
        if:true={item.Id}>
    </c-trm-duplicate-triangle>
</td>
```

**Ventajas:**
- ✅ Clickeable - abre modal de comparación
- ✅ Botón "Check for Duplicates" manual
- ✅ Triángulo verde con $ para Exact matches
- ✅ Triángulo amarillo para Potential matches
- ✅ Muestra detalles de matching records
- ✅ Navegación a records duplicados

---

## 🚨 COMPONENTES OBSOLETOS ENCONTRADOS

### `duplicateTriangle` (Versión Antigua) ⚠️

**Ubicación:** `force-app/main/default/lwc/duplicateTriangle/`

**Diferencias con `trmDuplicateTriangle`:**

| Característica | `duplicateTriangle` (OLD) | `trmDuplicateTriangle` (NEW) |
|----------------|---------------------------|------------------------------|
| Apex Class | `BillLineItemDuplicateHandler` ❌ | `TRM_DuplicateDetectionApi` ✅ |
| API Version | 59.0 | 64.0 |
| Architecture | Legacy | Trinity-aligned |
| Modal | TODO comment (línea 99) | ✅ Implementado |
| Estado | ⚠️ Obsoleto | ✅ Actual |

**Código de `duplicateTriangle.js` (Línea 3):**
```javascript
import getDuplicateData from '@salesforce/apex/BillLineItemDuplicateHandler.getDuplicateData';
```

**❌ PROBLEMA:** Esta clase `BillLineItemDuplicateHandler` **NO EXISTE** en el sandbox.

**Código de `duplicateTriangle.js` (Líneas 98-101):**
```javascript
openComparisonModal(matches) {
    // TODO: Implement comparison modal for multiple matches
    console.log('Opening comparison modal for matches:', matches);
}
```

**❌ PROBLEMA:** Modal no implementado (solo TODO comment).

---

## 📊 RESUMEN DE COMPONENTES LWC

| Componente | Estado | Backend | Modal | Uso Recomendado |
|------------|--------|---------|-------|-----------------|
| `duplicateTriangle` | ⚠️ Obsoleto | ❌ `BillLineItemDuplicateHandler` (no existe) | ❌ TODO | **NO USAR** |
| `trmDuplicateTriangle` | ✅ Actual | ✅ `TRM_DuplicateDetectionApi` | ✅ Implementado | **USAR ESTE** |
| `trmBillDuplicateSummary` | ✅ Actual | ✅ `TRM_DuplicateDetectionApi` | ✅ Implementado | **USAR ESTE** |
| `trmDuplicateComparisonModal` | ✅ Actual | ✅ Usado por `trmDuplicateTriangle` | N/A | **Soporte** |
| `trmCaseDuplicateSummary` | ✅ Actual | ✅ `TRM_DuplicateDetectionApi` | ✅ Implementado | **USAR ESTE** |
| `trmCaseAllDuplicatesModal` | ✅ Actual | ✅ Usado por `trmCaseDuplicateSummary` | N/A | **Soporte** |

---

## 🎯 ACCIÓN REQUERIDA: Reemplazar Icono con Componente

### Cambio Mínimo Requerido

**Archivo:** `customBillLineItemGrid.html` (Línea 489-499)

**ANTES:**
```html
<!-- Duplicate Flag -->
<td class="slds-text-align_center duplicate-flag-cell">
    <template if:true={item.isDuplicate}>
        <lightning-icon
            icon-name="utility:warning"
            size="small"
            variant="warning"
            title={item.duplicateStatusLabel}>
        </lightning-icon>
    </template>
</td>
```

**DESPUÉS:**
```html
<!-- Duplicate Flag -->
<td class="slds-text-align_center duplicate-flag-cell">
    <c-trm-duplicate-triangle
        record-id={item.Id}
        if:true={item.Id}>
    </c-trm-duplicate-triangle>
</td>
```

**Notas:**
- ✅ No requiere cambios en JavaScript
- ✅ `isDuplicate`, `duplicateStatus`, `duplicateStatusLabel` ya se calculan correctamente
- ✅ El componente `trmDuplicateTriangle` maneja su propia lógica de display
- ✅ Condición `if:true={item.Id}` previene mostrar en draft row

---

## ✅ CONCLUSIONES

1. **La columna de duplicados YA EXISTE** en el grid
2. **La lógica de procesamiento YA FUNCIONA** correctamente
3. **Solo falta reemplazar el icono estático** con el componente interactivo
4. **El componente `trmDuplicateTriangle` está listo** para usar
5. **El backend `TRM_DuplicateDetectionApi` está completo** y funcional
6. **Componente obsoleto `duplicateTriangle`** debe ser ignorado/eliminado

---

## 📝 PRÓXIMOS PASOS

1. ✅ Reemplazar icono en `customBillLineItemGrid.html` (5 minutos)
2. ✅ Testing en Sandbox (30 minutos)
3. ✅ Deploy a Production (1 día)

**Tiempo total estimado:** 1 día (vs. 5-8 días originales)

---

**Preparado por:** Alexia Abrego  
**Fecha:** 2026-01-16

