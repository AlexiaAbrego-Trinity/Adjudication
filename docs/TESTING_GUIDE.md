# 🧪 GUÍA DE TESTING - Validaciones BCN Quote

**Fecha:** 2026-01-14  
**Sistema:** Medivest BCN Quote Adjudication  
**Versión:** v2.3.6

---

## 🎯 OBJETIVO

Esta guía te ayuda a **probar todas las validaciones** del sistema para asegurarte que funcionan correctamente.

---

## 🛠️ SETUP INICIAL

### Prerequisitos:

1. Acceso a Salesforce sandbox (eobbcnb)
2. Permisos para crear/editar Cases y Bill Line Items
3. Un Case de tipo "BCN Quote" en status "Keying" o "Pending Review"

### Crear un Case de Prueba:

```
1. Ir a Cases → New
2. Record Type: BCN Quote
3. Llenar campos mínimos:
   - Status: Keying
   - Date Received: Hoy
   - Payee Name: Test Payee
   - Payee Address: 123 Test St
   - Total Claim Charge: $1,000.00
4. Save
```

---

## ✅ TESTING WARNINGS (2 Reglas)

### ⚠️ TEST 1: Payment Exceeds Individual Charge

**Objetivo:** Verificar que aparece warning cuando pago > cargo en un line item.

**Pasos:**
1. Abre tu Case de prueba
2. Crea un Bill Line Item:
   ```
   Service Start Date: 2026-01-01
   Service End Date: 2026-01-01
   Revenue Code: 0450
   Quantity: 1
   Charge: 100.00
   Approved Amount: 150.00  ← Mayor que cargo
   Account: [Cualquier cuenta]
   Remark Code 1: N123
   ```
3. Save
4. Click "Validate for Adjudication"

**Resultado Esperado:**
- ✅ Toast: "Found 0 error(s) and 1 warning(s)"
- ✅ Modal: Sección "⚠️ Warnings (Non-blocking) (1)"
- ✅ Warning: "Payment Exceeds Individual Charge"
- ✅ Botón "Proceed with Adjudication" HABILITADO

**Cómo Arreglar:**
- Cambia Approved Amount a 100 o menos
- O déjalo si es intencional (lump-sum)

---

### ⚠️ TEST 2: Account Payment Exceeds Balance

**Objetivo:** Verificar que aparece warning cuando pagos de cuenta > balance.

**Pasos:**
1. Encuentra una Member Account con balance conocido:
   ```sql
   SELECT Id, Name, BalanceAccrued__c 
   FROM Member_Account__c 
   WHERE BalanceAccrued__c > 0 
   LIMIT 1
   ```
   Ejemplo: Account "ABC" tiene $500 de balance

2. Crea 2 Bill Line Items asignados a esa cuenta:
   ```
   Line Item 1:
   - Account: ABC
   - Charge: 300
   - Approved Amount: 300
   - [Otros campos requeridos]
   
   Line Item 2:
   - Account: ABC
   - Charge: 300
   - Approved Amount: 400  ← Total = $700 > $500
   - [Otros campos requeridos]
   ```

3. Click "Validate for Adjudication"

**Resultado Esperado:**
- ✅ Toast: "Found 0 error(s) and 1 warning(s)"
- ✅ Modal: Warning "Account Payment Exceeds Balance"
- ✅ Mensaje: "Payments from ABC ($700.00) exceed accrued balance ($500.00)"
- ✅ Botón "Proceed" HABILITADO

**Cómo Arreglar:**
- Reduce los pagos a $500 total
- O déjalo si hay fondos adicionales confirmados

---

## ❌ TESTING FAILURES - BCN LEVEL (6 Reglas)

### ❌ TEST 3: BCN Status On Hold

**Pasos:**
1. Abre tu Case
2. Cambia Status a "On Hold"
3. Save
4. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Toast: "Found 1 error(s)"
- ❌ Modal: "BCN is currently On Hold"
- ❌ Botón "Proceed" DESHABILITADO

---

### ❌ TEST 4: Previously Adjudicated

**Pasos:**
1. Abre tu Case
2. Cambia Status a "Adjudicated"
3. Save
4. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "BCN has already been adjudicated"

---

### ❌ TEST 5: Received Date Required

**Pasos:**
1. Abre tu Case
2. Borra "Date Received"
3. Save
4. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "Required field missing: Received Date"

---

### ❌ TEST 6: Payee Required

**Pasos:**
1. Abre tu Case
2. Borra "Payee Name"
3. Save
4. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "Required field missing: Payee (Entity)"

---

### ❌ TEST 7: Payee Address Required

**Pasos:**
1. Abre tu Case
2. Borra "Payee Address"
3. Save
4. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "Required field missing: Payee Address"

---

### ❌ TEST 8: Total Claim Charge Required

**Pasos:**
1. Abre tu Case
2. Pon "Total Claim Charge" = 0
3. Asegúrate que NO haya line items con cargos
4. Save
5. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "Required field missing: Total Claim Charge"

---

## ❌ TESTING FAILURES - CHARGE LEVEL (2 Reglas)

### ❌ TEST 9: Cumulative Charges Mismatch

**Pasos:**
1. Abre tu Case
2. Pon "Total Claim Charge" = $1,000.00
3. Crea line items que sumen diferente:
   ```
   Line 1: Charge $500
   Line 2: Charge $300
   Total: $800  ← No coincide con $1,000
   ```
4. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "Line item charges ($800.00) do not equal Total Claim Charge ($1,000.00)"
- ❌ Details: "Difference: $200.00"

---

### ❌ TEST 10: Cumulative Payment Exceeds Charge

**Pasos:**
1. Abre tu Case
2. Total Claim Charge = $1,000.00
3. Crea line items con pagos que excedan:
   ```
   Line 1: Charge $500, Payment $700
   Line 2: Charge $500, Payment $600
   Total Payments: $1,300  ← Excede $1,000
   ```
4. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "Total payments ($1,300.00) exceed Total Claim Charge ($1,000.00)"
- ❌ Details: "Overpayment: $300.00"

---

## ❌ TESTING FAILURES - LINE ITEM (9 Reglas)

### ❌ TEST 11: Service Dates Required

**Pasos:**
1. Crea un line item
2. Deja vacío "Service Start Date" o "Service End Date"
3. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "1 line item missing start/end dates"

---

### ❌ TEST 12: Revenue Code OR CPT Required

**Pasos:**
1. Crea un line item
2. Deja vacíos AMBOS: "Revenue Code" Y "CPT/HCPCS/NDC"
3. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "1 line item missing both Revenue Code and CPT/HCPCS/NDC"

---

### ❌ TEST 13: Quantity Required

**Pasos:**
1. Crea un line item
2. Deja vacío "Quantity"
3. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "1 line item missing quantity"

---

### ❌ TEST 14: Charge Required

**Pasos:**
1. Crea un line item
2. Deja vacío "Charge"
3. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "1 line item missing charge amount"

---

### ❌ TEST 15: Negative Charge

**Pasos:**
1. Crea un line item
2. Pon "Charge" = -100
3. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "1 line item has negative charge"

---

### ❌ TEST 16: Negative Payment

**Pasos:**
1. Crea un line item
2. Pon "Approved Amount" = -50
3. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "1 line item has negative payment"

---

### ❌ TEST 17: Account Required

**Pasos:**
1. Crea un line item
2. Deja vacío "Account"
3. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "1 line item missing account assignment"

---

### ❌ TEST 18: Invalid Service Date Range

**Pasos:**
1. Crea un line item
2. Pon:
   ```
   Service Start Date: 2026-01-15
   Service End Date: 2026-01-10  ← Antes del start
   ```
3. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "1 line item has end date before start date"

---

### ❌ TEST 19: Remark Code 1 Required

**Pasos:**
1. Crea un line item
2. Deja vacío "Remark Code 1"
3. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "1 line item missing RC1"

---

## ❌ TESTING FAILURES - RELATIONAL (2 Reglas)

### ❌ TEST 20: Orphaned Line Items

**Nota:** Este error es difícil de reproducir manualmente - requiere corrupción de datos.

**Cómo Simular (Apex):**
```apex
// Crear line item sin Case
Bill_Line_Item__c orphan = new Bill_Line_Item__c(
    Case__c = null,  // Sin Case
    Charge__c = 100
);
insert orphan;
```

**Resultado Esperado:**
- ❌ Error: "Line items are not properly linked to BCN"

---

### ❌ TEST 21: Account Mismatch

**Nota:** Este error requiere configuración específica de Member Accounts.

**Pasos:**
1. Identifica el Member del Case
2. Encuentra una cuenta que NO pertenezca a ese Member
3. Asigna esa cuenta a un line item
4. Click "Validate for Adjudication"

**Resultado Esperado:**
- ❌ Error: "Line items have accounts that don't belong to case member"

---

## 🎯 TEST COMPLETO - HAPPY PATH

**Objetivo:** Verificar que un Case válido pasa todas las validaciones.

**Setup:**
```
Case:
- Status: Keying
- Date Received: 2026-01-14
- Payee Name: Test Hospital
- Payee Address: 123 Main St, City, ST 12345
- Total Claim Charge: $1,000.00

Line Item 1:
- Service Start Date: 2026-01-01
- Service End Date: 2026-01-01
- Revenue Code: 0450
- Quantity: 1
- Charge: 500.00
- Approved Amount: 400.00
- Account: [Valid account]
- Remark Code 1: N123

Line Item 2:
- Service Start Date: 2026-01-02
- Service End Date: 2026-01-02
- CPT/HCPCS/NDC: 99213
- Quantity: 1
- Charge: 500.00
- Approved Amount: 500.00
- Account: [Valid account]
- Remark Code 1: N456

Total Charges: $1,000.00 ✓
Total Payments: $900.00 ✓
```

**Resultado Esperado:**
- ✅ Toast: "Found 0 error(s) and 0 warning(s)"
- ✅ Modal: "✅ Validation Passed"
- ✅ Sección: "Passed Validation Rules (19)"
- ✅ Botón "Proceed with Adjudication" HABILITADO

---

## 🧪 TEST COMPLETO - MIXED SCENARIO

**Objetivo:** Verificar que el sistema maneja múltiples errores y warnings.

**Setup:**
```
Case:
- Status: Keying
- Date Received: [VACÍO]  ← ERROR
- Payee Name: Test Hospital
- Payee Address: Test Address
- Total Claim Charge: $1,000.00

Line Item 1:
- Service Start Date: [VACÍO]  ← ERROR
- Service End Date: 2026-01-01
- Revenue Code: 0450
- Quantity: 1
- Charge: 600.00
- Approved Amount: 800.00  ← WARNING (pago > cargo)
- Account: [Valid account]
- Remark Code 1: N123

Line Item 2:
- Service Start Date: 2026-01-02
- Service End Date: 2026-01-02
- Revenue Code: [VACÍO]
- CPT/HCPCS/NDC: [VACÍO]  ← ERROR
- Quantity: 1
- Charge: 400.00
- Approved Amount: 300.00
- Account: [Valid account]
- Remark Code 1: N456

Total Charges: $1,000.00 ✓
Total Payments: $1,100.00  ← ERROR (excede total)
```

**Resultado Esperado:**
- ❌ Toast: "Found 4 error(s) and 1 warning(s)"
- ❌ Modal: "Validation Failed - Issues Must Be Resolved"
- ❌ BCN-Level Failures (1): Received Date Required
- ❌ Charge-Level Failures (1): Payment Exceeds Total Charge
- ❌ Line Item Failures (2): Service Dates Required, Revenue/CPT Required
- ⚠️ Warnings (1): Payment Exceeds Individual Charge
- ❌ Botón "Proceed" DESHABILITADO

---

## 📊 CHECKLIST DE TESTING

Usa este checklist para verificar que todas las validaciones funcionan:

### ✅ Warnings (2):
- [ ] Payment Exceeds Individual Charge
- [ ] Account Payment Exceeds Balance

### ✅ BCN-Level Failures (6):
- [ ] Status On Hold
- [ ] Previously Adjudicated
- [ ] Received Date Required
- [ ] Payee Required
- [ ] Payee Address Required
- [ ] Total Claim Charge Required

### ✅ Charge-Level Failures (2):
- [ ] Cumulative Charges Mismatch
- [ ] Cumulative Payment Exceeds Charge

### ✅ Line Item Failures (9):
- [ ] Service Dates Required
- [ ] Revenue Code OR CPT Required
- [ ] Quantity Required
- [ ] Charge Required
- [ ] Negative Charge
- [ ] Negative Payment
- [ ] Account Required
- [ ] Invalid Service Date Range
- [ ] Remark Code 1 Required

### ✅ Relational Failures (2):
- [ ] Orphaned Line Items
- [ ] Account Mismatch

### ✅ Integration Tests:
- [ ] Happy Path (todo válido)
- [ ] Mixed Scenario (errores + warnings)
- [ ] UI muestra errores correctamente
- [ ] UI muestra warnings correctamente
- [ ] Botón "Proceed" se habilita/deshabilita correctamente

---

## 🐛 DEBUGGING TIPS

### Si un test falla:

1. **Abre la consola del navegador (F12)**
2. **Busca logs de TRINITY:**
   ```javascript
   TRINITY DEBUG - Warnings Array: [...]
   TRINITY DEBUG - Has Warnings: true
   TRINITY: Failed Rule IDs: [...]
   ```

3. **Verifica el resultado de Apex:**
   - Abre Developer Console
   - Debug Logs
   - Busca: `TRM_ValidationService`

4. **Verifica el modal:**
   - ¿Aparecen las secciones correctas?
   - ¿Los contadores son correctos?
   - ¿El botón "Proceed" está en el estado correcto?

### Problemas Comunes:

| Problema | Causa | Solución |
|----------|-------|----------|
| Warning no aparece | No se separó del array de failures | Verifica líneas 38-67 en TRM_ValidationService.cls |
| Botón "Proceed" deshabilitado con solo warnings | `canProceed` incluye warnings | Verifica líneas 58-63 en TRM_ValidationService.cls |
| Sección de warnings no aparece | `hasWarnings` getter falla | Verifica validationReportModal.js |
| Contadores incorrectos | Duplicados en arrays | Verifica separación de warnings |

---

## 📞 SOPORTE

**Documentación:**
- `FAILURES_IMPLEMENTED.md` - Lista completa de errores
- `WARNINGS_IMPLEMENTED.md` - Lista completa de warnings
- `VALIDATION_SUMMARY.md` - Resumen ejecutivo

**Código:**
- Backend: `TRM_ValidationService.cls`
- Frontend: `validationReportModal` LWC
- Tests: `TRM_ValidationServiceTest.cls`

**Preguntas:**
- Reporta bugs en Jira
- Contacta al equipo de desarrollo

---

**Fin del documento - Guía de Testing**


