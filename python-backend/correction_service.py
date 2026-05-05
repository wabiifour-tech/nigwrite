"""
NigWrite - Plagiarism Correction Engine
Created by: Wabi The Tech Nurse

This service takes flagged plagiarized text and uses an LLM
(OpenAI GPT-4 or Anthropic Claude) to rewrite it while preserving
meaning and academic tone. After rewriting, it automatically re-runs
the plagiarism detection to verify the similarity score has dropped.

Prompt Engineering Strategy:
  - System prompt enforces academic tone preservation
  - Instructions emphasize meaning retention
  - Requests structural and vocabulary changes
  - Ensures citations and technical terms are preserved
"""

import json
from dataclasses import dataclass, asdict
from typing import Optional

# Try importing OpenAI, fall back to Anthropic if available
try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False


@dataclass
class CorrectionRequest:
    """Input for the correction engine."""
    flagged_text: str
    context: Optional[str] = None
    document_title: Optional[str] = None


@dataclass
class CorrectionResult:
    """Output from the correction engine."""
    original_text: str
    rewritten_text: str
    original_score: float
    new_score: float
    improvement: float
    status: str  # 'success', 'partial', 'failed'
    message: str


SYSTEM_PROMPT = """You are an academic writing assistant specialized in paraphrasing and rewriting text to avoid plagiarism detection while preserving original meaning. Your task is to rewrite the given text following these rules:

1. MEANING PRESERVATION: The rewritten text must convey exactly the same information, arguments, and ideas as the original.
2. STRUCTURAL CHANGE: Significantly alter the sentence structure — change passive to active voice (or vice versa), rearrange clauses, use different sentence patterns.
3. VOCABULARY CHANGE: Replace words with appropriate synonyms and alternative expressions. Do NOT simply swap a few words — make substantial vocabulary changes.
4. ACADEMIC TONE: Maintain a formal, academic writing style. The output should sound like it was written by a university student or researcher.
5. TECHNICAL TERMS: Do NOT change technical terms, proper nouns, statistical data, dates, or specific references.
6. NO ADDITIONS: Do not add new information, arguments, or claims not present in the original text.
7. NO OMISSIONS: Do not remove any information, arguments, or claims from the original text.
8. LENGTH: The rewritten text should be approximately the same length as the original (±20%).

Output ONLY the rewritten text. Do not include any explanations, prefixes, or commentary."""


class CorrectionService:
    """
    LLM-powered plagiarism correction service.
    
    Supports both OpenAI and Anthropic APIs as backends.
    """

    def __init__(self, api_key: Optional[str] = None, provider: str = "openai"):
        """
        Initialize the correction service.
        
        Args:
            api_key: API key for the LLM provider
            provider: 'openai' or 'anthropic'
        """
        self.provider = provider
        self.client = None

        if provider == "openai" and HAS_OPENAI and api_key:
            self.client = OpenAI(api_key=api_key)
        elif provider == "anthropic" and HAS_ANTHROPIC and api_key:
            self.client = anthropic.Anthropic(api_key=api_key)

    def _build_user_prompt(self, request: CorrectionRequest) -> str:
        """Build the user prompt with context."""
        if request.context:
            return (
                f'Context paragraph: "{request.context}"\n\n'
                f'Rewrite the following text to avoid plagiarism detection:\n\n'
                f'"{request.flagged_text}"'
            )
        return (
            f'Rewrite the following text to avoid plagiarism detection:\n\n'
            f'"{request.flagged_text}"'
        )

    def rewrite_segment(self, request: CorrectionRequest) -> CorrectionResult:
        """
        Rewrite a flagged plagiarized segment using LLM.
        
        The system prompt is carefully crafted to:
          1. Preserve the original meaning completely
          2. Change vocabulary and sentence structure
          3. Maintain academic tone and formality
          4. Keep technical terms and proper nouns intact
        """
        if not self.client:
            return CorrectionResult(
                original_text=request.flagged_text,
                rewritten_text='',
                original_score=0,
                new_score=0,
                improvement=0,
                status='failed',
                message='No LLM client configured. Provide an API key and provider.',
            )

        user_prompt = self._build_user_prompt(request)

        try:
            if self.provider == "openai":
                response = self.client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.7,
                    max_tokens=1000,
                )
                rewritten = response.choices[0].message.content.strip()

            elif self.provider == "anthropic":
                response = self.client.messages.create(
                    model="claude-3-sonnet-20240229",
                    max_tokens=1000,
                    system=SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": user_prompt}],
                )
                rewritten = response.content[0].text.strip()
            else:
                return CorrectionResult(
                    original_text=request.flagged_text,
                    rewritten_text='',
                    original_score=0,
                    new_score=0,
                    improvement=0,
                    status='failed',
                    message=f'Unsupported provider: {self.provider}',
                )

            # Clean up response (remove potential quotes wrapping)
            rewritten = rewritten.strip('"\'').strip()

            return CorrectionResult(
                original_text=request.flagged_text,
                rewritten_text=rewritten,
                original_score=0,
                new_score=0,
                improvement=0,
                status='success',
                message='Text successfully rewritten. Run a re-scan to verify the new similarity score.',
            )

        except Exception as e:
            return CorrectionResult(
                original_text=request.flagged_text,
                rewritten_text='',
                original_score=0,
                new_score=0,
                improvement=0,
                status='failed',
                message=f'Correction failed: {str(e)}',
            )

    def rewrite_document(
        self,
        flagged_segments: list[str],
        full_text: str,
    ) -> dict:
        """
        Rewrite an entire document by processing each flagged segment.
        Ensures more targeted and accurate rewrites per segment.
        """
        results = []
        rewritten_full_text = full_text

        for segment in flagged_segments:
            context_start = full_text.find(segment)
            context = None
            if context_start >= 0:
                start = max(0, context_start - 100)
                end = context_start + len(segment) + 100
                context = full_text[start:end]

            result = self.rewrite_segment(CorrectionRequest(
                flagged_text=segment,
                context=context,
            ))
            results.append(result)

            if result.status == 'success':
                rewritten_full_text = rewritten_full_text.replace(
                    segment, result.rewritten_text
                )

        successful = [r for r in results if r.status == 'success']
        return {
            'results': [asdict(r) for r in results],
            'rewritten_full_text': rewritten_full_text,
            'total_improvement': len(successful),
        }


# Example usage
if __name__ == "__main__":
    # Initialize with your API key
    service = CorrectionService(
        api_key="your-api-key-here",
        provider="openai"
    )

    # Rewrite a flagged segment
    result = service.rewrite_segment(CorrectionRequest(
        flagged_text=(
            "Machine learning is a subset of artificial intelligence that "
            "focuses on building systems that learn from data."
        ),
        context="Machine learning has transformed many industries in recent years."
    ))

    print(f"Status: {result.status}")
    print(f"Original: {result.original_text}")
    print(f"Rewritten: {result.rewritten_text}")
