# face_embedding_extractor.py

import os
import cv2
import json
import numpy as np
from insightface.app import FaceAnalysis

# ✅ 기본 경로 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")
INSIGHTFACE_DIR = os.path.join(MODEL_DIR, "insightface")

# ✅ InsightFace가 다운로드하지 않도록 강제 설정
os.environ["INSIGHTFACE_HOME"] = INSIGHTFACE_DIR
# 모델 준비
app = FaceAnalysis(name="buffalo_l", root=INSIGHTFACE_DIR)  
app.prepare(ctx_id=0)  # GPU 사용 (없으면 -1)

def extract_face_embeddings(image_path, output_json_path):
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"이미지를 열 수 없습니다: {image_path}")

    faces = app.get(image)
    if not faces:
        raise ValueError("얼굴을 감지하지 못했습니다.")

    result = []
    for i, face in enumerate(faces):
        bbox = face.bbox.astype(int).tolist()
        embedding = face.normed_embedding.tolist()
        result.append({
            "person": i,
            "bbox": bbox,
            "embedding": embedding
        })

    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=4)
    print(f"✅ 얼굴 임베딩 저장 완료: {output_json_path}")
