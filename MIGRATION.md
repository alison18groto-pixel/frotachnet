# Migração segura do Frotas

## O que foi alterado

- O backup legado continua preservado em `appData` para rollback.
- `scripts/migrate-realtime-db.js` transforma um export JSON em uma estrutura modular sem apagar dados.
- O frontend respeita `read`/`full` por módulo em vez de liberar edição para qualquer usuário autorizado.
- Operadores gravam apenas os nós legados necessários (`veiculos`, `estoque`, `oficinas` e `regras`); usuários e logs continuam restritos ao ADMIN.
- O primeiro login sincroniza o perfil pelo UID para que as regras do Realtime Database possam validar permissões.
- Foi corrigido o erro `key is not defined` das Cloud Functions.
- Os nós modulares foram copiados para o Firebase de produção em paralelo, sem apagar `appData`.
- As regras de transição foram publicadas mantendo o legado e protegendo os nós modulares.

## Gerar uma cópia migrada localmente

Não versionar o backup real. Execute fora do repositório ou em uma pasta privada:

```bash
node scripts/migrate-realtime-db.js \
  /caminho/controle-veiculos-ea81c-default-rtdb-export.json \
  /caminho/controle-veiculos-migrado.json
```

O comando é idempotente e informa quantos veículos, serviços, itens de estoque, usuários e logs foram preservados.

## Regra do custo por KM

O relatório executivo usa o **odômetro atual de cada veículo** como base do custo por KM. Portanto:

```text
KM total da frota = soma de appData.veiculos[*].km
Custo por KM = (manutenção + combustível) / KM total da frota
```

O KM rodado calculado pelo histórico continua sendo exibido separadamente para análise, mas não é usado como denominador do KPI principal de custo por KM.

## Validação antes do deploy

```bash
node --check functions/index.js
python3 -m json.tool firebase.database.rules.json >/dev/null
python3 -m json.tool firebase.database.rules.modular-candidate.json >/dev/null
node scripts/validate-backup.js /caminho/backup-atual.json
node scripts/test-calculations.js
npm --prefix functions install
npm --prefix functions test --if-present
```

`firebase.database.rules.modular-candidate.json` continua sendo uma referência de homologação. A versão publicada em produção é a regra de transição versionada em `firebase.database.rules.json`: ela mantém `appData` durante a adaptação do frontend e adiciona os nós modulares.

O workflow `.github/workflows/validate.yml` executa as validações automaticamente em cada push e pull request para `main`.

Em seguida, testar primeiro em um projeto Firebase de homologação. O deploy de produção deve ser separado:

```bash
firebase deploy --only functions,database
```

## Rollback

1. Manter o export original em local privado.
2. Reverter o commit do código.
3. Restaurar o JSON original pelo Firebase Console somente após conferir o projeto e a data do backup.
4. Se regras forem publicadas, reaplicar o arquivo de regras anterior versionado no commit imediatamente anterior.

> O backup real e as cópias de rollback ficam fora do repositório. A desativação de `appData` ainda depende da troca do frontend para leitura e gravação modular e de testes com ADMIN, operador e leitor.
