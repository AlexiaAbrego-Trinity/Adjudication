# 🚀 MVADM-185: Plan de Implementación - Duplicate Detection

**Fecha:** 2026-01-16  
**Investigador:** Alexia Abrego  
**Tiempo Estimado:** 1 día  
**Complejidad:** Trivial

---

## 📋 RESUMEN EJECUTIVO

**Cambio Requerido:** Reemplazar icono estático con componente interactivo en el grid de Bill Line Items.

**Impacto:** Habilita modal de comparación de duplicados y botón "Check for Duplicates" manual.

**Archivos Afectados:** 1 archivo (`customBillLineItemGrid.html`)

**Líneas de Código:** 9 líneas → 5 líneas (simplificación del 44%)

---

## 🎯 PASO 1: Implementar Cambio (5 minutos)

### Archivo: `customBillLineItemGrid.html`

**Ubicación:** Líneas 489-499

### ANTES (Código Actual):
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

### DESPUÉS (Código Nuevo):
```html
<!-- Duplicate Flag -->
<td class="slds-text-align_center duplicate-flag-cell">
    <c-trm-duplicate-triangle
        record-id={item.Id}
        if:true={item.Id}>
    </c-trm-duplicate-triangle>
</td>
```

### Instrucciones:
1. Abrir `salesforce-project/force-app/main/default/lwc/customBillLineItemGrid/customBillLineItemGrid.html`
2. Navegar a línea 489
3. Reemplazar las 11 líneas (489-499) con las 5 líneas nuevas
4. Guardar archivo

**Nota:** NO se requieren cambios en JavaScript. La lógica de `isDuplicate`, `duplicateStatus`, y `duplicateStatusLabel` ya está implementada y funcionando.

---

## 🧪 PASO 2: Testing en Dev Sandbox (30 minutos)

### 2.1 Deploy a Sandbox
```bash
# Desde la raíz del proyecto
sf project deploy start --source-dir force-app/main/default/lwc/customBillLineItemGrid --target-org DevSandbox
```

### 2.2 Casos de Prueba

#### Test Case 1: Verificar Display del Triángulo
**Objetivo:** Confirmar que el triángulo aparece correctamente

**Pasos:**
1. Abrir un Case con Bill Line Items
2. Navegar a la pestaña "Quote Adjudication"
3. Verificar que el grid carga correctamente

**Resultado Esperado:**
- ✅ Grid carga sin errores
- ✅ Triángulo verde con $ aparece para duplicados exactos
- ✅ Triángulo amarillo aparece para duplicados potenciales
- ✅ No aparece triángulo para line items sin duplicados
- ✅ No aparece triángulo en draft row (nueva fila)

#### Test Case 2: Verificar Modal de Comparación
**Objetivo:** Confirmar que el click abre el modal

**Pasos:**
1. Click en un triángulo verde (duplicado exacto)
2. Verificar que modal se abre
3. Verificar contenido del modal

**Resultado Esperado:**
- ✅ Modal se abre al hacer click
- ✅ Muestra "Current Record" con detalles
- ✅ Muestra "Matching Records" con lista de duplicados
- ✅ Muestra confidence score (100% para exactos)
- ✅ Botón "View Record" navega correctamente
- ✅ Botón "Close" cierra el modal

#### Test Case 3: Verificar "Check for Duplicates" Manual
**Objetivo:** Confirmar que el botón manual funciona

**Pasos:**
1. Abrir modal de un line item
2. Click en botón "Check for Duplicates"
3. Esperar a que termine el proceso

**Resultado Esperado:**
- ✅ Botón muestra spinner mientras procesa
- ✅ Toast message confirma "Duplicate check completed"
- ✅ Triángulo se actualiza si cambia el status
- ✅ Modal se actualiza con nuevos matches

#### Test Case 4: Verificar Performance del Grid
**Objetivo:** Confirmar que no afecta la velocidad de carga

**Pasos:**
1. Abrir un Bill con 50+ line items
2. Medir tiempo de carga del grid
3. Comparar con versión anterior (si es posible)

**Resultado Esperado:**
- ✅ Grid carga en <3 segundos
- ✅ No hay lag al scrollear
- ✅ No hay errores en consola del navegador

---

## 📊 PASO 3: UAT con Claims Team (2 horas)

### 3.1 Preparación
- [ ] Crear Bill de prueba con duplicados conocidos
- [ ] Preparar script de demostración
- [ ] Documentar casos de uso

### 3.2 Sesión de UAT

**Participantes:**
- Claims team lead
- 2-3 Claims specialists
- Developer (Alexia)

**Agenda:**
1. Demostración de funcionalidad (15 min)
2. Hands-on testing por usuarios (45 min)
3. Feedback y preguntas (30 min)
4. Ajustes inmediatos si es necesario (30 min)

**Preguntas para Claims Team:**
- ¿El triángulo es suficientemente visible?
- ¿El modal muestra la información necesaria?
- ¿Los colores (verde vs. amarillo) son intuitivos?
- ¿Falta alguna información en el modal?
- ¿El botón "Check for Duplicates" es útil?

---

## 🚀 PASO 4: Deploy a Production (1 día)

### 4.1 Pre-Deploy Checklist
- [ ] Todos los tests pasaron en Sandbox
- [ ] UAT aprobado por Claims team
- [ ] Documentación de usuario creada
- [ ] Backup de código actual
- [ ] Change request aprobado

### 4.2 Deploy
```bash
# Deploy a Production
sf project deploy start --source-dir force-app/main/default/lwc/customBillLineItemGrid --target-org Production
```

### 4.3 Post-Deploy Verification
- [ ] Verificar que deploy fue exitoso
- [ ] Smoke test en Production
- [ ] Verificar que no hay errores en logs
- [ ] Notificar a Claims team que está disponible

---

## 📈 PASO 5: Monitoring (1 semana)

### 5.1 Métricas a Monitorear
- Número de duplicados detectados por día
- Número de clicks en triángulos
- Número de "Check for Duplicates" manuales
- Errores en logs relacionados con duplicate detection

### 5.2 Feedback Loop
- Daily check-in con Claims team (primeros 3 días)
- Weekly review de métricas
- Ajustes según feedback

---

## ⚠️ ROLLBACK PLAN

Si hay problemas críticos en Production:

### Opción 1: Rollback Rápido (5 minutos)
```bash
# Revertir al código anterior
git revert <commit_hash>
sf project deploy start --source-dir force-app/main/default/lwc/customBillLineItemGrid --target-org Production
```

### Opción 2: Hotfix (10 minutos)
Si el problema es menor, aplicar hotfix directamente:
1. Identificar el problema
2. Aplicar fix en Sandbox
3. Testing rápido
4. Deploy a Production

---

## 📝 DOCUMENTACIÓN DE USUARIO

### Crear Guía Rápida (30 minutos)

**Título:** "Duplicate Detection in Bill Review - Quick Guide"

**Contenido:**
1. ¿Qué es el triángulo de duplicados?
2. ¿Qué significa cada color?
   - 🟢 Verde con $ = Duplicado exacto (100% match)
   - 🟡 Amarillo = Duplicado potencial (60-90% match)
3. ¿Cómo ver detalles de duplicados?
   - Click en triángulo → modal se abre
4. ¿Cómo re-verificar duplicados?
   - Click en "Check for Duplicates" en modal
5. ¿Qué hacer si encuentro un duplicado?
   - Revisar ambos records
   - Decidir cuál mantener
   - Marcar el otro como "Deleted" o "Duplicate"

---

## ✅ CRITERIOS DE ACEPTACIÓN

### Funcionales
- [x] Triángulo verde con $ aparece para duplicados exactos
- [x] Triángulo amarillo aparece para duplicados potenciales
- [x] Click en triángulo abre modal de comparación
- [x] Modal muestra comparación lado a lado
- [x] Botón "Check for Duplicates" funciona
- [x] No aparece triángulo en draft row

### No Funcionales
- [x] Grid carga en <3 segundos con 50+ line items
- [x] No hay errores en consola del navegador
- [x] No afecta otras funcionalidades del grid
- [x] Compatible con todos los navegadores soportados

### Documentación
- [ ] Guía de usuario creada
- [ ] Código documentado
- [ ] Change log actualizado

---

## 📅 TIMELINE

| Día | Actividad | Responsable | Duración |
|-----|-----------|-------------|----------|
| **Día 1 - Mañana** | Implementar cambio | Alexia | 5 min |
| **Día 1 - Mañana** | Deploy a Sandbox | Alexia | 10 min |
| **Día 1 - Mañana** | Testing | Alexia | 30 min |
| **Día 1 - Tarde** | UAT con Claims | Alexia + Claims | 2 horas |
| **Día 1 - Tarde** | Ajustes si necesario | Alexia | 1 hora |
| **Día 2 - Mañana** | Deploy a Production | Alexia | 1 hora |
| **Día 2 - Tarde** | Monitoring inicial | Alexia | 2 horas |
| **Semana 1** | Monitoring continuo | Alexia | 30 min/día |

**Total:** 1-2 días laborales

---

**Preparado por:** Alexia Abrego  
**Fecha:** 2026-01-16  
**Estado:** ✅ Ready to Execute

