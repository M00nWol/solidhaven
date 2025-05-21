import json
import numpy as np

# 코사인 유사도 계산 함수
def cosine_similarity(a, b):
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# 코사인 유사도 기반 얼굴 매칭
def find_matching_face(db_json_path, group_json_path, threshold=0.5):
    with open(db_json_path, "r", encoding="utf-8") as f:
        db_faces = json.load(f)
    with open(group_json_path, "r", encoding="utf-8") as f:
        group_faces = json.load(f)

    if not db_faces or not group_faces:
        return None

    db_embedding = np.array(db_faces[0]["embedding"], dtype=np.float32)

    max_sim = -1.0
    matched_bbox = None

    for face in group_faces:
        embedding = face.get("embedding", [])
        if not embedding:
            continue
        sim = cosine_similarity(db_embedding, embedding)
        print(f"✅ 코사인 유사도: {sim:.4f}")
        if sim > max_sim:
            max_sim = sim
            matched_bbox = tuple(face["bbox"])

    print(f"✅ 최대 코사인 유사도: {max_sim:.4f}")
    return matched_bbox if max_sim >= threshold else None
