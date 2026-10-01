const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const crypto = require('crypto');

initializeApp();
const OWNER_UID = '0bUm9uxTizLn7S3dShqbLCYnFWz1';
const MODULES = ['frota', 'servicos', 'estoque', 'relatorios'];
function keyFor(value) { return String(value || '').replace(/[.#$\\[\\]]/g, '_'); }
function randomPassword() { return crypto.randomBytes(24).toString('base64url'); }
async function isAdminRequest(request) {
  if (!request.auth) return false;
  if (request.auth.uid === OWNER_UID) return true;
  const snapshot = await getDatabase().ref('appData/usuarios').once('value');
  const perfil = Object.values(snapshot.val() || {}).find((item) => item && item.uid === request.auth.uid);
  return !!perfil && perfil.papel === 'admin';
}
exports.registrarAuditoria = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'É necessário estar autenticado.');
  const data = request.data || {};
  const alteracoes = Array.isArray(data.alteracoes) ? data.alteracoes.slice(0, 20).map(String) : [];
  await getDatabase().ref('auditLogs').push({ at: new Date().toISOString(), uid: request.auth.uid, email: request.auth.token.email || null, acao: String(data.acao || 'ação').slice(0, 120), alteracoes });
  return { ok: true };
});
exports.listarAuditoria = onCall(async (request) => {
  if (!(await isAdminRequest(request))) throw new HttpsError('permission-denied', 'Somente ADMIN pode consultar auditoria.');
  const limite = Math.min(Math.max(Number(request.data && request.data.limite) || 300, 1), 500);
  const snapshot = await getDatabase().ref('auditLogs').orderByChild('at').limitToLast(limite).once('value');
  return { logs: Object.values(snapshot.val() || {}).sort((a, b) => String(b.at).localeCompare(String(a.at))) };
});
exports.criarUsuario = onCall(async (request) => {
  if (!(await isAdminRequest(request))) throw new HttpsError('permission-denied', 'Somente usuários ADMIN podem criar usuários.');
  const data = request.data || {};
  const email = String(data.email || '').trim().toLowerCase();
  const nome = String(data.nome || email).trim();
  const papel = ['leitor', 'operador', 'admin'].includes(data.papel) ? data.papel : 'leitor';
  if (!email.includes('@')) throw new HttpsError('invalid-argument', 'E-mail inválido.');
  const permissoes = {};
  for (const module of MODULES) if (data.permissoes && ['read', 'full'].includes(data.permissoes[module])) permissoes[module] = papel === 'leitor' ? 'read' : 'full';
  const created = await getAuth().createUser({ email, password: randomPassword(), displayName: nome, emailVerified: false });
  await getDatabase().ref(`appData/usuarios/${key(email)}`).set({ uid: created.uid, email, nome, papel, permissoes, tipo: 'permanente', atualizadoEm: new Date().toISOString(), atualizadoPor: request.auth.token.email || request.auth.uid });
  await getDatabase().ref(`loginAliases/${key(data.login)}`).set({ email, nome });
  return { uid: created.uid, email };
});
