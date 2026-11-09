importScripts('./innovae-frio-model.js?v=2.0.0');
self.onmessage = ({data}) => {
  try { self.postMessage({id:data.id,result:FrioModel.monteCarlo(data.records,data.config,data.options,data.own,data.manual)}); }
  catch(error) { self.postMessage({id:data.id,error:error.message}); }
};
