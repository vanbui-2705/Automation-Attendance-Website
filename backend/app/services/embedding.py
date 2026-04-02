class EmbeddingService:
    def extract_embeddings(self, frame_bytes):
        from deepface import DeepFace

        results = DeepFace.represent(
            img_path=frame_bytes,
            model_name="ArcFace",
            enforce_detection=False,
        )
        if not results:
            return []

        return [list(result["embedding"]) for result in results]
