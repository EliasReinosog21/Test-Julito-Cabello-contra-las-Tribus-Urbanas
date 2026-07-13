(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const escapar=texto=>String(texto??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const mezclar=lista=>{
    const copia=[...lista];
    for(let i=copia.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copia[i],copia[j]]=[copia[j],copia[i]];}
    return copia;
  };

  let preguntas=[],indice=0,historial=[],nombre='Estudiante',respondida=false,estadoIA={configurada:false};

  JULITO_CAPITULOS.forEach(([numero,titulo])=>{
    const opcion=document.createElement('option');
    opcion.value=numero;opcion.textContent=`Cap. ${numero} · ${titulo}`;
    if(numero===45) opcion.selected=true;
    $('cap').appendChild(opcion);
  });

  function descripcionTipo(tipo){
    if(tipo==='alternativa') return 'Alternativa';
    if(tipo==='verdadero_falso') return 'Verdadero o falso';
    return 'Pregunta abierta';
  }

  async function comprobarIA(){
    try{estadoIA=await JulitoAPI.estadoIA();}
    catch(error){estadoIA={configurada:false,mensaje:'No fue posible consultar el servidor de IA.'};}
    const caja=$('estadoIA');
    $('bloqueCodigo').classList.toggle('oculto',!estadoIA.requiereCodigo);
    if(estadoIA.requiereCodigo && JulitoAPI.codigo()) $('codigoAcceso').value=JulitoAPI.codigo();
    if(estadoIA.configurada){
      caja.className='estado-ia activo';
      caja.innerHTML=`<strong>🤖 Corrección con IA activa</strong><span>Modelo: ${escapar(estadoIA.modelo)}. El puntaje de preguntas abiertas es provisional.</span>`;
    }else{
      caja.className='estado-ia inactivo';
      caja.innerHTML=`<strong>✍️ Revisión docente disponible</strong><span>${escapar(estadoIA.mensaje||'La IA no está configurada.')}</span>`;
    }
  }

  $('empezar').addEventListener('click',async()=>{
    nombre=$('nombre').value.trim()||'Estudiante';
    if(estadoIA.requiereCodigo){
      const codigo=$('codigoAcceso').value.trim();
      if(!codigo){const error=$('errorInicio');error.textContent='Escribe el código de acceso entregado por el docente.';error.classList.remove('oculto');return;}
      JulitoAPI.fijarCodigo(codigo);
    }
    const hasta=Number($('cap').value);
    let cantidad=Number($('largo').value);
    if(cantidad===45 && hasta<45) cantidad=Math.min(45,hasta);
    const boton=$('empezar');
    const error=$('errorInicio');
    error.classList.add('oculto');
    boton.disabled=true;boton.textContent='Preparando preguntas…';
    try{
      const datos=await JulitoAPI.cargarPreguntas(hasta,cantidad);
      preguntas=datos.preguntas||[];
      if(!preguntas.length) throw new Error('No se recibieron preguntas para la selección indicada.');
      indice=0;historial=[];
      $('inicio').classList.add('oculto');$('resultado').classList.add('oculto');$('test').classList.remove('oculto');
      pintarPregunta();
    }catch(err){
      error.textContent=`No se pudo iniciar: ${err.message}`;error.classList.remove('oculto');
    }finally{boton.disabled=false;boton.textContent='¡Empezar el test!';}
  });

  function pintarPregunta(){
    respondida=false;
    const p=preguntas[indice];
    const habilidad=JULITO_HABILIDADES[p.habilidad]||JULITO_HABILIDADES.literal;
    $('contador').textContent=`Pregunta ${indice+1} de ${preguntas.length}`;
    $('marcador').textContent=`${historial.filter(x=>x.puntosObtenidos===x.puntosMaximos).length} chapitas 🏅`;
    $('progreso').style.width=`${indice/preguntas.length*100}%`;
    const tag=$('tag');
    tag.textContent=`${habilidad.icono} ${descripcionTipo(p.tipo)} · ${habilidad.nombre}`;
    tag.style.background=habilidad.color;
    tag.style.color=p.habilidad==='acontecimientos'?'var(--tinta)':'#fff';
    $('capTag').textContent=`cap. ${p.cap} · ${p.puntos} pto${p.puntos===1?'':'s'}`;
    $('pregunta').textContent=p.pregunta;
    const zona=$('zonaRespuesta');zona.innerHTML='';
    if(p.tipo==='alternativa') pintarAlternativas(p,zona);
    else if(p.tipo==='verdadero_falso') pintarVF(p,zona);
    else pintarAbierta(p,zona);
    $('feedback').className='feedback oculto';$('feedback').innerHTML='';
    $('siguiente').classList.add('oculto');
    $('siguiente').textContent=indice===preguntas.length-1?'Ver mi resultado 🏁':'Siguiente →';
    pintarChapitas();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function pintarAlternativas(p,zona){
    const letras=['A','B','C','D','E','F'];
    p.opciones.forEach((opcion,pos)=>{
      const boton=document.createElement('button');
      boton.type='button';boton.className='op';boton.dataset.valor=String(opcion.valor);
      boton.innerHTML=`<span class="letra">${letras[pos]||pos+1}</span><span>${escapar(opcion.texto)}</span>`;
      boton.addEventListener('click',()=>responderCerrada(p,opcion.valor,boton));
      zona.appendChild(boton);
    });
  }

  function pintarVF(p,zona){
    mezclar([{texto:'Verdadero',valor:true,letra:'V'},{texto:'Falso',valor:false,letra:'F'}]).forEach(opcion=>{
      const boton=document.createElement('button');
      boton.type='button';boton.className='op';boton.dataset.valor=String(opcion.valor);
      boton.innerHTML=`<span class="letra">${opcion.letra}</span><span>${opcion.texto}</span>`;
      boton.addEventListener('click',()=>responderCerrada(p,opcion.valor,boton));
      zona.appendChild(boton);
    });
  }

  function pintarAbierta(p,zona){
    const etiqueta=document.createElement('label');etiqueta.className='campo';etiqueta.htmlFor='respuestaAbierta';etiqueta.textContent='Escribe tu respuesta';
    const textarea=document.createElement('textarea');textarea.id='respuestaAbierta';textarea.maxLength=1200;textarea.placeholder='Responde con una o más oraciones y fundamenta cuando corresponda.';
    const contador=document.createElement('p');contador.className='ayuda';contador.textContent='0/1200 caracteres';
    textarea.addEventListener('input',()=>contador.textContent=`${textarea.value.length}/1200 caracteres`);
    const nota=document.createElement('div');nota.className='nota-ia';nota.textContent=estadoIA.configurada?'La IA comparará la respuesta con una pauta. Su evaluación será provisional.':'La respuesta quedará pendiente de revisión docente porque la IA no está configurada.';
    const boton=document.createElement('button');boton.type='button';boton.className=estadoIA.configurada?'btn lila':'btn amarillo';boton.textContent=estadoIA.configurada?'Evaluar respuesta con IA 🤖':'Guardar para revisión ✍️';
    boton.addEventListener('click',()=>responderAbierta(p,textarea.value,boton));
    zona.append(etiqueta,textarea,contador,nota,boton);
  }

  async function responderCerrada(p,respuesta,botonElegido){
    if(respondida) return;
    respondida=true;
    const botones=[...$('zonaRespuesta').querySelectorAll('.op')];
    botones.forEach(b=>b.disabled=true);
    const feedback=$('feedback');feedback.className='feedback info';feedback.innerHTML='<b>Revisando…</b>';
    try{
      const evaluacion=await JulitoAPI.evaluarCerrada(p.id,respuesta);
      botones.forEach(b=>{
        const esElegido=b===botonElegido;
        const texto=b.textContent.slice(1).trim();
        if(esElegido) b.classList.add(evaluacion.correcta?'buena':'mala');
        else if(texto===evaluacion.respuestaCorrecta) b.classList.add('buena');
        else b.classList.add('apagada');
      });
      const respuestaTexto=botonElegido.textContent.slice(1).trim();
      historial.push({
        preguntaId:p.id,tipo:p.tipo,cap:p.cap,habilidad:p.habilidad,enunciado:p.pregunta,
        respuesta,respuestaTexto,correcta:evaluacion.correcta,puntosObtenidos:evaluacion.puntosObtenidos,
        puntosMaximos:evaluacion.puntosMaximos,respuestaCorrecta:evaluacion.respuestaCorrecta,explicacion:evaluacion.explicacion
      });
      feedback.className=`feedback ${evaluacion.correcta?'si':'no'}`;
      feedback.innerHTML=`<b>${evaluacion.correcta?'¡Correcto! 🏅':'Revisa esta idea'}</b>${evaluacion.correcta?'':`La respuesta correcta es <u>${escapar(evaluacion.respuestaCorrecta)}</u>. `}${escapar(evaluacion.explicacion)}`;
      $('siguiente').classList.remove('oculto');pintarChapitas();
    }catch(error){
      respondida=false;botones.forEach(b=>b.disabled=false);
      feedback.className='feedback no';feedback.innerHTML=`<b>No se pudo corregir</b>${escapar(error.message)}`;
    }
  }

  async function responderAbierta(p,texto,boton){
    if(respondida) return;
    const respuesta=texto.trim();
    const feedback=$('feedback');
    if(respuesta.length<8){feedback.className='feedback no';feedback.innerHTML='<b>Falta desarrollar la respuesta</b>Escribe al menos una oración antes de continuar.';return;}
    respondida=true;
    const textarea=$('respuestaAbierta');textarea.disabled=true;boton.disabled=true;boton.textContent='Revisando…';
    feedback.className='feedback info';feedback.innerHTML='<b>Procesando la respuesta…</b>';
    try{
      const datos=await JulitoAPI.evaluarAbierta(p.id,respuesta);
      const pauta=datos.pauta||{};
      const base={
        preguntaId:p.id,tipo:p.tipo,cap:p.cap,habilidad:p.habilidad,enunciado:p.pregunta,
        respuesta,respuestaTexto:respuesta,correcta:null,puntosObtenidos:null,puntosMaximos:p.puntos,
        respuestaModelo:pauta.respuestaModelo||'',criterios:pauta.criterios||[]
      };
      let registro=base;
      if(datos.evaluado){
        const ia=datos.evaluacion;
        registro={...base,puntosObtenidos:Number(ia.puntaje),correcta:Number(ia.puntaje)===Number(p.puntos),evaluacionIA:{
          puntaje:Number(ia.puntaje),nivel:ia.nivel,retroalimentacion:ia.retroalimentacion,
          fortalezas:ia.fortalezas||[],porMejorar:ia.porMejorar||[],confianza:ia.confianza,
          requiereRevisionDocente:Boolean(ia.requiereRevisionDocente),modelo:datos.modelo,fecha:new Date().toISOString()
        }};
        const clase=ia.puntaje===p.puntos?'si':ia.puntaje>0?'pendiente':'no';
        feedback.className=`feedback ${clase}`;
        feedback.innerHTML=`<b>Evaluación provisional: ${ia.puntaje}/${p.puntos}</b>${escapar(ia.retroalimentacion)}${ia.requiereRevisionDocente?'<br><strong>Requiere revisión docente.</strong>':''}`;
      }else{
        registro={...base,errorIA:datos.motivo||'Pendiente'};
        feedback.className='feedback pendiente';feedback.innerHTML=`<b>Respuesta guardada ✍️</b>${escapar(datos.motivo||'Quedó pendiente de revisión docente.')}`;
      }
      historial.push(registro);$('siguiente').classList.remove('oculto');pintarChapitas();
    }catch(error){
      respondida=false;textarea.disabled=false;boton.disabled=false;boton.textContent=estadoIA.configurada?'Evaluar respuesta con IA 🤖':'Guardar para revisión ✍️';
      feedback.className='feedback no';feedback.innerHTML=`<b>No se pudo guardar</b>${escapar(error.message)}`;
    }
  }

  function pintarChapitas(){
    const c=$('chapitas');c.innerHTML='';
    historial.forEach(r=>{
      const d=document.createElement('div');
      if(r.tipo==='abierta'){
        d.className=r.evaluacionIA?`chapita ia ${r.puntosObtenidos===r.puntosMaximos?'ok':''}`:'chapita abierta';d.textContent=r.evaluacionIA?'🤖':'✍️';
      }else{d.className=`chapita ${r.correcta?'ok':'no'}`;d.textContent=r.correcta?'🏅':'·';}
      c.appendChild(d);
    });
    $('marcador').textContent=`${historial.filter(r=>r.puntosObtenidos===r.puntosMaximos).length} chapitas 🏅`;
  }

  $('siguiente').addEventListener('click',()=>{indice++;if(indice<preguntas.length)pintarPregunta();else terminar();});

  function terminar(){
    $('test').classList.add('oculto');$('resultado').classList.remove('oculto');
    const cerradas=historial.filter(r=>r.tipo!=='abierta');
    const abiertas=historial.filter(r=>r.tipo==='abierta');
    const puntosAuto=cerradas.reduce((s,r)=>s+Number(r.puntosObtenidos||0),0);
    const maxAuto=cerradas.reduce((s,r)=>s+Number(r.puntosMaximos||0),0);
    const puntosOpen=abiertas.reduce((s,r)=>s+Number(r.evaluacionIA?.puntaje||0),0);
    const maxOpen=abiertas.reduce((s,r)=>s+Number(r.puntosMaximos||0),0);
    const total=puntosAuto+puntosOpen,maxTotal=maxAuto+maxOpen;
    const pct=maxTotal?Math.round(total/maxTotal*100):0;
    $('nota').innerHTML=`${total}/${maxTotal}<small>${pct}% provisional</small>`;
    let medalla,mensaje;
    if(pct>=90){medalla='🏆 Nivel Julito investigador';mensaje='Dominio sobresaliente del libro.';}
    else if(pct>=70){medalla='🥇 Nivel Anita María';mensaje='Buen nivel de comprensión; quedan algunos detalles por afinar.';}
    else if(pct>=50){medalla='🥈 Nivel Beltrán punk';mensaje='Hay una base suficiente, pero conviene releer los capítulos más difíciles.';}
    else{medalla='🥉 Nivel Aarón (hum)';mensaje='Conviene releer y volver a intentarlo. ¡Fighting!';}
    $('medalla').textContent=medalla;$('mensaje').textContent=`${nombre}, ${mensaje}`;
    $('resumenPuntajes').innerHTML=`
      <div class="caja"><strong>${puntosAuto}/${maxAuto}</strong><span>Preguntas cerradas</span></div>
      <div class="caja"><strong>${puntosOpen}/${maxOpen}</strong><span>Abiertas, provisional</span></div>
      <div class="caja"><strong>${total}/${maxTotal}</strong><span>Total vigente</span></div>`;
    pintarDesglose();pintarRevision();
    const intento=StorageRespuestas.guardar({
      version:4,estudiante:nombre,capituloMaximo:Number($('cap').value),cantidad:preguntas.length,
      puntosAutomaticos:puntosAuto,maxAutomatico:maxAuto,puntosIA:puntosOpen,maxAbiertas:maxOpen,
      maxTotal,respuestas:historial
    });
    if(!intento.persistido){$('mensaje').textContent+=' El navegador no permitió guardar el intento.';}
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function pintarDesglose(){
    const stats={};
    historial.forEach(r=>{const h=r.habilidad||'literal';stats[h]=stats[h]||{obtenido:0,max:0};stats[h].obtenido+=Number(r.puntosObtenidos||0);stats[h].max+=Number(r.puntosMaximos||0);});
    const tabla=$('tabla');tabla.innerHTML='<h2>Resultados por habilidad</h2>';
    Object.entries(stats).forEach(([h,s])=>{
      const info=JULITO_HABILIDADES[h]||JULITO_HABILIDADES.literal;
      const fila=document.createElement('div');fila.className='fila';
      fila.innerHTML=`<span>${info.icono} ${escapar(info.nombre)}</span><span class="mini"><i style="width:${s.max?s.obtenido/s.max*100:0}%;background:${info.color}"></i></span><span class="n">${s.obtenido}/${s.max}</span>`;
      tabla.appendChild(fila);
    });
  }

  function pintarRevision(){
    const rev=$('revision');rev.innerHTML='<h2>Revisión del intento</h2>';
    historial.forEach((r,i)=>{
      const d=document.createElement('article');
      if(r.tipo==='abierta'){
        d.className='detalle-respuesta abierta';
        d.innerHTML=`<h3>${r.evaluacionIA?'🤖':'✍️'} ${i+1}. ${escapar(r.enunciado)}</h3><p><strong>Tu respuesta:</strong> ${escapar(r.respuestaTexto)}</p>${r.evaluacionIA?`<p><strong>Puntaje provisional:</strong> ${r.evaluacionIA.puntaje}/${r.puntosMaximos}</p><p>${escapar(r.evaluacionIA.retroalimentacion)}</p>`:'<p><strong>Pendiente de revisión docente.</strong></p>'}`;
      }else{
        d.className=`detalle-respuesta ${r.correcta?'correcta':'incorrecta'}`;
        d.innerHTML=`<h3>${r.correcta?'🏅':'❌'} ${i+1}. ${escapar(r.enunciado)}</h3><p><strong>Tu respuesta:</strong> ${escapar(r.respuestaTexto)}</p>${r.correcta?'':`<p><strong>Respuesta correcta:</strong> ${escapar(r.respuestaCorrecta)}</p>`}<p>${escapar(r.explicacion)}</p>`;
      }
      rev.appendChild(d);
    });
    rev.classList.add('oculto');$('revisar').textContent='Ver revisión';
  }

  $('revisar').addEventListener('click',()=>{const r=$('revision');r.classList.toggle('oculto');$('revisar').textContent=r.classList.contains('oculto')?'Ver revisión':'Ocultar revisión';});
  $('dnuevo').addEventListener('click',()=>{$('resultado').classList.add('oculto');$('inicio').classList.remove('oculto');window.scrollTo({top:0,behavior:'smooth'});});

  comprobarIA();
})();
