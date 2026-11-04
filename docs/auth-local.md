# Autenticação NAC TRAINING — preparação local

## Testes locais

1. Inicie o Supabase local com `npx supabase start` e aplique as migrations com `npx supabase db reset --local` somente se precisar de um banco local limpo. Esse reset apaga dados **locais**.
2. Configure `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com a chave pública exibida por `npx supabase status` e `NEXT_PUBLIC_SITE_URL=http://localhost:3000` no processo local do Next.js. O `.env.local` atual aponta para um projeto remoto cuja finalidade ainda não foi confirmada; não o utilize para testes de cadastro.
3. Inicie o Next.js com `npm run dev` e use `http://localhost:3000`. Os e-mails de teste ficam no Mailpit local em `http://127.0.0.1:54324`.
4. Confirmação de e-mail está ligada em `supabase/config.toml`. Os redirecionamentos locais autorizados são `/auth/confirm?destino=aluno` e `/auth/confirm?destino=redefinir-senha` na origem `http://localhost:3000`.
5. A suíte `scripts/test-auth-local.mjs` exige `SUPABASE_LOCAL_URL` e `SUPABASE_LOCAL_PUBLISHABLE_KEY`. Para verificar também os painéis e callbacks do Next.js, configure `SUPABASE_LOCAL_SECRET_KEY` com a chave **somente local** da CLI e `NAC_LOCAL_APP_URL` com a origem do site de teste. A suíte altera apenas perfis fictícios locais e restaura o papel `student` ao fim. Execute `npx supabase test db --local` para os 22 testes RLS originais e os 16 testes adicionais de perfis inativos.

Enquanto o `.env.local` apontar para o projeto remoto, as ações de autenticação ficam indisponíveis por padrão. O código só aceita um endpoint Supabase local ou `NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH=true` após autorização e validação remota específicas. Para executar o build isolado de teste na porta 3003, use `NAC_NEXT_DIST_DIR=.next-auth-test` tanto em `npm run build` quanto em `npm run start -- -p 3003`, com `NEXT_PUBLIC_SITE_URL=http://localhost:3003` e as variáveis do Supabase local.

## Antes de liberar usuários reais

- Verificar no projeto remoto se as três migrations e as 29 políticas RLS esperadas estão presentes. Respostas REST públicas negadas não comprovam equivalência das policies.
- Conferir no painel se a confirmação de e-mail está ativa e configurar SMTP, URL pública do site e URLs de callback exatas para confirmação e recuperação. A consulta pública de 3 de novembro de 2026 (horário de São Paulo) indicou `mailer_autoconfirm=false`, mas não revelou SMTP nem a lista de redirecionamentos. A URL de callback será `https://DOMINIO-OFICIAL/auth/confirm` com os destinos internos previstos. Configurar `NEXT_PUBLIC_SITE_URL` com a origem HTTPS exata. Conferir limites de envio e modelos de e-mail.
- Publicar termos de utilização e política de privacidade revisados. As páginas atuais são provisórias.
- Testar os fluxos no ambiente remoto de homologação autorizado antes de abrir o cadastro ao público.
- Só após essas verificações, definir `NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH=true` e `NEXT_PUBLIC_SITE_URL=https://DOMINIO-OFICIAL` no build do Next.js para habilitar o Auth remoto. Essa chave é pública e apenas controla a ativação; não substitui as políticas RLS. Veja o relatório `docs/NAC-MISSAO-05.md`.

## Professores e primeiro administrador

O cadastro público cria sempre `student` no gatilho `handle_new_user`. O cliente não oferece seleção de papéis. Depois de verificar a identidade e autorização da NAC Academia, um operador privilegiado pode conceder `instructor` usando a rotina SQL `admin_assign_role` existente, em transação auditada, com conferência de identidade e trilha de execução. Não usar atualização direta de perfil pelo navegador nem inferir o papel pelo domínio do e-mail.

O primeiro `admin` exige procedimento manual separado, com acesso privilegiado ao banco e autorização específica da academia. Verificar que a identidade Auth confirmou o e-mail, que o perfil está ativo e que ainda não existe administrador; registrar operador, data, justificativa e ID do perfil. O modelo de transação revisado está em `docs/database.md`. Não criar administrador automaticamente a partir do primeiro cadastro, nem armazenar senha administrativa no código. Nenhuma promoção remota está autorizada nesta missão.
