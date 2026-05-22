# GenAI Banking Support Chatbot

A production-quality **Retrieval-Augmented Generation (RAG)** chatbot for banking customer support. Upload your policy PDFs and knowledge base documents, then ask questions — the assistant retrieves the most relevant passages and generates grounded, citation-backed answers using Google Gemini (with automatic Groq fallback).

> **Live Demo:** [frontend-url.vercel.app](https://banking-rag-chatbot-six.vercel.app) · **API:** [backend-url.onrender.com](https://banking-rag-chatbot-qwrt.onrender.com)

---
Screenshot
<img width="1440" height="900" alt="Screenshot 2026-05-22 at 6 05 04 PM" src="https://github.com/user-attachments/assets/9cb8f237-d8af-4913-b477-b3471fce439b" />



---
## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's Browser                           │
│                    Next.js 15 · React 18                        │
│          Chat UI · File Upload · Session History                │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS (REST)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                            │
│                   POST /chat · POST /upload · GET /health       │
│                                                                 │
│  ┌─────────────────┐   ┌──────────────────┐                    │
│  │  RAG Pipeline   │   │  Response        │                    │
│  │                 │   │  Generator       │                    │
│  │  1. Embed query │   │                  │                    │
│  │  2. Retrieve    │   │  Gemini 2.0      │                    │
│  │     top-K chunks│   │  Flash (primary) │                    │
│  │  3. Build prompt│   │        ↓         │                    │
│  │  4. Generate    │   │  Groq LLaMA-3    │                    │
│  └────────┬────────┘   │  (fallback)      │                    │
│           │             └──────────────────┘                    │
│           ▼                                                     │
│  ┌─────────────────┐   ┌──────────────────────────────────┐    │
│  │ sentence-       │   │  ChromaDB (persistent, on-disk)  │    │
│  │ transformers    │   │  cosine similarity · 384-dim      │    │
│  │ all-MiniLM-L6   │──▶│  embedding space                 │    │
│  └─────────────────┘   └──────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### RAG Flow

1. **Ingest** — Upload a PDF or TXT file via the UI  
2. **Parse** — Extract raw text (pypdf for PDF, UTF-8 for TXT)  
3. **Chunk** — Split into 500-token overlapping chunks (LangChain splitter)  
4. **Embed** — Encode each chunk with `sentence-transformers/all-MiniLM-L6-v2` (384-dim)  
5. **Store** — Upsert embeddings + metadata into ChromaDB  
6. **Query** — Embed the user's question, retrieve top-5 most similar chunks  
7. **Generate** — Build a grounded prompt and call Gemini/Groq to produce a cited answer  

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 18, TypeScript, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (HuggingFace) |
| Vector DB | ChromaDB (persistent, embedded on-disk) |
| Primary LLM | Google Gemini 2.0 Flash |
| Fallback LLM | Groq LLaMA-3.3-70B (free, no billing required) |
| Config | pydantic-settings, `.env` files |
| Logging | Loguru |
| Deployment | Render (backend), Vercel (frontend) |

---

## Project Structure

```
banking-rag-chatbot/
├── backend/
│   ├── main.py                  # FastAPI app, lifespan, CORS, routes
│   ├── config.py                # Pydantic Settings (loaded from .env)
│   ├── requirements.txt
│   ├── render.yaml              # Render deployment config
│   ├── .env.example             # Copy → .env and fill in keys
│   ├── rag/
│   │   ├── ingestion.py         # Parse → chunk → embed → store
│   │   ├── retriever.py         # Embed query → cosine search → top-K
│   │   └── generator.py         # Gemini + Groq multi-provider LLM
│   ├── embeddings/
│   │   └── embedder.py          # SentenceTransformer wrapper
│   ├── vectorstore/
│   │   └── chroma_store.py      # ChromaDB client wrapper
│   ├── routes/
│   │   ├── health.py            # GET /health
│   │   ├── upload.py            # POST /upload
│   │   └── chat.py              # POST /chat
│   └── data/                    # ← git-ignored
│       ├── chroma_db/           # Persistent vector store
│       └── uploads/             # Uploaded documents
│
└── frontend/
    ├── app/
    │   ├── page.tsx             # Root page
    │   └── layout.tsx           # HTML shell, metadata
    ├── components/
    │   ├── Sidebar.tsx          # Upload panel + document list
    │   ├── ChatWindow.tsx       # Message list, streaming reveal
    │   ├── MessageBubble.tsx    # User / assistant / error bubbles
    │   ├── ChatInput.tsx        # Textarea + send button
    │   ├── FileUpload.tsx       # Drag-and-drop file uploader
    │   └── DocumentList.tsx     # Uploaded docs list
    ├── services/api.ts          # Typed fetch wrappers
    ├── types/index.ts           # Shared TypeScript types
    └── public/
        └── sample-banking-faq.txt  # Sample document to try first
```

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- A free [Google AI Studio key](https://aistudio.google.com/app/apikey) **or** a free [Groq key](https://console.groq.com) (at least one required)

### 1 — Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/banking-rag-chatbot.git
cd banking-rag-chatbot
```

### 2 — Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
```

Edit `.env` and fill in your API key(s):

```env
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here      # Optional fallback — highly recommended
ALLOWED_ORIGINS=http://localhost:3000
```

Start the backend:

```bash
python main.py
# Server starts at http://localhost:8000
```

Verify it's running:

```bash
curl http://localhost:8000/health
# {"status":"healthy","documents_indexed":0,"embedding_model":"sentence-transformers/all-MiniLM-L6-v2"}
```

### 3 — Frontend setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create your .env.local file
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000  (already set correctly)

# Start dev server
npm run dev
# Opens at http://localhost:3000
```

### 4 — Try it out

1. Open [http://localhost:3000](http://localhost:3000)
2. Click **"Upload Document"** in the sidebar
3. Upload `public/sample-banking-faq.txt` (or your own PDF)
4. Ask a question like *"What are the loan interest rates?"*

---

## API Reference

### `GET /health`

Returns system status and document count.

**Response:**
```json
{
  "status": "healthy",
  "documents_indexed": 41,
  "embedding_model": "sentence-transformers/all-MiniLM-L6-v2"
}
```

---

### `POST /upload`

Upload a PDF or TXT document for ingestion into the knowledge base.

**Request:** `multipart/form-data`
- `file` — PDF or TXT file (max 20 MB)

**Response:**
```json
{
  "document_id": "uuid-v4",
  "filename": "banking-policy.pdf",
  "chunk_count": 47,
  "message": "Successfully ingested 47 chunks"
}
```

---

### `POST /chat`

Send a message and receive a grounded answer from the knowledge base.

**Request:**
```json
{
  "message": "What is the minimum balance for a savings account?",
  "session_id": "uuid-v4",
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help?" }
  ]
}
```

**Response:**
```json
{
  "answer": "According to the savings account policy...",
  "session_id": "uuid-v4",
  "sources": [
    {
      "document_id": "uuid-v4",
      "filename": "banking-policy.pdf",
      "chunk_index": 12,
      "content_preview": "Minimum balance requirement for..."
    }
  ],
  "retrieval_count": 5
}
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes* | — | Google AI Studio API key |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Gemini model to use |
| `GROQ_API_KEY` | No | `""` | Groq API key (free fallback LLM) |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Groq model name |
| `CHROMA_PERSIST_DIR` | No | `./data/chroma_db` | ChromaDB storage path |
| `EMBEDDING_MODEL` | No | `sentence-transformers/all-MiniLM-L6-v2` | HuggingFace embedding model |
| `CHUNK_SIZE` | No | `500` | Token chunk size for splitting |
| `CHUNK_OVERLAP` | No | `100` | Overlap between chunks |
| `TOP_K_RESULTS` | No | `5` | Number of chunks to retrieve |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-separated CORS origins |
| `MAX_UPLOAD_SIZE_MB` | No | `20` | Max upload file size |
| `PORT` | No | `8000` | Server port |

*At least one of `GEMINI_API_KEY` or `GROQ_API_KEY` must be set.

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend base URL (e.g. `https://your-app.onrender.com`) |

---

## Deployment

### Backend → Render (Free Tier)

1. Push your code to GitHub (see below)
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub repository
4. Set the following:
   - **Root directory:** `backend`
   - **Runtime:** Python 3
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add **Environment Variables** in the Render dashboard:
   - `GEMINI_API_KEY` = your key
   - `GROQ_API_KEY` = your key
   - `ALLOWED_ORIGINS` = `https://your-vercel-app.vercel.app`
   - `CHROMA_MODE` = `local`
6. Click **Deploy**

> **Note:** Render's free tier uses ephemeral storage — ChromaDB data resets on redeploy. Re-upload your documents after each deploy. For persistence, upgrade to a paid plan or use Render Disks.

### Frontend → Vercel (Free Tier)

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Set **Root Directory** to `frontend`
4. Add **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` = `https://your-render-service.onrender.com`
5. Click **Deploy**

---

## Git Setup

```bash
# From the banking-rag-chatbot/ directory:
git init
git add .
git commit -m "feat: initial GenAI banking RAG chatbot"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/banking-rag-chatbot.git
git branch -M main
git push -u origin main
```

---

## Design Decisions & Challenges

**Multi-provider LLM fallback** — Gemini's free tier has regional quota restrictions (particularly in India, where `limit: 0` is common). The system automatically falls through a chain of 4 Gemini model variants before falling back to Groq (LLaMA-3.3-70B), ensuring the chatbot always responds.

**Stateless server design** — Session history is managed client-side and sent with every request. This allows horizontal scaling without shared session state, which is important for Render's free-tier single-instance constraint.

**ChromaDB embedded mode** — Using the embedded PersistentClient (not HTTP server mode) eliminates a separate service dependency, reducing complexity and cost. The tradeoff is that data is stored on the server's disk (ephemeral on Render free tier).

**Grounding-first prompt engineering** — The system prompt explicitly prohibits hallucination: the LLM must answer only from the retrieved CONTEXT, cite sources, and direct customers to support if information isn't available. This is critical for regulated industries like banking.

---

## Future Improvements

- Add support for DOCX and image-based PDFs (OCR)
- Streaming responses via Server-Sent Events
- Persistent storage using Render Disks or Supabase pgvector
- Authentication (JWT) and per-user document collections
- Evaluation metrics (RAGAS framework for faithfulness, relevance)
- Admin dashboard for document management
- Re-ranking retrieved chunks with a cross-encoder model

---

## License

MIT — free to use, modify, and deploy.
