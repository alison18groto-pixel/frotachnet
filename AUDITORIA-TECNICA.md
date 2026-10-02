# Auditoria técnica — Frotas

**Data:** 02/10/2026  
**Escopo:** `index.html`, Firebase Realtime Database, regras de segurança, Cloud Functions, migração, persistência, relatórios, cálculos de KM/consumo, manutenção e publicação.

## Resumo executivo

O sistema está funcional e já possui boas bases: autenticação Firebase, fila de salvamento, backup JSON, histórico de KM, relatórios executivos, funções administrativas e uma primeira camada de regras no Realtime Database.

Entretanto, a arquitetura ainda está em uma fase intermediária. O frontend continua gravando praticamente todo o domínio em `appData`, enquanto as regras e a documentação já apontam para uma estrutura modular. Isso cria uma divergência importante entre o que a interface promete e o que o servidor realmente permite.

### Prioridades

| Prioridade | Tema | Impacto |
|---|---|---|
| **P0 — urgente** | Corrigir regras Firebase e concluir a separação dos módulos | Segurança, permissões e capacidade de salvar |
| **P0 — urgente** | Substituir salvamento do objeto inteiro por atualizações transacionais por módulo | Perda de dados em edições simultâneas |
| **P1 — alta** | Criar testes automatizados para KM, consumo, custos e permissões | Evitar regressões como as dos relatórios |
| **P1 — alta** | Sanitizar qualquer conteúdo antes de usar `innerHTML` | Risco de XSS por dados cadastrados |
| **P1 — alta** | Corrigir conversão numérica em todos os relatórios | Totais incorretos quando dados vêm como texto |
| **P2 — média** | Dividir o `index.html` em módulos e criar processo de build/deploy | Manutenção, velocidade e publicação confiável |
| **P2 — média** | Melhorar importação, backups, auditoria e experiência de edição | Operação e recuperação |

---

## Pontos positivos encontrados

- O cálculo do **KM atual** dos relatórios agora usa diretamente `v.km`.
- O relatório diferencia **KM atual/odômetro** de **KM rodados analisados**.
- Existe `saveQueue`, evitando algumas colisões entre salvamentos sequenciais na mesma sessão.
- Há backup JSON manual e script de migração separado.
- A autenticação é feita pelo Firebase Authentication; o frontend não armazena senhas.
- Existem Cloud Functions para auditoria, sincronização de perfil e criação de usuário.
- O histórico de KM reúne registros manuais, abastecimentos e serviços.
- As regras têm uma estrutura inicial para `usuariosPorUid`, `veiculos`, `servicos`, `estoque` e `auditLogs`.
- O código contém mensagens de erro e validações básicas para vários cadastros.

---

# 1. Problemas críticos de segurança e permissões

## 1.1 `appData` ainda concentra todos os módulos

O frontend continua carregando e salvando `appData` como um objeto único. A documentação já reconhece essa limitação, mas as regras novas também estão presentes no mesmo arquivo.

### Consequência

Não é possível garantir no servidor que um operador altere apenas veículos, serviços ou estoque enquanto tudo permanece dentro de uma chave única. A proteção feita somente pela interface pode ser contornada chamando o Firebase diretamente.

### Recomendação

Migrar definitivamente para nós separados:

```text
veiculos/
servicos/
estoque/
configuracoes/
usuariosPorUid/
auditLogs/
```

Depois, alterar o frontend para ler e salvar cada módulo separadamente. Manter `appData` somente como backup legado/rollback temporário, com data de desativação definida.

## 1.2 A regra de escrita no pai pode bloquear as regras filhas

Em `firebase.database.rules.json`, `appData` possui uma regra `.write` restrita ao ADMIN e a alguns UIDs específicos. As regras de escrita em `appData/veiculos`, `appData/estoque`, `appData/oficinas` e `appData/regras` não substituem de forma segura a regra do pai quando o pai já concede ou nega a operação.

Além disso, o `salvarDados()` de operadores tenta escrever em caminhos dentro de `appData`, enquanto a regra principal do pai está restrita.

### Resultado provável

- Operadores podem ver a interface de edição, mas receber erro ao salvar; ou
- As permissões reais ficam diferentes da documentação; ou
- Um UID antigo continua com acesso especial sem aparecer claramente na tela.

### Recomendação

Testar as regras com usuários reais em projeto de homologação e remover a dependência da chave pai. O operador deve gravar diretamente em seu nó modular, por exemplo:

```text
veiculos/{id}
servicos/{id}
estoque/{id}
```

## 1.3 Leitura ampla de `appData`

A regra atual permite leitura de `appData` para qualquer usuário autenticado. Isso pode expor dados de usuários, configurações, estoque, veículos e demais módulos mesmo que a interface esconda a tela.

### Recomendação

Aplicar `.read` por módulo, usando `usuariosPorUid/{uid}/permissoes/{modulo}`. A interface deve ser apenas uma conveniência; o Firebase precisa ser a autoridade final.

## 1.4 Login por apelido antes da autenticação

O login consulta `loginAliases/{alias}` antes de o usuário estar autenticado. Porém, as regras atuais exigem `auth != null` para leitura de `loginAliases`.

### Recomendação

Escolher uma destas alternativas:

1. Fazer o login sempre por e-mail;
2. Criar uma Cloud Function HTTPS Callable para resolver o apelido de forma controlada;
3. Usar um índice público mínimo, sem expor informações desnecessárias e com proteção contra enumeração.

A opção mais segura para o projeto atual é a Cloud Function de resolução de apelido.

## 1.5 Identidades e permissões hardcoded no frontend

O código contém:

- UID do proprietário;
- E-mail bootstrap do ADMIN;
- Regra especial para qualquer e-mail contendo `eduardo`;
- UID adicional em `firebase.database.rules.json`.

Isso é frágil e pode conceder permissões inesperadas. Mesmo que o frontend não seja a autoridade final, essa lógica pode confundir a operação e gerar divergência com o servidor.

### Recomendação

Criar uma configuração de proprietário/tenant no Firebase e consultar permissões somente por UID. Remover a regra baseada em trecho de e-mail e eliminar o UID excepcional quando não for mais necessário.

## 1.6 Função de criação de usuário incompleta no fluxo da tela

Existe a Cloud Function `criarUsuario`, que cria a conta no Authentication com senha aleatória, mas a tela atual ainda grava o perfil diretamente em `appData/usuarios` e orienta o administrador a criar o usuário manualmente no Firebase.

### Recomendação

Escolher um fluxo único:

- ADMIN informa e-mail e permissões;
- Cloud Function cria o usuário ou gera link de redefinição;
- usuário recebe convite seguro;
- perfil e permissões são gravados pelo servidor;
- senha nunca é exibida ou armazenada pelo frontend.

---

# 2. Persistência e risco de perda de dados

## 2.1 O ADMIN salva o domínio inteiro de uma vez

Em `salvarDados()`, o ADMIN grava `updates.appData = snapshotToSave`. Isso substitui o objeto completo.

### Risco

Se duas telas estiverem abertas, uma edição antiga pode sobrescrever uma edição mais nova. Também é possível perder alterações feitas por outro usuário entre a leitura e o salvamento.

### Recomendação

Usar atualizações granulares e transações:

```text
veiculos/{id}
servicos/{id}
estoque/{id}
configuracoes/oficinas
configuracoes/regras
```

Para alterações que dependem do valor anterior, usar `transaction()` ou Cloud Function com validação de versão.

## 2.2 A fila de salvamento funciona apenas dentro da aba atual

`saveQueue` evita colisões sequenciais na mesma sessão, mas não resolve conflitos entre abas, celulares ou usuários diferentes.

### Recomendação

Adicionar:

- `updatedAt`;
- `updatedBy`;
- `version` por registro;
- transação para campos críticos;
- aviso de conflito quando a versão remota mudou.

## 2.3 Importação de backup é perigosa

`importarBackup()` aceita um JSON e troca o estado local sem validação profunda. Depois, `salvar()` pode gravar o conteúdo inteiro.

### Melhorias necessárias

- validar versão e estrutura;
- mostrar prévia da quantidade de veículos, serviços e itens;
- exigir confirmação explícita;
- gerar backup automático antes da restauração;
- oferecer restauração por módulo;
- bloquear IDs duplicados e campos inválidos;
- registrar auditoria da restauração.

## 2.4 Histórico inicial é alterado em memória

`popularHistoricoKmInicial()` reconstrói o histórico e marca `db.kmHistoryPopulated`, mas essa alteração só é persistida quando algum salvamento posterior ocorre. Isso pode gerar comportamento diferente entre sessões.

### Recomendação

Fazer a migração do histórico uma única vez em script/Cloud Function, com relatório de registros alterados, em vez de transformar silenciosamente os dados durante o carregamento da tela.

---

# 3. Problemas de cálculo e qualidade dos relatórios

## 3.1 Conversão numérica não é uniforme

Alguns trechos usam `Number(...)`, outros usam `parseNumero(...)` e outros somam diretamente valores armazenados:

```javascript
m.litros += a.qtd || 0;
m.valor += a.valor || 0;
```

Se `qtd` ou `valor` vierem como texto, a soma pode concatenar strings ou produzir total incorreto. O mesmo padrão aparece em partes dos relatórios de serviços e média de KM.

### Recomendação

Normalizar os dados na entrada e usar funções únicas em todos os cálculos:

```javascript
const litros = parseNumero(a.qtd);
const valor = parseNumero(a.valor);
const km = parseKM(a.km);
```

Idealmente, todos os registros devem ser convertidos para um schema numérico antes de entrarem em `db`.

## 3.2 KM rodado por período precisa de regra de negócio documentada

Quando existe filtro de período, `calcularKmRodadoPeriodo()` usa os registros disponíveis dentro do intervalo. Se o período começa depois do último registro anterior, o denominador pode ficar subestimado.

### Exemplo

Se o veículo tinha 140.000 km antes do período e aparece com 157.801 km no fim do período, o relatório precisa decidir se deve usar:

- o primeiro KM conhecido antes do período como base; ou
- somente registros dentro do período; ou
- o odômetro inicial informado pelo usuário.

Hoje essa decisão não está formalizada em uma política única.

### Recomendação

Definir e exibir no relatório:

```text
KM inicial considerado
KM final considerado
KM rodados = final - inicial
Fonte de cada valor
```

## 3.3 O relatório deve diferenciar sempre três conceitos

Recomendo padronizar todos os relatórios com estes nomes:

- **Odômetro atual:** `v.km`;
- **KM registrado:** valor de um abastecimento/serviço/histórico;
- **KM rodados no período:** distância calculada entre base e final.

Isso evita que um valor de serviço, histórico ou distância acumulada volte a aparecer como odômetro atual.

## 3.4 Outliers de consumo precisam ser configuráveis

O limite de 20 km/l foi aplicado para excluir valores fora do padrão. É uma proteção útil, mas deve ser configurável por tipo de veículo ou frota, e o relatório deveria informar quantos registros foram excluídos e por quê.

---

# 4. Segurança do frontend e dados inseridos

## 4.1 Uso extensivo de `innerHTML` com dados cadastrados

O sistema constrói grande parte da interface com `innerHTML`, usando motorista, placa, modelo, observações, oficina, notas e dados de auditoria.

`highlightText()` também injeta `<mark>` no texto sem primeiro escapar o conteúdo original.

### Risco

Um valor cadastrado como observação, nome ou placa contendo HTML/JavaScript pode criar XSS no navegador de qualquer usuário que visualize o registro.

### Recomendação

Criar uma função `escapeHtml()` e aplicá-la antes de inserir valores em templates. Para conteúdo que precisa aceitar formatação, usar uma lista de tags permitidas com sanitização explícita. Para imagens, validar esquema e origem do URL antes de usar `window.open`/`img src`.

## 4.2 Conteúdo de imagem é inserido diretamente

`showImage(src)` constrói HTML com o valor de `src`. Mesmo que as imagens atuais sejam data URLs, o valor precisa ser validado para aceitar somente formatos esperados.

## 4.3 Dependências externas sem fixação completa

Firebase compat e Chart.js são carregados por CDN. O Firebase está em uma versão explícita, mas Chart.js não está fixado por versão no trecho verificado.

### Recomendação

Fixar versões e usar Subresource Integrity quando possível. Para produção, utilizar um build com dependências versionadas e revisão de atualização.

---

# 5. Arquitetura e manutenção

## 5.1 `index.html` está grande demais

O arquivo possui aproximadamente **3.679 linhas** e concentra:

- HTML;
- CSS;
- autenticação;
- persistência;
- permissões;
- veículos;
- serviços;
- estoque;
- pneus;
- relatórios;
- exportações;
- gráficos.

Isso torna cada ajuste arriscado e dificulta testar uma área sem quebrar outra.

### Estrutura recomendada

```text
src/
  auth.js
  firebase.js
  permissions.js
  persistence.js
  data-normalization.js
  calculations/
    consumption.js
    mileage.js
    costs.js
  modules/
    vehicles.js
    services.js
    inventory.js
    tires.js
  reports/
    executive.js
    fuel.js
    mileage.js
  ui/
    escape-html.js
    notifications.js
index.html
```

Pode continuar sendo uma aplicação simples, mas com build mínimo usando Vite ou outro bundler leve.

## 5.2 Não há testes automatizados no repositório

Não foram encontrados testes unitários ou de integração.

### Testes prioritários

1. `parseKM()` com número, `157.801`, `157801`, vazio e valores inválidos;
2. `parseNumero()` com `52,07`, `1.234,56`, número e vazio;
3. consumo normal, consumo outlier e abastecimentos fora de ordem;
4. KM inicial/final com filtros de período;
5. custo por KM com serviço e combustível;
6. veículos sem histórico, sem abastecimento e sem KM;
7. permissões por papel e módulo;
8. backup/importação com JSON inválido;
9. regras do Firebase usando Emulator Suite.

## 5.3 Não há pipeline de publicação

O repositório não possui `firebase hosting`, workflow GitHub ou processo automatizado de deploy. Isso causou o problema recente em que o código estava corrigido no GitHub, mas a tela usada continuava antiga.

### Recomendação

Escolher um destino oficial e documentá-lo:

- Firebase Hosting; ou
- GitHub Pages; ou
- outra hospedagem definida pelo projeto.

Depois criar deploy automatizado com:

- validação JavaScript;
- testes;
- validação JSON das regras;
- publicação somente após sucesso;
- identificação de versão visível na tela.

---

# 6. Plano recomendado de execução

## Fase 1 — Segurança e estabilidade

1. Criar projeto Firebase de homologação.
2. Fazer export real do Realtime Database.
3. Migrar uma cópia para nós modulares.
4. Testar regras com ADMIN, operador, leitor e conta sem acesso.
5. Remover UID especial que não seja mais necessário.
6. Corrigir login por apelido.
7. Parar de usar `appData` como fonte principal.
8. Publicar regras somente após os testes.

## Fase 2 — Dados e relatórios

1. Criar normalizador único de veículo, KM, litros, valores e datas.
2. Definir formalmente KM atual, KM registrado e KM rodado.
3. Corrigir todos os relatórios para usar o normalizador.
4. Criar testes de regressão para os valores reais da frota.
5. Validar a Saveiro do Wesley e os demais veículos com um relatório de conferência.
6. Adicionar origem, KM inicial e KM final ao cálculo de custo/km.

## Fase 3 — Operação segura

1. Importação com prévia e rollback.
2. Backup automático periódico.
3. Auditoria de criação, edição, exclusão, restauração e alteração de permissão.
4. Controle de versão por registro.
5. Deploy automático com versão exibida na tela.

## Fase 4 — Manutenção e experiência

1. Dividir o monólito em módulos.
2. Substituir `prompt()` por modais e formulários validados.
3. Sanitizar HTML e imagens.
4. Melhorar indicadores de carregamento e erro.
5. Otimizar renderização para não reconstruir a tela inteira a cada atualização.

---

# Conclusão

A prioridade não deve ser adicionar muitos recursos novos agora. O melhor retorno virá de **concluir a segurança modular, estabilizar a persistência e criar testes dos cálculos**.

A ordem recomendada é:

1. **Firebase e permissões reais**;
2. **salvamento sem sobrescrita global**;
3. **normalização e testes de KM/valores**;
4. **deploy automático**;
5. **divisão do código e melhorias de interface**.

Com essas cinco etapas, o sistema ficará mais seguro, previsível e fácil de evoluir sem repetir problemas como veículos ausentes, KM incorreto ou alterações que aparecem no GitHub mas não chegam à tela usada pela equipe.
