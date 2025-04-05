import express from "express";
import twilio from "twilio";
import https from "https";
import dotenv from "dotenv";

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
    SYSTEM_PROMPT
} = process.env;

const ULTRAVOX_API_URL = "https://api.ultravox.ai/api/calls";

const ULTRAVOX_CALL_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: "fixie-ai/ultravox",
    voice: "Keren-Brazilian-Portuguese",
    temperature: 0.3,
    frequency_penalty: 0.3,
    presence_penalty: 0.2,
    firstSpeaker: "FIRST_SPEAKER_USER",
    medium: { twilio: {} },
};

// Mapeia CallSid => resumeUrl (n8n)
const callResumeMap = new Map();

// Cria a sala no Ultravox
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

// Endpoint chamado pelo n8n
app.post("/start-call", async (req, res) => {
    try {
        const { to, name, resumeUrl } = req.body;

        if (!to || !resumeUrl) {
            return res.status(400).json({ error: "Parâmetro 'to' ou 'resumeUrl' ausente" });
        }

        const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

        const call = await client.calls.create({
            to,
            from: TWILIO_PHONE_NUMBER,
            machineDetection: "Enable",
            machineDetectionTimeout: 5,
            url: `${BASE_URL}/handle-answer?name=${encodeURIComponent(name)}`,
            statusCallback: `${BASE_URL}/call-ended`,
            statusCallbackEvent: ["completed"],
            timeLimit: 240, // Limite de 4 minutos
        });

        // Armazena o resumeUrl
        callResumeMap.set(call.sid, resumeUrl);

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
        const { CallSid, AnsweredBy } = req.body;

        if (AnsweredBy === "human") {
            try {
                const { joinUrl } = await createUltravoxCall();
                console.log("Conectando com Ultravox:", joinUrl);

                res.type("text/xml").send(`
                    <Response>
                        <Connect>
                            <Stream url="${joinUrl}"/>
                        </Connect>
                    </Response>
                `);
            } catch (error) {
                console.error("Erro ao criar chamada Ultravox:", error.message);
                res.type("text/xml").send(`<Response><Say>Erro interno ao conectar com nosso sistema.</Say><Hangup/></Response>`);
            }
        } else {
            console.log("Chamada não foi atendida por humano. Encerrando...");
            res.type("text/xml").send(`<Response><Hangup/></Response>`);
        }
    } catch (error) {
        console.error("Erro no /handle-answer:", error);
        res.status(500).send("Erro interno no servidor");
    }
});

// Webhook chamado ao fim da chamada
app.post("/call-ended", async (req, res) => {
    console.log("Webhook /call-ended recebido:", req.body);

    try {
        const { CallSid, CallStatus, CallDuration, AnsweredBy } = req.body;

        const resumeUrl = callResumeMap.get(CallSid);

        if (!resumeUrl) {
            console.error("resumeUrl não encontrado para CallSid:", CallSid);
            return res.status(500).send("resumeUrl não encontrado");
        }

        await fetch(resumeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                CallSid,
                CallStatus,
                CallDuration,
                AnsweredBy
            }),
        });

        console.log("Webhook n8n notificado com sucesso");
        callResumeMap.delete(CallSid); // Limpa memória
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
