'use strict';
const {soloMetodo,json,cuerpoJSON}=require('../lib/http');
const {verificarAcceso}=require('../lib/auth');
const {encontrar}=require('../lib/preguntas');

module.exports=function handler(req,res){
  if(!soloMetodo(req,res,'POST')) return;
  if(!verificarAcceso(req,res)) return;
  const body=cuerpoJSON(req);
  const p=encontrar(String(body.preguntaId || ''));
  if(!p || !['alternativa','verdadero_falso'].includes(p.tipo)) return json(res,404,{ok:false,error:'Pregunta cerrada no encontrada.'});

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
