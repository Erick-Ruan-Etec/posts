# 📝 Blog com Vercel Blobs

Sistema de posts completo com armazenamento no Vercel Blobs, painel admin e comentários públicos.

---

## 🗂 Estrutura do projeto

```
/
├── api/
│   ├── posts.js       # GET, POST, DELETE de posts
│   ├── comments.js    # GET, POST, DELETE de comentários
│   └── auth.js        # Autenticação do admin
├── public/
│   ├── index.html     # Lista de posts (público)
│   ├── post.html      # Post individual + comentários
│   └── admin.html     # Painel admin
├── package.json
└── vercel.json
```

---

## 🚀 Deploy passo a passo

### 1. Crie o repositório no GitHub

```bash
git init
git add .
git commit -m "initial commit"
gh repo create meu-blog --public --push
# ou crie pelo github.com e faça git push
```

### 2. Importe no Vercel

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Conecte seu GitHub e importe o repositório
3. Clique em **Deploy** (as configurações padrão funcionam)

### 3. Ative o Vercel Blobs

1. No dashboard do projeto na Vercel, vá em **Storage**
2. Clique em **Create Database → Blob**
3. Dê um nome (ex: `blog-store`) e clique em **Create**
4. Clique em **Connect to Project** e selecione seu projeto
5. A variável `BLOB_READ_WRITE_TOKEN` é adicionada automaticamente ✅

### 4. Configure o token admin

1. No dashboard da Vercel, vá em **Settings → Environment Variables**
2. Adicione:
   - **Name:** `ADMIN_TOKEN`
   - **Value:** uma senha forte (ex: `minhaSenhaSegura2024!`)
   - **Environment:** Production, Preview, Development
3. Clique em **Save**
4. Faça um novo deploy: vá em **Deployments → Redeploy**

### 5. Acesse o site

- Site público: `https://seu-projeto.vercel.app`
- Painel admin: `https://seu-projeto.vercel.app/admin.html`
  - Use o `ADMIN_TOKEN` que você definiu

---

## 🔌 API Endpoints

### Posts (público)
| Método | URL | Descrição |
|--------|-----|-----------|
| GET | `/api/posts` | Lista todos os posts |
| GET | `/api/posts?id={id}` | Busca post por ID |

### Posts (admin — requer header `x-admin-token`)
| Método | URL | Descrição |
|--------|-----|-----------|
| POST | `/api/posts` | Cria novo post |
| DELETE | `/api/posts?id={id}` | Deleta post + comentários |

**Body do POST:**
```json
{
  "title": "Título do post",
  "content": "Conteúdo completo...",
  "author": "Nome do autor",
  "tags": ["tecnologia", "design"],
  "coverColor": "#e8c97e"
}
```

### Comentários (público)
| Método | URL | Descrição |
|--------|-----|-----------|
| GET | `/api/comments?postId={id}` | Lista comentários |
| POST | `/api/comments?postId={id}` | Adiciona comentário |

### Auth
| Método | URL | Descrição |
|--------|-----|-----------|
| POST | `/api/auth` | Valida token admin |

---

## 💡 Dicas de uso

- **Cor do card:** Cada post tem uma faixa colorida no topo do card. Escolha no painel admin.
- **Tags:** Separe com vírgula no admin: `tecnologia, design, vida`.
- **Comentários:** Qualquer visitante pode comentar, sem login.
- **Segurança:** O token admin fica em variável de ambiente na Vercel — nunca no código.

---

## 🛠 Desenvolvimento local

```bash
npm install
npm install -g vercel

# Configure as variáveis locais
vercel env pull .env.local
# Ou crie manualmente:
# BLOB_READ_WRITE_TOKEN=vercel_blob_...
# ADMIN_TOKEN=sua_senha_local

# Rode localmente
vercel dev
```

Acesse: `http://localhost:3000`
