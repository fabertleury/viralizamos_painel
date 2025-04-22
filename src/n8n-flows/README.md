# Fluxos do n8n para Viralizamos

Este diretório contém workflows do n8n prontos para importação na plataforma. Estes fluxos automatizam processos importantes do sistema Viralizamos.

## Fluxo de Notificação de Compras

O arquivo `order-notification-workflow.json` contém um fluxo completo para monitorar novas compras no banco de dados PostgreSQL e exibi-las em tempo real em uma página HTML.

### Como importar este fluxo no n8n:

1. Certifique-se de ter o n8n instalado e configurado. Você pode instalá-lo seguindo as instruções em [n8n.io](https://n8n.io)
2. Acesse a interface web do n8n (geralmente em http://localhost:5678)
3. No menu lateral, clique em "Workflows"
4. Clique no botão "Import from File"
5. Selecione o arquivo `order-notification-workflow.json` neste diretório
6. Configure suas credenciais do PostgreSQL:
   - Clique no nó "PostgreSQL Trigger"
   - Configure a conexão com o banco de dados (a string de conexão deve apontar para o banco PostgreSQL da aplicação)
   - Faça o mesmo para o nó "PostgreSQL"

### Como funciona este fluxo:

O fluxo consiste em dois caminhos principais:

1. **Caminho de trigger**: Monitora inserções e atualizações na tabela "Order" do PostgreSQL
   - Quando uma nova compra é registrada ou atualizada, o trigger dispara
   - Os dados são formatados para exibição
   - Uma requisição é enviada para o webhook interno para atualizar a página de notificações

2. **Caminho de visualização**: Fornece uma página HTML para visualizar as compras
   - Um endpoint webhook (`/order-notification`) é exposto
   - Quando acessado, o fluxo busca os pedidos mais recentes no PostgreSQL
   - Os dados são formatados e exibidos em uma página HTML responsiva

### Acessando a página de notificações:

Após importar e ativar o fluxo, você pode acessar a página de notificações em:

```
http://localhost:5678/webhook/order-notification-endpoint
```

Esta página se atualizará automaticamente quando novas compras forem registradas.

### Personalizações possíveis:

- Modifique o template HTML no nó "Responder com HTML" para alterar o design da página
- Ajuste as consultas SQL para filtrar pedidos específicos
- Configure notificações adicionais para serem enviadas por email ou SMS
- Adicione autenticação mais robusta para proteger o acesso à página de notificações 