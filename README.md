# FroshFunds — Assistente Pessoal de Finanças

Aplicação web para gerenciamento de finanças pessoais: importação de extratos bancários via CSV, dashboards de gastos, e assistente de IA para insights e sugestões.

## Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** ShadCN/UI + Tailwind CSS
- **API:** tRPC
- **Banco:** Supabase (PostgreSQL + Auth)
- **IA:** OpenAI gpt-4o-mini
- **Gráficos:** Recharts

## Pré-requisitos

1. Conta no [Supabase](https://supabase.com)
2. Chave de API do [OpenAI](https://platform.openai.com/api-keys)

## Configuração

1. Clone o repositório e instale as dependências:

```bash
npm install
```

2. Copie o arquivo de ambiente:

```bash
cp .env.example .env.local
```

3. Preencha `.env.local` com suas credenciais:
   - **NEXT_PUBLIC_SUPABASE_URL** e **NEXT_PUBLIC_SUPABASE_ANON_KEY** — Supabase Dashboard > Settings > API
   - **SUPABASE_SERVICE_ROLE_KEY** — Supabase Dashboard > Settings > API (chave service_role)
   - **OPENAI_API_KEY** — platform.openai.com > API keys

4. Execute as migrações no Supabase (via CLI):
   ```bash
   # Faça login (abre o navegador)
   supabase login

   # Vincule ao seu projeto (use o project ref da URL: https://<PROJECT_REF>.supabase.co)
   supabase link --project-ref <SEU_PROJECT_REF>

   # Envie as migrações para criar as tabelas
   supabase db push
   ```
   Ou, manualmente: Supabase Dashboard > SQL Editor > cole o conteúdo de `supabase/migrations/20240307120000_initial_schema.sql` > Execute

5. Confirme que o provedor de e-mail está ativo:
   - Supabase Dashboard > Authentication > Providers > Email

## Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy

## Formato do CSV (transações)

```
Data,Descrição,Valor
2024-01-15,iFood,-45.90
2024-01-14,Salário,5000.00
```

## Licença

MIT
