# 🗺️ Roadmap Keeply – Pós-Autenticação

Este roadmap parte do ponto atual: autenticação concluída, navbar, footer e página de conta prontos.  
Objetivo: ter uma versão funcional (MVP) em 5 semanas.

---

## 📍 Semana 1 – Estrutura de Dados + Gestão de Família

**Objetivo:** Permitir criação e associação de utilizadores a famílias.

### Backend
- [ ] Criar tabela `families` no DynamoDB
- [ ] Criar tabela `users` com campo `familyId`
- [ ] Endpoint `POST /family` – criar família
- [ ] Endpoint `GET /family` – obter info da família do utilizador
- [ ] Associar `familyId` ao utilizador no login/registro

### Frontend
- [ ] Se utilizador não tem família → forçar criação
- [ ] Página/Modal: criar ou visualizar família
- [ ] Guardar `familyId` no state/context

---

## 📍 Semana 2 – CRUD de Itens + Upload de Imagens

**Objetivo:** Adicionar, editar, remover e listar itens com imagem.

### Backend
- [ ] Criar tabela `items` com:
  - `itemId`, `familyId`, `userId`, `name`, `category`, `notes`, `imageUrl`, `createdAt`, `warrantyUntil`
- [ ] Endpoints:
  - `POST /items`
  - `GET /items`
  - `PUT /items/{id}`
  - `DELETE /items/{id}`
- [ ] Endpoint `POST /upload-url` para imagens no S3 (pré-assinado)

### Frontend
- [ ] Página: adicionar item com upload de imagem
- [ ] Página: editar item
- [ ] Página: lista de itens (cards ou tabela)
- [ ] Filtros por utilizador e categoria
- [ ] Visualização de imagem (preview)

---

## 📍 Semana 3 – Organização + Exportação

**Objetivo:** Tornar os dados pesquisáveis e exportáveis (JSON primeiro).

### Backend
- [ ] Endpoint `GET /export/json` – exportar inventário
- [ ] Endpoint `GET /family/users` – listar membros da família
- [ ] (Opcional) Endpoint de pesquisa: `GET /items?search=`

### Frontend
- [ ] Dropdowns para filtrar:
  - Por dono
  - Por categoria
- [ ] Botão “Exportar inventário” (gera JSON)
- [ ] Melhorar UI da lista (mostrar categorias e dono)

---

## 📍 Semana 4 – Planos e Limitações (Stripe)

**Objetivo:** Aplicar limites ao plano gratuito e permitir upgrades.

### Backend
- [ ] Campo `plan` na tabela `families`
- [ ] Middleware para limitar:
  - Nº de itens (máx. 50)
  - Exportação PDF bloqueada no plano gratuito
- [ ] Integração com Stripe Checkout
- [ ] Webhook para atualizar plano na BD

### Frontend
- [ ] Página de conta com plano atual
- [ ] Aviso ao atingir limite de itens
- [ ] Botão “Atualizar plano” → Stripe
- [ ] UI condicional (esconder exportação PDF no gratuito)

---

## 📍 Semana 5 – Garantias + Lembretes + Acabamentos

**Objetivo:** Funcionalidade de garantias e melhorias gerais de UX.

### Backend
- [ ] Campo `warrantyUntil` nos itens
- [ ] Lambda programada (CloudWatch Events) para verificar expirações
- [ ] Enviar email via SES (ex: 7 dias antes da expiração)

### Frontend
- [ ] Campo “Validade da Garantia” no formulário de item
- [ ] Destaque de garantias próximas do fim
- [ ] Página com lista de garantias
- [ ] Melhorias gerais:
  - [ ] Validação de formulários
  - [ ] Loading states
  - [ ] Toasts de sucesso/erro
  - [ ] Confirmações ao apagar item

---

## 🎯 Resultado após 5 semanas

- Gestão de família e multiutilizador funcional
- CRUD de itens completo com imagens
- Filtros úteis e exportação JSON
- Limitações e upgrade de plano via Stripe
- Sistema de garantias e notificações
