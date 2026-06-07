# Patch Notes

## 0.8.5 - 07/06/2026

- Painel web ajustado para escutar em `0.0.0.0` e porta padrão `8080`, conforme exigência da Discloud para sites.
- Adicionado endpoint `/health` para testar se o painel está respondendo na hospedagem.

## 0.8.4 - 07/06/2026

- Configuração da Discloud alterada para `TYPE=site`, permitindo acesso público ao painel web.
- Documentação de deploy atualizada com a URL esperada do painel na Discloud.

## 0.8.3 - 07/06/2026

- Projeto preparado para deploy na Discloud com `discloud.config`, `.discloudignore` e guia `DISCloud.md`.
- Painel web passa a aceitar `PORT` além de `WEB_PORT`, facilitando execução em hospedagens.
- Script `build` adicionado ao `package.json` para compilar o painel React.

## 0.8.2 - 07/06/2026

- Painel web ganhou aba Exoneração para selecionar um membro do servidor em dropdown e exonerar pelo site.
- Exoneração pelo painel usa permissão de Supervisão e valida se o bot consegue expulsar o membro pela hierarquia.

## 0.8.1 - 07/06/2026

- Aviso de lotação e barra laranja de barca passam a considerar 4 ou mais oficiais embarcados.
- Comando `/exonerar` passa a usar a mesma permissão/cargo autorizador dos registros.

## 0.8.0 - 07/06/2026

- Dono da barca recebe DM de atenção quando a barca atinge 3 ou mais oficiais embarcados.
- Barcas abertas com 3 ou mais oficiais passam a exibir barra lateral laranja.

## 0.7.9 - 07/06/2026

- Usuário não pode abrir uma barca se já estiver embarcado em outra barca aberta.
- Usuário não pode embarcar em outra barca se já estiver embarcado em uma barca aberta.
- Bloqueio retorna card ephemeral vermelho informando a barca atual e desde quando ela está aberta.

## 0.7.8 - 07/06/2026

- Resumo automático fixo da sala de barcas foi descontinuado.
- Adicionado comando `/resumo`, com resposta ephemeral, para consultar barcas ativas e oficiais embarcados no momento.

## 0.7.7 - 07/06/2026

- Resumo de barcas ativas agora mostra também a contagem total de oficiais embarcados.

## 0.7.6 - 07/06/2026

- Sala de barcas ativas agora recebe um card de resumo no final com a contagem de barcas abertas.
- Resumo de barcas é reposicionado automaticamente ao abrir, encerrar ou carregar patrulhamentos ativos.

## 0.7.5 - 07/06/2026

- Ao abrir uma barca, o usuário recebe um botão direto para a sala de barcas ativas.
- Adicionado comando `/infobarcas` com card informativo e banner explicando como abrir patrulhamento pelo menu.

## 0.7.4 - 07/06/2026

- Log de patrulhamento encerrado passa a exibir a foto da viatura como miniatura no cabeçalho, em vez de imagem grande no corpo do card.

## 0.7.3 - 07/06/2026

- Dropdown de remover policial no patrulhamento agora exibe o apelido do membro no servidor em vez do ID Discord.

## 0.7.2 - 07/06/2026

- Card de novo registro foi reorganizado com identificação, dados do novo registro, data/hora e status em blocos separados.
- Novo registro passa a seguir o mesmo padrão visual dos cards de atualização.

## 0.7.1 - 07/06/2026

- Card de atualização de registro foi reorganizado com identificação, alterações solicitadas, data/hora e status em blocos separados.
- Alterações solicitadas agora aparecem no formato "Campo: antes → depois".

## 0.7.0 - 07/06/2026

- Atualizações de registro agora mostram o antes e depois das alterações solicitadas na log de análise.
- Solicitações aprovadas ou recusadas deixam de exibir os botões Autorizar e Negar.
- Tabela de registros ganhou campos para guardar os dados anteriores da atualização.

## 0.6.9 - 07/06/2026

- Abertura de patrulhamento não exibe mais modal de observação; a observação deve ser adicionada pelo botão do card ativo.
- Log de patrulhamento encerrado agora exibe a foto da viatura utilizada, quando configurada.
- Cards de novo registro usam emoji join e barra azul; atualizações usam emoji update e barra branca.

## 0.6.8 - 07/06/2026

- Adicionado comando `/limpar` para apagar uma quantidade informada de mensagens do canal.
- DMs de registro aprovado e recusado agora usam Components v2 com banner da Rádio Patrulha.
- Novos membros recebem uma DM automática de boas-vindas com link do manual e link do canal do menu de registro.

## 0.6.7 - 07/06/2026

- Registro e atualização de registro agora alteram automaticamente o apelido do usuário para o modelo "ID - Nome" ao enviar a solicitação.
- Aprovação de registro passa a aplicar apenas cargos de unidade e patente, mantendo Autorizar/Recusar focado nos cargos.

## 0.6.6 - 07/06/2026

- Log de patrulhamento encerrado agora usa o emoji VTR no título.
- Barra lateral das barcas ativas fica verde quando há vagas e vermelha quando a viatura está lotada.
- Cards de entrada e saída do servidor agora exibem o avatar do membro em miniatura no cabeçalho.

## 0.6.5 - 06/06/2026

- Imagem da viatura no card de patrulhamento foi movida para miniatura 1:1 no canto do cabeçalho.
- Removida exibição grande da foto da viatura no meio do card ativo.

## 0.6.4 - 06/06/2026

- Aba Patrulhamento ganhou campo de foto por viatura.
- Cards de patrulhamento ativo passam a exibir a imagem da viatura selecionada quando configurada.

## 0.6.3 - 06/06/2026

- Botão Painel Policial foi ocultado temporariamente do menu principal, mantendo o código disponível para reativação futura.

## 0.6.2 - 06/06/2026

- Card de patrulhamento recebeu espaçamento entre a lista de embarcados e os botões.

## 0.6.1 - 06/06/2026

- Botões do menu principal, painel de anúncios e patrulhamento receberam os novos emojis customizados.
- Botão de encerramento de patrulhamento passou a exibir "Finalizar Patrulhamento".

## 0.6.0 - 06/06/2026

- Respostas ephemeral simples agora são removidas automaticamente após alguns segundos.
- Personalização ganhou nome amigável e descrição do perfil do bot.
- Adicionada aba Administração com usuários do site e permissões Supervisão/RH.
- Adicionados IDs de cargos Supervisão e RH para controlar ações dentro do bot.
- RH pode aprovar/negar registros, enviar DMs e anúncios; Supervisão pode fazer tudo.

## 0.5.9 - 06/06/2026

- Card de patrulhamento agora troca o texto para "Viatura sem vagas disponíveis para embarque" quando a lotação chega a zero.

## 0.5.8 - 06/06/2026

- Card de patrulhamento ativo não mostra mais o texto "VIATURA" nem a quantidade de lugares no título.
- Linha de observação do patrulhamento agora mostra vagas disponíveis calculadas pelos assentos menos embarcados.

## 0.5.7 - 06/06/2026

- Solicitações de registro no canal de análise convertidas para Components v2.
- Botões de aprovação e negação agora usam os emojis animados configurados.
- Aprovação e recusa passam a editar o card v2 original marcando APROVADO ou RECUSADO.

## 0.5.6 - 06/06/2026

- Aba DM ganhou edição das mensagens padrão de Ausência e Falta de cursos básicos.
- Adicionado canal de logs de entrada e saída do servidor.
- Logs de entrada e saída criados em Components v2 com banner da Rádio Patrulha.
- Adicionado comando `/exonerar` para expulsar membro pelo ID Discord com motivo de exoneração.

## 0.5.5 - 06/06/2026

- Patch Notes agora exibem a data da alteração.
- Botão Patch Notes abre um popup com a lista completa de versões.
- Personalização ganhou campo separado para Banner do bot e Banner das embeds.
- Ao gravar, o painel tenta atualizar logo e banner do bot no perfil do Discord.
- Caixas da aba Personalização foram alinhadas com a mesma altura.

## 0.5.4 - 06/06/2026

- Design do painel web refinado com menos azul saturado e leitura mais compacta.
- Aba DM separada da aba Anúncio.
- Aba DM recebeu mensagens prontas para Ausência e Falta de cursos básicos.
- Criador do patrulhamento agora embarca automaticamente na própria viatura.

## 0.5.3

- Aba Personalização movida para o final.
- Patch Notes agora aparecem no card superior ao lado do botão Gravar.
- Criada aba Anúncio no painel web.
- Formulário web de anúncio usa dropdown de canais e color picker para a barra.
- Formulário web de DM replica os campos da versão Discord.

## 0.5.2

- Card superior criado para status do banco, botão Gravar e mensagem de salvamento.
- Aba Personalização agora mostra miniatura do banner e logo configurados.
- Patentes e Unidades na aba Registro agora usam layout de tabela com cabeçalho único.

## 0.5.1

- Adicionado login no painel web com usuário e senha.
- Tema do painel alterado para visual policial azul.
- Banner e logo movidos da aba Salas para a aba Personalização.
- Observação de barcas abertas agora abre modal e pode ser editada por quem abriu a barca.

## 0.5.0

- Adicionado comando `/criarpainel`.
- Criado Painel de Anúncios em Components v2.
- Adicionado envio de DM privada por ID do usuário.
- Adicionada cópia da DM no canal de logs de DM.
- Adicionado envio de anúncio para canal padrão ou canal informado.
- Painel web agora possui sala de anúncios e sala de logs de DM.
- Painel web tenta listar canais do Discord para seleção em dropdown quando o bot está rodando.

## 0.4.4

- Patrulhamento ativo convertido para Components v2.
- Log de patrulhamento encerrado também usa Components v2.
- Atualizações de embarque, desembarque e remoção agora reeditam o container v2.

## 0.4.3

- Melhoradas as etapas de seleção com Components v2.
- Seleção de unidade/patente no registro agora aparece em container visual ephemeral.
- Seleção de viatura no patrulhamento agora aparece em container visual ephemeral.

## 0.4.2

- Patrulhamentos encerrados agora são removidos da sala de patrulhamentos ativos.
- Patrulhamentos abertos por mais de 20 horas são encerrados automaticamente.
- O bot recarrega patrulhamentos abertos do Supabase ao iniciar.
- O menu `/setup` agora usa Components v2 com botões dentro do container visual.

## 0.4.1

- Adicionadas as patentes oficiais no cadastro.
- Adicionadas as unidades oficiais no cadastro.
- As listas foram gravadas no Supabase preservando IDs de cargos já configurados.

## 0.4.0

- Adicionados assentos por viatura na aba Patrulhamento.
- Patrulhamento agora abre com seleção de viatura e modal de observação.
- Embed de patrulhamento ajustada para o padrão visual solicitado.
- Adicionados botões: Embarcar, Desembarcar, Observação, Remover Policial e Encerrar Patrulhamento.
- Embarque respeita lotação da viatura.
- Desembarque só pode ser usado por quem já está embarcado.
- Remover Policial só pode ser usado por quem abriu o patrulhamento.
- Encerrar Patrulhamento pode ser usado por quem abriu ou por administrador.

## 0.3.0

- Painel convertido para React.
- Adicionado verificador de conexão com Supabase.
- Adicionado campo de logo do bot.
- Adicionada aba Patrulhamento.
- Adicionada aba Patch Notes.

## 0.2.0

- Configurações, registros e patrulhamentos movidos para Supabase.
- Criadas tabelas isoladas com prefixo `bot_rp_`.
- Adicionado painel web de configuração.

## 0.1.0

- Criado bot Discord com registro, atualização, aprovação, recusa e patrulhamento.
