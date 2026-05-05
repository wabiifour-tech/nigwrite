"""
NigWrite - AI Content Detection Module
Created by: Wabi The Tech Nurse

Detects LLM-generated text (ChatGPT, GPT-4, Claude, etc.) using
statistical analysis of text patterns:

  1. Perplexity Analysis — Measures how predictable the text is.
     LLM text tends to have LOW perplexity (very predictable).
     Human text has HIGHER perplexity (more creative/unexpected choices).

  2. Burstiness Analysis — Measures sentence length variance.
     LLM text tends to have UNIFORM sentence lengths (low burstiness).
     Human text has VARIED sentence lengths (high burstiness).

  3. Vocabulary Diversity — Measures unique word usage patterns.
     LLM text often uses more limited vocabulary in certain contexts.

  4. Structural Patterns — Analyzes paragraph structure and transitions.
     LLM text follows more rigid organizational patterns.

Note: In production, this would integrate a fine-tuned RoBERTa model.
This implementation uses lightweight statistical heuristics for demonstration.
"""

import re
import math
from dataclasses import dataclass
from typing import List


@dataclass
class AIDetectionResult:
    """Complete AI detection analysis result."""
    ai_probability: float         # 0-100 percentage
    perplexity_score: float       # Lower = more likely AI-generated
    burstiness_score: float       # Lower = more likely AI-generated
    vocabulary_diversity: float   # Type-Token Ratio
    average_sentence_length: float
    sentence_length_variance: float
    confidence: str               # 'low', 'medium', 'high'
    indicators: List[str]         # Human-readable explanation of signals


# Common phrases frequently used by LLMs
LLM_PHRASES = [
    "in conclusion", "it is important to note", "it's worth noting",
    "as a language model", "as an ai", "in summary",
    "furthermore", "moreover", "additionally", "consequently",
    "nevertheless", "it is essential to", "it is crucial to",
    "plays a vital role", "delve into", "navigate the complexities",
    "in today's world", "in today's digital age", "landscape of",
    "underscores the importance", "shed light on", "paramount importance",
    "multifaceted", "a testament to", "paves the way for",
    "at the heart of", "in the realm of", "it is imperative",
    "not only", "but also", "in order to", "the fact that",
    "a wide range of", "a variety of", "it should be noted that",
    "bear in mind", "taking into account", "on the other hand",
    "when it comes to",
]


class AIDetector:
    """
    AI content detection using statistical text analysis.
    
    Analyzes text for patterns indicative of LLM-generated content
    using perplexity, burstiness, vocabulary diversity, and phrase detection.
    """

    def analyze_text(self, text: str) -> AIDetectionResult:
        """
        Analyze text for AI-generated content patterns.
        Returns a comprehensive detection result with multiple metrics.
        """
        if not text or not text.strip():
            return AIDetectionResult(
                ai_probability=0, perplexity_score=0, burstiness_score=0,
                vocabulary_diversity=0, average_sentence_length=0,
                sentence_length_variance=0, confidence='low',
                indicators=['Insufficient text provided for analysis'],
            )

        sentences = self._tokenize_sentences(text)
        words = self._tokenize_words(text)

        if len(sentences) < 2 or len(words) < 10:
            return AIDetectionResult(
                ai_probability=50, perplexity_score=0, burstiness_score=0,
                vocabulary_diversity=len(set(words)) / max(len(words), 1),
                average_sentence_length=len(words) / max(len(sentences), 1),
                sentence_length_variance=0, confidence='low',
                indicators=['Text too short for reliable AI detection. Submit at least 2-3 sentences.'],
            )

        # Run all detection analyses
        perplexity = self._calculate_perplexity(words)
        burstiness = self._calculate_burstiness(sentences)
        vocab_diversity = self._calculate_vocabulary_diversity(words)
        avg_sent_len = len(words) / len(sentences)
        sent_variance = self._calculate_sentence_length_variance(sentences)

        # Compile indicators
        indicators = []
        if perplexity < 3.5:
            indicators.append(f'Very low perplexity ({perplexity:.2f}) — text is highly predictable, suggesting AI generation')
        elif perplexity < 5.0:
            indicators.append(f'Low perplexity ({perplexity:.2f}) — somewhat predictable word choices')

        if burstiness < 30:
            indicators.append(f'Very low burstiness ({burstiness:.1f}) — unusually uniform sentence lengths')
        elif burstiness < 50:
            indicators.append(f'Low burstiness ({burstiness:.1f}) — sentence lengths are more uniform than typical human writing')

        if 20 <= avg_sent_len <= 28:
            indicators.append(f'Average sentence length ({avg_sent_len:.1f} words) falls in the typical LLM range of 18-28 words')

        if sent_variance < 40:
            indicators.append(f'Low sentence length variance ({sent_variance:.1f}) — human writing typically shows more variation')

        if vocab_diversity > 0.65:
            indicators.append(f'High vocabulary diversity ({vocab_diversity * 100:.1f}%) — could indicate AI\'s tendency to use varied synonyms')

        llm_phrases = self._detect_llm_phrases(text)
        if llm_phrases:
            indicators.append(f'Detected {len(llm_phrases)} common AI transition phrase(s): "{", ".join(llm_phrases[:3])}"')

        # Calculate overall AI probability
        ai_probability = self._calculate_ai_probability({
            'perplexity': perplexity,
            'burstiness': burstiness,
            'vocab_diversity': vocab_diversity,
            'avg_sentence_len': avg_sent_len,
            'sentence_variance': sent_variance,
            'llm_phrase_count': len(llm_phrases),
        })

        # Determine confidence level
        if ai_probability < 25 or ai_probability > 75:
            confidence = 'high'
        elif ai_probability < 40 or ai_probability > 60:
            confidence = 'medium'
        else:
            confidence = 'low'

        return AIDetectionResult(
            ai_probability=min(round(ai_probability), 100),
            perplexity_score=round(perplexity, 2),
            burstiness_score=round(burstiness, 2),
            vocabulary_diversity=round(vocab_diversity, 3),
            average_sentence_length=round(avg_sent_len, 1),
            sentence_length_variance=round(sent_variance, 1),
            confidence=confidence,
            indicators=indicators,
        )

    def _calculate_perplexity(self, words: list[str]) -> float:
        """
        Perplexity estimation using Shannon entropy as a proxy.
        Lower perplexity = more predictable = more likely AI-generated.
        """
        word_freq = {}
        for word in words:
            word_freq[word] = word_freq.get(word, 0) + 1

        entropy = 0
        total = len(words)
        for count in word_freq.values():
            prob = count / total
            entropy -= prob * math.log2(prob)

        perplexity = math.pow(2, entropy)
        return min(max(perplexity / (total * 0.01), 1), 10)

    def _calculate_burstiness(self, sentences: list[str]) -> float:
        """
        Burstiness measures sentence length variance using coefficient of variation.
        Human writing: CV 50-80% | AI writing: CV 25-45%.
        """
        lengths = [len(s.split()) for s in sentences]
        mean = sum(lengths) / len(lengths)
        if mean == 0:
            return 0

        variance = sum((l - mean) ** 2 for l in lengths) / len(lengths)
        std_dev = math.sqrt(variance)
        return (std_dev / mean) * 100  # CV as percentage

    def _calculate_vocabulary_diversity(self, words: list[str]) -> float:
        """Type-Token Ratio: unique words / total words."""
        unique = set(words)
        return len(unique) / max(len(words), 1)

    def _calculate_sentence_length_variance(self, sentences: list[str]) -> float:
        """Variance of sentence lengths in words."""
        lengths = [len(s.split()) for s in sentences]
        mean = sum(lengths) / len(lengths)
        return sum((l - mean) ** 2 for l in lengths) / len(lengths)

    def _detect_llm_phrases(self, text: str) -> list[str]:
        """Detect common LLM transition phrases and hedging patterns."""
        lower_text = text.lower()
        return [phrase for phrase in LLM_PHRASES if phrase in lower_text]

    def _calculate_ai_probability(self, metrics: dict) -> float:
        """Calculate overall AI probability using weighted scoring model."""
        score = 0

        # Perplexity: Lower = more AI (weight: 25%)
        if metrics['perplexity'] < 3: score += 25
        elif metrics['perplexity'] < 4: score += 20
        elif metrics['perplexity'] < 5: score += 12
        elif metrics['perplexity'] < 6: score += 5

        # Burstiness: Lower = more AI (weight: 25%)
        if metrics['burstiness'] < 30: score += 25
        elif metrics['burstiness'] < 40: score += 20
        elif metrics['burstiness'] < 50: score += 12
        elif metrics['burstiness'] < 60: score += 5

        # Sentence variance: Lower = more AI (weight: 20%)
        if metrics['sentence_variance'] < 20: score += 20
        elif metrics['sentence_variance'] < 40: score += 15
        elif metrics['sentence_variance'] < 60: score += 8
        elif metrics['sentence_variance'] < 80: score += 3

        # Average sentence length: 18-28 typical AI range (weight: 15%)
        if 18 <= metrics['avg_sentence_len'] <= 28: score += 15
        elif 15 <= metrics['avg_sentence_len'] <= 32: score += 8

        # LLM phrases: weight 15%
        phrase_score = min(metrics['llm_phrase_count'] * 3, 15)
        score += phrase_score

        return min(score, 100)

    def _tokenize_sentences(self, text: str) -> list[str]:
        """Split text into sentences."""
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if len(s.strip()) > 5]

    def _tokenize_words(self, text: str) -> list[str]:
        """Split text into words."""
        words = re.split(r'\s+', text)
        return [re.sub(r'[^\w\'-]', '', w).lower() for w in words if w.strip()]


# Example usage
if __name__ == "__main__":
    detector = AIDetector()

    # Human-written text
    human_text = """
    I think machine learning is pretty cool. It can do lots of things!
    Like recognizing images and stuff. But sometimes it makes mistakes,
    you know? The algorithms are getting better every year though.
    Researchers keep finding new ways to improve them. It's exciting.
    """

    # AI-generated text
    ai_text = """
    In today's rapidly evolving digital landscape, it is essential to understand 
    the multifaceted nature of technological advancement. Furthermore, the 
    implementation of artificial intelligence systems has underscored the 
    importance of maintaining a delicate balance between innovation and ethical 
    considerations. Additionally, it is worth noting that these developments 
    have far-reaching implications for society as a whole.
    """

    print("=== Human Text Analysis ===")
    result = detector.analyze_text(human_text)
    print(f"AI Probability: {result.ai_probability}%")
    print(f"Confidence: {result.confidence}")
    for ind in result.indicators:
        print(f"  - {ind}")

    print("\n=== AI Text Analysis ===")
    result = detector.analyze_text(ai_text)
    print(f"AI Probability: {result.ai_probability}%")
    print(f"Confidence: {result.confidence}")
    for ind in result.indicators:
        print(f"  - {ind}")
