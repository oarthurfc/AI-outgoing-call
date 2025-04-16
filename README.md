# 🎯 Voice AI Caller

Uma **agente de voz inteligente** projetada para realizar **ligações automáticas personalizadas** com o objetivo de **converter leads** em novos usuários, utilizando **linguagem natural**, **detecção de interesse** e **ferramentas automatizadas** como envio de SMS e desligamento automático da chamada.

## 📋 Funcionalidades

- 🤖 **Agente de voz treinada** com linguagem natural, estilo carismático e foco em conversão.
- ☎️ **Ligações automáticas** para uma lista de leads com base em um prompt personalizado.
- 💬 **Detecção de respostas** com fallback dinâmico caso o lead não responda.
- 🔁 **Diálogos dinâmicos**, com suporte a perguntas frequentes sobre a oferta.
- 📲 **Envio de SMS** com link para a oferta após manifestação de interesse.
- 🔚 **Encerramento automático da chamada** após conversão (via `hangUp()`).
- 📦 **Integração com n8n**, Google Sheets, Ultravox e Twilio.

## 🧠 Linguagem e Comportamento da IA

A agente de voz segue um **prompt personalizado** que pode ser facilmente ajustado para atender a diferentes necessidades de negócios. Com isso, você pode configurar:

- O **objetivo da ligação** (ex: vendas, informações, agendamento).
- O **tom e estilo de conversa** (ex: carismático, formal, direto ao ponto).
- **Respostas personalizadas** para perguntas comuns relacionadas à sua oferta (ex: valor mínimo de depósito, regulamentação da empresa, etc.).
- **Tópicos específicos** a serem abordados durante a ligação.
- **Fallbacks dinâmicos** para garantir uma conversa fluida, mesmo quando o usuário não responde ou se desvia do tema.

Com essa flexibilidade, o sistema pode ser reaproveitado para **diferentes nichos** e campanhas, ajustando-se aos requisitos de cada novo projeto ou oferta.

## ⚙️ Tecnologias Utilizadas

- **Twilio**: Utilizado para realizar as ligações automatizadas e gerenciar interações com os usuários.
- **Ultravox**: Plataforma de **Text-to-Speech (TTS)** para gerar a fala da agente de voz.
- **n8n**: Orquestração dos fluxos de automação.
- **Node.js + Express**: Backend para orquestrar a lógica do sistema e expor os endpoints da API.
- **SMS Funnel**: Plataforma para envio de mensagens SMS automáticas.

## 🔄 Fluxo da Chamada
![n8n-flow](https://github.com/oarthurfc/AI-outgoing-call/blob/main/n8n-flow.png)

1. Todos os leads são bucados de uma planilha do Google Sheets.
2. Inicia-se um loop iterando sobre o array de leads.
3. Uma requisição HTTP é feita para iniciar a chamada.
4. Chamada é encerrada automaticamente com `hangUp()`.
5. Um WebHook é acionado assim que a chamada finaliza.
6. Se houver interesse, a linha referente ao contato chamado é atualizada na planilha.
7. Uma requisição HTTP é enviada para o WebHook para adicionar o lead na lista de disparos de SMS.
