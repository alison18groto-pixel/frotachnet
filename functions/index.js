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
async function isAdminRequest(request) {
  if (!request.auth) return false;
  if (request.auth.uid === OWNER_UID) return true;
  const snapshot = await getDatabase().ref('appData/usuarios').once('value');
  const perfis = Object.values(snapshot.val() || {});
  const perfil = perfis.find((item) => item && item.uid === request.auth.uid);
  return !!perfil && perfil.papel === 'admin';
}

exports.registrarAuditoria = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'É necessário estar autenticado.');
  const data = request.data || {};
  const alteracoes = Array.isArray(data.alteracoes) ? data.alteracoes.slice(0, 20).map(String) : [];
  const acao = String(data.acao || 'ação').slice(0, 120);
  await getDatabase().ref('auditLogs').push({
    at: new Date().toISOString(), uid: request.auth.uid,
    email: request.auth.token.email || null, acao, alteracoes
  });
  return { ok: true };
});

exports.listarAuditoria = onCall(async (request) => {
  if (!(await isAdminRequest(request))) throw new HttpsError('permission-denied', 'Somente ADMIN pode consultar auditoria.');
  const limite = Math.min(Math.max(Number(request.data && request.data.limite) || 300, 1), 500);
  const snapshot = await getDatabase().ref('auditLogs').orderByChild('at').limitToLast(limite).once('value');
  const logs = Object.values(snapshot.val() || {}).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return { logs };
});

exports.criarUsuarioTemporario = onCall(async (request) => {
  if (!(await isAdminRequest(request))) throw new HttpsError('permission-denied', 'Somente usuários ADMIN podem criar convites.');
  const data = request.data || {};
  const tipo = data.tipo === 'demo' ? 'demo' : 'permanente';
  const login = String(data.login || '').trim().toLowerCase();
  const email = String(data.email || '').trim().toLowerCase();
  const nome = String(data.nome || login || email).trim();
  const papel = tipo === 'demo' ? 'leitor' : (['leitor', 'operador', 'admin'].includes(data.papel) ? data.papel : 'leitor');
  const senha = tipo === 'demo' ? String(data.senha || '') : temporaryPassword();
  const duracaoHoras = Number(data.duracaoHoras || 1);
  if (tipo === 'demo') {
    if (!/^[a-z0-9._-]{3,32}$/.test(login) || senha.length < 6 || duracaoHoras !== 1) throw new HttpsError('invalid-argument', 'Login, senha ou duração inválidos.');
  } else if (!email.includes('@')) throw new HttpsError('invalid-argument', 'E-mail do funcionário inválido.');
  const authEmail = tipo === 'demo' ? `${login}@demo.frota.local` : email;
  const permissoes = {};
  for (const module of MODULES) if (data.permissoes && ['read', 'full'].includes(data.permissoes[module])) permissoes[module] = tipo === 'demo' || papel === 'leitor' ? 'read' : 'full';
  const created = await getAuth().createUser({ email: authEmail, password: senha, displayName: nome, emailVerified: false });
  const profile = { uid: created.uid, email: tipo === 'demo' ? null : email, login: tipo === 'demo' ? login : null, nome, papel, permissoes, tipo, temporary: tipo === 'demo', atualizadoEm: new Date().toISOString(), atualizadoPor: request.auth.token.email || request.auth.uid };
  let expiresAt = null;
  if (tipo === 'demo') {
    const expiresAtEpoch = Date.now() + 60 * 60 * 1000;
    expiresAt = new Date(expiresAtEpoch).toISOString();
    await getAuth().setCustomUserClaims(created.uid, { temporary: true, expiresAt, expiresAtEpoch });
    profile.expiresAt = expiresAt; profile.expiresAtEpoch = expiresAtEpoch;
  } else await getAuth().setCustomUserClaims(created.uid, { temporary: false });
  await getDatabase().ref(`appData/usuarios/${keyForEmail(authEmail)}`).set(profile);
  await getDatabase().ref('auditLogs').push({ at: new Date().toISOString(), uid: request.auth.uid, email: request.auth.token.email || null, acao: 'criação de usuário', alteracoes: [tipo === 'demo' ? `demonstração:${login}` : `funcionário:${email}`, papel] });
  return { uid: created.uid, email: tipo === 'demo' ? null : email, login: tipo === 'demo' ? login : null, tipo, expiresAt };
});
