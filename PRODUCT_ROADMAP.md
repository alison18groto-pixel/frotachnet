# Frotas — análise e roadmap para comercialização

## Diagnóstico atual

O projeto atual funciona como uma aplicação single-page em um único `index.html`, com Firebase Authentication e Realtime Database. Os dados da frota, estoque, oficinas, regras e históricos são gravados em um único objeto `appData`.

### Pontos fortes

- Produto já possui um fluxo real de login.
- Dashboard, veículos, manutenção, abastecimento, estoque e relatórios formam um bom MVP vertical.
- Exportação/importação de backup e relatórios CSV ajudam na operação diária.
- O modelo de alertas por quilometragem é um diferencial útil para frotas pequenas.

### Riscos atuais antes de vender

1. **Segurança do banco**: não havia regras Firebase versionadas. Bloqueio somente no JavaScript não protege o banco contra chamadas diretas.
2. **Permissões granulares**: o domínio inteiro está em `appData`; por isso, leitura e escrita por módulo não podem ser aplicadas com segurança no servidor sem reorganizar os dados.
3. **Cadastro de usuários**: o HTML não possui backend administrativo para criar contas Firebase. A tela criada agora autoriza e-mail/papel/módulos; a conta ainda precisa existir no Firebase Authentication.
4. **Multiempresa ausente**: não há `tenantId`, isolamento de clientes, planos, limites ou cobrança.
5. **Dados sensíveis no Git**: os backups JSON estão versionados e podem conter dados operacionais. Eles devem sair do repositório e ser mantidos em storage privado.
6. **Fotos no banco**: imagens em base64 dentro do Realtime Database aumentam custo, latência e risco de limite. Use Firebase Storage com URLs protegidas.
7. **Bootstrap frágil**: o ADMIN inicial é identificado por e-mail fixo. Isso deve ser trocado por configuração de proprietário/tenant e custom claims.
8. **Manutenibilidade**: um arquivo de quase 200 KB dificulta testes, revisão e evolução. Separe frontend, domínio, componentes e serviços.
9. **Qualidade operacional**: ainda faltam testes automatizados, auditoria, logs, observabilidade, política de retenção e restauração testada.

## Entregue nesta versão

- Papéis **ADMIN**, **Operador** e **Leitor**.
- Permissões por módulo: Veículos, Serviços/configurações, Estoque e Relatórios.
- ADMIN pode autorizar/remover usuários e escolher leitura ou acesso completo por módulo.
- Usuário não autorizado não entra no aplicativo.
- Operações de escrita ficam protegidas no frontend por módulo.
- Arquivo de regras inicial e documentação de segurança adicionados.

> A proteção definitiva exige publicar regras do Firebase e, para permissões de escrita por módulo, migrar o banco para nós separados ou usar uma API/Cloud Functions autorizada.

## Roadmap recomendado

### P0 — segurança e confiabilidade

- Publicar e testar regras do Realtime Database em ambiente separado.
- Remover backups reais do Git e rotacionar credenciais caso tenham sido compartilhados.
- Migrar fotos para Firebase Storage.
- Criar ambientes `dev`, `staging` e `production`.
- Implementar Cloud Function de convite/criação de usuário e custom claims.
- Adicionar logs de auditoria para login, alteração, exclusão, importação e exportação.
- Validar todos os inputs também no backend.

### P1 — produto SaaS

- Adicionar `tenantId` em todos os registros e isolamento por empresa.
- Criar cadastro de empresa, proprietário, usuários e centros de custo.
- Criar planos e limites: quantidade de veículos, usuários, armazenamento e relatórios.
- Criar onboarding guiado e dados de demonstração.
- Permitir configuração de marca, logo, moeda, unidade e regras de manutenção por cliente.
- Criar página de suporte, termos de uso, privacidade e política de tratamento de dados.

### P2 — operação de frota

- Ordens de serviço com status, responsável, aprovação e custo previsto/real.
- Agenda de manutenção e notificações por e-mail/WhatsApp.
- Controle de documentos: CRLV, seguro, licenciamento, CNH e vencimentos.
- Histórico de alterações e aprovação para exclusões.
- Indicadores: custo por km, disponibilidade, consumo, custo por veículo e por centro de custo.
- Importação padronizada por CSV e integração com odômetro/GPS quando fizer sentido.

### P3 — escala comercial

- Separar o frontend em módulos e adotar TypeScript.
- Criar testes unitários, de integração, regras Firebase e E2E.
- Pipeline CI/CD com lint, testes, preview e deploy controlado.
- Monitoramento de erros e performance.
- Documentação de API e manual do cliente.
- Pesquisa com 3–5 empresas-piloto para validar preço, onboarding e funcionalidades realmente pagas.

## Modelo comercial inicial sugerido

Comece com uma oferta simples: **Plano Básico** para pequenas frotas e **Plano Profissional** com mais usuários, relatórios, alertas e auditoria. Evite vender apenas “software”; venda redução de manutenção emergencial, controle de custo e rastreabilidade. Meça ativação (primeiro veículo cadastrado), retenção mensal, custo por veículo e quantidade de registros por cliente antes de definir preços definitivos.
