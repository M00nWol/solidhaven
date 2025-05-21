# ✅ exposure_pipeline_runner.py
import os
from b_body import run_pipeline
from b_face_matcher import find_matching_face
from b_face_embedding import extract_face_embeddings

# 기준 얼굴 임베딩 (DB에서 온 거)
face_json = "data/face.json"

# 분석할 다인 사진
image_path = "data/test.jpg"

def run_exposure_pipeline(face_json, image_path):
    base_dir = os.path.dirname(image_path)
    base_name = os.path.splitext(os.path.basename(image_path))[0]
    multi_json = os.path.join(base_dir, base_name + "_multi_embedding.json")

    # Step 1: 다인 사진에서 얼굴 임베딩 추출
    extract_face_embeddings(image_path, multi_json)

    # Step 2: DB 임베딩과 비교
    matched_bbox = find_matching_face(face_json, multi_json)

    # Step 3: 일치하는 얼굴이 있다면 마스킹 파이프라인 실행
    if matched_bbox:
        print(f"✅ 일치하는 얼굴 bbox: {matched_bbox}")
        result = run_pipeline(image_path, matched_face_bbox=matched_bbox)
        return result
    else:
        print("❌ 일치하는 얼굴 없음. 마스킹 미진행.")
        return None

# 실행
if __name__ == "__main__":
    run_exposure_pipeline(face_json, image_path)
