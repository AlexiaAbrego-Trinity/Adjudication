# ❌ FAILURES (ERRORES) IMPLEMENTADOS - Guía Para Dummies

**Fecha:** 2026-01-14  
**Sistema:** Medivest BCN Quote Adjudication  
**Versión:** v2.3.6

---

## 🤔 ¿Qué es un FAILURE (Error)?

Un **FAILURE** (error) es un problema que te dice:

> "ALTO. No puedes continuar hasta que arregles esto."

### Características de los Failures:
- ❌ **SÍ bloquean** el proceso de adjudicación
- 🔴 **Aparecen en rojo** en el reporte
- 🚫 **NO puedes proceder** hasta arreglarlos
- ⚠️ **Son obligatorios** de resolver

---

## 📊 RESUMEN EJECUTIVO

| Categoría | # Reglas | ¿Qué valida? |
|-----------|----------|--------------|
| **BCN-Level** | 6 | Datos del Case (BCN Quote) |
| **Charge-Level** | 2 | Totales de cargos y pagos |
| **Line Item** | 9 | Datos de cada línea de factura |
| **Relational Integrity** | 2 | Relaciones entre registros |
| **TOTAL** | **19 reglas** | - |

---

## 🏢 CATEGORÍA 1: BCN-LEVEL (6 Reglas)

Estas reglas validan el **Case** (BCN Quote) completo.

---

### ❌ RULE 1: BCN Status On Hold

**🆔 ID:** `bcn_status_on_hold`  
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
El Case NO puede estar en status "On Hold".

#### 🎬 Cómo Reproducir:
1. Abre un Case
2. Cambia Status a "On Hold"
3. Click "Validate for Adjudication"
4. ❌ ERROR: "BCN is currently On Hold"

#### ✅ Cómo Arreglar:
Cambia el Status del Case a cualquier otro valor (ej: "Pending Review").

---

### ❌ RULE 2: Previously Adjudicated

**🆔 ID:** `bcn_previously_adjudicated`  
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
El Case NO puede estar ya adjudicado (Status = "Adjudicated" o "Closed").

#### 🎬 Cómo Reproducir:
1. Abre un Case
2. Cambia Status a "Adjudicated"
3. Click "Validate for Adjudication"
4. ❌ ERROR: "BCN has already been adjudicated"

#### ✅ Cómo Arreglar:
Revierte el status del Case a "Pending Review" o "Keying".

---

### ❌ RULE 3: Received Date Required

**🆔 ID:** `bcn_missing_date_received__c`  
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
El campo "Received Date" (Date_Received__c) debe tener un valor.

#### 🎬 Cómo Reproducir:
1. Abre un Case
2. Borra el campo "Received Date"
3. Click "Validate for Adjudication"
4. ❌ ERROR: "Required field missing: Received Date"

#### ✅ Cómo Arreglar:
Llena el campo "Received Date" con la fecha en que se recibió la factura.

---

### ❌ RULE 4: Payee (Entity) Required

**🆔 ID:** `bcn_missing_payee_name__c`  
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
El campo "Payee Name" (Payee_Name__c) debe tener un valor.

#### 🎬 Cómo Reproducir:
1. Abre un Case
2. Borra el campo "Payee Name"
3. Click "Validate for Adjudication"
4. ❌ ERROR: "Required field missing: Payee (Entity)"

#### ✅ Cómo Arreglar:
Llena el campo "Payee Name" con el nombre de quien recibirá el pago.

---

### ❌ RULE 5: Payee Address Required

**🆔 ID:** `bcn_missing_payee_address__c`  
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
El campo "Payee Address" (Payee_Address__c) debe tener un valor.

#### 🎬 Cómo Reproducir:
1. Abre un Case
2. Borra el campo "Payee Address"
3. Click "Validate for Adjudication"
4. ❌ ERROR: "Required field missing: Payee Address"

#### ✅ Cómo Arreglar:
Llena el campo "Payee Address" con la dirección completa del payee.

---

### ❌ RULE 6: Total Claim Charge Required

**🆔 ID:** `bcn_missing_total_claim_charge__c`  
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
El campo "Total Claim Charge" (Total_Claim_charge__c) debe tener un valor mayor a $0.

#### 🎬 Cómo Reproducir:
1. Abre un Case
2. Borra o pon $0 en "Total Claim Charge"
3. Asegúrate que NO haya line items con cargos
4. Click "Validate for Adjudication"
5. ❌ ERROR: "Required field missing: Total Claim Charge"

#### ✅ Cómo Arreglar:
Llena el campo "Total Claim Charge" con el total de la factura.

---

## 💰 CATEGORÍA 2: CHARGE-LEVEL (2 Reglas)

Estas reglas validan los **totales** de cargos y pagos.

---

### ❌ RULE 7: Cumulative Charges Mismatch

**🆔 ID:** `cumulative_charge_mismatch`  
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
La suma de todos los cargos de line items debe ser igual al "Total Claim Charge" (±$0.01 tolerancia).

#### 🎬 Cómo Reproducir:
```
Total Claim Charge: $1,000.00

Line Items:
- Line 1: Charge $500.00
- Line 2: Charge $300.00
Total: $800.00  ← No coincide con $1,000.00

❌ ERROR: "Line item charges ($800.00) do not equal Total Claim Charge ($1,000.00)"
```

#### ✅ Cómo Arreglar:
- Opción 1: Ajusta los line items para que sumen $1,000.00
- Opción 2: Cambia "Total Claim Charge" a $800.00

---

### ❌ RULE 8: Cumulative Payment Exceeds Charge

**🆔 ID:** `cumulative_payment_exceeds_charge`  
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
La suma de todos los pagos NO puede exceder el "Total Claim Charge".

#### 🎬 Cómo Reproducir:
```
Total Claim Charge: $1,000.00

Line Items:
- Line 1: Charge $500, Payment $600
- Line 2: Charge $500, Payment $600
Total Payments: $1,200.00  ← Excede $1,000.00

❌ ERROR: "Total payments ($1,200.00) exceed Total Claim Charge ($1,000.00)"
```

#### ✅ Cómo Arreglar:
Reduce los pagos para que NO excedan $1,000.00 en total.

---

## 📄 CATEGORÍA 3: LINE ITEM (9 Reglas)

Estas reglas validan **cada línea** de la factura.

---

### ❌ RULE 9: Service Dates Required

**🆔 ID:** `line_missing_service_dates`  
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
Cada line item debe tener "Service Start Date" Y "Service End Date".

#### 🎬 Cómo Reproducir:
1. Crea un line item
2. Deja vacío "Service Start Date" o "Service End Date"
3. Click "Validate for Adjudication"
4. ❌ ERROR: "1 line item missing start/end dates"

#### ✅ Cómo Arreglar:
Llena ambas fechas en todos los line items.

---

### ❌ RULE 10: Revenue Code OR CPT/HCPCS/NDC Required

**🆔 ID:** `line_missing_codes`  
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
Cada line item debe tener AL MENOS UNO de estos:
- Revenue Code, O
- CPT/HCPCS/NDC

#### 🎬 Cómo Reproducir:
1. Crea un line item
2. Deja vacíos AMBOS campos: "Revenue Code" Y "CPT/HCPCS/NDC"
3. Click "Validate for Adjudication"
4. ❌ ERROR: "4 line items missing both Revenue Code and CPT/HCPCS/NDC"

#### ✅ Cómo Arreglar:
Llena al menos uno de los dos campos en cada line item.

---

### ❌ RULE 11: Quantity Required

**🆔 ID:** `line_missing_quantity`  
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
Cada line item debe tener un valor en "Quantity".

#### 🎬 Cómo Reproducir:
1. Crea un line item
2. Deja vacío "Quantity"
3. Click "Validate for Adjudication"
4. ❌ ERROR: "1 line item missing quantity"

#### ✅ Cómo Arreglar:
Llena el campo "Quantity" (normalmente es 1).

---

### ❌ RULE 12: Charge Required

**🆔 ID:** `line_missing_charge`  
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
Cada line item debe tener un valor en "Charge".

#### 🎬 Cómo Reproducir:
1. Crea un line item
2. Deja vacío "Charge"
3. Click "Validate for Adjudication"
4. ❌ ERROR: "2 line items missing charge amount"

#### ✅ Cómo Arreglar:
Llena el campo "Charge" con el monto del cargo.

---

### ❌ RULE 13: Negative Charge

**🆔 ID:** `line_negative_charge`  
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
El "Charge" NO puede ser negativo (< 0).

#### 🎬 Cómo Reproducir:
1. Crea un line item
2. Pon "Charge" = -100
3. Click "Validate for Adjudication"
4. ❌ ERROR: "1 line item has negative charge"

#### ✅ Cómo Arreglar:
Cambia el "Charge" a un valor positivo.

---

### ❌ RULE 14: Negative Payment

**🆔 ID:** `line_negative_payment`  
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
El "Approved Amount" (pago) NO puede ser negativo (< 0).

#### 🎬 Cómo Reproducir:
1. Crea un line item
2. Pon "Approved Amount" = -50
3. Click "Validate for Adjudication"
4. ❌ ERROR: "1 line item has negative payment"

#### ✅ Cómo Arreglar:
Cambia el "Approved Amount" a un valor positivo o $0.

---

### ❌ RULE 15: Account Required

**🆔 ID:** `line_missing_account`
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
Cada line item debe tener una "Account" (Member_Account__c) asignada.

#### 🎬 Cómo Reproducir:
1. Crea un line item
2. Deja vacío el campo "Account"
3. Click "Validate for Adjudication"
4. ❌ ERROR: "1 line item missing account assignment"

#### ✅ Cómo Arreglar:
Asigna una cuenta (Member Account) a cada line item.

---

### ❌ RULE 16: Invalid Service Date Range

**🆔 ID:** `line_invalid_service_date_range`
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
La "Service End Date" NO puede ser ANTES de la "Service Start Date".

#### 🎬 Cómo Reproducir:
```
Line Item:
- Service Start Date: 2026-01-15
- Service End Date: 2026-01-10  ← Antes del start date

❌ ERROR: "1 line item has end date before start date"
```

#### ✅ Cómo Arreglar:
Asegúrate que "Service End Date" >= "Service Start Date".

---

### ❌ RULE 17: Remark Code 1 (RC1) Required

**🆔 ID:** `line_missing_rc1`
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
Cada line item debe tener "Remark Code 1" (Remark_Code_1__c).

#### 🎬 Cómo Reproducir:
1. Crea un line item
2. Deja vacío "Remark Code 1"
3. Click "Validate for Adjudication"
4. ❌ ERROR: "4 line items missing RC1"

#### ✅ Cómo Arreglar:
Llena el campo "Remark Code 1" en todos los line items.

---

## 🔗 CATEGORÍA 4: RELATIONAL INTEGRITY (2 Reglas)

Estas reglas validan las **relaciones** entre registros.

---

### ❌ RULE 18: Orphaned Line Items

**🆔 ID:** `relational_orphaned_line_items`
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
Todos los line items deben estar vinculados al Case correcto.

#### 🎬 Cómo Reproducir:
Este error es raro - ocurre si hay un problema de integridad de datos en Salesforce.

#### ✅ Cómo Arreglar:
Contacta al administrador de Salesforce - es un problema técnico.

---

### ❌ RULE 19: Account Mismatch

**🆔 ID:** `relational_account_mismatch`
**❌ Bloquea:** Sí

#### 📝 ¿Qué valida?
Las cuentas (Member_Account__c) asignadas a los line items deben pertenecer al miembro del Case.

#### 🎬 Cómo Reproducir:
```
Case Member: "ABC Corporation"

Line Item:
- Account: "XYZ Insurance"  ← Cuenta que NO pertenece a ABC Corp

❌ ERROR: "Line items have accounts that don't belong to case member"
```

#### ✅ Cómo Arreglar:
Asigna cuentas que pertenezcan al miembro correcto del Case.

---

## 📊 TABLA RESUMEN DE TODAS LAS REGLAS

| # | Rule ID | Nombre | Categoría | Bloquea |
|---|---------|--------|-----------|---------|
| 1 | `bcn_status_on_hold` | Status On Hold | BCN | ❌ Sí |
| 2 | `bcn_previously_adjudicated` | Previously Adjudicated | BCN | ❌ Sí |
| 3 | `bcn_missing_date_received__c` | Received Date Required | BCN | ❌ Sí |
| 4 | `bcn_missing_payee_name__c` | Payee Required | BCN | ❌ Sí |
| 5 | `bcn_missing_payee_address__c` | Payee Address Required | BCN | ❌ Sí |
| 6 | `bcn_missing_total_claim_charge__c` | Total Claim Charge Required | BCN | ❌ Sí |
| 7 | `cumulative_charge_mismatch` | Cumulative Charges Mismatch | Charge | ❌ Sí |
| 8 | `cumulative_payment_exceeds_charge` | Payment Exceeds Total Charge | Charge | ❌ Sí |
| 9 | `line_missing_service_dates` | Service Dates Required | Line Item | ❌ Sí |
| 10 | `line_missing_codes` | Revenue/CPT Code Required | Line Item | ❌ Sí |
| 11 | `line_missing_quantity` | Quantity Required | Line Item | ❌ Sí |
| 12 | `line_missing_charge` | Charge Required | Line Item | ❌ Sí |
| 13 | `line_negative_charge` | Negative Charge | Line Item | ❌ Sí |
| 14 | `line_negative_payment` | Negative Payment | Line Item | ❌ Sí |
| 15 | `line_missing_account` | Account Required | Line Item | ❌ Sí |
| 16 | `line_invalid_service_date_range` | Invalid Date Range | Line Item | ❌ Sí |
| 17 | `line_missing_rc1` | RC1 Required | Line Item | ❌ Sí |
| 18 | `relational_orphaned_line_items` | Orphaned Line Items | Relational | ❌ Sí |
| 19 | `relational_account_mismatch` | Account Mismatch | Relational | ❌ Sí |

---

## 🔍 ¿Cómo se ven en el sistema?

### En el Toast (mensaje emergente):
```
❌ Validation Complete
Found 7 error(s) and 0 warning(s). Click "View Report" to see details.
```

### En el Reporte de Validación:
```
┌─────────────────────────────────────────┐
│ ❌ Validation Failed - Issues Must Be   │
│    Resolved                             │
├─────────────────────────────────────────┤
│ ❌ BCN-Level Requirements (1)           │
│   ✗ Received Date Required              │
│     Required field missing              │
├─────────────────────────────────────────┤
│ ❌ Line Item Requirements (3)           │
│   ✗ Service Dates Required              │
│     4 line items missing start/end dates│
│     Lines: 1, 2, 3, 4                   │
└─────────────────────────────────────────┘

[Close]  [Fix Issues] ← Botón "Proceed" DESHABILITADO
```

---

## ❓ FAQ Para Dummies

**P: ¿Los failures me bloquean?**
R: ✅ SÍ. NO puedes hacer click en "Proceed with Adjudication".

**P: ¿Debo arreglar TODOS los failures?**
R: ✅ SÍ. Todos son obligatorios.

**P: ¿Qué pasa si no arreglo un failure?**
R: El sistema NO te deja proceder con la adjudicación.

**P: ¿Puedo ignorar un failure?**
R: ❌ NO. Son validaciones obligatorias.

**P: ¿Cuántos failures puedo tener?**
R: Puedes tener múltiples failures. Debes arreglarlos TODOS.

---

## 🎯 CHECKLIST RÁPIDO ANTES DE ADJUDICAR

Antes de hacer click en "Validate for Adjudication", verifica:

### ✅ BCN-Level:
- [ ] Status NO es "On Hold" ni "Adjudicated"
- [ ] Received Date está lleno
- [ ] Payee Name está lleno
- [ ] Payee Address está lleno
- [ ] Total Claim Charge > $0

### ✅ Charge-Level:
- [ ] Suma de line items = Total Claim Charge
- [ ] Suma de pagos ≤ Total Claim Charge

### ✅ Line Items (CADA UNO):
- [ ] Service Start Date y End Date llenos
- [ ] Revenue Code O CPT/HCPCS/NDC lleno
- [ ] Quantity lleno
- [ ] Charge lleno y positivo
- [ ] Approved Amount positivo (o $0)
- [ ] Account asignado
- [ ] End Date >= Start Date
- [ ] Remark Code 1 lleno

### ✅ Relational:
- [ ] Todos los line items vinculados al Case
- [ ] Cuentas pertenecen al miembro correcto

---

## 📞 ¿Necesitas Ayuda?

Si ves un failure y no sabes cómo arreglarlo:
1. Lee el mensaje de error completo
2. Revisa esta guía para encontrar la regla
3. Sigue los pasos de "Cómo Arreglar"
4. Si aún tienes dudas, pregunta a tu supervisor

---

**Fin del documento - Failures Implementados**


