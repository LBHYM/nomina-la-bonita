// Nómina La Bonita — app sin backend (localStorage)

const EMPLEADAS = ["Lupita", "Paulina", "Angelica", "Lisa"];

const CONFIG = {
  pagoPorHora: 40,
  pagoPorVideo: 20,
  bonoPuntualidadQuincena: 50,
  descuentoPlayera: 25,
  horasLunesPagado: 4,
};

const LS_RECORDS = "lb_nomina_records_v1";
const LS_BONOS = "lb_nomina_bonos_v1";
const LS_BONOS_AMT = "lb_nomina_bonos_amt_v1";
const LS_PLAYERA_PLAN = "lb_nomina_playera_plan_v1";
const LS_API_URL = "lb_nomina_api_url_v1";
const LS_API_KEY = "lb_nomina_api_key_v1";

function on(id, evt, fn){ const el = $(id); if(el) el.addEventListener(evt, fn); }

function $(id){ return document.getElementById(id); }

function toISODate(d){
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseISODate(s){
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m-1, d);
}

function endOfMonth(date){
  return new Date(date.getFullYear(), date.getMonth()+1, 0);
}

function minutesFromHHMM(hhmm){
  if(!hhmm) return null;
  const [h,m] = hhmm.split(":").map(Number);
  if(Number.isNaN(h) || Number.isNaN(m)) return null;
  return h*60 + m;
}

function roundToQuarterHours(minutes){
  if(minutes == null || minutes <= 0) return 0;
  const floored = Math.floor(minutes/15)*15; // 0–14 no cuenta
  return floored/60;
}

function currency(n){
  return Number(n||0).toLocaleString("es-MX", {style:"currency", currency:"MXN", minimumFractionDigits:2});
}

function daysBetweenInclusive(start, end){
  const a = new Date(start); const b = new Date(end);
  a.setHours(0,0,0,0); b.setHours(0,0,0,0);
  const days = Math.floor((b-a)/(1000*60*60*24));
  return days+1;
}

function countMondaysInclusive(start, end){
  const total = daysBetweenInclusive(start,end);
  let c=0;
  for(let i=0;i<total;i++){
    const d = new Date(start);
    d.setDate(d.getDate()+i);
    if(d.getDay()===1) c++;
  }
  return c;
}

function getQuincenaRange(year, monthIndex, mode){
  // monthIndex 0-11
  if(mode === "1-15"){
    return { start: new Date(year, monthIndex, 1), end: new Date(year, monthIndex, 15) };
  }
  const start = new Date(year, monthIndex, 16);
  return { start, end: endOfMonth(start) };
}

function loadRecords(){
  try{ return JSON.parse(localStorage.getItem(LS_RECORDS) || "[]"); }
  catch{ return []; }
}

function saveRecords(records){
  localStorage.setItem(LS_RECORDS, JSON.stringify(records));
}

function loadBonos(){
  const base = { Lupita:true, Paulina:false, Angelica:false, Lisa:false };
  try{ return {...base, ...(JSON.parse(localStorage.getItem(LS_BONOS) || "{}"))}; }
  catch{ return base; }
}

function saveBonos(bonos){
  localStorage.setItem(LS_BONOS, JSON.stringify(bonos));
}

function loadBonosAmt(){
  const base = { Lupita:50, Paulina:50, Angelica:50, Lisa:50 };
  try{ return {...base, ...(JSON.parse(localStorage.getItem(LS_BONOS_AMT) || "{}"))}; }
  catch{ return base; }
}

function saveBonosAmt(bonosAmt){
  localStorage.setItem(LS_BONOS_AMT, JSON.stringify(bonosAmt));
}

function loadPlayeraPlan(){
  const base = {};
  EMPLEADAS.forEach(n=>{
    base[n] = { costoTotal: 0, mitadEmpleado: 0, saldoEmpleado: 0 };
  });
  try{
    const saved = JSON.parse(localStorage.getItem(LS_PLAYERA_PLAN) || "{}");
    const out = { ...base };
    Object.keys(out).forEach(n=>{
      if(saved[n]){
        out[n] = { ...out[n], ...saved[n] };
      }
    });
    return out;
  }catch{
    return base;
  }
}

function loadApiUrl(){
  return localStorage.getItem(LS_API_URL) || "";
}
function saveApiUrl(v){
  localStorage.setItem(LS_API_URL, v || "");
}
function loadApiKey(){
  return localStorage.getItem(LS_API_KEY) || "";
}
function saveApiKey(v){
  localStorage.setItem(LS_API_KEY, v || "");
}

function savePlayeraPlan(plan){
  localStorage.setItem(LS_PLAYERA_PLAN, JSON.stringify(plan));
}

function computeRecord(r){
  const inMin = minutesFromHHMM(r.entrada);
  const outMin = minutesFromHHMM(r.salida);
  let workedMin = 0;
  if(inMin != null && outMin != null){
    workedMin = outMin - inMin;
    // si se cruzara medianoche (raro), lo ajustamos
    if(workedMin < 0) workedMin += 24*60;
  }
  const horas = roundToQuarterHours(workedMin);
  const pagoHoras = horas * CONFIG.pagoPorHora;
  const pagoVideo = r.video ? CONFIG.pagoPorVideo : 0;
  const descPlayera = r.playera ? CONFIG.descuentoPlayera : 0;
  const totalDia = pagoHoras + pagoVideo - descPlayera;

  return { workedMin, horas, pagoHoras, pagoVideo, descPlayera, totalDia };
}

function buildReciboSelect(){
  const sel = $("reciboEmpleado");
  if(!sel) return;
  sel.innerHTML = "";
  EMPLEADAS.forEach(n=>{
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = n;
    sel.appendChild(opt);
  });
}

function buildBonosUI(bonos, bonosAmt){
  const wrap = $("bonosUI");
  wrap.innerHTML = "";

  EMPLEADAS.forEach((name)=>{
    const row = document.createElement("div");
    row.className = "bonoRow";

    const left = document.createElement("div");
    left.className = "name";
    left.textContent = name;

    const right = document.createElement("div");
    right.className = "toggle";

    // Switch Sí/No
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = name === "Lupita" ? true : !!bonos[name];
    cb.disabled = name === "Lupita";

    const txt = document.createElement("span");
    txt.textContent = cb.checked ? "Sí" : "No";

    cb.addEventListener("change", ()=>{
      bonos[name] = cb.checked;
      saveBonos(bonos);
      render();
    });

    // Amount
    const amt = document.createElement("input");
    amt.type = "number";
    amt.min = "0";
    amt.step = "1";
    amt.value = String(bonosAmt[name] ?? 50);
    amt.style.width = "92px";
    amt.style.height = "34px";
    amt.style.borderRadius = "12px";
    amt.style.border = "1px solid rgba(90,59,46,.14)";
    amt.style.padding = "0 10px";
    amt.style.fontWeight = "900";
    amt.title = "Monto del bono para esta quincena";

    amt.addEventListener("input", ()=>{
      const v = Number(amt.value || 0);
      bonosAmt[name] = v;
      saveBonosAmt(bonosAmt);
      render();
    });

    const peso = document.createElement("span");
    peso.textContent = "$";
    peso.style.fontWeight = "900";
    peso.style.color = "#5A3B2E";

    right.appendChild(cb);
    right.appendChild(txt);

    // Lupita: bono siempre, pero monto editable
    const amtWrap = document.createElement("div");
    amtWrap.style.display = "flex";
    amtWrap.style.alignItems = "center";
    amtWrap.style.gap = "6px";
    amtWrap.style.marginLeft = "10px";
    amtWrap.appendChild(peso);
    amtWrap.appendChild(amt);

    row.appendChild(left);
    row.appendChild(right);
    row.appendChild(amtWrap);

    wrap.appendChild(row);
  });
}

function renderRegistro(records){
  const body = $("registroBody");
  body.innerHTML = "";

  const sorted = [...records].sort((a,b)=> a.fecha < b.fecha ? 1 : -1);

  sorted.forEach((r)=>{
    const c = computeRecord(r);
    const tr = document.createElement("tr");

    const cells = [
      r.fecha,
      r.empleada,
      r.entrada,
      r.salida,
      c.horas.toFixed(2),
      currency(c.pagoHoras),
      r.video ? "Sí" : "No",
      r.playera ? "Sí" : "No",
      r.notas || "",
    ];

    cells.forEach((val, idx)=>{
      const td = document.createElement("td");
      td.textContent = val;
      if([2,3,4,5,6,7].includes(idx)) td.className = "num";
      tr.appendChild(td);
    });

    const tdAction = document.createElement("td");
    tdAction.className = "num";

    const btnEdit = document.createElement("button");
    btnEdit.className = "iconBtn";
    btnEdit.textContent = "Editar";
    btnEdit.style.marginRight = "8px";
    btnEdit.addEventListener("click", ()=>{
      // Cargar datos al formulario para editar
      window.__LB_EDIT_ID__ = r.id;
      $("fecha").value = r.fecha;
      $("empleada").value = r.empleada;
      $("entrada").value = r.entrada;
      $("salida").value = r.salida;
      $("videos").value = Number(r.videos || 0);
      $("playeraAplicar").checked = !!r.playeraAplicar;
      $("playeraCosto").value = Number(r.playeraCosto || 0);
      $("notas").value = r.notas || "";
      previewFromForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
      $("btnAdd").textContent = "Guardar cambios";
      $("btnAdd").classList.add("btnWarn");
    });

    const btn = document.createElement("button");
    btn.className = "iconBtn iconBtnDanger";
    btn.textContent = "Eliminar";
    btn.addEventListener("click", ()=>{
      const ok = confirm(`¿Eliminar el registro de ${r.empleada} del ${r.fecha}?`);
      if(!ok) return;
      const next = records.filter(x=> x.id !== r.id);
      saveRecords(next);
      render();
    });

    tdAction.appendChild(btnEdit);
    tdAction.appendChild(btn);
    tr.appendChild(tdAction);

    body.appendChild(tr);
  });
}

function renderNomina(records, bonos, bonosAmt){
  const mesVal = $("mes").value; // YYYY-MM
  const mode = $("quincena").value;

  if(!mesVal){
    $("nominaBody").innerHTML = "";
    $("rangeText").textContent = "Selecciona el mes";
    $("totalNomina").textContent = currency(0);
    $("totalVideos").textContent = currency(0);
    $("totalPlayeras").textContent = currency(0);
    return;
  }

  const [y, m] = mesVal.split("-").map(Number);
  const range = getQuincenaRange(y, m-1, mode);
  const start = range.start.getTime();
  const end = range.end.getTime();

  $("rangeText").textContent = `Periodo: ${toISODate(range.start)} → ${toISODate(range.end)}`;

  const inRange = records.filter((r)=>{
    const t = parseISODate(r.fecha).getTime();
    return t>=start && t<=end;
  });

  const mondays = countMondaysInclusive(range.start, range.end);

  let totalNomina = 0;
  let totalVideos = 0;
  let totalPlayeras = 0;

  const body = $("nominaBody");
  body.innerHTML = "";

  EMPLEADAS.forEach((name)=>{
    const rows = inRange.filter(r=> r.empleada === name);

    const horas = rows.reduce((acc, r)=> acc + computeRecord(r).horas, 0);
    const pagoHoras = horas * CONFIG.pagoPorHora;

    const horasLunes = mondays * CONFIG.horasLunesPagado;
    const pagoLunes = horasLunes * CONFIG.pagoPorHora;

    const videos = rows.reduce((acc, r)=> acc + (r.video?1:0), 0);
    const pagoVideos = videos * CONFIG.pagoPorVideo;

    const playeras = rows.reduce((acc, r)=> acc + (r.playera?1:0), 0);
    const descPlayera = playeras * CONFIG.descuentoPlayera;

    const amt = Number((bonosAmt && bonosAmt[name] != null) ? bonosAmt[name] : CONFIG.bonoPuntualidadQuincena);
    const bono = (name === "Lupita") ? amt : (bonos[name] ? amt : 0);

    const total = (pagoHoras + pagoLunes) + pagoVideos + bono - descPlayera;

    totalNomina += total;
    totalVideos += pagoVideos;
    totalPlayeras += descPlayera;

    const tr = document.createElement("tr");

    const cells = [
      name,
      horas.toFixed(2),
      `${mondays} lunes`,
      currency(pagoHoras + pagoLunes),
      videos,
      currency(pagoVideos),
      currency(descPlayera),
      currency(bono),
      currency(total),
    ];

    cells.forEach((val, idx)=>{
      const td = document.createElement("td");
      td.textContent = val;
      if(idx>=1) td.className = "num";
      tr.appendChild(td);
    });

    body.appendChild(tr);
  });

  $("totalNomina").textContent = currency(totalNomina);
  $("totalVideos").textContent = currency(totalVideos);
  $("totalPlayeras").textContent = currency(totalPlayeras);
}

function exportRegistroCSV(records){
  const rows = [
    ["FECHA","EMPLEADA","ENTRADA","SALIDA","HORAS","PAGO_HORAS","VIDEO","PLAYERA","NOTAS"],
  ];

  records
    .slice()
    .sort((a,b)=> a.fecha > b.fecha ? 1 : -1)
    .forEach((r)=>{
      const c = computeRecord(r);
      rows.push([
        r.fecha,
        r.empleada,
        r.entrada,
        r.salida,
        c.horas.toFixed(2),
        c.pagoHoras.toFixed(2),
        String(Number(r.videos || 0)),
        (r.playeraAplicar ? "SI" : "NO"),
        String(Number(r.playeraCosto || 0)),
        r.tarde ? "SI" : "NO",
        r.notas || "",
      ]);
    });

  downloadCSV(`registro_la_bonita_${toISODate(new Date())}.csv`, rows);
}

function exportNominaCSV(records, bonos, bonosAmt, playeraPlan){
  const mesVal = $("mes").value;
  const mode = $("quincena").value;
  if(!mesVal){
    alert("Selecciona el mes primero.");
    return;
  }

  const [y, m] = mesVal.split("-").map(Number);
  const range = getQuincenaRange(y, m-1, mode);
  const start = range.start.getTime();
  const end = range.end.getTime();

  const inRange = records.filter((r)=>{
    const t = parseISODate(r.fecha).getTime();
    return t>=start && t<=end;
  });

  const mondays = countMondaysInclusive(range.start, range.end);

  const rows = [
    [
      "EMPLEADA","HORAS","LUNES","PAGO_HORAS","VIDEOS","PAGO_VIDEOS","DESCUENTO_PLAYERA","BONO","TOTAL"
    ]
  ];

  EMPLEADAS.forEach((name)=>{
    const rowsEmp = inRange.filter(r=> r.empleada === name);
    const horas = rowsEmp.reduce((acc, r)=> acc + computeRecord(r).horas, 0);
    const pagoHoras = horas * CONFIG.pagoPorHora;
    const horasLunes = mondays * CONFIG.horasLunesPagado;
    const pagoLunes = horasLunes * CONFIG.pagoPorHora;
    const videos = rowsEmp.reduce((acc, r)=> acc + (r.video?1:0), 0);
    const pagoVideos = videos * CONFIG.pagoPorVideo;
    const playeras = rowsEmp.reduce((acc, r)=> acc + (r.playera?1:0), 0);
    const descPlayera = playeras * CONFIG.descuentoPlayera;
    const amt = Number((bonosAmt && bonosAmt[name] != null) ? bonosAmt[name] : CONFIG.bonoPuntualidadQuincena);
    const bono = (name === "Lupita") ? amt : (bonos[name] ? amt : 0);
    const total = (pagoHoras + pagoLunes) + pagoVideos + bono - descPlayera;

    rows.push([
      name,
      horas.toFixed(2),
      mondays,
      (pagoHoras+pagoLunes).toFixed(2),
      videos,
      pagoVideos.toFixed(2),
      descPlayera.toFixed(2),
      bono.toFixed(2),
      total.toFixed(2),
    ]);
  });

  downloadCSV(`nomina_la_bonita_${toISODate(range.start)}_${toISODate(range.end)}.csv`, rows);
}

function downloadCSV(filename, rows){
  const csv = rows.map(r=> r.map(cell=> {
    const s = String(cell ?? "");
    const escaped = s.replaceAll('"','""');
    return `"${escaped}"`;
  }).join(",")).join("\n");

  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function previewFromForm(){
  const tmp = {
    fecha: $("fecha").value,
    empleada: $("empleada").value,
    entrada: $("entrada").value,
    salida: $("salida").value,
    videos: Number($("videos").value || 0),
    playeraAplicar: $("playeraAplicar").checked,
      playeraCosto: Number($("playeraCosto").value || 0),
    notas: $("notas").value.trim(),
  };

  const c = computeRecord(tmp);
  const txt = `Horas: ${c.horas.toFixed(2)} · Pago: ${currency(c.pagoHoras)} ${tmp.video?"· +video":""} ${tmp.playera?"· -playera":""}`;
  $("preview").textContent = txt;
}

function init(){
  // empleados
  const sel = $("empleada");
  EMPLEADAS.forEach((n)=>{
    const op = document.createElement("option");
    op.value = n; op.textContent = n;
    sel.appendChild(op);
  });

  // defaults
  $("fecha").value = toISODate(new Date());
  $("entrada").value = "16:00";
  $("salida").value = "20:00";

  // mes default
  const now = new Date();
  $("mes").value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;

  // listeners
  ["fecha","empleada","entrada","salida","notas"].forEach((id)=>{
    $(id).addEventListener("input", previewFromForm);
  });
  ["video","playera"].forEach((id)=>{
    $(id).addEventListener("change", previewFromForm);
  });

  on("btnAdd","click", ()=>{
    const editingId = window.__LB_EDIT_ID__ || null;

    const record = {
      id: editingId ? editingId : crypto.randomUUID(),
      fecha: $("fecha").value,
      empleada: $("empleada").value,
      entrada: $("entrada").value,
      salida: $("salida").value,
      videos: Number($("videos").value || 0),
      playeraAplicar: $("playeraAplicar").checked,
      playeraCosto: Number($("playeraCosto").value || 0),
      tarde: isLateByEntrada($("entrada").value),
      notas: $("notas").value.trim(),
    };

    if(!record.fecha || !record.empleada || !record.entrada || !record.salida){
      alert("Completa fecha, empleada, entrada y salida.");
      return;
    }

    const inMin = minutesFromHHMM(record.entrada);
    const outMin = minutesFromHHMM(record.salida);
    let diff = outMin - inMin;
    if(diff < 0) diff += 24*60;

    if(diff <= 0){
      alert("La hora de salida debe ser después de la entrada.");
      return;
    }

    const records = loadRecords();

    if(editingId){
      const idx = records.findIndex(x=> x.id === editingId);
      if(idx >= 0){
        records[idx] = record;
      }else{
        records.push(record);
      }
      window.__LB_EDIT_ID__ = null;
      $("btnAdd").textContent = "Guardar registro";
      $("btnAdd").classList.remove("btnWarn");
    }else{
      records.push(record);
    }

    saveRecords(records);

    // reset parcial
    $("videos").value = 0;
    $("playeraAplicar").checked = false;
    $("playeraCosto").value = 0;
        $("notas").value = "";

    render();
  });

  on("mes","change", render);
  on("quincena","change", render);

  on("btnExportRegistro","click", ()=>{
    exportRegistroCSV(loadRecords());
  });

  // Sync Sheets
  if($("apiUrl")){
    $("apiUrl").value = loadApiUrl();
    $("apiUrl").addEventListener("change", ()=> saveApiUrl($("apiUrl").value));
  }
  if($("apiKey")){
    $("apiKey").value = loadApiKey();
    $("apiKey").addEventListener("change", ()=> saveApiKey($("apiKey").value));
  }
  if($("btnSyncUp")){
    $("btnSyncUp").addEventListener("click", syncUpload);
  }
  if($("btnSyncDown")){
    $("btnSyncDown").addEventListener("click", syncDownload);
  }


  // Recibo PDF por empleada
  const btnPdf = $("btnReciboPDF");
  if(btnPdf){
    btnPdf && btnPdf.addEventListener("click", ()=>{
      const emp = $("reciboEmpleado").value;
      const bonos = loadBonos();
      const bonosAmt = loadBonosAmt();
      const playeraPlan = loadPlayeraPlan();
      const records = loadRecords();
      const range = getSelectedRange();
      const data = computeNominaForEmployee(emp, records, bonos, bonosAmt, playeraPlan, range);
      downloadReciboPDF(emp, data, range);
    });
  }


  on("btnExportNomina","click", ()=>{
    exportNominaCSV(loadRecords(), loadBonos(), loadBonosAmt(), loadPlayeraPlan());
  });

  on("btnReset","click", ()=>{
    const ok = confirm("¿Seguro? Esto borra TODO el historial guardado en esta computadora.");
    if(!ok) return;
    localStorage.removeItem(LS_RECORDS);
    localStorage.removeItem(LS_BONOS);
    window.__LB_EDIT_ID__ = null;
    $("btnAdd").textContent = "Guardar registro";
    $("btnAdd").classList.remove("btnWarn");
    render();
  });

  previewFromForm();
  render();
}

function render(){
  const records = loadRecords();
  const bonos = loadBonos();
  const bonosAmt = loadBonosAmt();

  // Lupita siempre sí
  bonos.Lupita = true;
  saveBonos(bonos);
  // Bonos monto: si no existe, se inicializa
  saveBonosAmt(bonosAmt);

  buildBonosUI(bonos, bonosAmt);
  renderRegistro(records);
  renderNomina(records, bonos, bonosAmt);
  previewFromForm();
}

init();


async function syncUpload(){
  const url = loadApiUrl().trim();
  const apiKey = loadApiKey().trim();
  if(!url){
    alert("Pega primero la URL del Web App (Apps Script).");
    return;
  }
  const payload = {
    action: "upload",
    apiKey,
    records: loadRecords(),
    bonos: loadBonos(),
    bonosAmt: loadBonosAmt(),
    playeraPlan: loadPlayeraPlan()
  };

  $("syncStatus").textContent = "Guardando en Sheets...";
  try{
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(!data.ok) throw new Error(data.error || "Error");
    $("syncStatus").textContent = "Listo ✅ Guardado en Google Sheets.";
  }catch(err){
    $("syncStatus").textContent = "Error ❌ No se pudo guardar.";
    alert("Error al guardar en Sheets: " + err.message);
  }
}

async function syncDownload(){
  const url = loadApiUrl().trim();
  const apiKey = loadApiKey().trim();
  if(!url){
    alert("Pega primero la URL del Web App (Apps Script).");
    return;
  }
  const payload = { action:"download", apiKey };

  $("syncStatus").textContent = "Cargando desde Sheets...";
  try{
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(!data.ok) throw new Error(data.error || "Error");

    if(Array.isArray(data.records)) saveRecords(data.records);
    if(data.bonos && typeof data.bonos === "object") saveBonos(data.bonos);
    if(data.bonosAmt && typeof data.bonosAmt === "object") saveBonosAmt(data.bonosAmt);
    if(data.playeraPlan && typeof data.playeraPlan === "object") savePlayeraPlan(data.playeraPlan);

    $("syncStatus").textContent = "Listo ✅ Ya cargaste tu nómina desde Sheets.";
    render();
  }catch(err){
    $("syncStatus").textContent = "Error ❌ No se pudo cargar.";
    alert("Error al cargar desde Sheets: " + err.message);
  }
}
