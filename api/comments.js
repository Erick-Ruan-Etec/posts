// api/comments.js
// Vercel Serverless Function — gerencia comentários via Vercel Blobs

import { put, list, del } from "@vercel/blob";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin123";

function requireAdmin(req) {
    return req.headers["x-admin-token"] === ADMIN_TOKEN;
}

function jsonResponse(res, status, data) {
    res.status(status).json(data);
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, x-admin-token",
    );
    if (req.method === "OPTIONS") return res.status(200).end();

    const postId = req.query.postId;
    if (!postId)
        return jsonResponse(res, 400, { error: "postId é obrigatório" });

    const prefix = `comments/${postId}/`;

    // GET — lista comentários de um post (público)
    if (req.method === "GET") {
        try {
            const { blobs } = await list({ prefix });
            const comments = await Promise.all(
                blobs
                    .filter((b) => b.pathname.endsWith(".json"))
                    .map(async (blob) => {
                        const r = await fetch(blob.downloadUrl);
                        return await r.json();
                    }),
            );
            comments.sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
            );
            return jsonResponse(res, 200, comments);
        } catch (err) {
            return jsonResponse(res, 500, {
                error: "Erro ao listar comentários",
                detail: err.message,
            });
        }
    }

    // POST — adiciona comentário (público, com rate-limit simples via IP)
    if (req.method === "POST") {
        const { author, content } = req.body;
        if (!author || !content)
            return jsonResponse(res, 400, {
                error: "Autor e conteúdo são obrigatórios",
            });
        if (content.length > 1000)
            return jsonResponse(res, 400, {
                error: "Comentário muito longo (máx 1000 chars)",
            });

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const comment = {
            id,
            postId,
            author: author.slice(0, 50),
            content: content.slice(0, 1000),
            createdAt: new Date().toISOString(),
        };

        await put(`${prefix}${id}.json`, JSON.stringify(comment), {
            access: "public",
            contentType: "application/json",
        });

        return jsonResponse(res, 201, comment);
    }

    // DELETE — remove comentário (admin)
    if (req.method === "DELETE") {
        if (!requireAdmin(req))
            return jsonResponse(res, 401, { error: "Não autorizado" });

        const { commentId } = req.query;
        if (!commentId)
            return jsonResponse(res, 400, { error: "commentId obrigatório" });

        try {
            const { blobs } = await list({ prefix: `${prefix}${commentId}` });
            if (!blobs.length)
                return jsonResponse(res, 404, {
                    error: "Comentário não encontrado",
                });
            await del(blobs[0].url);
            return jsonResponse(res, 200, { success: true });
        } catch (err) {
            return jsonResponse(res, 500, {
                error: "Erro ao deletar comentário",
                detail: err.message,
            });
        }
    }

    return jsonResponse(res, 405, { error: "Método não permitido" });
}
