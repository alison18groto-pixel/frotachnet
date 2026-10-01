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

1. Publique regras do Realtime Database que permitam leitura apenas a usuários autenticados e gravação somente ao ADMIN (arquivo `firebase.database.rules.json`).
2. Migre os dados para nós separados por domínio (`vehicles`, `services`, `inventory`, `settings`, `users`) se precisar aplicar permissão de escrita por módulo no servidor.
3. Crie usuários via Firebase Authentication/Cloud Function; este frontend apenas autoriza o e-mail e não deve receber credenciais de serviço.
4. Remova o bootstrap por e-mail e troque-o por uma configuração inicial de tenant/owner.
5. Ative MFA, política de senha, logs de auditoria e backups automáticos.

## Cadastro de usuário

A tela **Usuários** cadastra a autorização (e-mail, papel e módulos). A conta/senha ainda precisa ser criada no Firebase Authentication. Em produção, substitua esse passo manual por uma Cloud Function administrativa com convite por e-mail.
