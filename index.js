import express from "express";
import twilio from "twilio";
import https from "https";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const {
    BASE_URL,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    ULTRAVOX_API_KEY
} = process.env;

const ULTRAVOX_API_URL = "https://api.ultravox.ai/api/calls";

const callResumeMap = new Map();

// Cria a sala no Ultravox com prompt dinâmico
async function createUltravoxCall(systemPrompt, name, day) {
    const callConfig = {
        systemPrompt,
        temperature: 0.1,
        model: "fixie-ai/ultravox",
        voice: "Keren-Brazilian-Portuguese",
        firstSpeakerSettings: {
            agent: {
                text: `Oi ${name}, tudo bem? Aqui é a Rafaela da Gol de Bet! Tô te ligando porque hoje, ${day} você foi selecionado pra receber uma condição super especial que tá rolando só pra alguns usuários. Quer saber mais?`,
            }
        },        
        medium: { twilio: {} },
        maxDuration: "240s",
        languageHint: "pt-BR",
        timeExceededMessage: "Preciso ir agora, mas vou te enviar uma mensagem por SMS com sua surpresinha. Até logo!"
    };

    const request = https.request(ULTRAVOX_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": ULTRAVOX_API_KEY,
        },
    });

    return new Promise((resolve, reject) => {
        let data = "";
        request.on("response", (response) => {
            response.on("data", (chunk) => (data += chunk));
            response.on("end", () => resolve(JSON.parse(data)));
        });
        request.on("error", reject);
        request.write(JSON.stringify(callConfig));
        request.end();
    });
}

// Inicia a ligação
app.post("/start-call", async (req, res) => {
    try {
        const { to, resumeUrl, systemPrompt, name, day } = req.body;

        if (!to || !resumeUrl || !systemPrompt) {
            return res.status(400).json({ error: "Parâmetros 'to', 'resumeUrl' ou 'systemPrompt' são obrigatórios" });
        }

        const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

        const call = await client.calls.create({
            to,
            from: TWILIO_PHONE_NUMBER,
            url: `${BASE_URL}/handle-answer`,
            statusCallback: `${BASE_URL}/call-ended`,
            statusCallbackEvent: ["completed"],
        });

        // Armazena o resumeUrl e systemPrompt para esse CallSid
        callResumeMap.set(call.sid, { resumeUrl, systemPrompt });

        res.json({ success: true, callSid: call.sid });
    } catch (error) {
        console.error("Erro ao iniciar chamada:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Webhook chamado quando a ligação é atendida
app.post("/handle-answer", async (req, res) => {
    console.log("Webhook /handle-answer recebido:", req.body);

    try {
        const { CallSid } = req.body;
        const meta = callResumeMap.get(CallSid);

        if (!meta || !meta.systemPrompt) {
            console.error("Prompt não encontrado para CallSid:", CallSid);
            return res.type("text/xml").send(`<Response><Say>Erro interno ao buscar prompt.</Say><Hangup/></Response>`);
        }

        const ultravoxResponse = await createUltravoxCall(meta.systemPrompt);
        const { joinUrl } = ultravoxResponse;

        res.type("text/xml").send(`
            <Response>
                <Connect>
                    <Stream url="${joinUrl}"/>
                </Connect>
            </Response>
        `);
    } catch (error) {
        console.error("Erro ao conectar com Ultravox:", error.message);
        res.type("text/xml").send(`<Response><Say>Erro interno ao conectar com nosso sistema.</Say><Hangup/></Response>`);
    }
});

// Webhook ao fim da chamada
app.post("/call-ended", async (req, res) => {
    console.log("Webhook /call-ended recebido:", req.body);

    try {
        const { CallSid, CallStatus, CallDuration, AnsweredBy } = req.body;

        const meta = callResumeMap.get(CallSid);
        if (!meta || !meta.resumeUrl) {
            console.error("resumeUrl não encontrado para CallSid:", CallSid);
            return res.status(500).send("resumeUrl não encontrado");
        }

        await fetch(meta.resumeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ CallSid, CallStatus, CallDuration, AnsweredBy }),
        });

        console.log("Webhook call-ended notificado com sucesso");
        callResumeMap.delete(CallSid);
        res.status(200).send("OK");
    } catch (error) {
        console.error("Erro no /call-ended:", error);
        res.status(500).send("Erro interno no servidor");
    }
});

// Inicia o servidor
app.listen(3030, () => {
    console.log("Servidor rodando na porta 3030");
});
