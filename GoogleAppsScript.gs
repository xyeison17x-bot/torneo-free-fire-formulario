const SHEET_ID = "PEGAR_AQUI_EL_ID_DE_TU_GOOGLE_SHEET";
const SHEET_NAME = "Inscripciones";
const ADMIN_TOKEN = "CAMBIA_ESTE_TOKEN_PRIVADO";
const HEADER = [
  "Fecha servidor",
  "Nickname",
  "UID",
  "Nombre completo",
  "Edad",
  "Telefono",
  "Correo electronico",
  "Escuadra o clan",
  "Nombre del equipo",
  "Modalidad",
  "Rol principal",
  "Region",
  "Dispositivo",
  "Notas",
  "Acepto reglas y datos",
  "Fecha enviada navegador"
];

function doPost(e) {
  try {
    const rawBody = e.postData && e.postData.contents ? e.postData.contents : "{}";
    const data = JSON.parse(rawBody);
    const normalized = normalizePayload(data);
    const validation = validatePayload(normalized);

    if (!validation.ok) {
      return jsonResponse(validation);
    }

    const sheet = getSheet();
    ensureHeader(sheet);
    if (uidAlreadyExists(sheet, normalized.uid)) {
      return jsonResponse({
        ok: false,
        message: "Este UID ya esta inscrito. Si necesitas ayuda, contactanos."
      });
    }

    sheet.appendRow([
      new Date(),
      normalized.nickname,
      normalized.uid,
      normalized.fullName,
      normalized.age,
      normalized.phone,
      normalized.email,
      normalized.squad,
      normalized.teamName,
      normalized.mode,
      normalized.role,
      normalized.region,
      normalized.device,
      normalized.notes,
      normalized.termsAccepted ? "Si" : "No",
      normalized.submittedAt
    ]);

    return jsonResponse({
      ok: true,
      message: "Inscripcion guardada."
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      message: error.message || "Error interno al guardar."
    });
  }
}

function doGet(e) {
  try {
    const action = e && e.parameter ? String(e.parameter.action || "") : "";
    const token = e && e.parameter ? String(e.parameter.token || "") : "";

    if (action !== "list") {
      return jsonResponse({
        ok: false,
        message: "Accion no valida."
      });
    }

    if (!ADMIN_TOKEN || ADMIN_TOKEN === "CAMBIA_ESTE_TOKEN_PRIVADO" || token !== ADMIN_TOKEN) {
      return jsonResponse({
        ok: false,
        message: "No autorizado."
      });
    }

    const sheet = getSheet();
    ensureHeader(sheet);
    const data = getRegistrations(sheet);

    return jsonResponse({
      ok: true,
      rows: data
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      message: error.message || "Error interno al consultar."
    });
  }
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (sheet) {
    return sheet;
  }

  return spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeader(sheet) {
  if (sheet.getLastRow() > 0) {
    return;
  }

  sheet.appendRow(HEADER);
}

function uidAlreadyExists(sheet, uid) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return false;
  }

  const values = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
  return values.some(function(row) {
    return String(row[0] || "").trim() === uid;
  });
}

function getRegistrations(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = HEADER.length;

  if (lastRow <= 1) {
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  return values.map(function(row) {
    return {
      createdAt: row[0],
      nickname: row[1],
      uid: row[2],
      fullName: row[3],
      age: row[4],
      phone: row[5],
      email: row[6],
      squad: row[7],
      teamName: row[8],
      mode: row[9],
      role: row[10],
      region: row[11],
      device: row[12],
      notes: row[13],
      termsAccepted: row[14],
      submittedAt: row[15]
    };
  });
}

function normalizePayload(data) {
  return {
    nickname: String(data.nickname || "").trim(),
    uid: String(data.uid || "").trim(),
    fullName: String(data.fullName || "").trim(),
    age: String(data.age || "").trim(),
    phone: String(data.phone || "").trim(),
    email: String(data.email || "").trim(),
    squad: String(data.squad || "").trim(),
    teamName: String(data.teamName || "").trim(),
    mode: String(data.mode || "").trim(),
    role: String(data.role || "").trim(),
    region: String(data.region || "").trim(),
    device: String(data.device || "").trim(),
    notes: String(data.notes || "").trim(),
    submittedAt: String(data.submittedAt || "").trim(),
    teamWebsite: String(data.teamWebsite || "").trim(),
    termsAccepted: data.termsAccepted === true
  };
}

function validatePayload(data) {
  const requiredFields = ["nickname", "uid", "fullName", "age", "phone", "mode", "role", "region", "device"];
  const missingField = requiredFields.find(function(field) {
    return !String(data[field] || "").trim();
  });

  if (data.teamWebsite) {
    return {
      ok: false,
      message: "No se pudo procesar la solicitud."
    };
  }

  if (missingField) {
    return {
      ok: false,
      message: "Faltan campos obligatorios."
    };
  }

  if (!/^\d{6,15}$/.test(data.uid)) {
    return {
      ok: false,
      message: "El UID no es valido."
    };
  }

  if (!/^\d{7,15}$/.test(data.phone.replace(/\D/g, ""))) {
    return {
      ok: false,
      message: "El telefono no es valido."
    };
  }

  if (!/^\d+$/.test(data.age)) {
    return {
      ok: false,
      message: "La edad no es valida."
    };
  }

  var ageNumber = Number(data.age);
  if (ageNumber < 10 || ageNumber > 60) {
    return {
      ok: false,
      message: "La edad debe estar entre 10 y 60 anos."
    };
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return {
      ok: false,
      message: "El correo electronico no es valido."
    };
  }

  if (["Solo", "Duo", "Squad"].indexOf(data.mode) === -1) {
    return {
      ok: false,
      message: "La modalidad no es valida."
    };
  }

  if ((data.mode === "Duo" || data.mode === "Squad") && !data.teamName) {
    return {
      ok: false,
      message: "Debes indicar el nombre del equipo."
    };
  }

  if (!data.termsAccepted) {
    return {
      ok: false,
      message: "Debes aceptar las reglas y el tratamiento de datos."
    };
  }

  return {
    ok: true
  };
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
