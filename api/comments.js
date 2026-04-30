// api/comments.js — CommonJS
const { put, list, del, get } = require("@vercel/blob");

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin123";
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

function isAdmin(req) {
    return req.headers["x-admin-token"] === ADMIN_TOKEN;
}

function json(res, status, data) {
    res.setHeader("Content-Type", "application/json");
    res.status(status).end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, x-admin-token",
    );
    if (req.method === "OPTIONS") return res.status(200).end();

    const { postId, commentId } = req.query;
    if (!postId) return json(res, 400, { error: "postId é obrigatório" });

    const prefix = `comments/${postId}/`;

    // ── GET ── lista comentários do post (público)
    if (req.method === "GET") {
        try {
            const { blobs } = await list({ prefix, token: BLOB_TOKEN });
            const comments = await Promise.all(
                blobs
                    .filter((b) => b.pathname.endsWith(".json"))
                    .map(async (b) => {
                        const blob = await get(b.url, {
                            access: "private",
                            token: BLOB_TOKEN,
                        });
                        const text = await new Response(blob.stream).text();
                        return JSON.parse(text);
                    }),
            );
            comments.sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
            );
            return json(res, 200, comments);
        } catch (err) {
            console.error("comments GET error:", err);
            return json(res, 500, {
                error: "Erro ao listar comentários",
                detail: err.message,
            });
        }
    }

    // ── POST ── adiciona comentário (público)
    if (req.method === "POST") {
        const { author, content } = req.body || {};
        if (!author || !content)
            return json(res, 400, { error: "Autor e conteúdo obrigatórios" });
        if (content.length > 1000)
            return json(res, 400, {
                error: "Comentário muito longo (máx 1000 chars)",
            });
        try {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const comment = {
                id,
                postId,
                author: String(author).slice(0, 50),
                content: String(content).slice(0, 1000),
                createdAt: new Date().toISOString(),
            };
            await put(`${prefix}${id}.json`, JSON.stringify(comment), {
                access: "public",
                contentType: "application/json",
                token: BLOB_TOKEN,
            });
            return json(res, 201, comment);
        } catch (err) {
            console.error("comments POST error:", err);
            return json(res, 500, {
                error: "Erro ao salvar comentário",
                detail: err.message,
            });
        }
    }

    // ── DELETE ── remove comentário (admin)
    if (req.method === "DELETE") {
        if (!isAdmin(req)) return json(res, 401, { error: "Não autorizado" });
        if (!commentId)
            return json(res, 400, { error: "commentId obrigatório" });
        try {
            const { blobs } = await list({
                prefix: `${prefix}${commentId}`,
                token: BLOB_TOKEN,
            });
            if (!blobs.length)
                return json(res, 404, { error: "Comentário não encontrado" });
            await del(blobs[0].url, { token: BLOB_TOKEN });
            return json(res, 200, { success: true });
        } catch (err) {
            console.error("comments DELETE error:", err);
            return json(res, 500, {
                error: "Erro ao deletar comentário",
                detail: err.message,
            });
        }
    }

    return json(res, 405, { error: "Método não permitido" });
};
