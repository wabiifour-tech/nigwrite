"""
NigWrite - Winnowing Engine (Plagiarism Detection Core)
Created by: Wabi The Tech Nurse

Implements the Winnowing Algorithm for document fingerprinting:
  1. Text Normalization (lowercase, remove punctuation)
  2. N-Gram Generation (overlapping k-grams)
  3. Rolling Hash (Rabin-Karp)
  4. Winnowing Selection (pick representative hashes per window)
  5. Matching & Scoring (compare fingerprints against corpus)

Reference: Schleimer, S., Wilkerson, D. & Aiken, A. (2003).
"Winnowing: Local Algorithms for Document Fingerprinting."
SIGMOD Conference Proceedings.
"""

import re
from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional, Set


@dataclass
class Fingerprint:
    """A single document fingerprint entry."""
    hash: int
    position: int
    ngram: str


@dataclass
class PlagiarismMatch:
    """A detected plagiarism match against a source document."""
    text: str
    source_title: str
    source_url: Optional[str]
    similarity_contribution: float
    start_position: int


@dataclass
class ScanResult:
    """Complete plagiarism scan result."""
    overall_similarity: float  # 0-100 percentage
    matches: List[PlagiarismMatch]
    flagged_segments: List[str]


class WinnowingEngine:
    """
    Winnowing Algorithm implementation for plagiarism detection.
    
    Uses Rabin-Karp rolling hash function to generate document fingerprints,
    then applies the winnowing selection process to create a compact,
    robust fingerprint set for comparison.
    """

    # Configuration constants
    NGRAM_SIZE: int = 5          # k-gram size (number of words per n-gram)
    WINDOW_SIZE: int = 4         # w - window size for winnowing selection
    BASE_PRIME: int = 257        # Base for Rabin-Karp rolling hash
    HASH_MODULUS: int = 2 ** 32  # Modulus to keep hashes within 32-bit range

    def normalize_text(self, text: str) -> str:
        """
        Step 1: Normalize text by lowercasing and removing punctuation.
        Ensures that "Hello, World!" and "hello world" produce the same fingerprints.
        """
        text = text.lower()
        text = re.sub(r'[^\w\s]', '', text)   # Remove all non-alphanumeric, non-whitespace
        text = re.sub(r'\s+', ' ', text).strip()  # Collapse whitespace
        return text

    def generate_ngrams(self, text: str) -> List[str]:
        """
        Step 2: Generate k-grams (n-grams) from normalized text.
        Returns overlapping sequences of k words.
        """
        words = text.split()
        ngrams = []

        if len(words) < self.NGRAM_SIZE:
            if words:
                ngrams.append(' '.join(words))
            return ngrams

        for i in range(len(words) - self.NGRAM_SIZE + 1):
            ngram = ' '.join(words[i:i + self.NGRAM_SIZE])
            ngrams.append(ngram)

        return ngrams

    def rabin_karp_hash(self, string: str) -> int:
        """
        Step 3: Compute Rabin-Karp rolling hash for a string.
        Uses a polynomial rolling hash with a prime base.
        """
        hash_value = 0
        for char in string:
            hash_value = (hash_value * self.BASE_PRIME + ord(char)) % self.HASH_MODULUS
        return hash_value

    def winnow(self, hashes: List[Tuple[int, int, str]]) -> List[Fingerprint]:
        """
        Step 4: Apply Winnowing selection to pick representative fingerprints.
        For each window of size w, select the minimum hash value.
        If the minimum appears in multiple windows, only record it once.
        """
        if not hashes:
            return []

        w = self.WINDOW_SIZE
        selected = []
        selected_hashes = set()

        if len(hashes) < w:
            # Pick the minimum hash from all available
            min_hash = min(hashes, key=lambda x: x[0])
            selected.append(Fingerprint(
                hash=min_hash[0],
                position=min_hash[1],
                ngram=min_hash[2]
            ))
            return selected

        rightmost_min_pos = -1

        for i in range(len(hashes) - w + 1):
            window = hashes[i:i + w]
            min_in_window = min(window, key=lambda x: x[0])

            if min_in_window[1] >= rightmost_min_pos:
                if min_in_window[0] not in selected_hashes or min_in_window[1] > rightmost_min_pos:
                    selected.append(Fingerprint(
                        hash=min_in_window[0],
                        position=min_in_window[1],
                        ngram=min_in_window[2]
                    ))
                    selected_hashes.add(min_in_window[0])
                    rightmost_min_pos = min_in_window[1]

        return selected

    def generate_fingerprints(self, text: str) -> List[Fingerprint]:
        """
        Full fingerprinting pipeline: normalize -> n-grams -> hash -> winnow.
        Returns the complete set of document fingerprints.
        """
        normalized = self.normalize_text(text)
        ngrams = self.generate_ngrams(normalized)
        hashes = [
            (self.rabin_karp_hash(ngram), index, ngram)
            for index, ngram in enumerate(ngrams)
        ]
        return self.winnow(hashes)

    def match_document(
        self,
        submitted_text: str,
        corpus: Dict[int, List[Dict]]
    ) -> ScanResult:
        """
        Step 5: Match submitted document fingerprints against the corpus.
        Compares each fingerprint hash against the indexed store.
        """
        fingerprints = self.generate_fingerprints(submitted_text)

        if not fingerprints:
            return ScanResult(
                overall_similarity=0,
                matches=[],
                flagged_segments=[]
            )

        match_count = 0
        matches = []
        matched_positions = set()

        for fp in fingerprints:
            corpus_entries = corpus.get(fp.hash, [])
            if corpus_entries:
                match_count += 1
                matched_positions.add(fp.position)

                for entry in corpus_entries:
                    matches.append(PlagiarismMatch(
                        text=fp.ngram,
                        source_title=entry.get('source_title', 'Unknown'),
                        source_url=entry.get('source_url'),
                        similarity_contribution=0,
                        start_position=fp.position,
                    ))

        # Calculate overall similarity score
        overall_similarity = round(
            (match_count / max(len(fingerprints), 1)) * 100
        )

        # Distribute similarity contribution
        total_matches = len(matches)
        for match in matches:
            match.similarity_contribution = round(
                (1 / max(total_matches, 1)) * overall_similarity * 10
            ) / 10

        # Extract flagged segments
        normalized = self.normalize_text(submitted_text)
        words = normalized.split()
        flagged_segments = []
        current_segment = []

        for i in range(max(0, len(words) - self.NGRAM_SIZE + 1)):
            if i in matched_positions:
                current_segment.append(words[i])
            else:
                if current_segment:
                    flagged_segments.append(' '.join(current_segment))
                    current_segment = []
        if current_segment:
            flagged_segments.append(' '.join(current_segment))

        return ScanResult(
            overall_similarity=min(overall_similarity, 100),
            matches=matches,
            flagged_segments=flagged_segments
        )

    def rescan_after_correction(
        self,
        original_text: str,
        corrected_text: str,
        corpus: Dict[int, List[Dict]]
    ) -> dict:
        """
        Re-scan a document after correction to verify similarity has decreased.
        Returns the new similarity score and remaining flagged segments.
        """
        original_result = self.match_document(original_text, corpus)
        new_result = self.match_document(corrected_text, corpus)

        return {
            'original_score': original_result.overall_similarity,
            'new_score': new_result.overall_similarity,
            'improvement': original_result.overall_similarity - new_result.overall_similarity,
            'new_matches': new_result.matches,
        }


# Example usage
if __name__ == "__main__":
    engine = WinnowingEngine()

    # Sample document to check
    document = """
    Machine learning is a subset of artificial intelligence that focuses on 
    building systems that learn from data. These systems improve their 
    performance on a specific task over time without being explicitly 
    programmed. Deep learning is a specialized branch that uses neural 
    networks with many layers to analyze various factors of data.
    """

    # Generate fingerprints
    fingerprints = engine.generate_fingerprints(document)
    print(f"Generated {len(fingerprints)} fingerprints")
    for fp in fingerprints[:3]:
        print(f"  Hash: {fp.hash}, Position: {fp.position}, N-gram: '{fp.ngram[:40]}...'")
