import express from "express";
import twilio from "twilio";
import https from "https";
import dotenv from "dotenv";
import fetch from "node-fetch"; // Import necessário para Node < 18

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const {
    BASE_URL,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    ULTRAVOX_API_KEY,
    SYSTEM_PROMPT,
    N8N_WEBHOOK_URL 
} = process.env;

const ULTRAVOX_API_URL = "https://api.ultravox.ai/api/calls";

const ULTRAVOX_CALL_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: "fixie-ai/ultravox",
    voice: "Keren-Brazilian-Portuguese",
    temperature: 0.3,
    firstSpeaker: "FIRST_SPEAKER_AGENT",
    medium: { twilio: {} },
};

// Função que cria a sala do Ultravox
async function createUltravoxCall() {
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
        request.write(JSON.stringify(ULTRAVOX_CALL_CONFIG));
        request.end();
    });
}

// Endpoint chamado pelo n8n para iniciar a ligação
app.post("/start-call", async (req, res) => {
    try {
        const { to, name } = req.body;

        if (!to) {
            return res.status(400).json({ error: "Número de destino ausente" });
        }

        const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

        const call = await client.calls.create({
            to,
            from: TWILIO_PHONE_NUMBER,
            machineDetection: "Enable",
            machineDetectionTimeout: 6,
            url: `${BASE_URL}/handle-answer?name=${encodeURIComponent(name)}`,
            statusCallback: `${BASE_URL}/call-ended`,
            statusCallbackEvent: ["completed"],
            statusCallbackMethod: "POST",
        });

        res.json({ success: true, callSid: call.sid });
    } catch (error) {
        console.error("Erro ao iniciar chamada:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint que analisa se quem atendeu é humano ou caixa postal
app.post("/handle-answer", async (req, res) => {
    console.log("Webhook /handle-answer recebido com body:", req.body);

    try {
        const {
            CallSid,
            AnsweredBy
        } = req.body;

        console.log("CallSid:", CallSid);
        console.log("AnsweredBy:", AnsweredBy);

        if (AnsweredBy === "human") {
            const { joinUrl } = await createUltravoxCall();
            console.log("Conectando com Ultravox:", joinUrl);

            return res.type("text/xml").send(`
                <Response>
                    <Connect>
                        <Stream url="${joinUrl}"/>
                    </Connect>
                </Response>
            `);
        } else {
            console.log("Chamada não foi atendida por humano. Encerrando...");
            return res.type("text/xml").send(`<Response><Hangup/></Response>`);
        }
    } catch (error) {
        console.error("Erro no /handle-answer:", error);
        return res.status(500).send("Erro interno no servidor");
    }
});

// Endpoint que avisa quando a chamada terminou (usado pelo n8n via Wait Webhook)
app.post("/call-ended", async (req, res) => {
    console.log("Webhook /call-ended recebido com body:", req.body);

    try {
        const {
            CallSid,
            CallStatus,
            CallDuration,
            AnsweredBy
        } = req.body;

        console.log("CallSid:", CallSid);
        console.log("CallStatus:", CallStatus);
        console.log("CallDuration:", CallDuration);
        console.log("AnsweredBy:", AnsweredBy);

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                CallSid,
                CallStatus,
                CallDuration,
                AnsweredBy
            }),
        });

        const data = await response.json();
        console.log("Webhook n8n notificado com sucesso:", data);

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
