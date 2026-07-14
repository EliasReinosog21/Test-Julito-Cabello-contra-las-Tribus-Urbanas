(function(){
  'use strict';

  const $ = id => document.getElementById(id);
  let intentos = StorageRespuestas.listar();
  let intentoActivo = null;

  function escapar(texto){
    return String(texto ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function fechaLegible(fecha){
    try{
      return new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(fecha));
    }catch(_){
      return fecha || '';
    }
  }

  function abiertas(intento){
    return (intento.respuestas || []).filter(r=>r.tipo==='abierta');
  }

  function puntosIAOriginales(intento){
    return abiertas(intento).reduce((s,r)=>s+Number(r.evaluacionIA?.puntaje ?? r.puntosObtenidos ?? 0),0);
  }

  function maxAbiertas(intento){
    return abiertas(intento).reduce((s,r)=>s+Number(r.puntosMaximos || 0),0);
  }

  function puntoVigente(intento,respuesta){
    const revision = intento.revisionManual || {};
    if(Object.prototype.hasOwnProperty.call(revision,respuesta.preguntaId)) return Number(revision[respuesta.preguntaId] || 0);
    if(respuesta.evaluacionIA) return Number(respuesta.evaluacionIA.puntaje ?? respuesta.puntosObtenidos ?? 0);
    return 0;
  }

  function puntosAbiertasVigentes(intento){
    return abiertas(intento).reduce((s,r)=>s+puntoVigente(intento,r),0);
  }

  function cantidadAjustesManuales(intento){
    return Object.keys(intento.revisionManual || {}).length;
  }

  function totalObtenido(intento){
    return Number(intento.puntosAutomaticos || 0) + puntosAbiertasVigentes(intento);
  }

  function abiertasPendientes(intento){
    const revision = intento.revisionManual || {};
    return abiertas(intento).filter(r=>{
      if(Object.prototype.hasOwnProperty.call(revision,r.preguntaId)) return false;
      if(!r.evaluacionIA) return true;
      return Boolean(r.evaluacionIA.requiereRevisionDocente);
    }).length;
  }

  function renderTabla(){
    const filtro = $('filtro').value.trim().toLowerCase();
    const visibles = intentos.filter(i=>!filtro || String(i.estudiante || '').toLowerCase().includes(filtro));
    $('resumenIntentos').textContent = `${intentos.length} intento${intentos.length===1?'':'s'} guardado${intentos.length===1?'':'s'} · ${visibles.length} visible${visibles.length===1?'':'s'}`;

    const cuerpo = $('cuerpoIntentos');
    cuerpo.innerHTML = '';

    if(!visibles.length){
      const fila = document.createElement('tr');
      fila.innerHTML = '<td colspan="5">No hay intentos guardados.</td>';
      cuerpo.appendChild(fila);
      return;
    }

    visibles.forEach(intento=>{
      const puntosAbiertas = puntosAbiertasVigentes(intento);
      const total = totalObtenido(intento);
      const pendientes = abiertasPendientes(intento);
      const maxOpen = maxAbiertas(intento) || Number(intento.maxAbiertas || 0);
      const maxTotal = Number(intento.maxTotal || Number(intento.maxAutomatico || 0)+maxOpen);
      const ajustes = cantidadAjustesManuales(intento);
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${escapar(intento.estudiante || 'Estudiante')}</td>
        <td>${escapar(fechaLegible(intento.fecha))}</td>
        <td>${escapar(intento.capituloMaximo)}</td>
        <td><strong>${total}/${maxTotal}</strong><br><span style="font-size:12px">Cerradas: ${intento.puntosAutomaticos || 0}/${intento.maxAutomatico || 0} · Abiertas vigentes: ${puntosAbiertas}/${maxOpen}${ajustes?` · ${ajustes} ajuste${ajustes===1?'':'s'} manual${ajustes===1?'':'es'}`:''}${pendientes?` · ${pendientes} por revisar`:''}</span></td>
        <td><button class="btn compacto lila" data-id="${escapar(intento.id)}">Revisar</button></td>`;
      fila.querySelector('button').addEventListener('click',()=>abrirDetalle(intento.id));
      cuerpo.appendChild(fila);
    });
  }

  function abrirDetalle(id){
    intentoActivo = intentos.find(i=>i.id===id) || null;
    if(!intentoActivo) return;

    $('detalle').classList.remove('oculto');
    $('detalleNombre').textContent = `${intentoActivo.estudiante} · hasta cap. ${intentoActivo.capituloMaximo}`;
    $('detalleFecha').textContent = fechaLegible(intentoActivo.fecha);
    renderResumenDetalle();
    renderRespuestasDetalle();
    $('mensajeRevision').classList.add('oculto');
    $('detalle').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderResumenDetalle(){
    const cerradas = Number(intentoActivo.puntosAutomaticos || 0);
    const maxCerradas = Number(intentoActivo.maxAutomatico || 0);
    const ia = puntosIAOriginales(intentoActivo);
    const vigentes = puntosAbiertasVigentes(intentoActivo);
    const maxOpen = maxAbiertas(intentoActivo) || Number(intentoActivo.maxAbiertas || 0);
    const total = cerradas + vigentes;
    const maxTotal = Number(intentoActivo.maxTotal || maxCerradas + maxOpen);

    $('detallePuntajes').innerHTML = `
      <div class="caja"><strong>${cerradas}/${maxCerradas}</strong><span>Preguntas cerradas</span></div>
      <div class="caja"><strong>${ia}/${maxOpen}</strong><span>Propuesta de IA</span></div>
      <div class="caja"><strong>${total}/${maxTotal}</strong><span>Total vigente</span></div>`;
  }

  function listaHTML(items){
    return Array.isArray(items) && items.length
      ? `<ul style="margin:6px 0 0 22px">${items.map(x=>`<li>${escapar(x)}</li>`).join('')}</ul>`
      : '';
  }

  function renderRespuestasDetalle(){
    const contenedor = $('detalleRespuestas');
    contenedor.innerHTML = '<h2 style="margin-top:18px">Respuestas</h2>';
    const revision = intentoActivo.revisionManual || {};

    (intentoActivo.respuestas || []).forEach((respuesta,indice)=>{
      const bloque = document.createElement('article');
      if(respuesta.tipo==='abierta'){
        const tieneManual = Object.prototype.hasOwnProperty.call(revision,respuesta.preguntaId);
        const valorManual = tieneManual ? Number(revision[respuesta.preguntaId]) : '';
        const ia = respuesta.evaluacionIA;
        const criterios = listaHTML(respuesta.criterios || []);
        const placeholder = ia ? `IA: ${ia.puntaje}` : 'Pendiente';
        bloque.className = 'detalle-respuesta abierta';
        bloque.innerHTML = `
          <h3>${ia?'🤖':'✍️'} ${indice+1}. ${escapar(respuesta.enunciado)}</h3>
          <p><strong>Respuesta del estudiante:</strong><br>${escapar(respuesta.respuestaTexto || respuesta.respuesta)}</p>
          ${ia?`<div class="evaluacion-ia">
            <p><strong>Evaluación IA:</strong> ${Number(ia.puntaje ?? respuesta.puntosObtenidos ?? 0)}/${respuesta.puntosMaximos} · Nivel ${escapar(ia.nivel || '')} · Confianza ${escapar(ia.confianza || '')}</p>
            <p><strong>Retroalimentación:</strong> ${escapar(ia.retroalimentacion || '')}</p>
            ${ia.fortalezas?.length?`<p><strong>Fortalezas:</strong></p>${listaHTML(ia.fortalezas)}`:''}
            ${ia.porMejorar?.length?`<p><strong>Por mejorar:</strong></p>${listaHTML(ia.porMejorar)}`:''}
            ${ia.requiereRevisionDocente?'<p><strong>⚠ La IA recomienda revisión docente.</strong></p>':''}
          </div>`:'<p class="alerta" style="margin-top:10px">Esta respuesta no fue evaluada por IA.</p>'}
          <details><summary>Ver respuesta modelo y criterios</summary>
            <p style="margin-top:10px"><strong>Respuesta modelo:</strong><br>${escapar(respuesta.respuestaModelo || '')}</p>
            ${criterios?`<p style="margin-top:10px"><strong>Criterios:</strong></p>${criterios}`:''}
          </details>
          <label class="campo" for="puntaje-${escapar(respuesta.preguntaId)}">Ajuste docente (máximo ${respuesta.puntosMaximos})</label>
          <input type="number" id="puntaje-${escapar(respuesta.preguntaId)}" class="puntaje-manual" data-qid="${escapar(respuesta.preguntaId)}" min="0" max="${Number(respuesta.puntosMaximos || 0)}" step="1" value="${valorManual}" placeholder="${placeholder}">
          <p class="ayuda">Deja el campo vacío para conservar el puntaje de IA. Si no hubo IA, vacío significa pendiente.</p>`;
      }else if(respuesta.tipo==='pareados'){
        const detalle = Array.isArray(respuesta.detallePareados) ? respuesta.detallePareados : [];
        const filas = detalle.map(item=>`
          <li class="${item.correcta?'par-correcto':'par-incorrecto'}">
            <strong>${item.correcta?'✓':'✗'} ${escapar(item.izquierda)}</strong><br>
            Respuesta: ${escapar(item.seleccionada)}
            ${item.correcta?'':`<br>Correcta: ${escapar(item.respuestaCorrecta)}`}
          </li>`).join('');
        bloque.className = `detalle-respuesta pareados ${respuesta.correcta?'correcta':'incorrecta'}`;
        bloque.innerHTML = `
          <h3>🔗 ${indice+1}. ${escapar(respuesta.enunciado)}</h3>
          <p><strong>Resultado:</strong> ${respuesta.puntosObtenidos}/${respuesta.puntosMaximos} relaciones correctas.</p>
          <ul class="revision-pareados">${filas}</ul>
          <p class="ayuda">${escapar(respuesta.explicacion || '')}</p>`;
      }else{
        bloque.className = `detalle-respuesta ${respuesta.correcta?'correcta':'incorrecta'}`;
        bloque.innerHTML = `
          <h3>${respuesta.correcta?'🏅':'❌'} ${indice+1}. ${escapar(respuesta.enunciado)}</h3>
          <p><strong>Respuesta:</strong> ${escapar(respuesta.respuestaTexto)}</p>
          ${respuesta.correcta?'':`<p><strong>Correcta:</strong> ${escapar(respuesta.respuestaCorrecta)}</p>`}
          <p class="ayuda">${escapar(respuesta.explicacion || '')} · ${respuesta.puntosObtenidos}/${respuesta.puntosMaximos} puntos</p>`;
      }
      contenedor.appendChild(bloque);
    });
  }

  $('guardarRevision').addEventListener('click',()=>{
    if(!intentoActivo) return;
    try{
      const revision = {...(intentoActivo.revisionManual || {})};
      document.querySelectorAll('.puntaje-manual').forEach(input=>{
        const qid = input.dataset.qid;
        const max = Number(input.max || 0);
        if(input.value===''){
          delete revision[qid];
          return;
        }
        const valor = Number(input.value);
        if(!Number.isFinite(valor) || valor<0 || valor>max){
          throw new Error(`El puntaje de una pregunta debe estar entre 0 y ${max}.`);
        }
        revision[qid] = valor;
      });

      intentoActivo = StorageRespuestas.actualizar(intentoActivo.id,{revisionManual:revision,fechaRevision:new Date().toISOString()});
      intentos = StorageRespuestas.listar();
      renderTabla();
      renderResumenDetalle();
      renderRespuestasDetalle();
      mostrarMensaje('La revisión manual quedó guardada. Los ajustes reemplazan el puntaje de IA en el total vigente.',false);
    }catch(error){
      mostrarMensaje(error.message || 'No fue posible guardar la revisión.',true);
    }
  });

  function mostrarMensaje(texto,error){
    const caja = $('mensajeRevision');
    caja.className = `feedback ${error?'no':'si'}`;
    caja.innerHTML = `<b>${error?'Revisa los puntajes':'Revisión guardada'}</b>${escapar(texto)}`;
  }

  $('eliminarIntento').addEventListener('click',()=>{
    if(!intentoActivo || !confirm('¿Eliminar definitivamente este intento?')) return;
    StorageRespuestas.eliminar(intentoActivo.id);
    intentos = StorageRespuestas.listar();
    intentoActivo = null;
    $('detalle').classList.add('oculto');
    renderTabla();
  });

  $('cerrarDetalle').addEventListener('click',()=>{
    intentoActivo = null;
    $('detalle').classList.add('oculto');
  });

  $('filtro').addEventListener('input',renderTabla);

  $('exportarJSON').addEventListener('click',()=>{
    StorageRespuestas.descargar(
      `respuestas-julito-${new Date().toISOString().slice(0,10)}.json`,
      JSON.stringify(intentos,null,2),
      'application/json;charset=utf-8'
    );
  });

  function csvCelda(valor){
    const texto = String(valor ?? '').replaceAll('"','""');
    return `"${texto}"`;
  }

  $('exportarCSV').addEventListener('click',()=>{
    const encabezados = ['ID','Estudiante','Fecha','Capítulo máximo','Preguntas','Puntos cerrados','Máximo cerradas','Propuesta IA abiertas','Puntaje vigente abiertas','Máximo abiertas','Total vigente','Máximo total','Ajustes manuales','Por revisar'];
    const filas = intentos.map(i=>[
      i.id,i.estudiante,i.fecha,i.capituloMaximo,i.cantidad,
      i.puntosAutomaticos,i.maxAutomatico,puntosIAOriginales(i),puntosAbiertasVigentes(i),maxAbiertas(i),
      totalObtenido(i),i.maxTotal,cantidadAjustesManuales(i),abiertasPendientes(i)
    ]);
    const csv = [encabezados,...filas].map(f=>f.map(csvCelda).join(';')).join('\n');
    StorageRespuestas.descargar(`respuestas-julito-${new Date().toISOString().slice(0,10)}.csv`, '\uFEFF'+csv, 'text/csv;charset=utf-8');
  });

  $('borrarTodo').addEventListener('click',()=>{
    if(!intentos.length) return;
    if(!confirm('¿Borrar todos los intentos guardados en este navegador? Esta acción no se puede deshacer.')) return;
    StorageRespuestas.limpiar();
    intentos = [];
    intentoActivo = null;
    $('detalle').classList.add('oculto');
    renderTabla();
  });

  renderTabla();
})();
