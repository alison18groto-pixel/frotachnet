# Convites permanentes e demonstrações

Na tela de usuários existem dois tipos de convite:

- **Funcionário — permanente**: como Eduardo. A conta não recebe expiração. O ADMIN escolhe o papel e os módulos; o funcionário define a própria senha pelo link enviado ao e-mail.
- **Demonstração — 1 hora**: para mostrar o Frotas a clientes ou visitantes. O ADMIN cria um login e uma senha diretamente na tela, sem e-mail. O acesso é forçado para **Leitor**, não pode gravar dados e expira uma hora depois da criação.

Para funcionários, a função cria uma senha aleatória interna e solicita o e-mail de redefinição; o funcionário escolhe a própria senha. Para demonstrações, a senha informada pelo ADMIN é enviada somente à função e armazenada apenas pelo Firebase Authentication, que guarda o hash. Ela não é salva no Realtime Database.

O e-mail do funcionário deve ser exclusivo no Firebase Authentication. Para Eduardo, use um endereço próprio, por exemplo `eduardo@empresa.com`; não use o e-mail do ADMIN. Para demonstrações, o login precisa ser único e ter de 3 a 32 caracteres (`a-z`, números, ponto, hífen ou sublinhado).

## Publicação

Com o Firebase CLI autenticado no projeto correto, execute na raiz:

```bash
firebase use controle-veiculos-ea81c
firebase deploy --only functions,database
```

A publicação requer Billing/Blaze em muitos projetos Firebase para Cloud Functions. Se o projeto estiver no plano Spark, o Firebase poderá impedir o deploy da função.

A função valida o UID do ADMIN `0bUm9uxTizLn7S3dShqbLCYnFWz1` no servidor. As regras do Realtime Database usam os custom claims de expiração para bloquear demonstrações vencidas também fora da interface.
