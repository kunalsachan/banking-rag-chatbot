"""
rag/generator.py — Grounded response generation with provider fallback.

Provider chain (tried in order):
  1. Google Gemini (gemini-2.0-flash, then lighter models)
  2. Groq (llama-3.3-70b-versatile) — free fallback, no billing required

This makes the system resilient:
  • If Gemini free-tier quota is unavailable (common in some regions),
    Groq takes over transparently.
  • When Gemini billing is enabled later, it becomes primary again.

Both providers receive the same strict system prompt and grounding rules,
so answer quality is consistent regardless of which model responds.
"""

from __future__ import annotations

from loguru import logger


SYSTEM_PROMPT = """\
You are a knowledgeable and professional banking support assistant for a leading bank.
Your role is to help customers understand banking products, policies, procedures, \
account management, loans, credit cards, digital banking, and general financial queries.

STRICT RULES YOU MUST FOLLOW:
1. Answer ONLY based on the CONTEXT provided below.
2. If the answer is not present in the CONTEXT, say clearly:
   "I don't have enough information in the knowledge base to answer this question. \
Please contact our support team or visit a branch."
3. Never make up facts, figures, rates, or policies that are not in the CONTEXT.
4. Keep answers clear, professional, and concise.
5. When relevant, mention which document or section the information comes from.
6. Use a friendly, helpful, and empathetic tone — customers may be stressed.
7. If a question involves a sensitive financial decision, always recommend \
consulting a qualified financial advisor.
"""

GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-8b-latest",
]


class ResponseGenerator:
    """
    Generate grounded answers using Gemini with automatic Groq fallback.

    Usage:
        generator = ResponseGenerator(
            gemini_api_key="...",
            groq_api_key="...",   # optional — pass "" to disable
        )
        answer = generator.generate(query, chunks, history)
    """

    def __init__(
        self,
        api_key: str,                          # Gemini key
        model: str = "gemini-2.0-flash",
        groq_api_key: str = "",                # Groq key (optional)
        groq_model: str = "llama-3.3-70b-versatile",
    ) -> None:
        self.gemini_api_key = api_key
        self.groq_api_key = groq_api_key
        self.groq_model = groq_model

        # Gemini model chain
        others = [m for m in GEMINI_MODELS if m != model]
        self.gemini_chain = [model] + others

    # ------------------------------------------------------------------ #
    #  Public interface                                                    #
    # ------------------------------------------------------------------ #

    def generate(
        self,
        query: str,
        chunks: list[dict],
        history: list[tuple[str, str]] | None = None,
    ) -> str:
        context = self._build_context(chunks)
        prompt = self._build_prompt(query, context, history or [])

        # Try Gemini first
        gemini_result = self._try_gemini(prompt)
        if gemini_result:
            return gemini_result

        # Fall back to Groq
        if self.groq_api_key:
            groq_result = self._try_groq(prompt)
            if groq_result:
                return groq_result

        raise RuntimeError(
            "All AI providers are currently unavailable. "
            "Please check your API keys and quota, then try again."
        )

    # ------------------------------------------------------------------ #
    #  Gemini provider                                                     #
    # ------------------------------------------------------------------ #

    def _try_gemini(self, prompt: str) -> str | None:
        """Try all Gemini models. Returns answer string or None."""
        try:
            from google import genai
            from google.genai import types
        except ImportError:
            logger.warning("google-genai not installed, skipping Gemini")
            return None

        try:
            client = genai.Client(api_key=self.gemini_api_key)
        except Exception as exc:
            logger.warning(f"Gemini client init failed: {exc}")
            return None

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,
            top_p=0.8,
            max_output_tokens=1024,
        )

        for model_name in self.gemini_chain:
            try:
                logger.info(f"Trying Gemini model: {model_name}")
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config,
                )
                answer = response.text.strip() if response.text else ""
                if answer:
                    logger.info(f"✅ Gemini ({model_name}) responded")
                    return answer

            except Exception as exc:
                exc_str = str(exc)
                logger.warning(f"Gemini {model_name} failed: {exc_str[:150]}")

                # Hard auth failure — no point trying other Gemini models
                if any(k in exc_str for k in ["401", "403", "PERMISSION_DENIED", "API_KEY_INVALID"]):
                    logger.error("Gemini auth failed — skipping all Gemini models")
                    return None

                # Quota / not-found — try next model
                continue

        logger.warning("All Gemini models exhausted — falling back to Groq")
        return None

    # ------------------------------------------------------------------ #
    #  Groq fallback provider                                              #
    # ------------------------------------------------------------------ #

    def _try_groq(self, prompt: str) -> str | None:
        """Call Groq API. Returns answer string or None."""
        try:
            from groq import Groq
        except ImportError:
            logger.warning("groq package not installed, skipping Groq fallback")
            return None

        try:
            logger.info(f"Trying Groq model: {self.groq_model}")
            client = Groq(api_key=self.groq_api_key)
            completion = client.chat.completions.create(
                model=self.groq_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                temperature=0.2,
                max_tokens=1024,
                top_p=0.8,
            )
            answer = completion.choices[0].message.content or ""
            answer = answer.strip()
            if answer:
                logger.info(f"✅ Groq ({self.groq_model}) responded")
                return answer
        except Exception as exc:
            logger.error(f"Groq failed: {exc}")

        return None

    # ------------------------------------------------------------------ #
    #  Prompt construction                                                 #
    # ------------------------------------------------------------------ #

    def _build_context(self, chunks: list[dict]) -> str:
        if not chunks:
            return "No relevant information found in the knowledge base."
        lines = []
        for i, chunk in enumerate(chunks, start=1):
            lines.append(
                f"[SOURCE {i} — {chunk['filename']}, chunk {chunk['chunk_index']}]\n"
                f"{chunk['content']}\n"
            )
        return "\n---\n".join(lines)

    def _build_prompt(
        self,
        query: str,
        context: str,
        history: list[tuple[str, str]],
    ) -> str:
        parts = [
            "CONTEXT FROM KNOWLEDGE BASE\n"
            "===========================\n"
            f"{context}"
        ]
        if history:
            history_text = "\n".join(
                f"{role.upper()}: {content}"
                for role, content in history[-6:]
            )
            parts.append(
                "CONVERSATION HISTORY (most recent last)\n"
                "=======================================\n"
                f"{history_text}"
            )
        parts.append(
            "CURRENT QUESTION\n"
            "================\n"
            f"{query}"
        )
        return "\n\n".join(parts)
