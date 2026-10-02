#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const file = process.argv[2];
if (!file) {
  console.error('Uso: node scripts/validate-backup.js <backup.json>');
  process.exit(2);
}

let source;
try {
  source = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
} catch (error) {
  console.error(`Backup inválido: ${error.message}`);
  process.exit(1);
}

const appData = source.appData && typeof source.appData === 'object' ? source.appData : source;
const list = value => Array.isArray(value) ? value : Object.values(value || {});
const vehicles = list(appData.veiculos);
const inventory = list(appData.estoque);
const errors = [];
const warnings = [];
const ids = new Set();

if (!vehicles.length) errors.push('Nenhum veículo encontrado.');
for (const [index, vehicle] of vehicles.entries()) {
  if (!vehicle || typeof vehicle !== 'object') { errors.push(`Veículo ${index + 1} não é um objeto.`); continue; }
  if (vehicle.id === undefined || vehicle.id === null || vehicle.id === '') errors.push(`Veículo ${index + 1} sem ID.`);
  const id = String(vehicle.id);
  if (ids.has(id)) errors.push(`ID de veículo duplicado: ${id}.`);
  ids.add(id);
  if (!vehicle.placa) warnings.push(`Veículo ${id} sem placa.`);
  if (!Number.isFinite(Number(String(vehicle.km ?? 0).replace(/\D/g, '')))) warnings.push(`KM inválido no veículo ${id}.`);
  for (const service of list(vehicle.servicos)) if (!service || typeof service !== 'object') errors.push(`Serviço inválido no veículo ${id}.`);
  for (const fill of list(vehicle.abastecimentos)) if (!fill || typeof fill !== 'object') errors.push(`Abastecimento inválido no veículo ${id}.`);
}

const report = {
  arquivo: path.resolve(file),
  veiculos: vehicles.length,
  servicos: vehicles.reduce((sum, v) => sum + list(v?.servicos).length, 0),
  abastecimentos: vehicles.reduce((sum, v) => sum + list(v?.abastecimentos).length, 0),
  estoque: inventory.length,
  usuarios: Object.keys(appData.usuarios || {}).length,
  auditLogs: Object.keys(source.auditLogs || {}).length,
  errors,
  warnings,
  valido: errors.length === 0,
};
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
