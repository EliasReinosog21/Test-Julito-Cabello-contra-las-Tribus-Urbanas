'use strict';

const BANCO = require('../data/preguntas');
const CAPITULOS = require('../data/capitulos');

const TIPOS_VALIDOS = new Set(['alternativa','verdadero_falso','abierta']);
const HABILIDADES_VALIDAS = new Set(['literal','inferencial','personajes','acontecimientos','vocabulario','reflexion']);

function mezclar(lista){
  const salida=[...lista];
  for(let i=salida.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [salida[i],salida[j]]=[salida[j],salida[i]];
  }
  return salida;
}

function validarBanco(){
  const errores=[];
  const ids=new Set();
  const porCapitulo=Object.fromEntries(CAPITULOS.map(([n])=>[n,{alternativa:0,verdadero_falso:0,abierta:0}]));

  BANCO.forEach((p,indice)=>{
    const etiqueta=`Pregunta ${indice+1}${p?.id?` (${p.id})`:''}`;
    if(!p || typeof p!=='object'){errores.push(`${etiqueta}: registro inválido.`);return;}
    if(!p.id || typeof p.id!=='string') errores.push(`${etiqueta}: falta id.`);
    else if(ids.has(p.id)) errores.push(`${etiqueta}: id duplicado.`);
    else ids.add(p.id);
    if(!TIPOS_VALIDOS.has(p.tipo)) errores.push(`${etiqueta}: tipo inválido.`);
    if(!Number.isInteger(p.cap) || p.cap<1 || p.cap>45) errores.push(`${etiqueta}: capítulo inválido.`);
    if(!HABILIDADES_VALIDAS.has(p.habilidad)) errores.push(`${etiqueta}: habilidad inválida.`);
    if(!Number.isFinite(Number(p.puntos)) || Number(p.puntos)<1) errores.push(`${etiqueta}: puntaje inválido.`);

    if(p.tipo==='alternativa'){
      if(!p.pregunta || !Array.isArray(p.opciones) || p.opciones.length<2) errores.push(`${etiqueta}: alternativa incompleta.`);
      if(!Number.isInteger(p.correcta) || p.correcta<0 || p.correcta>=p.opciones?.length) errores.push(`${etiqueta}: índice correcto inválido.`);
      if(!p.explicacion) errores.push(`${etiqueta}: falta explicación.`);
    }
    if(p.tipo==='verdadero_falso'){
      if(!p.afirmacion || typeof p.correcta!=='boolean') errores.push(`${etiqueta}: verdadero/falso incompleto.`);
      if(!p.explicacion) errores.push(`${etiqueta}: falta explicación.`);
    }
    if(p.tipo==='abierta'){
      if(!p.pregunta || !p.respuestaModelo || !Array.isArray(p.criterios) || !p.criterios.length) errores.push(`${etiqueta}: pregunta abierta incompleta.`);
    }
    if(porCapitulo[p.cap]?.[p.tipo]!==undefined) porCapitulo[p.cap][p.tipo]++;
  });

  for(const [cap,cuentas] of Object.entries(porCapitulo)){
    for(const tipo of TIPOS_VALIDOS){
      if(!cuentas[tipo]) errores.push(`Capítulo ${cap}: falta al menos una pregunta de tipo ${tipo}.`);
    }
  }
  return {ok:errores.length===0,errores,total:BANCO.length,porCapitulo};
}

function encontrar(id){
  return BANCO.find(p=>p.id===id) || null;
}

function limpiarParaCliente(p){
  const base={
    id:p.id,
    tipo:p.tipo,
    cap:p.cap,
    habilidad:p.habilidad,
    puntos:Number(p.puntos)
  };
  if(p.tipo==='alternativa'){
    const opciones=mezclar(p.opciones.map((texto,valor)=>({valor,texto})));
    return {...base,pregunta:p.pregunta,opciones};
  }
  if(p.tipo==='verdadero_falso') return {...base,pregunta:p.afirmacion};
  return {...base,pregunta:p.pregunta};
}

function cuotas(total){
  if(total<=2) return {alternativa:1,verdadero_falso:total-1,abierta:0};
  const abierta=Math.max(1,Math.round(total*0.25));
  const verdadero_falso=Math.max(1,Math.round(total*0.25));
  const alternativa=Math.max(1,total-abierta-verdadero_falso);
  return {alternativa,verdadero_falso,abierta};
}

function secuenciaTipos(objetivo){
  const lista=[];
  for(const tipo of ['alternativa','verdadero_falso','abierta']){
    for(let i=0;i<objetivo[tipo];i++) lista.push(tipo);
  }
  return mezclar(lista);
}

function elegirDelCapitulo(cap,tipo,usadas){
  const candidatas=BANCO.filter(p=>p.cap===cap && p.tipo===tipo && !usadas.has(p.id));
  if(candidatas.length) return mezclar(candidatas)[0];
  const reemplazo=BANCO.filter(p=>p.cap===cap && !usadas.has(p.id));
  return reemplazo.length?mezclar(reemplazo)[0]:null;
}

function seleccionar({hasta=45,cantidad=25}={}){
  const limite=Math.min(45,Math.max(1,Number.parseInt(hasta,10)||45));
  const max=Math.min(60,Math.max(1,Number.parseInt(cantidad,10)||25));
  const disponibles=BANCO.filter(p=>p.cap<=limite);
  const total=Math.min(max,disponibles.length);
  const objetivo=cuotas(total);
  const tipos=secuenciaTipos(objetivo);
  const usadas=new Set();
  const seleccion=[];

  // Primera vuelta: cubrir tantos capítulos diferentes como permita el largo del test.
  const capitulos=mezclar(Array.from({length:limite},(_,i)=>i+1));
  const cobertura=Math.min(total,limite);
  for(let i=0;i<cobertura;i++){
    const tipo=tipos[i] || 'alternativa';
    const elegida=elegirDelCapitulo(capitulos[i],tipo,usadas);
    if(elegida){seleccion.push(elegida);usadas.add(elegida.id);}
  }

  // Segunda vuelta: completar manteniendo las cuotas globales por tipo.
  const cuenta={alternativa:0,verdadero_falso:0,abierta:0};
  seleccion.forEach(p=>cuenta[p.tipo]++);
  for(const tipo of ['alternativa','verdadero_falso','abierta']){
    let faltan=Math.max(0,objetivo[tipo]-cuenta[tipo]);
    const candidatas=mezclar(disponibles.filter(p=>p.tipo===tipo && !usadas.has(p.id)));
    while(faltan>0 && candidatas.length){
      const p=candidatas.pop();seleccion.push(p);usadas.add(p.id);faltan--;
    }
  }

  // Respaldo por si un banco futuro no permite cumplir alguna cuota.
  if(seleccion.length<total){
    const restantes=mezclar(disponibles.filter(p=>!usadas.has(p.id)));
    while(seleccion.length<total && restantes.length){seleccion.push(restantes.pop());}
  }
  return mezclar(seleccion.slice(0,total));
}

module.exports={BANCO,CAPITULOS,mezclar,validarBanco,encontrar,limpiarParaCliente,seleccionar};
