# Segurança e controle de acesso

## Modelo implementado

- **ADMIN**: acesso total, inclusive gerenciamento de usuários.
- **Leitor**: acesso de leitura aos módulos selecionados.
- **Operador**: leitura e gravação nos módulos selecionados.
- Módulos: Veículos, Serviços/configurações, Estoque e Relatórios.
- O administrador inicial é o e-mail `chnettelecomunicacoes@gmail.com`, mantido como bootstrap temporário.

## Limitação importante do estado atual

O Frotas é um HTML estático que grava todo o domínio em uma única chave `appData`. A tela e os bloqueios JavaScript melhoram a experiência, mas **não substituem as regras do Firebase**, pois qualquer cliente autenticado pode tentar chamar o Realtime Database diretamente.

Antes de vender o produto:

1. Publique regras do Realtime Database que permitam leitura apenas a usuários autenticados e gravação somente ao ADMIN (arquivo `firebase.database.rules.json`). O UID do proprietário já está preenchido no arquivo.
2. Migre os dados para nós separados por domínio (`vehicles`, `services`, `inventory`, `settings`, `users`) se precisar aplicar permissão de escrita por módulo no servidor.
3. Crie usuários via Firebase Authentication/Cloud Function; este frontend apenas autoriza o e-mail e não deve receber credenciais de serviço.
4. Remova o bootstrap por e-mail e troque-o por uma configuração inicial de tenant/owner.
5. Ative MFA, política de senha e backups automáticos; a auditoria de login e alterações já está preparada pela Cloud Function.

## Cadastro de usuário

A tela **Usuários** cadastra funcionários permanentes. Cada funcionário usa e-mail no Firebase e pode ter um nome curto para login. A Cloud Function registra logins bem-sucedidos, criação de usuários e módulos alterados em cada salvamento. A consulta dos logs fica disponível somente ao ADMIN; consulte `USERS.md` para o fluxo de usuários.

> Observação: como o domínio ainda está armazenado em uma única chave `appData`, a regra atual permite gravação a contas autenticadas e o controle de Leitor/Operador é aplicado pela interface. Antes de comercializar, separe os módulos em nós próprios e aplique regras por módulo no servidor.

## Regras atuais

A estrutura legada salva todos os módulos dentro de `appData`. Por isso, as regras seguras atuais permitem gravação somente ao ADMIN e leitura a usuários autenticados. Isso evita que um usuário comum altere ou apague dados de outro módulo.

O acesso de Operador com gravação por módulo será reativado após a migração para nós separados (`veiculos`, `servicos`, `estoque`, `usuarios`), com regras individuais por módulo. Não mantenha regras globais com `.write: "auth != null"` em produção.

