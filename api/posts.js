// api/posts.js
// Vercel Serverless Function — gerencia posts via Vercel Blobs

import { put, list, del, getDownloadUrl } from "@vercel/blob";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin123";
const POSTS_PREFIX = "posts/";

function requireAdmin(req) {
  const auth = req.headers["x-admin-token"];
  return auth === ADMIN_TOKEN;
}

function jsonResponse(res, status, data) {
  res.status(status).json(data);
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token");
  if (req.method === "OPTIONS") return res.status(200).end();

  // GET /api/posts — lista todos os posts (público)
  if (req.method === "GET" && !req.query.id) {
    try {
      const { blobs } = await list({ prefix: POSTS_PREFIX });

      const posts = await Promise.all(
        blobs
          .filter((b) => b.pathname.endsWith(".json"))
          .map(async (blob) => {
            const r = await fetch(blob.downloadUrl);
            return await r.json();
          })
      );

      // Ordena por data decrescente
      posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return jsonResponse(res, 200, posts);
    } catch (err) {
      return jsonResponse(res, 500, { error: "Erro ao listar posts", detail: err.message });
    }
  }

  // GET /api/posts?id=xxx — busca post específico (público)
  if (req.method === "GET" && req.query.id) {
    try {
      const { blobs } = await list({ prefix: `${POSTS_PREFIX}${req.query.id}` });
      if (!blobs.length) return jsonResponse(res, 404, { error: "Post não encontrado" });
      const r = await fetch(blobs[0].downloadUrl);
      const post = await r.json();
      return jsonResponse(res, 200, post);
    } catch (err) {
      return jsonResponse(res, 500, { error: "Erro ao buscar post", detail: err.message });
    }
  }

  // POST /api/posts — cria novo post (admin)
  if (req.method === "POST") {
    if (!requireAdmin(req)) return jsonResponse(res, 401, { error: "Não autorizado" });

    const { title, content, author, tags, coverColor } = req.body;
    if (!title || !content) return jsonResponse(res, 400, { error: "Título e conteúdo são obrigatórios" });

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const post = {
      id,
      title,
      content,
      author: author || "Admin",
      tags: tags || [],
      coverColor: coverColor || "#1a1a2e",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await put(`${POSTS_PREFIX}${id}.json`, JSON.stringify(post), {
      access: "public",
      contentType: "application/json",
    });

    return jsonResponse(res, 201, post);
  }

  // DELETE /api/posts?id=xxx — deleta post (admin)
  if (req.method === "DELETE") {
    if (!requireAdmin(req)) return jsonResponse(res, 401, { error: "Não autorizado" });

    const { id } = req.query;
    if (!id) return jsonResponse(res, 400, { error: "ID obrigatório" });

    try {
      const { blobs } = await list({ prefix: `${POSTS_PREFIX}${id}` });
      if (!blobs.length) return jsonResponse(res, 404, { error: "Post não encontrado" });
      await del(blobs[0].url);

      // Também deleta comentários do post
      const { blobs: commentBlobs } = await list({ prefix: `comments/${id}` });
      for (const cb of commentBlobs) await del(cb.url);

      return jsonResponse(res, 200, { success: true });
    } catch (err) {
      return jsonResponse(res, 500, { error: "Erro ao deletar", detail: err.message });
    }
  }

  return jsonResponse(res, 405, { error: "Método não permitido" });
}
