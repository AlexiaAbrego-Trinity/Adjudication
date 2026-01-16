# MVADM-185: Implementation Checklist
## BCN/Quote – Validate Duplicate & Likely Duplicate Charge Detection

**Ticket:** MVADM-185  
**Assignee:** Alexia Abrego  
**Sprint:** TBD  
**Estimated Effort:** 10-16 días (2-3 sprints)

---

## 📋 PRE-IMPLEMENTATION CHECKLIST

### ✅ Verificaciones Completadas

- [x] Investigación de componentes existentes
- [x] Verificación de campos en Bill_Line_Item__c
- [x] Análisis de componentes LWC (trmDuplicateTriangle, trmBillDuplicateSummary)
- [x] Identificación de clase Apex faltante (TRM_DuplicateDetectionApi)
- [x] Documentación de arquitectura actual
- [x] Propuesta de solución completa

### ⏳ Pendiente de Aprobación

- [ ] Revisión de propuesta con Claims team
- [ ] Aprobación de lógica de matching (exacto vs potencial)
- [ ] Confirmación de umbrales (tolerancia de cargo, ventana de fechas)
- [ ] Aprobación de plan de implementación
- [ ] Asignación de sprint y recursos

---

## 🚀 SPRINT 1: BACKEND APEX (5-8 días)

### Fase 1.1: Crear Estructura de Clase (1 día)

- [ ] Crear archivo `TRM_DuplicateDetectionApi.cls`
- [ ] Definir wrapper classes:
  - [ ] `DuplicateData`
  - [ ] `MatchRecord`
  - [ ] `SourceRecord`
  - [ ] `Configuration`
  - [ ] `BillDuplicateSummary`
  - [ ] `DuplicateLineItem`
  - [ ] `MatchScore` (private)
- [ ] Agregar comentarios de documentación
- [ ] Commit inicial: "MVADM-185: Create TRM_DuplicateDetectionApi skeleton"

**Archivos Afectados:**
- `force-app/main/default/classes/TRM_DuplicateDetectionApi.cls` (NUEVO)
- `force-app/main/default/classes/TRM_DuplicateDetectionApi.cls-meta.xml` (NUEVO)

### Fase 1.2: Implementar Lógica de Matching (2-3 días)

- [ ] Implementar método `findDuplicates(Id recordId)`
  - [ ] Query de registro fuente
  - [ ] Cálculo de ventana de fechas (5 años)
  - [ ] Query de candidatos potenciales
  - [ ] Filtrado y scoring
- [ ] Implementar método `calculateMatchScore(source, candidate)`
  - [ ] Comparación de paciente (REQUERIDO)
  - [ ] Comparación de fecha (exacta y ±3 días)
  - [ ] Comparación de código de procedimiento
  - [ ] Comparación de cargo (exacto y ±5%)
  - [ ] Comparación de cantidad
  - [ ] Comparación de proveedor (opcional)
  - [ ] Cálculo de confidence score (0-100)
  - [ ] Determinación de Exact vs Potential
- [ ] Implementar método helper `getMatchCount(String json)`
- [ ] Testing manual en Developer Console
- [ ] Commit: "MVADM-185: Implement duplicate matching logic"

**Criterios de Aceptación:**
- ✅ Detecta duplicados exactos (100% match en campos core)
- ✅ Detecta duplicados potenciales (4+ campos coinciden)
- ✅ Excluye el registro actual de resultados
- ✅ Limita a 50 matches máximo
- ✅ Ventana de 5 años hacia atrás

### Fase 1.3: Implementar Métodos @AuraEnabled (1-2 días)

- [ ] Implementar `getDuplicateData(Id recordId)` - Cacheable
  - [ ] Query de registro con campos de duplicados
  - [ ] Parseo de Matching_Records__c JSON
  - [ ] Construcción de DuplicateData wrapper
  - [ ] Error handling
- [ ] Implementar `triggerManualCheck(Id recordId)` - Non-cacheable
  - [ ] Llamada a findDuplicates()
  - [ ] Scoring de matches
  - [ ] Construcción de JSON para Matching_Records__c
  - [ ] Update de Duplicate_Status__c y Last_Duplicate_Check__c
  - [ ] Retorno de mensaje de status
- [ ] Implementar `getBillDuplicateSummary(Id billId)` - Cacheable
  - [ ] Query de todos los line items del Bill
  - [ ] Conteo de exactos vs potenciales
  - [ ] Construcción de BillDuplicateSummary
  - [ ] Mensaje de resumen
- [ ] Implementar `triggerBillDuplicateCheck(Id billId)` - Non-cacheable
  - [ ] Loop sobre todos los line items
  - [ ] Llamada a triggerManualCheck() para cada uno
  - [ ] Conteo de resultados
  - [ ] Mensaje de resumen
- [ ] Commit: "MVADM-185: Implement @AuraEnabled methods"

**Criterios de Aceptación:**
- ✅ Métodos cacheable NO modifican datos
- ✅ Métodos non-cacheable actualizan campos correctamente
- ✅ JSON se serializa/deserializa correctamente
- ✅ Error handling con AuraHandledException

### Fase 1.4: Test Class (1-2 días)

- [ ] Crear archivo `TRM_DuplicateDetectionApi_Test.cls`
- [ ] Implementar `@TestSetup` con datos de prueba:
  - [ ] Account (Patient)
  - [ ] Bill__c
  - [ ] Code__c
  - [ ] Bill_Line_Item__c original
  - [ ] Bill_Line_Item__c duplicado exacto
  - [ ] Bill_Line_Item__c duplicado potencial
  - [ ] Bill_Line_Item__c único (sin duplicados)
- [ ] Test cases:
  - [ ] `testGetDuplicateData_ExactMatch()`
  - [ ] `testGetDuplicateData_PotentialMatch()`
  - [ ] `testTriggerManualCheck_ExactMatch()`
  - [ ] `testTriggerManualCheck_NoDuplicates()`
  - [ ] `testGetBillDuplicateSummary()`
  - [ ] `testTriggerBillDuplicateCheck()`
  - [ ] `testDifferentPatient_NoMatch()` (negative test)
  - [ ] `testOldDate_NoMatch()` (outside 5-year window)
- [ ] Ejecutar tests y verificar >75% coverage
- [ ] Commit: "MVADM-185: Add test coverage for TRM_DuplicateDetectionApi"

**Criterios de Aceptación:**
- ✅ Code coverage >75%
- ✅ Todos los tests pasan
- ✅ Tests cubren casos positivos y negativos
- ✅ Tests verifican JSON serialization

### Fase 1.5: Deploy a Sandbox (0.5 días)

- [ ] Deploy clase Apex a Dev Sandbox
- [ ] Verificar deployment exitoso
- [ ] Ejecutar tests en Sandbox
- [ ] Verificar que campos Bill_Line_Item__c existen
- [ ] Testing manual con datos reales
- [ ] Commit: "MVADM-185: Backend implementation complete"

---

## 🎨 SPRINT 2: FRONTEND INTEGRATION (3-5 días)

### Fase 2.1: Integrar trmDuplicateTriangle en Grid (1-2 días)

- [ ] Modificar `customBillLineItemGrid.html`
  - [ ] Reemplazar icono estático con componente `<c-trm-duplicate-triangle>`
  - [ ] Pasar `record-id={item.Id}` como parámetro
  - [ ] Agregar condición `if:true={item.Id}` (no mostrar en draft row)
- [ ] Modificar `customBillLineItemGrid.js`
  - [ ] Verificar que `isDuplicate` se calcula correctamente
  - [ ] Verificar que `duplicateStatus` se pasa correctamente
  - [ ] Mantener `getDuplicateStatusLabel()` helper
- [ ] Testing en Dev Sandbox:
  - [ ] Verificar que triángulo aparece en line items con duplicados
  - [ ] Verificar que click abre modal de comparación
  - [ ] Verificar que "Check for Duplicates" funciona
- [ ] Commit: "MVADM-185: Integrate trmDuplicateTriangle into Bill Review grid"

**Archivos Afectados:**
- `force-app/main/default/lwc/customBillLineItemGrid/customBillLineItemGrid.html`
- `force-app/main/default/lwc/customBillLineItemGrid/customBillLineItemGrid.js`

**Criterios de Aceptación:**
- ✅ Triángulo verde con $ aparece para duplicados exactos
- ✅ Triángulo amarillo aparece para duplicados potenciales
- ✅ Click en triángulo abre modal con detalles
- ✅ Modal muestra comparación lado a lado
- ✅ No afecta performance del grid

### Fase 2.2: Verificación Automática al Crear Line Items (1 día)

- [ ] Modificar `customBillLineItemGrid.js` método `handleSaveDraft`
  - [ ] Importar `triggerManualCheck` de Apex
  - [ ] Agregar llamada después de crear line item
  - [ ] Agregar `refreshApex()` para actualizar UI
  - [ ] Error handling (no bloquear flujo si falla)
- [ ] Testing:
  - [ ] Crear nuevo line item que es duplicado
  - [ ] Verificar que triángulo aparece automáticamente
  - [ ] Crear nuevo line item único
  - [ ] Verificar que NO aparece triángulo
- [ ] Commit: "MVADM-185: Add automatic duplicate check on line item creation"

**Criterios de Aceptación:**
- ✅ Verificación se ejecuta automáticamente al guardar
- ✅ UI se actualiza para mostrar triángulo
- ✅ No bloquea el flujo si la verificación falla
- ✅ Usuario ve feedback inmediato

### Fase 2.3: Integrar trmBillDuplicateSummary en Bill Review (1 día)

- [ ] Identificar componente padre (bcnQuoteEmbeddedInterface o similar)
- [ ] Agregar `<c-trm-bill-duplicate-summary>` en la interfaz
  - [ ] Pasar `record-id={billId}` como parámetro
  - [ ] Agregar clase CSS para spacing
  - [ ] Mostrar solo en Bill Review stage
- [ ] Testing:
  - [ ] Verificar que resumen aparece en Bill Review
  - [ ] Verificar conteo de duplicados exactos/potenciales
  - [ ] Verificar botón "Check All Duplicates"
  - [ ] Verificar modal con lista de line items duplicados
- [ ] Commit: "MVADM-185: Add Bill-level duplicate summary to Bill Review"

**Archivos Afectados:**
- `force-app/main/default/lwc/bcnQuoteEmbeddedInterface/bcnQuoteEmbeddedInterface.html` (o similar)

**Criterios de Aceptación:**
- ✅ Resumen visible en Bill Review stage
- ✅ Muestra conteo correcto de duplicados
- ✅ "Check All Duplicates" verifica todos los line items
- ✅ Modal muestra lista completa de duplicados

### Fase 2.4: UI/UX Polish (0.5 días)

- [ ] Verificar estilos CSS de triángulos
- [ ] Verificar tooltips informativos
- [ ] Verificar mensajes de error user-friendly
- [ ] Verificar loading spinners durante verificación
- [ ] Testing de accesibilidad (screen readers)
- [ ] Commit: "MVADM-185: UI/UX polish for duplicate detection"

**Criterios de Aceptación:**
- ✅ Estilos consistentes con diseño existente
- ✅ Tooltips claros y útiles
- ✅ Loading states visibles
- ✅ Accesible para usuarios con discapacidades

### Fase 2.5: Deploy a Sandbox (0.5 días)

- [ ] Deploy componentes LWC a Dev Sandbox
- [ ] Verificar deployment exitoso
- [ ] Testing end-to-end completo
- [ ] Documentar cualquier issue encontrado
- [ ] Commit: "MVADM-185: Frontend integration complete"

---

## ✅ SPRINT 3: VALIDATION & REFINEMENT (2-3 días)

### Fase 3.1: Integrar en TRM_ValidationService (1 día)

- [ ] Modificar `TRM_ValidationService.cls`
- [ ] Agregar verificación de duplicados en validación pre-adjudication
- [ ] Generar Yellow Line Warning (no bloquea) si Duplicate_Status__c = 'Exact'
- [ ] Testing:
  - [ ] Validar BCN con line item duplicado exacto
  - [ ] Verificar que aparece yellow line warning
  - [ ] Verificar que NO bloquea adjudication
  - [ ] Validar BCN sin duplicados
  - [ ] Verificar que NO aparece warning
- [ ] Commit: "MVADM-185: Add duplicate check to validation service"

**Archivos Afectados:**
- `force-app/main/default/classes/TRM_ValidationService.cls`

**Criterios de Aceptación:**
- ✅ Warning aparece para duplicados exactos
- ✅ NO bloquea el flujo de adjudication
- ✅ Mensaje claro y accionable
- ✅ Incluye número de línea afectado

### Fase 3.2: Ajustar Umbrales Según Feedback (0.5 días)

- [ ] Revisar con Claims team:
  - [ ] Tolerancia de cargo (actualmente $0.01 para exacto, ±5% para potencial)
  - [ ] Ventana de fechas (actualmente ±3 días para potencial)
  - [ ] Ventana de búsqueda (actualmente 5 años)
  - [ ] Número mínimo de campos coincidentes (actualmente 4 de 6)
- [ ] Ajustar constantes en `TRM_DuplicateDetectionApi.cls` si es necesario
- [ ] Re-ejecutar tests con nuevos umbrales
- [ ] Commit: "MVADM-185: Adjust matching thresholds based on feedback"

**Criterios de Aceptación:**
- ✅ Umbrales aprobados por Claims team
- ✅ Tests actualizados para reflejar nuevos umbrales
- ✅ Documentación actualizada

### Fase 3.3: Documentación para Usuarios (0.5 días)

- [ ] Crear guía de usuario:
  - [ ] Qué significa el triángulo verde con $
  - [ ] Qué significa el triángulo amarillo
  - [ ] Cómo revisar duplicados
  - [ ] Cómo marcar como revisado
  - [ ] Casos de uso legítimos (no son duplicados)
- [ ] Agregar tooltips informativos en UI
- [ ] Crear FAQ para Claims team
- [ ] Commit: "MVADM-185: Add user documentation"

**Archivos Afectados:**
- `salesforce-project/docs/USER_GUIDE_DUPLICATE_DETECTION.md` (NUEVO)

**Criterios de Aceptación:**
- ✅ Documentación clara y concisa
- ✅ Incluye screenshots
- ✅ Cubre casos comunes y edge cases
- ✅ Aprobada por Claims team

### Fase 3.4: Testing de Aceptación con Claims Team (1 día)

- [ ] Preparar datos de prueba en Sandbox:
  - [ ] Casos de duplicados exactos
  - [ ] Casos de duplicados potenciales
  - [ ] Casos de NO duplicados
  - [ ] Casos de duplicados legítimos (múltiples servicios)
- [ ] Sesión de testing con Claims team:
  - [ ] Demostrar flujo completo
  - [ ] Recoger feedback
  - [ ] Documentar issues encontrados
  - [ ] Priorizar fixes
- [ ] Implementar fixes críticos
- [ ] Re-testing con Claims team
- [ ] Obtener sign-off para producción

**Criterios de Aceptación:**
- ✅ Claims team puede usar la funcionalidad sin ayuda
- ✅ No hay bugs críticos
- ✅ Performance aceptable
- ✅ Sign-off formal obtenido

### Fase 3.5: Deploy a Production (0.5 días)

- [ ] Crear deployment package:
  - [ ] `TRM_DuplicateDetectionApi.cls`
  - [ ] `TRM_DuplicateDetectionApi_Test.cls`
  - [ ] `customBillLineItemGrid` (modificado)
  - [ ] `bcnQuoteEmbeddedInterface` (modificado)
  - [ ] `TRM_ValidationService.cls` (modificado)
- [ ] Ejecutar pre-deployment checklist:
  - [ ] Todos los tests pasan en Sandbox
  - [ ] Code coverage >75%
  - [ ] No hay errores de linting
  - [ ] Documentación completa
  - [ ] Sign-off de Claims team
- [ ] Deploy a Production
- [ ] Ejecutar smoke tests en Production
- [ ] Monitorear logs por 24 horas
- [ ] Commit: "MVADM-185: Production deployment complete"

**Criterios de Aceptación:**
- ✅ Deployment exitoso sin errores
- ✅ Smoke tests pasan
- ✅ No hay errores en logs
- ✅ Funcionalidad disponible para usuarios

---

## 📊 TESTING MATRIX

### Test Scenarios

| Scenario | Expected Result | Status |
|----------|----------------|--------|
| **Duplicado Exacto** | | |
| Mismo paciente, fecha, código, cargo, cantidad | 🟢 Triángulo verde con $ | ⏳ |
| Confidence score = 100% | Status = 'Exact' | ⏳ |
| **Duplicado Potencial** | | |
| Mismo paciente, fecha ±2 días, código, cargo ±3% | 🟡 Triángulo amarillo | ⏳ |
| Confidence score 60-90% | Status = 'Potential' | ⏳ |
| **NO Duplicado** | | |
| Diferente paciente | Sin triángulo | ⏳ |
| Diferente código | Sin triángulo | ⏳ |
| Fecha >5 años atrás | Sin triángulo | ⏳ |
| **Casos Legítimos** | | |
| Múltiples servicios mismo día (diferente practitioner) | Puede mostrar triángulo, usuario marca como revisado | ⏳ |
| Reenvío con documentación corregida | Puede mostrar triángulo, usuario marca como revisado | ⏳ |
| **Performance** | | |
| Bill con 100 line items | Check completo <30 segundos | ⏳ |
| Line item con 50 matches | Modal carga <2 segundos | ⏳ |
| **UI/UX** | | |
| Click en triángulo | Modal abre con comparación | ⏳ |
| "Check for Duplicates" | Actualiza status y muestra resultado | ⏳ |
| "Check All Duplicates" | Verifica todos los line items | ⏳ |
| **Validation** | | |
| Adjudication con duplicado exacto | Yellow line warning (no bloquea) | ⏳ |
| Adjudication sin duplicados | Sin warning | ⏳ |

---

## 🔍 POST-DEPLOYMENT MONITORING

### Week 1: Intensive Monitoring

- [ ] Revisar logs diariamente
- [ ] Monitorear performance de queries
- [ ] Recoger feedback de Claims team
- [ ] Documentar issues encontrados
- [ ] Implementar hotfixes si es necesario

### Week 2-4: Regular Monitoring

- [ ] Revisar logs semanalmente
- [ ] Analizar métricas de uso:
  - [ ] Cuántos duplicados se detectan
  - [ ] Ratio de exactos vs potenciales
  - [ ] Cuántos se marcan como revisados
  - [ ] Tiempo promedio de verificación
- [ ] Ajustar umbrales si es necesario
- [ ] Documentar lecciones aprendidas

### Métricas de Éxito

| Métrica | Target | Actual |
|---------|--------|--------|
| Duplicados exactos detectados | >90% | ⏳ |
| Falsos positivos | <10% | ⏳ |
| Tiempo de verificación | <5 segundos | ⏳ |
| Adopción por Claims team | >80% | ⏳ |
| Satisfacción de usuarios | >4/5 | ⏳ |

---

## 🚨 ROLLBACK PLAN

### Si hay problemas críticos en Production:

1. **Identificar el problema:**
   - [ ] Revisar logs de errores
   - [ ] Reproducir en Sandbox
   - [ ] Determinar severidad

2. **Rollback parcial (si es posible):**
   - [ ] Desactivar verificación automática (comentar código en `handleSaveDraft`)
   - [ ] Mantener verificación manual disponible
   - [ ] Deploy hotfix

3. **Rollback completo (si es necesario):**
   - [ ] Revertir cambios en `customBillLineItemGrid`
   - [ ] Revertir cambios en `TRM_ValidationService`
   - [ ] Mantener `TRM_DuplicateDetectionApi` (no causa daño si no se usa)
   - [ ] Deploy rollback package

4. **Comunicación:**
   - [ ] Notificar a Claims team
   - [ ] Documentar issue en Jira
   - [ ] Planear fix y re-deployment

---

## 📝 NOTAS IMPORTANTES

### Campos Requeridos en Bill_Line_Item__c

✅ **YA EXISTEN** (no requieren creación):
- `Duplicate_Status__c` (Picklist: None, Exact, Potential)
- `Matching_Records__c` (Long Text Area - JSON)
- `Last_Duplicate_Check__c` (DateTime)

### Componentes LWC Existentes

✅ **YA IMPLEMENTADOS** (solo requieren integración):
- `trmDuplicateTriangle` - Indicador visual individual
- `trmBillDuplicateSummary` - Resumen a nivel Bill

### Clase Apex Faltante

❌ **REQUIERE CREACIÓN COMPLETA**:
- `TRM_DuplicateDetectionApi.cls` - Toda la lógica de backend

### Dependencias

- Salesforce API Version: 64.0+
- Lightning Web Components
- Apex Classes: `TRM_ValidationService`, `TRM_MedicalBillingService`
- Objects: `Bill__c`, `Bill_Line_Item__c`, `Code__c`, `Account`

---

## 🎯 DEFINITION OF DONE

### Backend (Apex)
- [x] Clase `TRM_DuplicateDetectionApi` creada
- [x] Lógica de matching implementada
- [x] Métodos @AuraEnabled implementados
- [x] Test class con >75% coverage
- [x] Todos los tests pasan
- [x] Deployed a Sandbox
- [x] Deployed a Production

### Frontend (LWC)
- [x] `trmDuplicateTriangle` integrado en grid
- [x] Verificación automática al crear line items
- [x] `trmBillDuplicateSummary` integrado en Bill Review
- [x] UI/UX polish completo
- [x] Deployed a Sandbox
- [x] Deployed a Production

### Validation
- [x] Integrado en `TRM_ValidationService`
- [x] Yellow line warning implementado
- [x] No bloquea adjudication
- [x] Deployed a Production

### Documentation
- [x] Guía de usuario creada
- [x] FAQ para Claims team
- [x] Documentación técnica completa
- [x] Tooltips informativos en UI

### Testing & QA
- [x] Testing de aceptación con Claims team
- [x] Sign-off formal obtenido
- [x] Smoke tests en Production
- [x] Monitoring plan en ejecución

### Metrics
- [x] Métricas de éxito definidas
- [x] Dashboard de monitoreo configurado
- [x] Proceso de feedback establecido

---

## 📞 CONTACTOS

- **Product Owner:** TBD
- **Tech Lead:** TBD
- **Claims Team Lead:** TBD
- **QA Lead:** TBD

---

## 📅 TIMELINE ESTIMADO

```
Week 1-2: Sprint 1 - Backend Apex
├─ Day 1-2: Estructura de clase y matching logic
├─ Day 3-4: Métodos @AuraEnabled
├─ Day 5-7: Test class y deployment
└─ Day 8: Buffer

Week 3: Sprint 2 - Frontend Integration
├─ Day 1-2: Integrar trmDuplicateTriangle
├─ Day 3: Verificación automática
├─ Day 4: Integrar trmBillDuplicateSummary
└─ Day 5: UI/UX polish y deployment

Week 4: Sprint 3 - Validation & Refinement
├─ Day 1: Integrar en TRM_ValidationService
├─ Day 2: Ajustar umbrales y documentación
├─ Day 3: Testing de aceptación
└─ Day 4-5: Deploy a Production y monitoring
```

**Total:** 3-4 semanas (15-20 días laborales)

---

**Última Actualización:** 2026-01-16
**Versión:** 1.0
**Estado:** Ready for Implementation


