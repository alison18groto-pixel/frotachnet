# Migração segura do Frotas

## O que foi alterado

- O backup legado continua preservado em `appData` para rollback.
- `scripts/migrate-realtime-db.js` transforma um export JSON em uma estrutura modular sem apagar dados.
- O frontend respeita `read`/`full` por módulo em vez de liberar edição para qualquer usuário autorizado.
- Operadores gravam apenas os nós legados necessários (`veiculos`, `estoque`, `oficinas` e `regras`); usuários e logs continuam restritos ao ADMIN.
- O primeiro login sincroniza o perfil pelo UID para que as regras do Realtime Database possam validar permissões.
- Foi corrigido o erro `key is not defined` das Cloud Functions.

## Gerar uma cópia migrada localmente

Não versionar o backup real. Execute fora do repositório ou em uma pasta privada:

```bash
node scripts/migrate-realtime-db.js \
  /caminho/controle-veiculos-ea81c-default-rtdb-export.json \
  /caminho/controle-veiculos-migrado.json
```

O comando é idempotente e informa quantos veículos, serviços, itens de estoque, usuários e logs foram preservados.

## Validação antes do deploy

```bash
node --check functions/index.js
python3 -m json.tool firebase.database.rules.json >/dev/null
npm --prefix functions install
npm --prefix functions test --if-present
```

Em seguida, testar primeiro em um projeto Firebase de homologação. O deploy de produção deve ser separado:

```bash
firebase deploy --only functions,database
```

## Rollback

1. Manter o export original em local privado.
2. Reverter o commit do código.
3. Restaurar o JSON original pelo Firebase Console somente após conferir o projeto e a data do backup.
4. Se regras forem publicadas, reaplicar o arquivo de regras anterior versionado no commit imediatamente anterior.

> Esta implementação não publica o banco real automaticamente e não inclui o backup anexado no Git.
