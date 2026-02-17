/**
 * La Bonita - Nómina (API)
 * 
 * Instrucciones rápidas:
 * 1) Crea un Google Sheet vacío.
 * 2) Extensiones -> Apps Script
 * 3) Pega este código y guarda.
 * 4) Implementar -> Nueva implementación -> Aplicación web
 *    - Ejecutar como: tú
 *    - Quién tiene acceso: Cualquiera
 * 5) Copia la URL y pégala en tu sistema web.
 * 
 * Seguridad:
 * - Opcional: define API_KEY abajo y úsala en la web.
 */

const API_KEY = ""; // opcional. Ej: "LABONITA2026"

function doPost(e){
  try{
    const body = JSON.parse(e.postData.contents || "{}");
    if(API_KEY && body.apiKey !== API_KEY){
      return json({ ok:false, error:"API_KEY inválida" });
    }

    const action = body.action;

    if(action === "upload"){
      const records = Array.isArray(body.records) ? body.records : [];
      const bonos = body.bonos || {};
      const bonosAmt = body.bonosAmt || {};
      const playeraPlan = body.playeraPlan || {};
      writeAll(records, bonos, bonosAmt, playeraPlan);
      return json({ ok:true });
    }

    if(action === "download"){
      const data = readAll();
      return json({ ok:true, ...data });
    }

    return json({ ok:false, error:"Acción no válida" });
  }catch(err){
    return json({ ok:false, error:String(err) });
  }
}

function json(obj){
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ss(){
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sheet(name){
  const s = ss().getSheetByName(name);
  return s || ss().insertSheet(name);
}

function writeAll(records, bonos, bonosAmt, playeraPlan){
  // Hoja: records
  const shR = sheet("records");
  shR.clearContents();
  shR.appendRow(["id","fecha","empleada","entrada","salida","videos","playeraAplicar","playeraCosto","tarde","notas"]);
  records.forEach(r=>{
    shR.appendRow([
      r.id || "",
      r.fecha || "",
      r.empleada || "",
      r.entrada || "",
      r.salida || "",
      Number(r.videos || 0),
      r.playeraAplicar ? "1" : "0",
      Number(r.playeraCosto || 0),
      r.tarde ? "1" : "0",
      r.notas || ""
    ]);
  });

  // Hoja: bonos
  const shB = sheet("bonos");
  shB.clearContents();
  shB.appendRow(["empleada","bonoActivo","bonoMonto"]);
  const empleadas = ["Lupita","Paulina","Angelica","Lisa"];
  empleadas.forEach(n=>{
    shB.appendRow([
      n,
      (n==="Lupita" ? "1" : (bonos[n] ? "1" : "0")),
      Number(bonosAmt[n] || 0)
    ]);
  });

  // Hoja: playeraPlan
  const shP = sheet("playeraPlan");
  shP.clearContents();
  shP.appendRow(["empleada","costoTotal","mitadEmpleado","saldoEmpleado"]);
  empleadas.forEach(n=>{
    const p = playeraPlan[n] || {};
    shP.appendRow([
      n,
      Number(p.costoTotal || 0),
      Number(p.mitadEmpleado || 0),
      Number(p.saldoEmpleado || 0)
    ]);
  });

  // Meta
  const shM = sheet("meta");
  shM.clearContents();
  shM.appendRow(["updatedAt"]);
  shM.appendRow([new Date().toISOString()]);
}

function readAll(){
  const shR = sheet("records");
  const r = shR.getDataRange().getValues();
  const records = [];
  for(let i=1;i<r.length;i++){
    const row = r[i];
    if(!row[0]) continue;
    records.push({
      id: String(row[0]),
      fecha: String(row[1]),
      empleada: String(row[2]),
      entrada: String(row[3]),
      salida: String(row[4]),
      videos: Number(row[5] || 0),
      playeraAplicar: String(row[6]) === "1",
      playeraCosto: Number(row[7] || 0),
      tarde: String(row[8]) === "1",
      notas: String(row[9] || "")
    });
  }

  const shB = sheet("bonos");
  const b = shB.getDataRange().getValues();
  const bonos = {};
  const bonosAmt = {};
  for(let i=1;i<b.length;i++){
    const row = b[i];
    if(!row[0]) continue;
    const name = String(row[0]);
    bonos[name] = String(row[1]) === "1";
    bonosAmt[name] = Number(row[2] || 0);
  }

  const shP = sheet("playeraPlan");
  const p = shP.getDataRange().getValues();
  const playeraPlan = {};
  for(let i=1;i<p.length;i++){
    const row = p[i];
    if(!row[0]) continue;
    const name = String(row[0]);
    playeraPlan[name] = {
      costoTotal: Number(row[1] || 0),
      mitadEmpleado: Number(row[2] || 0),
      saldoEmpleado: Number(row[3] || 0),
    };
  }

  return { records, bonos, bonosAmt, playeraPlan };
}
