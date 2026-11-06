# NAC TRAINING

Aplicativo da NAC Academia com ambientes integrados para aluno, professor e administração. Next.js, React, TypeScript, Tailwind CSS e Supabase Auth/PostgreSQL com RLS.

## Desenvolvimento local

1. Instale as dependências com `npm install`.
2. Inicie o Supabase local com `npx supabase start`.
3. Configure `.env.local` a partir de `.env.example`, usando **somente** o endpoint raiz e a chave publishable do Supabase local.
4. Execute `npm run dev` e abra o endereço informado pelo Next.js, normalmente [http://localhost:3000](http://localhost:3000).

O cadastro público cria apenas alunos. O primeiro administrador exige o procedimento PostgreSQL confiável descrito em [NAC-MISSAO-09.md](docs/NAC-MISSAO-09.md). Professor é um papel atribuído por administrador a uma conta confirmada.

## Variáveis

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Origem raiz do projeto Supabase, sem `/rest/v1` ou outros caminhos. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública `sb_publishable_…`; nunca use uma chave secreta. |
| `NEXT_PUBLIC_SITE_URL` | Origem do site; HTTPS exato em homologação/produção. |
| `NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH` | `false` por padrão. Defina `true` somente após homologação e autorização do ambiente remoto. |

Nenhuma chave `service_role` ou `sb_secret_` pertence ao aplicativo. Os scripts de teste aceitam a chave secreta **somente da pilha local** para criar e remover fixtures fictícios.

## Verificação

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:db-schema
npm run test:deployment-config
npx supabase test db --local
```

Os fluxos end-to-end locais são `npm run test:student-local`, `npm run test:instructor-local`, `npm run test:admin-local` e `node scripts/test-auth-local.mjs`. Exigem Next.js e Supabase locais com as variáveis de teste descritas nos relatórios de missão. Não execute esses scripts contra um projeto remoto.

## Estado de implantação

As 15 migrations (14 originais e a correção de privilégios da auditoria) passaram na instalação limpa local. O ensaio incremental da estrutura remota e as oito suítes pgTAP passaram com 134 asserções. Auth e os três painéis passaram nos testes HTTP locais, incluindo volume e paginação. A validação visual desta versão permanece pendente. Nenhuma migration remota foi aplicada e não houve deploy. Consulte [NAC-MASTER.md](docs/NAC-MASTER.md), a [comparação do banco](docs/MASTER-BANCO.md) e o [plano de backup/publicação](docs/MASTER-OPERACOES.md).
