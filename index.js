import express from "express";
import twilio from "twilio";
import https from "https";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

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
            to: to,
            from: TWILIO_PHONE_NUMBER,
            machineDetection: "Enable",
            machineDetectionTimeout: 6,
            url: `${BASE_URL}/handle-answer`,
            statusCallback: `${BASE_URL}/call-ended`,
            statusCallbackEvent: ["completed"],
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

        if (answeredBy === "human") {
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
        
        res.status(200).send("OK");
    } catch (error) {
        console.error("Erro no /handle-answer:", error);
        res.status(500).send("Erro interno no servidor");
    }
});

// Endpoint que avisa quando a chamada terminou (usado pelo n8n via Wait Webhook)
app.post("/call-ended", (req, res) => {
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

        fetch(`https://oarthurfc.app.n8n.cloud/webhook-waiting/80`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                CallSid: CallSid,
                CallStatus,
                CallDuration,
                AnsweredBy
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                console.log("Webhook n8n notificado com sucesso:", data);
            })
            .catch((error) => {
                console.error("Erro ao notificar webhook n8n:", error);
            });

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
