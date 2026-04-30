// api/auth.js
// Verifica se o token admin é válido

export default function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "POST")
        return res.status(405).json({ error: "Método não permitido" });

    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    const { token } = req.body;

    if (token === ADMIN_TOKEN) {
        return res.status(200).json({ success: true, token });
    }
    return res.status(401).json({ error: "Token inválido" });
}
