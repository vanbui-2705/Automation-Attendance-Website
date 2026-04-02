class EmbeddingService:
    def __init__(self, extractor=None):
        self._extractor = extractor or (lambda frame_bytes: [])

    def extract_embeddings(self, frame_bytes):
        embeddings = self._extractor(frame_bytes) or []
        return [list(embedding) for embedding in embeddings]
