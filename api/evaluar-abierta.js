'use strict';
const {soloMetodo,json,cuerpoJSON}=require('../lib/http');
const {verificarAcceso}=require('../lib/auth');
const {encontrar}=require('../lib/preguntas');
const {evaluarRespuestaAbierta}=require('../lib/ai-gateway');

module.exports=async function handler(req,res){
  if(!soloMetodo(req,res,'POST')) return;
  if(!verificarAcceso(req,res)) return;
  const body=cuerpoJSON(req);
  const p=encontrar(String(body.preguntaId || ''));
  if(!p || p.tipo!=='abierta') return json(res,404,{ok:false,error:'Pregunta abierta no encontrada.'});
  const respuesta=String(body.respuesta || '').trim();
  if(!respuesta) return json(res,400,{ok:false,error:'La respuesta está vacía.'});
  const pauta={respuestaModelo:p.respuestaModelo,criterios:p.criterios,puntosMaximos:Number(p.puntos)};

  try{
    const resultado=await evaluarRespuestaAbierta({
      pregunta:p.pregunta,
      respuesta,
      respuestaModelo:p.respuestaModelo,
      criterios:p.criterios,
      puntos:p.puntos
    },req);
    if(!resultado.configurada){
      return json(res,200,{ok:true,evaluado:false,motivo:'La IA no está configurada. La respuesta quedó pendiente de revisión docente.',pauta});
    }
    return json(res,200,{
      ok:true,
      evaluado:true,
      modelo:resultado.modelo,
      autenticacion:resultado.autenticacion,
      evaluacion:resultado.evaluacion,
      pauta
    });
  }catch(error){
    console.error('Error al evaluar respuesta abierta:',error);
    return json(res,200,{
      ok:true,
      evaluado:false,
      motivo:'No fue posible obtener la evaluación automática. La respuesta quedó pendiente de revisión docente.',
      detalle:process.env.NODE_ENV==='development'?error.message:undefined,
      pauta
    });
  }
};
