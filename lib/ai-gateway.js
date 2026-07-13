'use strict';

const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/responses';
const MODELO_PREDETERMINADO = 'google/gemini-3.1-flash-lite';

function obtenerCredencial(){
  // En Vercel, VERCEL_OIDC_TOKEN es generado automáticamente para el proyecto.
  // AI_GATEWAY_API_KEY queda como alternativa para desarrollo local o despliegues externos.
  return process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || '';
}

function modoAutenticacion(){
  if(process.env.AI_GATEWAY_API_KEY) return 'api_key';
  if(process.env.VERCEL_OIDC_TOKEN) return 'oidc';
  return 'ninguno';
}

function modeloConfigurado(){
  return process.env.AI_GATEWAY_MODEL || MODELO_PREDETERMINADO;
}

function extraerTexto(payload){
  if(typeof payload?.output_text === 'string' && payload.output_text.trim()){
    return payload.output_text.trim();
  }

  for(const item of payload?.output || []){
    for(const contenido of item?.content || []){
      if(typeof contenido?.text === 'string' && contenido.text.trim()){
        return contenido.text.trim();
      }
      if(typeof contenido?.output_text === 'string' && contenido.output_text.trim()){
        return contenido.output_text.trim();
      }
    }
  }

  return '';
}

function esquemaEvaluacion(maximo){
  return {
    type:'object',
    additionalProperties:false,
    properties:{
      puntaje:{type:'integer',minimum:0,maximum:maximo},
      nivel:{type:'string',enum:['logrado','parcial','insuficiente']},
      retroalimentacion:{type:'string'},
      fortalezas:{type:'array',items:{type:'string'},maxItems:3},
      porMejorar:{type:'array',items:{type:'string'},maxItems:3},
      confianza:{type:'string',enum:['alta','media','baja']},
      requiereRevisionDocente:{type:'boolean'}
    },
    required:[
      'puntaje',
      'nivel',
      'retroalimentacion',
      'fortalezas',
      'porMejorar',
      'confianza',
      'requiereRevisionDocente'
    ]
  };
}

function crearErrorGateway(respuesta, payload){
  const mensaje = payload?.error?.message ||
    payload?.message ||
    `Vercel AI Gateway respondió con estado ${respuesta.status}.`;

  const error = new Error(mensaje);
  error.status = respuesta.status;
  error.tipo = payload?.error?.type || null;
  return error;
}

async function solicitarGateway(cuerpo){
  const token = obtenerCredencial();
  if(!token) return {configurada:false};

  const respuesta = await fetch(GATEWAY_URL, {
    method:'POST',
    headers:{
      Authorization:`Bearer ${token}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify(cuerpo)
  });

  const payload = await respuesta.json().catch(() => ({}));
  if(!respuesta.ok) throw crearErrorGateway(respuesta, payload);

  return {
    configurada:true,
    payload,
    modelo:cuerpo.model,
    autenticacion:modoAutenticacion()
  };
}

async function evaluarRespuestaAbierta({pregunta,respuesta,respuestaModelo,criterios,puntos}){
  const token = obtenerCredencial();
  if(!token) return {configurada:false};

  const maximo = Math.max(1, Number(puntos) || 1);
  const modelo = modeloConfigurado();

  const instrucciones = [
    'Eres un corrector de comprensión lectora para un estudiante chileno de 10 años, quinto básico.',
    'Evalúa exclusivamente con la pauta entregada.',
    'Acepta paráfrasis, sinónimos y respuestas breves que demuestren comprensión.',
    'No exijas coincidencia literal con la respuesta modelo.',
    'No descuentas por ortografía o puntuación salvo que impidan comprender la idea.',
    'Si hay ambigüedad, contradicciones o la pauta no permite decidir con seguridad, baja la confianza y exige revisión docente.',
    'La retroalimentación debe ser clara, concreta, respetuosa y de máximo 70 palabras.',
    'No incluyas datos personales ni información ajena a la evaluación.'
  ].join(' ');

  const datos = {
    pregunta,
    respuestaDelEstudiante:respuesta,
    respuestaModelo,
    criterios,
    puntajeMaximo:maximo
  };

  const cuerpo = {
    model:modelo,
    instructions:instrucciones,
    input:JSON.stringify(datos),
    store:false,
    reasoning:{effort:'minimal'},
    temperature:0.1,
    text:{
      format:{
        type:'json_schema',
        name:'evaluacion_respuesta_abierta',
        strict:true,
        schema:esquemaEvaluacion(maximo)
      }
    },
    max_output_tokens:500
  };

  const resultado = await solicitarGateway(cuerpo);
  if(!resultado.configurada) return resultado;

  const texto = extraerTexto(resultado.payload);
  if(!texto) throw new Error('La IA no devolvió una evaluación legible.');

  let evaluacion;
  try{
    evaluacion = JSON.parse(texto);
  }catch(_){
    throw new Error('La IA devolvió un formato inválido.');
  }

  evaluacion.puntaje = Math.min(
    maximo,
    Math.max(0, Math.round(Number(evaluacion.puntaje) || 0))
  );

  return {
    configurada:true,
    modelo:resultado.modelo,
    autenticacion:resultado.autenticacion,
    evaluacion,
    idRespuesta:resultado.payload.id || null
  };
}

async function probarConexion(){
  const modelo = modeloConfigurado();
  const resultado = await solicitarGateway({
    model:modelo,
    instructions:'Responde únicamente con el JSON solicitado.',
    input:'Confirma que el servicio está operativo.',
    store:false,
    reasoning:{effort:'minimal'},
    temperature:0,
    text:{
      format:{
        type:'json_schema',
        name:'estado_gateway',
        strict:true,
        schema:{
          type:'object',
          additionalProperties:false,
          properties:{operativo:{type:'boolean'}},
          required:['operativo']
        }
      }
    },
    max_output_tokens:50
  });

  if(!resultado.configurada) return resultado;
  const texto = extraerTexto(resultado.payload);
  let datos = null;
  try{ datos = JSON.parse(texto); }catch(_){ /* diagnóstico solamente */ }

  return {
    configurada:true,
    modelo:resultado.modelo,
    autenticacion:resultado.autenticacion,
    operativo:Boolean(datos?.operativo),
    idRespuesta:resultado.payload.id || null
  };
}

module.exports = {
  MODELO_PREDETERMINADO,
  obtenerCredencial,
  modoAutenticacion,
  modeloConfigurado,
  evaluarRespuestaAbierta,
  probarConexion
};
