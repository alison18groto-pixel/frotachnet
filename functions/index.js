const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const crypto = require('crypto');

initializeApp();
const OWNER_UID = '0bUm9uxTizLn7S3dShqbLCYnFWz1';
const MODULES = ['frota', 'servicos', 'estoque', 'relatorios'];

function keyForEmail(email) { return email.replace(/[.#$\\[\\]]/g, '_'); }
function temporaryPassword() { return crypto.randomBytes(24).toString('base64url'); }

exports.criarUsuarioTemporario = onCall(async (request) => {
  if (!request.auth || request.auth.uid !== OWNER_UID) {
    throw new HttpsError('permission-denied', 'Somente o ADMIN pode criar usuários.');
  }
  const data = request.data || {};
  const email = String(data.email || '').trim().toLowerCase();
  const nome = String(data.nome || email).trim();
  const papel = ['leitor', 'operador', 'admin'].includes(data.papel) ? data.papel : 'leitor';
  const duracaoHoras = Number(data.duracaoHoras || 1);
  if (!email.includes('@') || duracaoHoras !== 1) throw new HttpsError('invalid-argument', 'E-mail ou duração inválidos.');
  const permissoes = {};
  for (const module of MODULES) {
    if (data.permissoes && ['read', 'full'].includes(data.permissoes[module])) permissoes[module] = papel === 'leitor' ? 'read' : 'full';
  }
  const expiresAtEpoch = Date.now() + 60 * 60 * 1000;
  const expiresAt = new Date(expiresAtEpoch).toISOString();
  const created = await getAuth().createUser({ email, password: temporaryPassword(), displayName: nome, emailVerified: false });
  await getAuth().setCustomUserClaims(created.uid, { temporary: true, expiresAt, expiresAtEpoch });
  await getDatabase().ref(`appData/usuarios/${keyForEmail(email)}`).set({
    uid: created.uid, email, nome, papel, permissoes, temporary: true, expiresAt, expiresAtEpoch,
    atualizadoEm: new Date().toISOString(), atualizadoPor: request.auth.token.email || request.auth.uid
  });
  return { uid: created.uid, email, expiresAt };
});
