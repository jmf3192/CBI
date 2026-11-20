import { CBI } from './cbi-supabase.js?v=20261120';

const $ = (selector) => document.querySelector(selector);
const form = $('#application-form');
let access, selectedId = null, drafts = [], editions = [];
const message = (text) => { $('#status').textContent = text; };
const money = new Intl.NumberFormat('es-ES', {style:'currency', currency:'EUR'});
const fields = ['company_name','project_name','application_year','province','requested_budget','notes'];
const request = (path, options = {}) => CBI.request(`/rest/v1/${path}`, {...options, session:access.session});

function selectTab(name, focus = false) {
  document.querySelectorAll('[data-tab]').forEach(button => {
    const selected = button.dataset.tab === name;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
    $(`#panel-${button.dataset.tab}`).hidden = !selected;
  });
}
document.querySelectorAll('[data-tab]').forEach(button => {
  button.addEventListener('click', () => selectTab(button.dataset.tab));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    selectTab(event.key === 'Home' ? 'request' : event.key === 'End' ? 'history' : button.dataset.tab === 'request' ? 'history' : 'request', true);
  });
});
function openDraft(draft = null) {
  selectedId = draft?.id || null;
  form.reset();
  form.elements.application_year.value = new Date().getFullYear();
  if (draft) fields.forEach(name => { form.elements[name].value = draft[name] ?? ''; });
  renderDrafts();
}
function renderDrafts() {
  const container = $('#drafts');
  container.replaceChildren();
  if (!drafts.length) container.textContent = 'Aún no hay borradores guardados.';
  drafts.forEach(draft => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'draft';
    button.textContent = `${draft.application_year} · ${draft.project_name}`;
    button.setAttribute('aria-current', String(draft.id === selectedId));
    button.addEventListener('click', () => openDraft(draft));
    container.append(button);
  });
}
$('#new-request').addEventListener('click', () => { openDraft(); message('Nueva solicitud. Completa los datos y guarda el borrador.'); });
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!access || !form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  values.application_year = Number(values.application_year);
  values.requested_budget = Number(values.requested_budget);
  values.company_name = values.company_name.trim(); values.project_name = values.project_name.trim();
  if (!values.company_name || !values.project_name) { message('Completa la empresa y el proyecto.'); return; }
  $('#application-fields').disabled = true; $('#new-request').disabled = true;
  try {
    const path = selectedId ? `paid_aragon_applications?id=eq.${encodeURIComponent(selectedId)}&select=*` : 'paid_aragon_applications?select=*';
    const rows = await request(path, {method:selectedId ? 'PATCH' : 'POST', headers:{Prefer:'return=representation'}, body:values});
    if (!rows?.[0]) throw Error('El borrador no se ha guardado. Revisa los permisos.');
    const draft = rows[0]; drafts = [draft,...drafts.filter(item => item.id !== draft.id)];
    openDraft(draft); message('Borrador guardado en CBI.');
  } catch (error) { message(`No se ha podido guardar: ${error.message}`); }
  finally { $('#application-fields').disabled = false; $('#new-request').disabled = false; }
});
let historyRequest = 0;
async function loadHistory() {
  const generation = ++historyRequest;
  $('#history-status').textContent = 'Cargando históricos…';
  $('#history-rows').replaceChildren();
  try {
    const yearId = $('#history-year').value;
    const filter = yearId ? `&edition_id=eq.${encodeURIComponent(yearId)}` : '';
    const rows = await request(`paid_aragon_awards?select=*&order=created_at.desc,id.asc&limit=201${filter}`);
    if (generation !== historyRequest) return;
    rows.slice(0,200).forEach(row => {
      const tr = document.createElement('tr');
      const edition = editions.find(item => item.id === row.edition_id);
      [edition?.year ?? '—',row.beneficiary,row.project_title || '—',row.province || '—',row.granted_amount === null ? '—' : money.format(row.granted_amount)].forEach(value => {
        const td = document.createElement('td'); td.textContent = value; tr.append(td);
      });
      const td = document.createElement('td');
      try {
        const url = new URL(row.source_url || edition?.source_url);
        if (['https:','http:'].includes(url.protocol)) {
          const a = document.createElement('a'); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Consultar'; td.append(a);
        } else td.textContent = '—';
      } catch { td.textContent = '—'; }
      tr.append(td); $('#history-rows').append(tr);
    });
    $('#history-status').textContent = rows.length > 200 ? 'Se muestran los primeros 200 registros. Filtra por año para acotar la consulta.' : rows.length ? `${rows.length} registros.` : 'No hay registros para esta selección. Pendiente de incorporar fuentes históricas.';
  } catch(error) { if (generation === historyRequest) $('#history-status').textContent = `No se han podido cargar los históricos: ${error.message}`; }
}
$('#history-year').addEventListener('change', loadHistory);
document.addEventListener('cbi:access-granted', async event => {
  access = event.detail;
  openDraft();
  try {
    const permissions = await request(`user_call_access?select=access_level&user_id=eq.${encodeURIComponent(access.session.user.id)}&call_id=eq.${encodeURIComponent(access.call.id)}`);
    const canWrite = ['evaluate','admin'].includes(permissions[0]?.access_level);
    $('#application-fields').disabled = !canWrite; $('#new-request').disabled = !canWrite;
    [drafts, editions] = await Promise.all([
      request('paid_aragon_applications?select=*&status=eq.draft&order=updated_at.desc&limit=200'),
      request('paid_aragon_editions?select=*&order=year.desc')
    ]);
    renderDrafts();
    editions.forEach(edition => {
      const option = document.createElement('option'); option.value = edition.id; option.textContent = edition.year; $('#history-year').append(option);
    });
    message(canWrite ? 'Listo para configurar tu solicitud.' : 'Acceso de consulta. Solicita permiso de edición para guardar borradores.');
    await loadHistory();
  } catch(error) { $('#application-fields').disabled = true; $('#new-request').disabled = true; message(`No se ha podido cargar el panel: ${error.message}. Recarga para reintentar.`); }
}, {once:true});
