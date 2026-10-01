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
  if (!request.auth) throw new HttpsError('unauthenticated', 'É necessário estar autenticado.');
  const perfisSnapshot = await getDatabase().ref('appData/usuarios').once('value');
  const perfis = Object.values(perfisSnapshot.val() || {});
  const perfilAtual = perfis.find((perfil) => perfil && perfil.uid === request.auth.uid);
  const administrador = request.auth.uid === OWNER_UID || (perfilAtual && perfilAtual.papel === 'admin');
  if (!administrador) throw new HttpsError('permission-denied', 'Somente usuários ADMIN podem criar convites.');

  const data = request.data || {};
  const tipo = data.tipo === 'demo' ? 'demo' : 'permanente';
  const login = String(data.login || '').trim().toLowerCase();
  const email = String(data.email || '').trim().toLowerCase();
  const nome = String(data.nome || login || email).trim();
  const papel = tipo === 'demo' ? 'leitor' : (['leitor', 'operador', 'admin'].includes(data.papel) ? data.papel : 'leitor');
  const senha = tipo === 'demo' ? String(data.senha || '') : temporaryPassword();
  const duracaoHoras = Number(data.duracaoHoras || 1);
  if (tipo === 'demo') {
    if (!/^[a-z0-9._-]{3,32}$/.test(login) || senha.length < 6 || duracaoHoras !== 1) {
      throw new HttpsError('invalid-argument', 'Login, senha ou duração inválidos.');
    }
  } else if (!email.includes('@')) {
    throw new HttpsError('invalid-argument', 'E-mail do funcionário inválido.');
  }
  const authEmail = tipo === 'demo' ? `${login}@demo.frota.local` : email;
  const permissoes = {};
  for (const module of MODULES) {
    if (data.permissoes && ['read', 'full'].includes(data.permissoes[module])) {
      permissoes[module] = tipo === 'demo' || papel === 'leitor' ? 'read' : 'full';
    }
  }
  const created = await getAuth().createUser({ email: authEmail, password: senha, displayName: nome, emailVerified: false });
  const profile = {
    uid: created.uid, email: tipo === 'demo' ? null : email, login: tipo === 'demo' ? login : null,
    nome, papel, permissoes, tipo, temporary: tipo === 'demo',
    atualizadoEm: new Date().toISOString(), atualizadoPor: request.auth.token.email || request.auth.uid
  };
  let expiresAt = null;
  if (tipo === 'demo') {
    const expiresAtEpoch = Date.now() + 60 * 60 * 1000;
    expiresAt = new Date(expiresAtEpoch).toISOString();
    await getAuth().setCustomUserClaims(created.uid, { temporary: true, expiresAt, expiresAtEpoch });
    profile.expiresAt = expiresAt;
    profile.expiresAtEpoch = expiresAtEpoch;
  } else {
    await getAuth().setCustomUserClaims(created.uid, { temporary: false });
  }
  await getDatabase().ref(`appData/usuarios/${keyForEmail(authEmail)}`).set(profile);
  return { uid: created.uid, email: tipo === 'demo' ? null : email, login: tipo === 'demo' ? login : null, tipo, expiresAt };
});
