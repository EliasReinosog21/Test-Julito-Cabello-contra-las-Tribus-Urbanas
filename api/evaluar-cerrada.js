'use strict';
const {soloMetodo,json,cuerpoJSON}=require('../lib/http');
const {verificarAcceso}=require('../lib/auth');
const {encontrar,tokenPareado}=require('../lib/preguntas');

module.exports=function handler(req,res){
  if(!soloMetodo(req,res,'POST')) return;
  if(!verificarAcceso(req,res)) return;

  const body=cuerpoJSON(req);
  const p=encontrar(String(body.preguntaId || ''));
  if(!p || !['alternativa','verdadero_falso','pareados'].includes(p.tipo)){
    return json(res,404,{ok:false,error:'Pregunta cerrada no encontrada.'});
  }

  if(p.tipo==='pareados'){
    const respuestas=body.respuesta && typeof body.respuesta==='object' && !Array.isArray(body.respuesta)
      ? body.respuesta
      : {};

    const detalle=p.pares.map(par=>{
      const izquierdaId=tokenPareado(p.id,par.id,'izquierda');
      const derechaCorrectaId=tokenPareado(p.id,par.id,'derecha');
      const seleccionadaId=String(respuestas[izquierdaId] || '');
      const parSeleccionado=p.pares.find(candidato=>
        tokenPareado(p.id,candidato.id,'derecha')===seleccionadaId
      );
      const correcta=seleccionadaId===derechaCorrectaId;

      return {
        id:izquierdaId,
        izquierda:par.izquierda,
        seleccionada:parSeleccionado?.derecha || 'Sin respuesta',
        correcta,
        respuestaCorrecta:par.derecha
      };
    });

    const correctas=detalle.filter(item=>item.correcta).length;
    const total=p.pares.length;

    return json(res,200,{
      ok:true,
      correcta:correctas===total,
      puntosObtenidos:correctas,
      puntosMaximos:total,
      correctas,
      total,
      detalle,
      respuestaCorrecta:`${correctas} de ${total} relaciones correctas`,
      explicacion:p.explicacion
    });
  }

  let correcta=false;
  let respuestaCorrecta='';

  if(p.tipo==='alternativa'){
    const valor=Number(body.respuesta);
    correcta=Number.isInteger(valor) && valor===p.correcta;
    respuestaCorrecta=p.opciones[p.correcta];
  }else{
    const valor=body.respuesta===true || body.respuesta==='true';
    correcta=valor===p.correcta;
    respuestaCorrecta=p.correcta?'Verdadero':'Falso';
  }

  return json(res,200,{
    ok:true,
    correcta,
    puntosObtenidos:correcta?Number(p.puntos):0,
    puntosMaximos:Number(p.puntos),
    respuestaCorrecta,
    explicacion:p.explicacion
  });
};
