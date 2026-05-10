const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const MAX_BASE64_LENGTH = 4 * 1024 * 1024;
const MAX_TEXT_LENGTH = 500;

function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(ip, { start: now, count: 1 });
        return true;
    }

    entry.count++;
    return entry.count <= RATE_LIMIT_MAX;
}

function isAllowedOrigin(req) {
    const origin = req.headers['origin'] || '';
    const referer = req.headers['referer'] || '';

    if (!origin && !referer) return true;

    const allowed = [
        process.env.ALLOWED_ORIGIN,
        process.env.VERCEL_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
        process.env.VERCEL_BRANCH_URL
    ].filter(Boolean).map(h => h.replace(/^https?:\/\//, ''));

    if (allowed.length === 0) return true;

    return allowed.some(host => origin.includes(host) || referer.includes(host));
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    if (!isAllowedOrigin(req)) {
        return res.status(403).json({ error: 'Origen no autorizado' });
    }

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || 'unknown';

    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un momento.' });
    }

    let API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
    if (API_KEY) {
        API_KEY = API_KEY.replace(/^["']|["']$/g, '');
    }

    if (!API_KEY) {
        return res.status(500).json({ error: 'Falta la API Key en las variables de entorno de Vercel' });
    }

    try {
        const { base64Data, textData } = req.body;

        if (base64Data && base64Data.length > MAX_BASE64_LENGTH) {
            return res.status(413).json({ error: 'Imagen demasiado grande (máximo 4MB)' });
        }

        if (textData && textData.length > MAX_TEXT_LENGTH) {
            return res.status(413).json({ error: 'Texto demasiado largo (máximo 500 caracteres)' });
        }

        const parts = [];

        if (base64Data) {
            parts.push({
                text: "Eres un nutricionista experto. Analiza este plato de comida y estima las calorías, proteínas, carbohidratos y grasas. En la primera línea pon el nombre del plato. Después los valores nutricionales. Responde de forma breve y amigable."
            });
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data.trim()
                }
            });
        } else if (textData) {
            const sanitized = textData.replace(/[<>"'`]/g, '');
            parts.push({
                text: `Eres un nutricionista experto. El usuario ha comido lo siguiente: "${sanitized}". Estima las calorías totales, proteínas, carbohidratos y grasas de esa comida. En la primera línea pon el nombre del plato. Después los valores nutricionales. Responde de forma breve y amigable.`
            });
        } else {
            return res.status(400).json({ error: 'No se recibieron datos para analizar' });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts }]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const textoRespuesta = data.candidates[0].content.parts[0].text;
        res.status(200).json({ result: textoRespuesta });

    } catch (error) {
        console.error("Error en la API de Vercel:", error);
        res.status(500).json({ error: error.message || 'Error desconocido al procesar con Gemini' });
    }
}
