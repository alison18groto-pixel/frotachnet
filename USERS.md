# Usuários permanentes

O Frotas usa somente usuários permanentes. Para cadastrar um funcionário:

1. Crie a conta dele em **Firebase Authentication → Users → Add user** usando o e-mail real.
2. No Frotas, o ADMIN abre a engrenagem e informa nome, e-mail, nome curto, papel e módulos.
3. O funcionário entra com o nome curto cadastrado, por exemplo `eduardo`, ou com o e-mail real.

O nome curto é apenas um apelido de login associado ao e-mail do Firebase. O Frotas não armazena senhas.

Para publicar a regra que permite resolver o nome curto antes da autenticação:

```bash
firebase deploy --only database
```
