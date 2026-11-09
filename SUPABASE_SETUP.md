# Conectando o PURAZI Studio ao Supabase

Depois disso, a agenda passa a ser **compartilhada** entre todos os aparelhos (dois clientes nunca conseguem o mesmo horário) e o painel do barbeiro passa a ter **login de verdade** (e-mail + senha).

Tempo estimado: 15 minutos.

---

## 1) Criar o projeto

1. Acesse https://supabase.com e entre com sua conta (pode ser a do GitHub).
2. **New project** → dê um nome (ex.: `purazi-studio`), crie uma **senha do banco** (guarde-a) e escolha a região **South America (São Paulo)**.
3. Aguarde ~2 minutos até o projeto ficar pronto.

## 2) Criar as tabelas e regras de segurança

1. No menu da esquerda abra **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/migrations/20261109120000_init.sql` deste repositório, copie **tudo**, cole no editor e clique em **Run**.
3. Deve aparecer *Success. No rows returned*. (Pode rodar de novo sem problema: ele não apaga nada.)

## 3) Proteger o cadastro de usuários

O barbeiro será o **único** usuário. Para que ninguém mais consiga criar conta:

1. Menu **Authentication** → **Sign In / Providers** (ou *Providers → Email*).
2. **Desligue** a opção **Allow new users to sign up**.
3. (Opcional) Em *Email*, deixe **Confirm email** desligado, já que você vai criar o usuário manualmente.

> Mesmo que alguém criasse uma conta, o banco só libera o painel para quem estiver na tabela `admins` (passo 5).

## 4) Criar o usuário do barbeiro

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Informe o **e-mail** e uma **senha forte** (mínimo 8 caracteres) e marque **Auto Confirm User**.
3. Clique em **Create user**.

## 5) Dar permissão de barbeiro a esse usuário

No **SQL Editor**, rode (trocando pelo e-mail do passo 4):

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'EMAIL_DO_BARBEIRO@exemplo.com';
```

Para conferir: `select * from public.admins;` deve mostrar 1 linha.

## 6) Copiar a URL e a chave pública

1. **Project Settings** (engrenagem) → **API**.
2. Copie:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon / publishable key** (a chave *pública*).

> ⚠️ **Nunca** use a chave `service_role` no site. A chave `anon` é pública por design — quem protege os dados são as regras do banco que você instalou no passo 2.

## 7) Configurar na Vercel

1. Projeto na Vercel → **Settings** → **Environment Variables**.
2. Adicione (marque *Production* e *Preview*):

| Nome | Valor |
|---|---|
| `VITE_SUPABASE_URL` | a Project URL do passo 6 |
| `VITE_SUPABASE_ANON_KEY` | a chave anon do passo 6 |

3. Vá em **Deployments** → no último deploy, **⋯ → Redeploy** (as variáveis só valem em um novo deploy).

## 8) Testar

1. Abra o site → **Agendar horário** → faça um agendamento de teste.
2. Em outro aparelho (ou aba anônima), abra a agenda: o horário escolhido deve aparecer **ocupado**.
3. Abra `seusite.com/#barbeiro` → entre com o e-mail e a senha do passo 4 → o agendamento aparece no painel, com nome e telefone.
4. No painel, aba **Horários**: reduza o sábado (ex.: até 14h) e salve. No site, o sábado já mostra só os horários novos.
5. Para apagar o agendamento de teste: no painel, **Cancelar** (o horário volta a ficar livre).

Se algo não funcionar, abra o console do navegador (F12) e veja a mensagem de erro; no Supabase, **Logs → Postgres Logs** mostra erros do banco.

---

## Como a segurança funciona (resumo)

- As tabelas têm **RLS ligado e nenhuma policy**: ninguém lê nem grava direto nelas (nem com a chave `anon`).
- O site só usa **funções** do banco:
  - **Públicas:** ver horários livres (sem nenhum dado pessoal), criar, consultar, remarcar e cancelar agendamento. Consultar/remarcar/cancelar exigem **código + WhatsApp** do cliente.
  - **Do barbeiro:** só funcionam se o usuário logado estiver em `admins`.
- O choque de horários é impedido **pelo próprio banco** (mesmo que dois clientes cliquem no mesmo segundo).
- Regras no servidor: horário dentro do expediente (inclui sábado reduzido), dentro da grade de intervalos, no futuro, sem bloqueios, serviço cabendo antes do fechamento, até 90 dias à frente, máximo de 3 agendamentos em aberto por telefone, cancelar/remarcar com 12h de antecedência.

## Pontos de atenção

- **Plano gratuito:** o Supabase pode *pausar* projetos gratuitos que ficam cerca de 1 semana sem nenhum acesso. Como o site consulta o banco a cada visita, isso só deve ocorrer se ninguém abrir o site por muitos dias; se acontecer, é só clicar em *Restore* no painel do Supabase.
- **Spam:** o limite por telefone reduz abusos, mas não impede alguém de inventar telefones. Se isso virar problema, o próximo passo é um captcha (ex.: Cloudflare Turnstile) antes de confirmar.
- **Backup:** em *Database → Backups* confira a política do seu plano. Para exportar a agenda, use o SQL Editor: `select * from public.appointments;` → *Download CSV*.
- **Modo local:** se as variáveis `VITE_SUPABASE_*` não existirem, o site continua funcionando como antes (dados só no navegador). Os agendamentos já feitos assim **não** são migrados para o banco.
