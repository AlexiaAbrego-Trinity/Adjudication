# MVADM-185: Duplicate Detection Implementation
## BCN/Quote – Validate Duplicate & Likely Duplicate Charge Detection

**Ticket:** [MVADM-185](https://medivest.atlassian.net/browse/MVADM-185)  
**Investigador:** Alexia Abrego  
**Fecha de Investigación:** 2026-01-16  
**Estado:** ✅ Investigación Completa - Listo para Implementación

---

## 📚 DOCUMENTACIÓN DISPONIBLE

### 1. 📄 Executive Summary
**Archivo:** `MVADM-185_EXECUTIVE_SUMMARY.md`

**Contenido:**
- Resumen ejecutivo de hallazgos
- Valor de negocio
- Esfuerzo y timeline estimado
- Experiencia de usuario (antes/después)
- Recomendación final

**Audiencia:** Product Owners, Stakeholders, Management

---

### 2. 🔍 Investigation Report
**Archivo:** `MVADM-185_DUPLICATE_DETECTION_INVESTIGATION.md`

**Contenido:**
- Hallazgos principales
- Componentes existentes (LWC, campos, etc.)
- Componentes faltantes (Apex class)
- Propuesta de solución detallada
- Comparación: Lo que existe vs lo que falta
- Plan de implementación por sprints
- Mockups y visualizaciones

**Audiencia:** Developers, Tech Leads, Architects

---

### 3. 💻 Implementation Examples
**Archivo:** `MVADM-185_IMPLEMENTATION_EXAMPLES.md`

**Contenido:**
- Estructura completa de `TRM_DuplicateDetectionApi.cls`
- Wrapper classes (DuplicateData, MatchRecord, etc.)
- Lógica de matching (exacto vs potencial)
- Métodos @AuraEnabled con ejemplos
- Test class completo
- Notas de implementación
- Formato de JSON storage

**Audiencia:** Developers (implementación directa)

---

### 4. ✅ Implementation Checklist
**Archivo:** `MVADM-185_IMPLEMENTATION_CHECKLIST.md`

**Contenido:**
- Checklist detallado por sprint
- Pre-implementation checklist
- Sprint 1: Backend Apex (5-8 días)
- Sprint 2: Frontend Integration (3-5 días)
- Sprint 3: Validation & Refinement (2-3 días)
- Testing matrix
- Post-deployment monitoring
- Rollback plan
- Definition of done

**Audiencia:** Developers, QA, Project Managers

---

## 🎯 QUICK START GUIDE

### Para Product Owners / Stakeholders

1. **Leer primero:** `MVADM-185_EXECUTIVE_SUMMARY.md`
2. **Decisión requerida:** Aprobar implementación (10-16 días de esfuerzo)
3. **Valor esperado:** Prevención de pagos duplicados, mejora de calidad

### Para Developers

1. **Leer primero:** `MVADM-185_DUPLICATE_DETECTION_INVESTIGATION.md`
2. **Referencia de código:** `MVADM-185_IMPLEMENTATION_EXAMPLES.md`
3. **Seguir:** `MVADM-185_IMPLEMENTATION_CHECKLIST.md`
4. **Comenzar con:** Sprint 1 - Crear `TRM_DuplicateDetectionApi.cls`

### Para QA / Testers

1. **Leer:** `MVADM-185_IMPLEMENTATION_CHECKLIST.md` (sección Testing Matrix)
2. **Preparar:** Datos de prueba según escenarios
3. **Ejecutar:** Testing de aceptación con Claims team

---

## 🚀 RESUMEN DE IMPLEMENTACIÓN

### Estado Actual: 70% Completo

✅ **Ya Existe:**
- Campos en `Bill_Line_Item__c` (Duplicate_Status__c, Matching_Records__c, Last_Duplicate_Check__c)
- Componente LWC `trmDuplicateTriangle` (indicador visual)
- Componente LWC `trmBillDuplicateSummary` (resumen a nivel Bill)
- Columna de duplicados en `customBillLineItemGrid`

❌ **Falta:**
- Clase Apex `TRM_DuplicateDetectionApi.cls` (backend completo)
- Integración activa de componentes LWC en el grid
- Verificación automática al crear line items
- Integración en `TRM_ValidationService`

### Trabajo Requerido: 30% Restante

**Fase 1:** Crear backend Apex (5-8 días)
**Fase 2:** Integrar frontend (3-5 días)
**Fase 3:** Validación y refinamiento (2-3 días)

**Total:** 10-16 días (2-3 sprints)

---

## 📊 DIAGRAMAS DISPONIBLES

### 1. Arquitectura de Componentes
Muestra la relación entre componentes LWC, Apex backend, y Salesforce data.

**Componentes:**
- Bill Review UI (Grid, Triangle, Summary)
- Apex Backend (TRM_DuplicateDetectionApi - FALTA IMPLEMENTAR)
- Salesforce Data (Bill_Line_Item__c fields)
- Validation Layer (TRM_ValidationService)

### 2. Flujo de Detección de Duplicados
Diagrama de secuencia mostrando 4 escenarios:
- Carga inicial de Bill Review
- Crear nuevo line item
- Click en triángulo de duplicado
- Validación pre-adjudication

### 3. Estado Actual vs Estado Futuro
Comparación visual de lo que existe vs lo que se implementará.

---

## 🎨 EXPERIENCIA DE USUARIO

### Indicadores Visuales

**🟢 Triángulo Verde con $**
- Duplicado EXACTO detectado
- 100% confidence
- Todos los campos core coinciden exactamente

**🟡 Triángulo Amarillo**
- Duplicado POTENCIAL detectado
- 60-90% confidence
- 4+ campos coinciden (con tolerancias)

### Interacciones

1. **Click en triángulo** → Abre modal de comparación
2. **Modal muestra:**
   - Registro actual
   - Lista de matches
   - Comparación lado a lado
   - Botón "View Record"
   - Botón "Mark as Reviewed"

3. **Botón "Check for Duplicates"** → Verifica un line item
4. **Botón "Check All Duplicates"** → Verifica todo el Bill

---

## 🔍 LÓGICA DE MATCHING

### Duplicado EXACTO
```
✅ Mismo paciente (Member_Account__c)
✅ Misma fecha (Service_Start_Date__c)
✅ Mismo código (CPT_HCPCS_NDC__c)
✅ Mismo cargo (Charge__c ± $0.01)
✅ Misma cantidad (Quantity__c)
→ Status: 'Exact'
→ Confidence: 100%
```

### Duplicado POTENCIAL
```
✅ Mismo paciente (REQUERIDO)
✅ 4 de 6 campos coinciden:
   - Fecha ±3 días
   - Código de procedimiento
   - Cargo ±5%
   - Cantidad
   - Proveedor
→ Status: 'Potential'
→ Confidence: 60-90%
```

### Ventana de Búsqueda
- 5 años hacia atrás (configurable)
- Máximo 50 matches
- Excluye Bills con Status = 'Deleted'
- Excluye el registro actual

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### Performance
- Indexar campos: `Member_Account__c`, `Service_Start_Date__c`, `CPT_HCPCS_NDC__c`
- Limitar a 50 matches por búsqueda
- Verificación asíncrona para Bills grandes

### Casos Legítimos (NO son duplicados)
- ✅ Múltiples servicios del mismo tipo en un día
- ✅ Diferentes practitioners
- ✅ Reenvío con documentación corregida
- ✅ Disputa de pago (mismo claim, diferente contexto)

**Solución:** Botón "Mark as Reviewed" para silenciar advertencias

### UX/UI
- **NO bloquear** el flujo de adjudication
- Solo advertir visualmente
- Permitir override por usuario
- Mostrar contexto completo en modal

---

## 📝 ARCHIVOS GENERADOS

```
salesforce-project/docs/
├── MVADM-185_README.md                              (este archivo)
├── MVADM-185_EXECUTIVE_SUMMARY.md                   (resumen ejecutivo)
├── MVADM-185_DUPLICATE_DETECTION_INVESTIGATION.md   (investigación detallada)
├── MVADM-185_IMPLEMENTATION_EXAMPLES.md             (código de ejemplo)
└── MVADM-185_IMPLEMENTATION_CHECKLIST.md            (checklist de implementación)
```

---

## 🔗 RECURSOS ADICIONALES

### Componentes Existentes

**LWC:**
- `force-app/main/default/lwc/trmDuplicateTriangle/`
- `force-app/main/default/lwc/trmBillDuplicateSummary/`
- `force-app/main/default/lwc/customBillLineItemGrid/`

**Apex (para referencia):**
- `force-app/main/default/classes/TRM_ValidationService.cls`
- `force-app/main/default/classes/TRM_MedicalBillingService.cls`

### Campos en Salesforce

**Bill_Line_Item__c:**
- `Duplicate_Status__c` (Picklist: None, Exact, Potential)
- `Matching_Records__c` (Long Text Area - JSON)
- `Last_Duplicate_Check__c` (DateTime)

---

## 📞 CONTACTOS

- **Investigador:** Alexia Abrego
- **Ticket:** [MVADM-185](https://medivest.atlassian.net/browse/MVADM-185)
- **Repositorio:** medivest-adjudication

---

## ✅ PRÓXIMOS PASOS

1. **Revisar documentación** con Product Owner y Tech Lead
2. **Obtener aprobación** para implementación
3. **Asignar sprint** y recursos
4. **Comenzar Sprint 1:** Crear `TRM_DuplicateDetectionApi.cls`

---

**Última Actualización:** 2026-01-16  
**Versión:** 1.0  
**Estado:** ✅ Ready for Implementation


