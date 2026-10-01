# Convites permanentes e demonstrações

Na tela de usuários existem dois tipos de convite:

- **Funcionário — permanente**: como Eduardo. A conta não recebe expiração. O ADMIN escolhe o papel e os módulos; o funcionário define a própria senha pelo link enviado ao e-mail.
- **Demonstração — 1 hora**: para mostrar o Frotas a clientes ou visitantes. O acesso é forçado para **Leitor**, não pode gravar dados e expira uma hora depois da criação.

Em ambos os casos, a função cria uma senha aleatória interna e solicita o e-mail de redefinição de senha. A senha escolhida pelo convidado nunca é salva no Realtime Database nem no código.

O e-mail deve ser exclusivo no Firebase Authentication. Para Eduardo, use um endereço próprio, por exemplo `eduardo@empresa.com`; não use o e-mail do ADMIN.

## Publicação

Com o Firebase CLI autenticado no projeto correto, execute na raiz:

```bash
firebase use controle-veiculos-ea81c
firebase deploy --only functions,database
```

A publicação requer Billing/Blaze em muitos projetos Firebase para Cloud Functions. Se o projeto estiver no plano Spark, o Firebase poderá impedir o deploy da função.

A função valida o UID do ADMIN `0bUm9uxTizLn7S3dShqbLCYnFWz1` no servidor. As regras do Realtime Database usam os custom claims de expiração para bloquear demonstrações vencidas também fora da interface.
