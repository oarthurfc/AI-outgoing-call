Com certeza! Aqui está um exemplo de um `README.md` completo, claro e profissional para o seu projeto da agente de voz da Gol de Bet:

---

# 🎯 Voice AI Caller - Gol de Bet

Uma agente de voz inteligente chamada **Rafaela**, criada para realizar **ligações automáticas personalizadas** com o objetivo de converter antigos jogadores de outras casas de apostas em novos usuários da **Gol de Bet**, utilizando **linguagem natural**, **detecção de interesse** e **ferramentas automatizadas** como envio de SMS e desligamento automático da chamada.

## 📋 Funcionalidades

- 🤖 **Agente de voz treinada** com linguagem natural, estilo carismático e foco em conversão.
- ☎️ **Ligações automáticas** para uma lista de leads de casas concorrentes.
- 💬 **Detecção de respostas** com fallback dinâmico caso o lead não responda.
- 🔁 **Diálogos dinâmicos**, com suporte a perguntas frequentes sobre promoções.
- 📲 **Envio de SMS** com o link da promoção após manifestação de interesse.
- 🔚 **Encerramento automático da chamada** após conversão (via `hangUp()`).
- 📦 **Integração com n8n**, Google Sheets, Ultravox e Twilio.

## 🧠 Linguagem e comportamento da IA

A agente segue um prompt específico com as seguintes diretrizes:

- Foco total na promoção do dia da Gol de Bet.
- Não responde a assuntos fora do escopo (IA, política, culinária, etc).
- Respostas preparadas para perguntas como:
  - **Qual o depósito mínimo?** → R$30,00
  - **Qual o saque mínimo?** → R$30,00
  - **A casa é regulamentada?** → Sim, possui licença nacional para operar no Brasil.
- Destaques da oferta:
  - Bônus exclusivos
  - Saques via PIX instantâneo
  - Super *ods* (pronúncia ajustada para evitar erros)
  - Rodadas grátis semanais

## 🛠️ Tecnologias Utilizadas

- **Ultravox** – Execução de chamadas de voz com IA
- **Twilio** – Envio de SMS
- **n8n** – Orquestração dos fluxos de automação
- **Google Sheets** – Armazenamento dos leads
- **JavaScript / TypeScript** – Scripts auxiliares
- **Prompt Engineering** – Para controle preciso do comportamento da IA

## 🔄 Fluxo da Chamada

1. Chamada iniciada com apresentação da Rafaela.
2. Promoção explicada com urgência e clareza.
3. Caso o usuário não responda, fallback ativado com uma segunda tentativa.
4. Se houver interesse, SMS enviado com o link.
5. Chamada é encerrada automaticamente com `hangUp()`.
