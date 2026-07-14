'use strict';

const crypto = require('crypto');
const BANCO = require('../data/preguntas');
const CAPITULOS = require('../data/capitulos');

const TIPOS_VALIDOS = new Set(['alternativa','verdadero_falso','abierta','pareados']);
const TIPOS_BASE_OBLIGATORIOS = ['alternativa','verdadero_falso','abierta'];
const HABILIDADES_VALIDAS = new Set([
  'literal','inferencial','personajes','acontecimientos','vocabulario','reflexion','relacionar'
]);

function mezclar(lista){
  const salida=[...lista];
  for(let i=salida.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [salida[i],salida[j]]=[salida[j],salida[i]];
  }
  return salida;
}

function normalizar(texto){
  return String(texto||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
}

function textoPrincipal(p){
  if(p.tipo==='verdadero_falso') return p.afirmacion;
  if(p.tipo==='pareados'){
    return [p.instruccion,...(p.pares||[]).map(par=>par.izquierda)].join(' ');
  }
  return p.pregunta;
}

function clavePregunta(p){
  return normalizar(textoPrincipal(p));
}

function grupoPregunta(p){
  return normalizar(p.grupo||'');
}

function validarBanco(){
  const errores=[];
  const ids=new Set();
  const porCapitulo=Object.fromEntries(
    CAPITULOS.map(([n])=>[n,{alternativa:0,verdadero_falso:0,abierta:0,pareados:0}])
  );

  BANCO.forEach((p,indice)=>{
    const etiqueta=`Pregunta ${indice+1}${p?.id?` (${p.id})`:''}`;
    if(!p || typeof p!=='object'){
      errores.push(`${etiqueta}: registro inválido.`);
      return;
    }

    if(!p.id || typeof p.id!=='string') errores.push(`${etiqueta}: falta id.`);
    else if(ids.has(p.id)) errores.push(`${etiqueta}: id duplicado.`);
    else ids.add(p.id);

    if(!TIPOS_VALIDOS.has(p.tipo)) errores.push(`${etiqueta}: tipo inválido.`);
    if(!Number.isInteger(p.cap) || p.cap<1 || p.cap>45) errores.push(`${etiqueta}: capítulo máximo inválido.`);
    if(!HABILIDADES_VALIDAS.has(p.habilidad)) errores.push(`${etiqueta}: habilidad inválida.`);
    if(!Number.isFinite(Number(p.puntos)) || Number(p.puntos)<1) errores.push(`${etiqueta}: puntaje inválido.`);

    if(p.grupo!==undefined && (typeof p.grupo!=='string' || !p.grupo.trim())){
      errores.push(`${etiqueta}: grupo conceptual inválido.`);
    }

    if(p.capitulos!==undefined){
      if(!Array.isArray(p.capitulos) || p.capitulos.length<2){
        errores.push(`${etiqueta}: capítulos debe contener al menos dos capítulos.`);
      }else{
        const capitulos=p.capitulos.map(Number);
        const unicos=new Set(capitulos);
        if(capitulos.some(cap=>!Number.isInteger(cap) || cap<1 || cap>45)){
          errores.push(`${etiqueta}: contiene capítulos fuera del rango 1-45.`);
        }
        if(unicos.size!==capitulos.length) errores.push(`${etiqueta}: contiene capítulos repetidos.`);
        if(Math.max(...capitulos)!==p.cap){
          errores.push(`${etiqueta}: cap debe ser el capítulo más alto requerido para responder.`);
        }
      }
    }

    if(p.tipo==='alternativa'){
      if(!p.pregunta || !Array.isArray(p.opciones) || p.opciones.length<2){
        errores.push(`${etiqueta}: alternativa incompleta.`);
      }
      if(!Number.isInteger(p.correcta) || p.correcta<0 || p.correcta>=p.opciones?.length){
        errores.push(`${etiqueta}: índice correcto inválido.`);
      }
      if(!p.explicacion) errores.push(`${etiqueta}: falta explicación.`);
    }

    if(p.tipo==='verdadero_falso'){
      if(!p.afirmacion || typeof p.correcta!=='boolean'){
        errores.push(`${etiqueta}: verdadero/falso incompleto.`);
      }
      if(!p.explicacion) errores.push(`${etiqueta}: falta explicación.`);
    }

    if(p.tipo==='abierta'){
      if(!p.pregunta || !p.respuestaModelo || !Array.isArray(p.criterios) || !p.criterios.length){
        errores.push(`${etiqueta}: pregunta abierta incompleta.`);
      }
    }

    if(p.tipo==='pareados'){
      if(!p.instruccion || !Array.isArray(p.pares) || p.pares.length<3){
        errores.push(`${etiqueta}: términos pareados incompletos; se requieren al menos tres pares.`);
      }else{
        const idsPares=new Set();
        const izquierdas=new Set();
        const derechas=new Set();
        p.pares.forEach((par,numero)=>{
          const etiquetaPar=`${etiqueta}, par ${numero+1}`;
          if(!par || typeof par!=='object'){
            errores.push(`${etiquetaPar}: registro inválido.`);
            return;
          }
          if(!par.id || typeof par.id!=='string') errores.push(`${etiquetaPar}: falta id.`);
          else if(idsPares.has(par.id)) errores.push(`${etiquetaPar}: id duplicado.`);
          else idsPares.add(par.id);
          if(!par.izquierda || !par.derecha) errores.push(`${etiquetaPar}: faltan términos.`);
          const izquierda=normalizar(par.izquierda);
          const derecha=normalizar(par.derecha);
          if(izquierdas.has(izquierda)) errores.push(`${etiquetaPar}: término izquierdo repetido.`);
          if(derechas.has(derecha)) errores.push(`${etiquetaPar}: término derecho repetido.`);
          izquierdas.add(izquierda);
          derechas.add(derecha);
        });
        if(Number(p.puntos)!==p.pares.length){
          errores.push(`${etiqueta}: el puntaje debe ser igual a la cantidad de pares.`);
        }
      }
      if(!p.explicacion) errores.push(`${etiqueta}: falta explicación.`);
      if(!Array.isArray(p.capitulos) || p.capitulos.length<2){
        errores.push(`${etiqueta}: los términos pareados deben relacionar más de un capítulo.`);
      }
    }

    if(porCapitulo[p.cap]?.[p.tipo]!==undefined) porCapitulo[p.cap][p.tipo]++;
  });

  for(const [cap,cuentas] of Object.entries(porCapitulo)){
    for(const tipo of TIPOS_BASE_OBLIGATORIOS){
      if(!cuentas[tipo]) errores.push(`Capítulo ${cap}: falta al menos una pregunta de tipo ${tipo}.`);
    }
  }

  return {ok:errores.length===0,errores,total:BANCO.length,porCapitulo};
}

function encontrar(id){
  return BANCO.find(p=>p.id===id) || null;
}

function tokenPareado(preguntaId,parId,lado){
  const secreto=process.env.PAREADOS_SECRET || 'julito-pareados-v4.4';
  return crypto
    .createHmac('sha256',secreto)
    .update(`${lado}|${preguntaId}|${parId}`)
    .digest('hex')
    .slice(0,24);
}

function limpiarParaCliente(p){
  const base={
    id:p.id,
    tipo:p.tipo,
    cap:p.cap,
    habilidad:p.habilidad,
    puntos:Number(p.puntos)
  };

  if(Array.isArray(p.capitulos)) base.capitulos=[...p.capitulos];

  if(p.tipo==='alternativa'){
    const opciones=mezclar(p.opciones.map((texto,valor)=>({valor,texto})));
    return {...base,pregunta:p.pregunta,opciones};
  }

  if(p.tipo==='verdadero_falso'){
    return {...base,pregunta:p.afirmacion};
  }

  if(p.tipo==='pareados'){
    const elementos=mezclar(p.pares.map(par=>({
      id:tokenPareado(p.id,par.id,'izquierda'),
      texto:par.izquierda
    })));
    const opciones=mezclar(p.pares.map(par=>({
      id:tokenPareado(p.id,par.id,'derecha'),
      texto:par.derecha
    })));
    return {...base,pregunta:p.instruccion,elementos,opciones};
  }

  return {...base,pregunta:p.pregunta};
}

function cuotas(total,pareadosDisponibles=0){
  if(total<=1) return {alternativa:total,verdadero_falso:0,abierta:0,pareados:0};
  if(total===2) return {alternativa:1,verdadero_falso:1,abierta:0,pareados:0};

  // Máximo estricto: floor(5 %). Por eso los tests de 10 y 15 preguntas no
  // incorporan pareados; 25 incorpora 1, 45 incorpora 2 y 60 incorpora 3.
  const pareados=Math.min(pareadosDisponibles,Math.floor(total*0.05));
  const restante=total-pareados;
  const abierta=Math.max(1,Math.round(restante*0.25));
  const verdadero_falso=Math.max(1,Math.round(restante*0.25));
  const alternativa=Math.max(1,restante-abierta-verdadero_falso);

  return {alternativa,verdadero_falso,abierta,pareados};
}

function secuenciaTipos(objetivo,tipos=['alternativa','verdadero_falso','abierta','pareados']){
  const lista=[];
  for(const tipo of tipos){
    for(let i=0;i<(objetivo[tipo]||0);i++) lista.push(tipo);
  }
  return mezclar(lista);
}

function estaDisponible(p,usadas,clavesUsadas,gruposUsados){
  const clave=clavePregunta(p);
  const grupo=grupoPregunta(p);
  return !usadas.has(p.id) && !clavesUsadas.has(clave) && (!grupo || !gruposUsados.has(grupo));
}

function registrar(p,seleccion,usadas,clavesUsadas,gruposUsados,cuenta){
  seleccion.push(p);
  usadas.add(p.id);
  clavesUsadas.add(clavePregunta(p));
  const grupo=grupoPregunta(p);
  if(grupo) gruposUsados.add(grupo);
  cuenta[p.tipo]=(cuenta[p.tipo]||0)+1;
}

function elegirDelCapitulo(cap,tipo,disponibles,usadas,clavesUsadas,gruposUsados,cuenta,objetivo){
  const exactas=disponibles.filter(p=>
    p.cap===cap &&
    p.tipo===tipo &&
    estaDisponible(p,usadas,clavesUsadas,gruposUsados)
  );
  if(exactas.length) return mezclar(exactas)[0];

  const tiposConCupo=['alternativa','verdadero_falso','abierta'].filter(t=>(cuenta[t]||0)<(objetivo[t]||0));
  const reemplazos=disponibles.filter(p=>
    p.cap===cap &&
    p.tipo!=='pareados' &&
    tiposConCupo.includes(p.tipo) &&
    estaDisponible(p,usadas,clavesUsadas,gruposUsados)
  );
  if(reemplazos.length) return mezclar(reemplazos)[0];

  const cualquierBase=disponibles.filter(p=>
    p.cap===cap &&
    p.tipo!=='pareados' &&
    estaDisponible(p,usadas,clavesUsadas,gruposUsados)
  );
  return cualquierBase.length?mezclar(cualquierBase)[0]:null;
}


function seleccionarCoberturaCompleta(disponibles,limite,objetivo){
  const capitulosBase=Array.from({length:limite},(_,i)=>i+1);

  for(let intento=0;intento<250;intento++){
    const usadas=new Set();
    const clavesUsadas=new Set();
    const gruposUsados=new Set();
    const seleccion=[];
    const cuenta={alternativa:0,verdadero_falso:0,abierta:0,pareados:0};
    const pendientes=new Set(capitulosBase);
    let fallo=false;

    while(pendientes.size){
      const opcionesPorCapitulo=[];

      for(const cap of pendientes){
        const candidatas=disponibles.filter(p=>
          p.cap===cap &&
          (cuenta[p.tipo]||0)<(objetivo[p.tipo]||0) &&
          estaDisponible(p,usadas,clavesUsadas,gruposUsados)
        );
        opcionesPorCapitulo.push({cap,candidatas});
      }

      const minimo=Math.min(...opcionesPorCapitulo.map(item=>item.candidatas.length));
      if(!Number.isFinite(minimo) || minimo===0){
        fallo=true;
        break;
      }

      const restringidos=mezclar(opcionesPorCapitulo.filter(item=>item.candidatas.length===minimo));
      const elegidoCap=restringidos[0];
      const restantes=pendientes.size;

      const ordenadas=mezclar(elegidoCap.candidatas).sort((a,b)=>{
        const necesidadA=((objetivo[a.tipo]||0)-(cuenta[a.tipo]||0))/restantes;
        const necesidadB=((objetivo[b.tipo]||0)-(cuenta[b.tipo]||0))/restantes;
        if(necesidadA!==necesidadB) return necesidadB-necesidadA;
        const grupoA=grupoPregunta(a)?1:0;
        const grupoB=grupoPregunta(b)?1:0;
        return grupoA-grupoB;
      });

      const elegida=ordenadas[0];
      registrar(elegida,seleccion,usadas,clavesUsadas,gruposUsados,cuenta);
      pendientes.delete(elegidoCap.cap);
    }

    if(!fallo && seleccion.length===limite){
      const cumple=Object.keys(objetivo).every(tipo=>(cuenta[tipo]||0)===(objetivo[tipo]||0));
      if(cumple) return mezclar(seleccion);
    }
  }

  return null;
}

function seleccionar({hasta=45,cantidad=25}={}){
  const limite=Math.min(45,Math.max(1,Number.parseInt(hasta,10)||45));
  const max=Math.min(60,Math.max(1,Number.parseInt(cantidad,10)||25));
  const disponibles=BANCO.filter(p=>p.cap<=limite);
  const total=Math.min(max,disponibles.length);
  const cantidadPareados=disponibles.filter(p=>p.tipo==='pareados').length;
  const objetivo=cuotas(total,cantidadPareados);

  // Cuando el largo coincide con el capítulo máximo, la interfaz promete una
  // actividad por capítulo. Esta ruta mantiene esa cobertura exacta.
  if(total===limite){
    const coberturaCompleta=seleccionarCoberturaCompleta(disponibles,limite,objetivo);
    if(coberturaCompleta) return coberturaCompleta;
  }

  const usadas=new Set();
  const clavesUsadas=new Set();
  const gruposUsados=new Set();
  const seleccion=[];
  const cuenta={alternativa:0,verdadero_falso:0,abierta:0,pareados:0};
  const capitulosCubiertos=new Set();

  // Los pareados se seleccionan primero y se distribuyen entre capítulos máximos
  // diferentes siempre que el banco lo permita.
  const candidatosPareados=mezclar(disponibles.filter(p=>p.tipo==='pareados'));
  for(const p of candidatosPareados){
    if(cuenta.pareados>=objetivo.pareados) break;
    if(capitulosCubiertos.has(p.cap)) continue;
    if(!estaDisponible(p,usadas,clavesUsadas,gruposUsados)) continue;
    registrar(p,seleccion,usadas,clavesUsadas,gruposUsados,cuenta);
    capitulosCubiertos.add(p.cap);
  }
  for(const p of candidatosPareados){
    if(cuenta.pareados>=objetivo.pareados) break;
    if(!estaDisponible(p,usadas,clavesUsadas,gruposUsados)) continue;
    registrar(p,seleccion,usadas,clavesUsadas,gruposUsados,cuenta);
    capitulosCubiertos.add(p.cap);
  }

  // Primera vuelta: cubrir capítulos diferentes. Las preguntas multicapítulo
  // cuentan en el capítulo más alto necesario para responderlas.
  const tiposBase=secuenciaTipos(objetivo,['alternativa','verdadero_falso','abierta']);
  const capitulos=mezclar(Array.from({length:limite},(_,i)=>i+1).filter(cap=>!capitulosCubiertos.has(cap)));

  for(const cap of capitulos){
    if(seleccion.length>=total) break;
    const tipoDeseado=tiposBase.find(tipo=>(cuenta[tipo]||0)<(objetivo[tipo]||0)) || 'alternativa';
    const elegida=elegirDelCapitulo(
      cap,tipoDeseado,disponibles,usadas,clavesUsadas,gruposUsados,cuenta,objetivo
    );
    if(!elegida) continue;
    registrar(elegida,seleccion,usadas,clavesUsadas,gruposUsados,cuenta);
    capitulosCubiertos.add(cap);
    const posicion=tiposBase.indexOf(elegida.tipo);
    if(posicion>=0) tiposBase.splice(posicion,1);
  }

  // Segunda vuelta: completar las cuotas por tipo sin repetir id, texto o grupo.
  for(const tipo of ['alternativa','verdadero_falso','abierta','pareados']){
    let faltan=Math.max(0,(objetivo[tipo]||0)-(cuenta[tipo]||0));
    const candidatas=mezclar(disponibles.filter(p=>
      p.tipo===tipo && estaDisponible(p,usadas,clavesUsadas,gruposUsados)
    ));
    while(faltan>0 && candidatas.length){
      const p=candidatas.pop();
      if(!estaDisponible(p,usadas,clavesUsadas,gruposUsados)) continue;
      registrar(p,seleccion,usadas,clavesUsadas,gruposUsados,cuenta);
      faltan--;
    }
  }

  // Respaldo: completar el largo solicitado manteniendo el tope de pareados.
  if(seleccion.length<total){
    const restantes=mezclar(disponibles.filter(p=>
      estaDisponible(p,usadas,clavesUsadas,gruposUsados) &&
      (p.tipo!=='pareados' || cuenta.pareados<objetivo.pareados)
    ));
    while(seleccion.length<total && restantes.length){
      const p=restantes.pop();
      if(!estaDisponible(p,usadas,clavesUsadas,gruposUsados)) continue;
      if(p.tipo==='pareados' && cuenta.pareados>=objetivo.pareados) continue;
      registrar(p,seleccion,usadas,clavesUsadas,gruposUsados,cuenta);
    }
  }

  return mezclar(seleccion.slice(0,total));
}

module.exports={
  BANCO,CAPITULOS,mezclar,validarBanco,encontrar,limpiarParaCliente,seleccionar,tokenPareado
};
