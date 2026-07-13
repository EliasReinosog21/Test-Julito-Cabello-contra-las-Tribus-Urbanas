'use strict';

function aplicarCabeceras(res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
}

function json(res,status,payload){
  aplicarCabeceras(res);
  res.status(status).json(payload);
}

function soloMetodo(req,res,metodo){
  if(req.method===metodo) return true;
  res.setHeader('Allow',metodo);
  json(res,405,{ok:false,error:`Método no permitido. Usa ${metodo}.`});
  return false;
}

function cuerpoJSON(req){
  if(req.body && typeof req.body==='object') return req.body;
  if(typeof req.body==='string'){
    try{return JSON.parse(req.body);}catch(_){return {};}
  }
  return {};
}

module.exports={aplicarCabeceras,json,soloMetodo,cuerpoJSON};
