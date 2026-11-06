# NAC Training — Missão 09.2

## Escopo da auditoria

O catálogo remoto não foi auditado: não havia sessão administrativa remota autorizada. Os números abaixo pertencem **somente à fixture local de testes**, nunca à biblioteca real da NAC. Os arquivos de inventário [CSV](evidence/mission092-local-inventory.csv) e [JSON](evidence/mission092-local-inventory.json) registram ID, nome, grupo, mídia, dimensões, instruções e pendências de cada exercício. As cinco fotografias de exemplo não têm autorização de uso registrada e permanecem **aguardando revisão**.

| Métrica local | Quantidade |
|---|---:|
| Exercícios | 5 |
| Imagens legíveis | 5 |
| Sem imagem técnica aprovada | 5 |
| Vídeos | 0 |
| GIFs | 0 |
| Mapas musculares legíveis | 1 |
| Com instruções cadastradas | 5 |
| Aguardando revisão técnica | 5 |
| Completos e aprovados | 0 |
| Sem demonstração | 5 |
| Arquivos quebrados na fixture | 0 |

### Lacunas por exercício da fixture local

| Exercício | ID | Grupo | Imagem | Movimento | Mapa | Instruções | Revisão |
|---|---|---|---|---|---|---|---|
| Supino Reto | `b97a939d-5bd6-4642-b687-7fd861232966` | Peito | Exemplo legível | Ausente | Exemplo legível | Cadastradas | Pendente |
| Supino Inclinado | `43063301-d0d5-4db8-9fd3-2598e97d7af6` | Peito | Exemplo legível | Ausente | Ausente | Cadastradas | Pendente |
| Crucifixo na Máquina | `b5bad0cb-b5b8-4358-b85f-e4f97c29ffbb` | Peito | Exemplo legível | Ausente | Ausente | Cadastradas | Pendente |
| Crossover | `94c47db3-4ccc-4666-b08c-428501e18ce4` | Peito | Exemplo legível | Ausente | Ausente | Cadastradas | Pendente |
| Tríceps na Polia | `5cc675ff-277f-4ce0-8791-4248de1b00a1` | Tríceps | Exemplo legível | Ausente | Ausente | Cadastradas | Pendente |

As instruções cadastradas ainda exigem validação profissional. Dicas e erros comuns do catálogo estão vazios nos cinco itens. A anotação de uma ficha individual do Supino Reto não foi interpretada como dica oficial do catálogo. O mapa de peito mostra o músculo principal, mas ainda precisa de revisão para destacar visualmente os auxiliares.

## Padrão de mídia NAC

- **Capa:** exercício e equipamento identificáveis, corpo inteiro ou articulações relevantes no quadro, iluminação consistente, sem texto embutido. Novo upload horizontal com pelo menos 900 × 450 px e proporção entre 1,3:1 e 2,2:1. O servidor preserva a proporção, limita a 1440 × 900 px e converte para WebP (qualidade 78, até 900 KB). Arquivos existentes não são substituídos automaticamente.
- **Miniatura:** usa a capa otimizada, com carregamento sob demanda, enquadramento fixo e cache por URL versionada. O inventário registra dimensões e bytes para identificar imagens que precisem de nova captura.
- **Mapa muscular:** imagem específica do exercício, com músculo principal e auxiliares revisados tecnicamente. Novos uploads são convertidos para WebP sem distorção, até 1440 × 1440 px.
- **Movimento:** MP4/WebM de até 25 MB ou GIF de até 12 MB, movimento completo e tecnicamente validado. O aluno inicia a reprodução; vídeo começa sem som, com controles para parar e repetir. Na ausência de arquivo aprovado, permanece o estado neutro.
- **Direitos:** antes de aprovar, o administrador registra a origem/autorização da mídia e o nome do profissional responsável. Fotografias ou vídeos de terceiros sem licença não devem ser cadastrados.

## Fluxo de cadastro e revisão

1. Identificar o exercício pelo **ID** do inventário; confirmar nome, grupo e equipamento com o profissional.
2. Reunir capa, demonstração e mapa próprios ou licenciados. Conferir que todos mostram o exercício correto.
3. Revisar instruções, músculos, dica e erros comuns com o profissional responsável. Registrar somente conteúdo específico e fundamentado.
4. Enviar os arquivos no detalhe administrativo. Cada envio ou alteração de orientação reabre automaticamente a revisão.
5. Registrar a autorização de uso e o profissional, confirmar a revisão e aprovar. O banco bloqueia aprovação sem capa, demonstração, mapa, instruções, dica e erros comuns. Aluno e professor não alteram a aprovação oficial.
6. Repetir a auditoria de arquivos e a homologação visual antes da publicação.

O painel de exercícios agora mostra totais e filtros para completos aprovados, sem imagem, sem demonstração, aguardando revisão e URL/formato inválido. Ele não afirma que uma URL com formato válido corresponde a um arquivo existente; a auditoria local verifica arquivos e requisições ao Storage separadamente. URLs externas não verificadas ficam identificadas como pendência.

Na ficha, biblioteca e detalhe, a associação usa `exercise.id`. Durante a sessão, a miniatura abre o detalhe com foto, movimento e músculos e retorna à mesma sessão, sem alterar séries registradas.

## Validação

Fechamento técnico executado em 5 de novembro de 2026, somente no Supabase local e no preview local do build final.

| Verificação | Resultado |
|---|---|
| Build completo após a validação final de formatos | **Aprovado**: Next.js 15.5.29, 28 rotas estáticas geradas e rotas dinâmicas compiladas |
| Lint e TypeScript | **Aprovados**, sem erros ou avisos de lint |
| Esquema e configuração de implantação | **Aprovados** (`test:db-schema` e `test:deployment-config`) |
| pgTAP original em banco local de ensaio limpo | **134/134 aprovados**, em 8 suítes existentes |
| pgTAP adicional da Missão 09.2 em banco local migrado | **12/12 aprovados**, em `supabase/tests-extra/nac_visual_media_test.sql`; não incluído na contagem original |
| Integração local via aplicação | **8 scripts aprovados**: autenticação, aluno, professor, administração, favoritos, revisão visual, upload/Storage e associação mídia/sessão |
| Navegador local | **Aprovado** em 390 × 844, 768 × 1024 e 1440 × 900: início, biblioteca, detalhe, mapa muscular, catálogo e revisão administrativa; sem rolagem horizontal |

O teste de upload verificou autenticação e papéis, assinatura inválida, dimensões mínimas, conversão WebP, leitura pública, associação pelo ID, **substituição com remoção do arquivo anterior** e remoção final. O teste administrativo enviou uma tentativa de aprovação com demonstração `.mov` não suportada: a ação retornou `erro=pendencias` e o estado permaneceu `pending`. O pgTAP adicional verificou bloqueio de aprovação incompleta, permissão exclusiva do administrador, reabertura, edição de mídia em exercício prescrito e preservação de séries, repetições e carga. Os fluxos de aluno, professor e administrador cobriram fichas, vínculos, sessões, histórico e isolamento de dados.

As únicas falhas encontradas durante o fechamento estavam na **preparação do teste adicional**: faltava o vínculo professor–aluno da ficha fictícia, e a carga `20.00` era comparada como texto a `20`. Corrigidas na suíte de teste; nenhum defeito da aplicação foi identificado nesses cenários. Dados criados pelos testes de integração foram removidos; a suíte pgTAP adicional executou em transação com `rollback`.

As [capturas reais do build final, lado a lado com a referência](evidence/mission092-release-reference-vs-app.png) mostram a distância visual que ainda existe em relação à arte aprovada. Estão disponíveis as capturas individuais do [início](evidence/mission092-release-real-inicio-390.png), [detalhe](evidence/mission092-release-real-detalhe-390.png), [biblioteca](evidence/mission092-release-real-biblioteca-390.png), [mapa muscular](evidence/mission092-release-real-musculos-390.png), [editor](evidence/mission092-release-real-admin-revisao-390.png) e [aprovação](evidence/mission092-release-real-admin-aprovacao-390.png), além das versões tablet e desktop com os mesmos nomes e larguras `768` e `1440`. Busca, filtros, abas, favoritos e imagens da fixture local funcionaram. Não há controle de reprodução quando falta demonstração.

### Migrations locais relacionadas

`20261104140000_exercise_anatomy_media.sql`, `20261104150000_student_exercise_favorites.sql`, `20261104160000_exercise_media_management.sql`, `20261104170000_exercise_media_storage_select.sql` e `20261104180000_exercise_visual_review.sql`. Elas foram exercitadas somente no banco local migrado. Nenhuma migration foi aplicada ao Supabase remoto.

## Pendências para o catálogo real

São necessários o inventário remoto autenticado em modo de leitura, a conferência das migrations contra o esquema real, mídias autorizadas de cada exercício real e a revisão técnica dos profissionais da NAC. O Supabase remoto não foi modificado e não houve publicação. As cinco imagens da fixture permaneceram exclusivamente no ambiente local e em capturas de evidência; são **exemplos pendentes**, não conteúdo oficial. A biblioteca de conteúdo real **não está homologada** e não há exercícios reais com mídia aprovada comprovados por esta auditoria.

## Revalidação final solicitada

Em 5 de novembro de 2026, o build foi repetido **após** a última alteração administrativa. O [log do build](evidence/mission092-validation-build.log) mostra compilação, lint e checagem de tipos aprovados e geração de 28 páginas estáticas. `npm run lint`, `npm run typecheck` e `npm run test:db-schema` também passaram em execuções separadas.

- [pgTAP original](evidence/mission092-validation-pgtap-original.log): **134/134** asserções aprovadas, distribuídas entre oito suítes, no banco local de ensaio limpo.
- [pgTAP adicional de mídia](evidence/mission092-validation-pgtap-media.log): **12/12** asserções aprovadas no banco local migrado, em transação revertida ao final.
- [Integração no build recém-gerado](evidence/mission092-validation-integration.log): **8/8 scripts aprovados**. Cobrem autenticação, aluno, professor, administrador, favoritos, revisão, upload e sessão. A quantidade de asserções internas desses scripts não foi somada à contagem pgTAP.

O teste administrativo confirmou bloqueio de aluno e professor, rejeição de assinatura de arquivo inválida e de capa fora das dimensões, upload convertido para WebP, substituição com remoção do arquivo anterior, remoção final e rejeição de aprovação de `.mov` não suportado. Fichas, vínculo com professor, séries, repetições, cargas e histórico foram exercitados nos testes de aluno, professor e administração. Não foi encontrada regressão da aplicação nesta rodada. O único acréscimo foi uma asserção explícita para o exercício prescrito **sem vídeo**: a sessão e o detalhe abriram, o retorno à sessão preservou o progresso e nenhum controle falso de reprodução apareceu.

### Conteúdo parcial e completo

Hoje o banco distingue somente `pending` e `approved`; `approved` continua exigindo capa, demonstração, mapa, instruções, dica, erros comuns, revisão profissional e direitos registrados. A execução do treino **não depende** desse status nem da presença de vídeo. Portanto, a falta de vídeo não bloqueia a ficha, mas `pending` **não significa** “parcialmente aprovado”: inclui também materiais ainda não revisados.

Uma separação segura futura seria acrescentar um estado próprio, por exemplo `partial_approved`, após definir os requisitos mínimos com a NAC: imagem autorizada, instruções tecnicamente revisadas, responsável e direitos registrados. Vídeo e mapa poderiam continuar como pendências identificadas; `approved` manteria integralmente as exigências atuais. Isso requer migration, política de transição e testes próprios antes de qualquer uso remoto. **Nenhuma regra de aprovação ou permissão foi alterada nesta revalidação.**

O [inventário local atualizado](evidence/mission092-local-inventory.json) confirma **5 exemplos, 5 pendentes, 0 completos/aprovados e 0 vídeos/GIFs**. Eles não foram enviados ao Supabase remoto nem tratados como conteúdo oficial. O encerramento é **técnico e local**; a homologação do catálogo real permanece pendente de auditoria remota autorizada, mídias com direitos comprovados e revisão profissional. Nenhuma migration remota foi aplicada e não houve deploy.
