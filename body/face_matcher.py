import json
import numpy as np

def find_matching_face(db_json_path, group_json_path, threshold=0.65):
    with open(db_json_path, "r", encoding="utf-8") as f:
        db_faces = json.load(f)
    with open(group_json_path, "r", encoding="utf-8") as f:
        group_faces = json.load(f)

    if not db_faces or not group_faces:
        return None

    # 현재는 첫 번째 사람만 기준 (원하면 반복문으로 여러 명 처리 가능)
    db_embedding = np.array(db_faces[0]["embedding"], dtype=np.float32)

    min_dist = float("inf")
    matched_bbox = None

    for face in group_faces:
        embedding = np.array(face.get("embedding", []), dtype=np.float32)
        if embedding.size == 0:
            continue
        dist = np.linalg.norm(db_embedding - embedding)
        if dist < min_dist:
            min_dist = dist
            matched_bbox = tuple(face["bbox"])

    print(f"✅ 얼굴 임베딩 거리: {min_dist:.4f}")
    return matched_bbox if min_dist < threshold else None