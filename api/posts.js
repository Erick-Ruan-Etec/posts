// api/posts.js — CommonJS (compatível com Vercel Serverless)
const { put, list, del, get } = require("@vercel/blob");

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin123";
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const POSTS_PREFIX = "posts/";

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

    // ── GET /api/posts ── lista todos
    if (req.method === "GET" && !req.query.id) {
        try {
            const { blobs } = await list({
                prefix: POSTS_PREFIX,
                token: BLOB_TOKEN,
            });
            const posts = await Promise.all(
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
            posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return json(res, 200, posts);
        } catch (err) {
            console.error("posts GET list error:", err);
            return json(res, 500, {
                error: "Erro ao listar posts",
                detail: err.message,
            });
        }
    }

    // ── GET /api/posts?id=xxx ── post específico
    if (req.method === "GET" && req.query.id) {
        try {
            const { blobs } = await list({
                prefix: `${POSTS_PREFIX}${req.query.id}`,
                token: BLOB_TOKEN,
            });
            if (!blobs.length)
                return json(res, 404, { error: "Post não encontrado" });
            const blob = await get(blobs[0].url, {
                access: "private",
                token: BLOB_TOKEN,
            });
            const text = await new Response(blob.stream).text();
            return json(res, 200, JSON.parse(text));
        } catch (err) {
            console.error("posts GET id error:", err);
            return json(res, 500, {
                error: "Erro ao buscar post",
                detail: err.message,
            });
        }
    }

    // ── POST /api/posts ── cria post (admin)
    if (req.method === "POST") {
        if (!isAdmin(req)) return json(res, 401, { error: "Não autorizado" });
        const { title, content, author, tags, coverColor } = req.body || {};
        if (!title || !content)
            return json(res, 400, { error: "Título e conteúdo obrigatórios" });
        try {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const post = {
                id,
                title,
                content,
                author: author || "Admin",
                tags: Array.isArray(tags) ? tags : [],
                coverColor: coverColor || "#e8c97e",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await put(`${POSTS_PREFIX}${id}.json`, JSON.stringify(post), {
                access: "private",
                contentType: "application/json",
                token: BLOB_TOKEN,
            });
            return json(res, 201, post);
        } catch (err) {
            console.error("posts POST error:", err);
            return json(res, 500, {
                error: "Erro ao salvar post",
                detail: err.message,
            });
        }
    }

    // ── DELETE /api/posts?id=xxx ── deleta post + comentários (admin)
    if (req.method === "DELETE") {
        if (!isAdmin(req)) return json(res, 401, { error: "Não autorizado" });
        const { id } = req.query;
        if (!id) return json(res, 400, { error: "ID obrigatório" });
        try {
            const { blobs } = await list({
                prefix: `${POSTS_PREFIX}${id}`,
                token: BLOB_TOKEN,
            });
            if (!blobs.length)
                return json(res, 404, { error: "Post não encontrado" });
            await del(blobs[0].url, { token: BLOB_TOKEN });
            const { blobs: comments } = await list({
                prefix: `comments/${id}/`,
                token: BLOB_TOKEN,
            });
            if (comments.length) {
                await Promise.all(
                    comments.map((c) => del(c.url, { token: BLOB_TOKEN })),
                );
            }
            return json(res, 200, { success: true });
        } catch (err) {
            console.error("posts DELETE error:", err);
            return json(res, 500, {
                error: "Erro ao deletar",
                detail: err.message,
            });
        }
    }

    return json(res, 405, { error: "Método não permitido" });
};
