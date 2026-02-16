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

function buildBonosUI(bonos){
  const wrap = $("bonosUI");
  wrap.innerHTML = "";

  EMPLEADAS.forEach((name)=>{
    const row = document.createElement("div");
    row.className = "bonoRow";

    const left = document.createElement("div");
    left.className = "name";
    left.textContent = name;

    const right = document.createElement("label");
    right.className = "toggle";

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

    right.appendChild(cb);
    right.appendChild(txt);

    row.appendChild(left);
    row.appendChild(right);
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

    tdAction.appendChild(btn);
    tr.appendChild(tdAction);

    body.appendChild(tr);
  });
}

function renderNomina(records, bonos){
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

    const bono = (name === "Lupita") ? CONFIG.bonoPuntualidadQuincena : (bonos[name] ? CONFIG.bonoPuntualidadQuincena : 0);

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
        r.video ? "SI" : "NO",
        r.playera ? "SI" : "NO",
        r.notas || "",
      ]);
    });

  downloadCSV(`registro_la_bonita_${toISODate(new Date())}.csv`, rows);
}

function exportNominaCSV(records, bonos){
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
    const bono = (name === "Lupita") ? CONFIG.bonoPuntualidadQuincena : (bonos[name] ? CONFIG.bonoPuntualidadQuincena : 0);
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
    video: $("video").checked,
    playera: $("playera").checked,
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

  $("btnAdd").addEventListener("click", ()=>{
    const record = {
      id: crypto.randomUUID(),
      fecha: $("fecha").value,
      empleada: $("empleada").value,
      entrada: $("entrada").value,
      salida: $("salida").value,
      video: $("video").checked,
      playera: $("playera").checked,
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
    records.push(record);
    saveRecords(records);

    // reset parcial
    $("video").checked = false;
    $("playera").checked = false;
    $("notas").value = "";

    render();
  });

  $("mes").addEventListener("change", render);
  $("quincena").addEventListener("change", render);

  $("btnExportRegistro").addEventListener("click", ()=>{
    exportRegistroCSV(loadRecords());
  });

  $("btnExportNomina").addEventListener("click", ()=>{
    exportNominaCSV(loadRecords(), loadBonos());
  });

  $("btnReset").addEventListener("click", ()=>{
    const ok = confirm("¿Seguro? Esto borra TODO el historial guardado en esta computadora.");
    if(!ok) return;
    localStorage.removeItem(LS_RECORDS);
    localStorage.removeItem(LS_BONOS);
    render();
  });

  previewFromForm();
  render();
}

function render(){
  const records = loadRecords();
  const bonos = loadBonos();

  // Lupita siempre sí
  bonos.Lupita = true;
  saveBonos(bonos);

  buildBonosUI(bonos);
  renderRegistro(records);
  renderNomina(records, bonos);
  previewFromForm();
}

init();
