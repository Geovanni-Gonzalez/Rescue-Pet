const fs = require("fs");
const db = JSON.parse(fs.readFileSync("backend/data/db.json", "utf8"));
const now = new Date().toISOString();
for (let i = 0; i < 400; i++) {
  db.animal.push({ id: `perf-animal-${i}`, name: `Mascota ${i}`, species: i % 2 ? "Perro" : "Gato", estimatedBreed: "Mestizo", estimatedAge: (i % 12) + 1, size: "M", status: "AVAILABLE", mainPhotoUrl: null, rescueLocationText: "San Jose, Costa Rica, zona " + i, rescueLatitude: 9.9 + i / 1000, rescueLongitude: -84.1, publicProfileUrl: null, qrUrl: null, energyLevel: "MEDIUM", spaceNeed: "MEDIUM", goodWithChildren: true, goodWithPets: true, createdByUserId: "admin-seed", createdAt: now, updatedAt: now });
}
for (let i = 0; i < 8000; i++) {
  db.auditLog.push({ id: `perf-audit-${i}`, userId: "admin-seed", action: "LOGIN", entityType: "User", entityId: "admin-seed", metadataJson: JSON.stringify({ index: i, detail: "registro de auditoria de prueba de rendimiento con texto realista" }), ipAddress: "192.168.1." + (i % 255), createdAt: now });
}
for (let i = 0; i < 2000; i++) {
  db.notification.push({ id: `perf-notif-${i}`, userId: i % 2 ? "admin-seed" : "adopter-seed", type: "INFO", title: "Notificacion " + i, message: "Mensaje de notificacion de prueba de rendimiento numero " + i, resourceType: null, resourceId: null, readAt: null, createdAt: now });
}
fs.writeFileSync("backend/data/db.json", JSON.stringify(db, null, 2));
const mb = (fs.statSync("backend/data/db.json").size / 1048576).toFixed(2);
console.log(`db.json inflado: ${mb} MB, ${db.animal.length} animales, ${db.auditLog.length} logs`);
