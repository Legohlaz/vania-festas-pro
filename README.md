# Vânia Festas Pro

Sistema de locação para catálogo público, reservas, agenda, logística, financeiro e atendimento pelo WhatsApp Web.

## Rodar localmente

1. Instale as dependências: `npm install`.
2. Copie `.env.example` para `.env.local` e preencha as credenciais do Supabase.
3. Execute, no SQL Editor do Supabase, as migrations de `supabase/migrations` em ordem cronológica.
4. Inicie o projeto com `npm run dev` e abra `http://localhost:3000`.

## Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Opcional. Sem esta chave, as sugestões inteligentes usam a busca local do catálogo.
OPENAI_API_KEY=
```

Nunca publique `.env.local` ou chaves de API no Git.

## Painel administrativo

Após autenticar, o painel reúne:

- Painel geral e agenda de próximos eventos;
- Produtos, imagens adicionais, favoritos e busca por termos;
- Clientes, reservas, pagamentos, logística e financeiro;
- Pré-reservas geradas pela extensão do WhatsApp.

## Extensão do WhatsApp

Em desenvolvimento, abra `brave://extensions` (ou `chrome://extensions`), ative o modo desenvolvedor e escolha **Carregar sem compactação**. Selecione a pasta `extensions/whatsapp-locacoes`.

Na primeira abertura, informe o endereço local do sistema (`http://localhost:3000`), faça login e informe também o endereço público do catálogo quando quiser compartilhar links com clientes.

## Validação

```bash
npm run verify
```

## Publicação

Antes de publicar, configure no provedor de hospedagem as mesmas variáveis de ambiente do Supabase. Atualize o endereço público do catálogo na extensão e, se necessário, adicione o domínio publicado em `host_permissions` no `extensions/whatsapp-locacoes/manifest.json`; depois recarregue a extensão no navegador.
