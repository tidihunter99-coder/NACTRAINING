# NAC Training — Missão 09.1

## Resultado visual local

As capturas abaixo foram feitas pelo Chrome na aplicação Next.js local, em 390 × 844, com uma fixture de teste identificada. Não são mockups. A [comparação lado a lado](evidence/mission091-reference-vs-app.png) coloca cada tela real junto da referência aprovada. Capturas individuais: [início](evidence/mission091-real-inicio-390.png), [detalhe](evidence/mission091-real-detalhe-390.png), [biblioteca](evidence/mission091-real-biblioteca-390.png) e [músculos](evidence/mission091-real-musculos-390.png). As três telas também foram capturadas em 768 × 1024 e 1440 × 900, com prefixo `mission091-real-` em `docs/evidence`.

As miniaturas agora carregam sob demanda, com enquadramento fixo e estado neutro para falha ou ausência. A foto do detalhe não exibe botão de reprodução quando não existe demonstração. O player aceita MP4, WebM e GIF cadastrados pelo administrador, somente após ação do aluno, com controles de pausa/parada e repetição. GIFs não iniciam sem ação do aluno. O mapa muscular e as orientações são associados por exercício, sem reutilização automática por nome ou grupo.

## Gestão e segurança

O administrador pode enviar, substituir, visualizar e desassociar capa, demonstração e mapa muscular no detalhe do exercício, além de editar dica e erros comuns. O upload valida origem, papel, tamanho, MIME e assinatura do arquivo. O bucket `nac-exercise-media` tem políticas restritas ao administrador. As migrations incrementais estão em `supabase/migrations/20261104160000_exercise_media_management.sql` e `supabase/migrations/20261104170000_exercise_media_storage_select.sql`; foram aplicadas **apenas no Supabase local**. O painel administrativo calcula as contagens de mídia do catálogo acessível ao administrador, sem usar a página atual como amostra.

O Supabase remoto não foi modificado e não houve deploy. Séries, cargas, fichas e histórico permanecem no fluxo existente. O teste local confirmou bloqueio de upload e remoção para usuário sem sessão, aluno e professor.

## Auditoria de mídia

| Escopo | Total | Imagem | Vídeo | GIF | Mapa | Sem demonstração | Sem mídia | Arquivos com erro |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Fixture local de teste | 5 | 5 | 0 | 0 | 1 | 5 | 0 | 0 |

As cinco imagens são exemplos da fixture visual local. Elas não representam mídia aprovada do catálogo real. Não houve sessão administrativa remota para contar ou verificar os exercícios reais. O painel administrativo calcula essas contagens quando executado com acesso ao catálogo; a existência física de arquivos remotos ainda requer auditoria autenticada. Nenhum vídeo de execução aprovado foi fornecido, portanto a reprodução real de um exercício continua pendente de mídia autorizada. O mapa disponível destaca o peitoral no Supino Reto e lista tríceps e ombros como auxiliares; uma ilustração que também destaque visualmente os músculos auxiliares ainda depende de revisão técnica.

## Validação

- Lint, TypeScript, build, verificação de esquema e configuração de deploy: aprovados.
- 134 testes pgTAP: aprovados no banco de ensaio local limpo. Na base da fixture visual, o teste de *primeiro* administrador encontra um administrador já existente; as outras sete suítes passam.
- Testes locais de autenticação, aluno, professor, administrador e favoritos: aprovados.
- Teste de mídia ausente, assinatura inválida, upload e remoção no Storage local: aprovado.
- Capturas em 390 × 844, 768 × 1024 e 1440 × 900: sem rolagem horizontal. Busca, filtro, favoritos, abas e carregamento das imagens locais: aprovados.

## Pendências para homologação do catálogo real

1. Fornecer mídias próprias ou licenciadas e aprovadas tecnicamente para os exercícios reais. O aplicativo mantém estado neutro nos itens sem mídia.
2. Auditar o catálogo remoto com uma sessão administrativa somente de leitura para obter totais reais e checar arquivos externos. Nenhuma credencial administrativa remota foi usada nesta missão.
3. Validar reprodução com vídeo/GIF aprovado de cada exercício e revisar a anatomia secundária no mapa do Supino Reto.
