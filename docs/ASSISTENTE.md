# Jarvis da Vânia Festas

Entrada: `/admin/assistente`, menu Jarvis e atalho flutuante na administração.

## O que está implementado

- Conversa por texto com OpenAI Responses e ferramentas limitadas ao administrador autenticado.
- Ditado de mensagens em português quando o navegador oferece SpeechRecognition; texto disponível nos demais navegadores.
- Leitura das respostas pela voz do navegador, ativada pelo usuário.
- Consulta de clientes, produtos, disponibilidade e eventos dos próximos sete dias.
- Preparação de proposta de reserva com preços consultados no banco.
- Revisão em cartão antes do salvamento. A proposta expira em 30 minutos.
- Salvamento transacional e idempotente como **reserva pendente**. A confirmação do evento e o bloqueio de estoque seguem o fluxo normal da reserva existente.
- Tarefas pessoais com data e horário de Salvador, criadas pela conversa ou pelo formulário.
- Lembretes no painel e notificações optativas do navegador. A página administrativa precisa permanecer aberta; não há serviço de push com navegador fechado ou aplicativo nativo nesta versão.
- Até 100 mensagens por administrador por dia, seis passos de ferramentas por resposta, tamanho limitado de conversa e timeout de 50 segundos.

## Configuração

- `OPENAI_API_KEY`: segredo somente no servidor. Usar a chave existente autorizada pelo proprietário; nunca usar prefixo NEXT_PUBLIC.
- `OPENAI_ASSISTANT_MODEL`: opcional; padrão `gpt-6-luna`.
- Aplicar `supabase/migrations/20261112131139_admin_assistant.sql`.
- A conta da API precisa ter créditos. Em 12/11/2026, o teste real aceitou a chave, mas a geração retornou HTTP 429 `credit_balance_exhausted`.
- Configurar a chave também no ambiente Production da Vercel e gerar um novo deploy.

## Privacidade e limites

Somente os resultados das consultas necessárias seguem para a IA, nunca o catálogo completo. O Supabase é a fonte de preços, produtos e disponibilidade. Respostas não são persistidas pela aplicação: a conversa fica na memória da página até ser recarregada. A requisição usa `store: false` na OpenAI. Propostas e tarefas ficam no banco, sob RLS que exige administrador e titularidade.

O assistente não possui ferramenta de SQL arbitrário, edição de clientes, alteração de preços, cobranças, cancelamento de reservas ou envio de mensagens externas. O ditado depende das permissões e do serviço de voz oferecido pelo navegador. Não há palavra de ativação nem escuta permanente.

## Validação operacional

1. Entrar como administrador e abrir Jarvis. Verificar agenda e tarefas.
2. Criar tarefa com horário de Salvador, recarregar a página e confirmar persistência.
3. Ativar avisos pelo sino e manter administração aberta para testar um vencimento.
4. Após adicionar créditos à API, perguntar pelos eventos da semana e buscar produto por nome.
5. Solicitar uma reserva com cliente cadastrado, produto, quantidade, data, endereço e taxa de entrega.
6. Conferir proposta e clicar em Salvar reserva pendente. Abrir a reserva e conferir os itens.
7. Repetir o salvamento da mesma proposta deve retornar o mesmo ID.
8. Tentar proposta expirada, produto sem estoque ou preço alterado: o salvamento deve ser recusado.

Testes de integração transacionais foram executados no banco com rollback; nenhuma reserva de teste ficou cadastrada. A geração real com ferramentas ainda depende de créditos para validação completa.
