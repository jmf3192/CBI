export const isLegacyRecord=row=>row.record_type==='feder_operation';
export function mergeHistoryRecords(awards,operations){
 const ids=new Set(awards.map(row=>row.id));
 for(const row of operations){
  if(!isLegacyRecord(row)||!Number.isInteger(row.year)||row.year<2017||row.year>2020||row.status!=='operacion_feder')throw Error('Registro FEDER antiguo no válido.');
  if(ids.has(row.id))throw Error('Registro histórico duplicado: '+row.id);ids.add(row.id);
  if(row.granted_amount!==null||row.eligible_budget!==null||row.score!==null)throw Error('Una operación FEDER no puede incorporarse como concesión o puntuación PAIP.');
 }
 return [...awards,...operations];
}
