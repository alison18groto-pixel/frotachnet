# Usuários temporários

O fluxo seguro usa uma Cloud Function. O ADMIN informa nome, e-mail, papel e módulos; a função cria uma conta Firebase com uma senha aleatória que nunca é salva no Frotas. Em seguida, o frontend solicita ao Firebase o e-mail de redefinição de senha. O convidado escolhe a própria senha no link recebido.

A validade começa **no momento da criação** e dura uma hora. A expiração é gravada no perfil e em custom claims (`expiresAtEpoch`), e as regras do Realtime Database também bloqueiam leitura quando o prazo termina.

## Publicação

Com o Firebase CLI autenticado no projeto correto, execute na raiz:

```bash
firebase use controle-veiculos-ea81c
firebase deploy --only functions,database
```

A publicação requer Billing/Blaze em muitos projetos Firebase para Cloud Functions. Se o projeto estiver no plano Spark, o Firebase poderá impedir o deploy da função.

Não armazene senhas no Realtime Database, no código ou no frontend. O e-mail do convidado precisa ser exclusivo no Firebase Authentication.
