# 🎯 MVADM-185: Próximos Pasos - Guía de Implementación

**Fecha:** 2026-01-16  
**Estado:** Backend Completo - Frontend Pendiente

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### ✅ Fase 1: Verificación (COMPLETO)
- [x] Investigar estado actual del sistema
- [x] Descargar clases Apex del sandbox
- [x] Verificar componentes LWC
- [x] Documentar arquitectura
- [x] Estimar esfuerzo restante

### ⏳ Fase 2: Frontend Integration (3-5 días)

#### Tarea 1: Integrar trmDuplicateTriangle en Grid
**Objetivo:** Mostrar indicador de duplicados en cada Bill Line Item

**Pasos:**
1. Abrir Lightning App Builder en Sandbox
2. Editar Bill Line Item Record Page
3. Agregar componente `trmDuplicateTriangle`
4. Configurar visibility rules:
   - Mostrar solo si `Duplicate_Status__c != null`
5. Guardar y activar
6. Testing:
   - Crear line item duplicado
   - Verificar que aparece el triángulo
   - Verificar colores (rojo = Exact, amarillo = Potential)

**Tiempo estimado:** 1-2 días

---

#### Tarea 2: Integrar trmBillDuplicateSummary en Bill Page
**Objetivo:** Mostrar resumen de duplicados a nivel Bill

**Pasos:**
1. Abrir Lightning App Builder en Sandbox
2. Editar Bill Record Page
3. Agregar componente `trmBillDuplicateSummary`
4. Posicionar en sección apropiada (sugerencia: sidebar)
5. Configurar tamaño y layout
6. Guardar y activar
7. Testing:
   - Abrir Bill con line items duplicados
   - Verificar que muestra resumen correcto
   - Probar botón "Check for Duplicates"
   - Verificar modal de detalles

**Tiempo estimado:** 1-2 días

---

#### Tarea 3: Verificar Auto-Detection
**Objetivo:** Confirmar que la detección automática funciona

**Pasos:**
1. Verificar que el trigger está activo:
   ```bash
   sf data query --query "SELECT Id, Name, Status FROM ApexTrigger WHERE Name LIKE '%Duplicate%'" --target-org eobbcnb
   ```

2. Testing manual:
   - Crear un Bill Line Item
   - Crear otro con mismo CPT/HCPCS, Charge, y Service Date
   - Verificar que `Duplicate_Status__c` se actualiza automáticamente
   - Verificar que `Matching_Records__c` contiene JSON correcto

3. Testing bulk:
   - Importar 10+ line items con duplicados
   - Verificar procesamiento asíncrono
   - Verificar que todos se marcan correctamente

**Tiempo estimado:** 1 día

---

### ⏳ Fase 3: Validation & Testing (2-3 días)

#### Tarea 4: (Opcional) Integrar con TRM_ValidationService
**Objetivo:** Generar warnings pre-adjudication

**Pasos:**
1. Abrir `TRM_ValidationService.cls`
2. Agregar método `validateDuplicates(List<Bill_Line_Item__c> items)`
3. Llamar desde método principal de validación
4. Retornar warnings si hay duplicados
5. Testing:
   - Ejecutar validación en Bill con duplicados
   - Verificar que aparecen warnings
   - Verificar que no bloquea adjudication (solo warning)

**Tiempo estimado:** 1 día (OPCIONAL)

---

#### Tarea 5: User Acceptance Testing
**Objetivo:** Validar con usuarios finales

**Escenarios de Testing:**
1. **Scenario 1: Exact Duplicate**
   - Crear line item
   - Crear duplicado exacto
   - Verificar indicador rojo
   - Verificar mensaje correcto

2. **Scenario 2: Potential Duplicate**
   - Crear line item
   - Crear similar (mismo CPT, diferente charge)
   - Verificar indicador amarillo
   - Verificar mensaje correcto

3. **Scenario 3: Bill Summary**
   - Abrir Bill con múltiples duplicados
   - Verificar resumen correcto
   - Probar botón "Check for Duplicates"
   - Verificar modal de detalles

4. **Scenario 4: Bulk Processing**
   - Importar 50+ line items
   - Verificar procesamiento completo
   - Verificar performance (<5 segundos)

**Tiempo estimado:** 1 día

---

#### Tarea 6: Deploy a Production
**Objetivo:** Mover a producción

**Pasos:**
1. Crear Change Set en Sandbox:
   - Incluir 9 clases Apex
   - Incluir 2 componentes LWC
   - Incluir custom fields
   - Incluir Lightning Pages modificadas

2. Upload Change Set a Production

3. Validar en Production (sin deploy):
   - Verificar test coverage >75%
   - Verificar no hay errores de compilación

4. Deploy Change Set

5. Post-deployment verification:
   - Verificar clases deployed
   - Verificar componentes visibles
   - Crear test record
   - Verificar funcionalidad

**Tiempo estimado:** 1 día

---

### ⏳ Fase 4: Monitoring (Ongoing)

#### Tarea 7: Monitoring Inicial
**Objetivo:** Asegurar estabilidad en producción

**Métricas a monitorear:**
1. **Error Rate**
   - Debug logs con errores
   - Exception emails
   - Target: <1% error rate

2. **Performance**
   - Tiempo de procesamiento
   - Governor limits usage
   - Target: <3 segundos por check

3. **Adoption**
   - Número de checks ejecutados
   - Número de duplicados detectados
   - User feedback

**Herramientas:**
- Salesforce Debug Logs
- Event Monitoring
- Custom Dashboard (opcional)

**Tiempo estimado:** Ongoing (1 hora/día primera semana)

---

## 📊 TIMELINE ESTIMADO

```
Week 1:
├─ Day 1-2: Integrar trmDuplicateTriangle
├─ Day 3-4: Integrar trmBillDuplicateSummary
└─ Day 5: Verificar Auto-Detection

Week 2:
├─ Day 1: (Opcional) TRM_ValidationService
├─ Day 2: User Acceptance Testing
├─ Day 3: Deploy a Production
└─ Day 4-5: Monitoring & Ajustes
```

**Total:** 5-8 días laborales (1-2 semanas)

---

## ✅ CRITERIOS DE ÉXITO

1. ✅ Indicador de duplicados visible en grid
2. ✅ Resumen de duplicados visible en Bill page
3. ✅ Auto-detection funciona en insert/update
4. ✅ Performance <3 segundos por check
5. ✅ Test coverage >75%
6. ✅ Zero critical errors en producción
7. ✅ User feedback positivo

---

## 🚨 RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Performance issues con bulk | Media | Alto | Async processing ya implementado |
| User confusion con indicadores | Baja | Medio | Documentación y training |
| False positives | Media | Medio | Ajustar confidence thresholds |
| Production deployment issues | Baja | Alto | Validar en Sandbox primero |

---

## 📞 CONTACTOS

**Developer:** Alexia Abrego  
**Ticket:** MVADM-185  
**Sandbox:** eobbcnb  
**Org:** trinity@medivest.com

---

**Última actualización:** 2026-01-16

