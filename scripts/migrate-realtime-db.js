#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Uso: node scripts/migrate-realtime-db.js <backup.json> <saida.json>');
  process.exit(2);
}

const [, , inputFile, outputFile] = process.argv;
if (!inputFile || !outputFile) usage();

const inputPath = path.resolve(inputFile);
const outputPath = path.resolve(outputFile);
const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const appData = source.appData && typeof source.appData === 'object' ? source.appData : {};
const users = appData.usuarios && typeof appData.usuarios === 'object' ? appData.usuarios : {};

const vehicles = Array.isArray(appData.veiculos) ? appData.veiculos : Object.values(appData.veiculos || {});
const inventory = Array.isArray(appData.estoque) ? appData.estoque : Object.values(appData.estoque || {});
const services = [];
for (const vehicle of vehicles) {
  for (const service of Array.isArray(vehicle.servicos) ? vehicle.servicos : []) {
    services.push({
      ...service,
      veiculoId: vehicle.id,
      placa: vehicle.placa || null,
    });
  }
}

const usersByUid = {};
for (const user of Object.values(users)) {
  if (user && user.uid) usersByUid[user.uid] = user;
}

const migrated = {
  ...source,
  // O legado permanece intacto para rollback e compatibilidade da versão atual.
  appData: source.appData || {},
  // Nós novos são preparados para regras granulares após a validação.
  veiculos: vehicles,
  servicos: services,
  estoque: inventory,
  configuracoes: {
    oficinas: Array.isArray(appData.oficinas) ? appData.oficinas : [],
    regras: appData.regras && typeof appData.regras === 'object' ? appData.regras : {},
    nextId: Number(appData.nextId) || 1,
  },
  usuariosPorUid: usersByUid,
  migrationMeta: {
    version: 1,
    migratedAt: new Date().toISOString(),
    source: path.basename(inputPath),
    legacyPreserved: true,
  },
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(migrated, null, 2) + '\n');
console.log(JSON.stringify({
  output: outputPath,
  vehicles: vehicles.length,
  services: services.length,
  inventory: inventory.length,
  users: Object.keys(users).length,
  usersByUid: Object.keys(usersByUid).length,
  auditLogs: Object.keys(source.auditLogs || {}).length,
  legacyPreserved: true,
}, null, 2));
