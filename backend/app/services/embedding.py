class EmbeddingService:
    def extract_embeddings(self, frame_bytes):
        import cv2
        import numpy as np
        from deepface import DeepFace

        # Convert raw bytes to numpy array (BGR) for DeepFace
        arr = np.frombuffer(frame_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return []

        results = DeepFace.represent(
            img_path=img,
            model_name="ArcFace",
            enforce_detection=False,
        )
        if not results:
            return []

        return [list(result["embedding"]) for result in results]
