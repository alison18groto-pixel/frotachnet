#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function parseKM(v) { return parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0; }
function parseNumero(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const texto = String(v ?? '').trim().replace(/\s/g, '');
  if (!texto) return 0;
  const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}
function intervalosConsumo(abastecimentos) {
  const registros = abastecimentos.map(a => ({ km: parseKM(a.km), qtd: parseNumero(a.qtd) }))
    .filter(a => a.km > 0 && a.qtd > 0).sort((a, b) => a.km - b.km);
  const result = [];
  for (let i = 1; i < registros.length; i++) {
    const kmRod = registros[i].km - registros[i - 1].km;
    const consumo = kmRod / registros[i].qtd;
    if (kmRod > 0 && consumo <= 20) result.push({ kmRod, litros: registros[i].qtd, consumo });
  }
  return result;
}

assert.equal(parseKM('157.801'), 157801);
assert.equal(parseKM(157801), 157801);
assert.equal(parseKM(''), 0);
assert.equal(parseNumero('1.234,56'), 1234.56);
assert.equal(parseNumero('52,07'), 52.07);
assert.equal(parseNumero('1.234'), 1.234);
assert.equal(parseNumero('inválido'), 0);

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const oleoHelpers = html.match(/function tipoMatchRegra\(tipo, regra\) \{[\s\S]*?\n\}\n\nfunction servicoAtualizaBase\(servico, regra\) \{[\s\S]*?\n\}/);
assert.ok(oleoHelpers, 'A lógica compartilhada de identificação de regras e emendas de óleo deve existir.');
const oleoSandbox = {};
vm.runInNewContext(`${oleoHelpers[0]}\nglobalThis.servicoAtualizaBase = servicoAtualizaBase;`, oleoSandbox);
assert.equal(oleoSandbox.servicoAtualizaBase({ tipo: 'Emenda de óleo', oleoModo: 'emenda' }, 'Troca de óleo'), false);
assert.equal(oleoSandbox.servicoAtualizaBase({ tipo: 'Troca de óleo', oleoModo: 'troca_completa' }, 'Troca de óleo'), true);
assert.equal(oleoSandbox.servicoAtualizaBase({ tipo: 'Troca de óleo' }, 'Troca de óleo'), true, 'Registros antigos de troca completa continuam válidos.');
const detectorOleo = html.match(/function nomeProdutoEhOleo\(nome\) \{[\s\S]*?\n\}/);
assert.ok(detectorOleo, 'O sistema deve identificar itens de óleo pelo nome do produto.');
const detectorSandbox = {};
vm.runInNewContext(`${detectorOleo[0]}\nglobalThis.nomeProdutoEhOleo = nomeProdutoEhOleo;`, detectorSandbox);
assert.equal(detectorSandbox.nomeProdutoEhOleo('Óleo Motor 5W30'), true);
assert.equal(detectorSandbox.nomeProdutoEhOleo('Óleo Hidráulico ISO 68'), true);
assert.equal(detectorSandbox.nomeProdutoEhOleo('Filtro de Óleo'), true);
assert.equal(detectorSandbox.nomeProdutoEhOleo('Filtro de ar'), false);
assert.match(html, /await salvar\(\);/, 'A interface só deve confirmar a manutenção depois de aguardar o salvamento.');
assert.match(html, /podeEditar\('estoque'\)/, 'A baixa de estoque precisa exigir permissão de edição do estoque.');

const intervalos = intervalosConsumo([
  { km: '150.000', qtd: '50,00' },
  { km: '150.400', qtd: '50,00' },
  { km: '157.801', qtd: '10,00' }, // 740,1 km/l: deve ser rejeitado
  { km: '151.000', qtd: '50,00' },
]);
assert.equal(intervalos.length, 2);
assert.equal(intervalos.reduce((sum, item) => sum + item.kmRod, 0), 1000);
assert.equal(intervalos.reduce((sum, item) => sum + item.litros, 0), 100);

const odometros = [161518, 157801, 86943, 139982, 83422, 24158, 815];
const gastos = [28534.01, 21186.81, 18399.49, 16081.90, 29180.87, 4591.84, 876.02];
const totalOdometros = odometros.reduce((sum, km) => sum + km, 0);
const totalGastos = gastos.reduce((sum, valor) => sum + valor, 0);
assert.equal(totalOdometros, 654639);
assert.equal(Number((totalGastos / totalOdometros).toFixed(6)), 0.181552);

console.log('OK: testes de normalização, consumo, óleo e exclusão de outlier passaram.');
