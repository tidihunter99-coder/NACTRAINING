# Revisão de segurança — Missão 03

## Escopo e evidência

Revisão estática das migrations locais em 3 de novembro de 2026. Em seguida, as migrations base e corretiva foram aplicadas a uma pilha Supabase local isolada e 22 testes pgTAP executados como `authenticated` com identidades fictícias. Não houve conexão de escrita, seed ou consulta privilegiada ao banco Supabase remoto. A existência das 10 tabelas e 29 políticas no projeto remoto é reportada pelo responsável pelo projeto, mas não foi revalidada por esta revisão.

## Cobertura de RLS

| Grupo | Políticas base | Resultado da revisão estática |
| --- | ---: | --- |
| `profiles` | 2 | Perfil próprio; leitura limitada a professor vinculado e administrador. |
| `student_instructors` | 4 | Vínculos são visíveis aos envolvidos; escrita apenas administrativa. |
| `exercises` | 4 | Biblioteca global, exercício próprio e exercício prescrito são separados. |
| `workout_plans` | 3 | Aluno lê ficha ativa; professor só administra aluno vinculado. |
| `workout_days` | 3 | Leitura deriva da ficha; escrita só em rascunho gerenciável. |
| `workout_exercises` | 3 | Leitura deriva da ficha; prescrição não é editável pelo aluno. |
| `workout_sessions` | 3 | Aluno cria/atualiza apenas sessões próprias; vínculo é validado por trigger. |
| `workout_set_logs` | 3 | Série exige sessão aberta do próprio aluno e exercício da divisão correta. |
| `body_metrics` | 3 | Sem acesso público ou administrativo amplo; aluno e professor vinculado somente. |
| `audit_events` | 1 | Somente administrador autenticado lê eventos. |
| **Total** | **29** | Contagem validada pelo teste estático. |

## Controles confirmados na migration base

- Não há política de `INSERT`, `UPDATE` ou `DELETE` de perfil que dê ao aluno a coluna `role`; o privilégio de coluna permite apenas `full_name`, `phone` e `avatar_url`.
- Alunos não têm política de atualização para `workout_plans`, `workout_days` ou `workout_exercises`.
- Vínculo ativo é conferido por função auxiliar para a leitura do professor.
- Triggers verificam que sessão, plano e divisão pertencem ao mesmo aluno; séries devem pertencer à divisão da sessão e respeitar a quantidade prescrita.
- `body_metrics` não tem política para administrador, reduzindo acesso a dados corporais.
- FKs usam `restrict` para preservar histórico de treino.

## Lacunas identificadas e correção preparada

| Prioridade | Lacuna na migration base | Correção local preparada |
| --- | --- | --- |
| Alta | Professor vinculado a dois alunos poderia reatribuir uma ficha entre eles, preservando sessões apontando para um plano com novo dono. | Trigger torna `student_id` e `instructor_id` da ficha imutáveis. |
| Média | Uma sessão concluída/cancelada podia receber alterações de duração, horário ou observações. | Trigger torna sessões terminais imutáveis. |
| Média | Professor podia criar exercício próprio com visibilidade `academy`, publicando conteúdo global sem operação administrativa. | Política restringe professor a `instructor_only`; administrador controla publicação global. |
| Defesa em profundidade | Trigger de papel usava `current_user` em função `SECURITY DEFINER`, que identifica o dono da função, não o chamador. Privilégios de coluna já bloqueiam o ataque comum, mas o trigger não fornecia a proteção adicional pretendida. | Trigger substituído para avaliar `auth.uid()` e `is_admin()`. |

A correção está em `supabase/migrations/20261103220000_security_hardening.sql`. Ela **não foi aplicada remotamente**.

## Testes

Validação local final: **22 aprovados, 0 reprovados**. A primeira execução reprovou 8 assertivas porque a forma de dois argumentos de `throws_ok(sql, texto)` trata o texto como mensagem de erro esperada. O banco bloqueou todas as oito operações. A suíte agora usa `throws_ok(sql, SQLSTATE, null, descrição)`.

| Teste | Bloqueio observado na primeira execução |
| --- | --- |
| 4 — aluno promove próprio papel | `42501`, sem privilégio para atualizar `profiles.role` |
| 8 — aluno grava série em sessão alheia | `P0001`, validação da sessão/divisão |
| 9 — aluno usa exercício de outra divisão | `P0001`, validação da sessão/divisão |
| 11 — aluno altera sessão concluída | `P0001`, trigger de imutabilidade |
| 13 — aluno falsifica auditoria | `42501`, sem privilégio de inserção |
| 14 — aluno exclui auditoria | `42501`, sem privilégio de exclusão |
| 18 — professor cria ficha para aluno sem vínculo | `P0001`, validação de aluno/professor |
| 19 — professor publica exercício global | `42501`, política RLS de exercícios |

Logs: `supabase/tests/rls-first-run.log` e `supabase/tests/rls-final-run.log`. Nenhuma política foi alterada para obter o resultado.

Executados localmente:

```text
npm run test:db-schema  # passou: 29 políticas base e controles requeridos
npm run lint            # passou
npx tsc --noEmit        # passou
npm run build           # passou
supabase test db --local # passou: 22/22, migrations base e corretiva aplicadas localmente
```

Os testes comprovam os 22 cenários cobertos no banco local. Ainda é recomendável ampliar a suíte para todas as operações CRUD e conferir o estado efetivo do projeto remoto antes da disponibilização a usuários reais.

## Recomendação para Missão 04

O projeto está preparado para desenvolver a Missão 04, com os cenários críticos cobertos pela suíte local. Antes de usuários reais, confira o estado das migrations no projeto remoto e amplie a cobertura de autorização. A chave secreta compartilhada fora de um cofre de segredos deve ser rotacionada; `service_role`/secret bypassam RLS e nunca devem estar no navegador.
