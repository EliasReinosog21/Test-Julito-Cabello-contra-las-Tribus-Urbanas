'use strict';
const {soloMetodo,json}=require('../lib/http');
const {verificarAcceso}=require('../lib/auth');
const {seleccionar,limpiarParaCliente,validarBanco}=require('../lib/preguntas');

module.exports=function handler(req,res){
  if(!soloMetodo(req,res,'GET')) return;
  if(!verificarAcceso(req,res)) return;
  const validacion=validarBanco();
  if(!validacion.ok) return json(res,500,{ok:false,error:'El banco de preguntas no superó la validación interna.'});
  const hasta=req.query?.hasta;
  const cantidad=req.query?.cantidad;
  const seleccion=seleccionar({hasta,cantidad}).map(limpiarParaCliente);
  return json(res,200,{ok:true,preguntas:seleccion,totalBanco:validacion.total});
};
