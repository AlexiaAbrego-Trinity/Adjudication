# ⚠️ WARNINGS IMPLEMENTADOS - Guía Para Dummies

**Fecha:** 2026-01-14  
**Sistema:** Medivest BCN Quote Adjudication  
**Versión:** v2.3.6

---

## 🤔 ¿Qué es un WARNING?

Un **WARNING** (advertencia) es una alerta que te dice:

> "Oye, esto se ve raro, pero no te voy a bloquear. Revísalo y decide si está bien o no."

### Características de los Warnings:
- ✅ **NO bloquean** el proceso de adjudicación
- ⚠️ **Aparecen en amarillo** en el reporte
- 🔔 **Te avisan** de algo que puede ser intencional o un error
- 🚀 **Puedes proceder** con "Proceed with Adjudication"

---

## 📋 WARNINGS IMPLEMENTADOS (2 Total)

---

### ⚠️ WARNING #1: Payment Exceeds Individual Charge

**🏷️ Nombre Técnico:** `line_payment_exceeds_charge`  
**📂 Categoría:** Line Item (Línea de factura)  
**🎯 ¿Qué detecta?** Un line item tiene un pago mayor que su cargo

#### 🧐 ¿Por qué es WARNING y no ERROR?

Porque **Medicare hace pagos lump-sum** (pagos en bloque). Ejemplo:

```
Factura de $10,000 con 3 líneas:
- Línea 1: Cargo $500   → Pago $6,500  ← Parece raro, pero es válido
- Línea 2: Cargo $3,000 → Pago $0
- Línea 3: Cargo $6,500 → Pago $0
─────────────────────────────────────
Total:      Cargo $10,000 → Pago $6,500  ← Total OK
```

Medicare pagó todo en la primera línea. Es raro, pero **legítimo**.

#### 📝 Ejemplo Simple:

```
Line Item #5:
- Cargo (Charge__c): $100.00
- Pago Aprobado (Approved_Amount__c): $150.00

⚠️ WARNING: "El pago ($150) es mayor que el cargo ($100)"
```

#### 🎬 Cómo Reproducir:

1. Abre un Case (BCN Quote)
2. Edita un line item:
   - Charge: `100`
   - Approved Amount: `150`
3. Guarda
4. Click "Validate for Adjudication"
5. Verás: ⚠️ "1 warning(s)"
6. Click "View Report"
7. Verás sección amarilla: "Warnings (Non-blocking)"

#### ✅ ¿Cuándo está bien ignorarlo?

- Medicare/Medicaid lump-sum payments
- Ajustes de facturación consolidados
- Pagos que cubren múltiples líneas

#### ❌ ¿Cuándo debes arreglarlo?

- Error de captura (escribiste $150 en lugar de $15)
- Pago duplicado por error
- El total de pagos también excede el total de cargos

---

### ⚠️ WARNING #2: Account Payment Exceeds Balance

**🏷️ Nombre Técnico:** `account_payment_exceeds_balance`  
**📂 Categoría:** Charge Level (Nivel de cargos/cuentas)  
**🎯 ¿Qué detecta?** Los pagos de una cuenta exceden su balance disponible

#### 🧐 ¿Por qué es WARNING y no ERROR?

Porque pueden haber **fondos adicionales** que aún no se reflejan en el sistema, o puede ser un **ajuste legítimo**.

#### 📝 Ejemplo Simple:

```
Cuenta: "ABC Insurance"
- Balance Disponible (BalanceAccrued__c): $500.00

Line Items asignados a ABC Insurance:
- Line 1: Pago $300.00
- Line 2: Pago $400.00
─────────────────────
Total pagos: $700.00

⚠️ WARNING: "Pagos ($700) exceden balance ($500) por $200"
```

#### 🎬 Cómo Reproducir:

1. Encuentra una cuenta con balance conocido:
   - Ejemplo: "XYZ Corp" tiene $500 de balance
2. Crea line items asignados a esa cuenta:
   - Line 1: Account = XYZ Corp, Approved Amount = $300
   - Line 2: Account = XYZ Corp, Approved Amount = $400
3. Total = $700 (excede $500)
4. Click "Validate for Adjudication"
5. Verás: ⚠️ "1 warning(s)"

#### ✅ ¿Cuándo está bien ignorarlo?

- Hay fondos adicionales que se depositarán pronto
- Es un ajuste aprobado por finanzas
- La cuenta tiene crédito extendido

#### ❌ ¿Cuándo debes arreglarlo?

- No hay fondos adicionales confirmados
- Es un error de asignación de cuenta
- Debes reasignar pagos a otra cuenta

---

## 🎯 RESUMEN RÁPIDO

| # | Warning | ¿Qué significa? | ¿Puedo proceder? |
|---|---------|-----------------|------------------|
| 1 | Payment Exceeds Individual Charge | Un line item tiene pago > cargo | ✅ Sí |
| 2 | Account Payment Exceeds Balance | Pagos de cuenta > balance disponible | ✅ Sí |

---

## 🔍 ¿Cómo se ven en el sistema?

### En el Toast (mensaje emergente):
```
⚠️ Validation Complete
Found 0 error(s) and 1 warning(s). Click "View Report" to see details.
```

### En el Reporte de Validación:
```
┌─────────────────────────────────────────┐
│ ⚠️ Warnings (Non-blocking) (1)          │
├─────────────────────────────────────────┤
│ ⚠ Payment Exceeds Individual Charge    │
│   1 line item has approved amounts      │
│   exceeding individual charges          │
│   Lines: 5                              │
└─────────────────────────────────────────┘

[Close]  [Proceed with Adjudication] ← Botón habilitado
```

---

## ❓ FAQ Para Dummies

**P: ¿Los warnings me bloquean?**  
R: ❌ NO. Puedes hacer click en "Proceed with Adjudication".

**P: ¿Debo arreglar los warnings?**  
R: Depende. Revisa si es intencional o un error.

**P: ¿Qué pasa si ignoro un warning?**  
R: El sistema te deja proceder. Tú decides si es correcto.

**P: ¿Cómo sé si un warning es serio?**  
R: Lee el mensaje y los detalles. Si no estás seguro, pregunta a tu supervisor.

---

## 📞 ¿Necesitas Ayuda?

Si ves un warning y no sabes qué hacer:
1. Lee el mensaje completo
2. Revisa los line items afectados
3. Pregunta a tu supervisor o al equipo de finanzas
4. Documenta tu decisión

---

**Fin del documento - Warnings Implementados**

