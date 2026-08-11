# Publicação na Vercel

## 1. Criar o projeto

1. Entre em [vercel.com/new](https://vercel.com/new) usando a conta que tem acesso ao GitHub.
2. Importe o repositório `Legohlaz/vania-festas-pro`.
3. Mantenha o framework detectado como **Next.js** e o diretório raiz como `./`.

## 2. Configurar variáveis

Em **Project Settings → Environment Variables**, cadastre para o ambiente **Production**:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

`OPENAI_API_KEY` é opcional. O sistema já possui sugestão local para funcionar sem ela. Não configure nenhuma chave `service_role` ou secreta com o prefixo `NEXT_PUBLIC_`.

Faça o primeiro deploy. A Vercel entregará uma URL parecida com `https://vania-festas-pro.vercel.app`.

## 3. Ajustar o Supabase

Em **Authentication → URL Configuration**:

- Defina **Site URL** como a URL final da Vercel ou do domínio próprio.
- Em **Redirect URLs**, mantenha `http://localhost:3000/**` e adicione a URL pública seguida de `/**`.
- Enquanto houver previews, adicione `https://*-<seu-slug-da-vercel>.vercel.app/**`.

As URLs de autenticação precisam estar permitidas no Supabase para que confirmações de e-mail e recuperação de senha apontem para o site correto.

## 4. Atualizar a extensão

1. Em `brave://extensions`, clique em **Recarregar** na extensão Vânia Festas Pro (versão 0.5.1).
2. No painel lateral do WhatsApp, entre novamente.
3. Em **Endereço do sistema**, troque `http://localhost:3000` pela URL da Vercel.
4. Em **Endereço público do catálogo**, use a mesma URL, ou o domínio próprio quando ele existir.

## 5. Conferência final

- Abra a URL pública em uma janela anônima e teste o catálogo.
- Entre em `/login` e verifique o painel administrativo.
- No WhatsApp Web, busque um produto e salve uma pré-reserva.
- Execute `npm run verify` antes de cada publicação importante.

Para um domínio próprio, cadastre-o em **Project Settings → Domains** na Vercel e repita o passo 3 com esse domínio.
