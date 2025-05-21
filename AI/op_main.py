# -*- coding: utf-8 -*-
import time
import os
import cv2
import json                
import numpy as np

from embedding_extractor import mask_matching_face, arcface_app
from op_body import process_image
from video_processing import extract_frames, save_video

# [1] family_embeddings_string 정의
family_embeddings_string = {}  # 임베딩 있다고 가정
def ensure_dirs(paths):
    for p in paths:
        os.makedirs(p, exist_ok=True)

def normalize_embeddings(raw_embeddings: dict) -> dict:
    return {name: np.array(vec)/np.linalg.norm(vec)
            for name, vec in raw_embeddings.items()}

def process_video(video_path: str, raw_embeddings: dict, output_dir: str):
    frame_dir  = os.path.join(output_dir, "frames")
    result_dir = os.path.join(output_dir, "frames_masked")
    ensure_dirs([output_dir, frame_dir, result_dir])

    normalized = normalize_embeddings(raw_embeddings)
    frames, fps, size = extract_frames(video_path)
    if frames is None:
        raise IOError(f"비디오 로드 실패: {video_path}")

    processed = []
    for idx, frame in enumerate(frames, start=1):
        print(f"🎞 Frame {idx}/{len(frames)} 처리 중…")

        # 1) 얼굴 매칭 + 마스킹 → 임시 이미지 저장
        face_masked = mask_matching_face(frame, normalized)
        tmp_path = os.path.join(frame_dir, f"frame_{idx:04d}.jpg")
        cv2.imwrite(tmp_path, face_masked)

        # 2) 얼굴 임베딩 JSON 생성 (무조건 덮어쓰기)
        face_json = tmp_path.replace(".jpg", "_multi_embedding.json")
        if os.path.exists(face_json):
            os.remove(face_json)

        img_bgr = cv2.imread(tmp_path)
        if img_bgr is None:
            raise RuntimeError(f"임시 얼굴 이미지 로드 실패: {tmp_path}")
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        faces = arcface_app.get(img_rgb)
        data = []
        for f in faces:
            x1, y1, x2, y2 = map(int, f.bbox)
            w, h = x2 - x1, y2 - y1
            emb = getattr(f, 'normed_embedding', None) or getattr(f, 'embedding', None)
            vec = emb.tolist() if emb is not None else []
            data.append({'bbox': [x1, y1, w, h], 'embedding': vec})

        with open(face_json, 'w', encoding='utf-8') as fp:
            json.dump(data, fp, indent=4)

        # 3) 최적화된 신체 파이프라인 호출
        per_frame_dir = os.path.join(frame_dir, f"frame_{idx:04d}")
        os.makedirs(per_frame_dir, exist_ok=True)
        _, vis_img = process_image(tmp_path, face_json, per_frame_dir)

        # 4) 결과 프레임 저장
        out_path = os.path.join(result_dir, f"frame_{idx:04d}_masked.jpg")
        cv2.imwrite(out_path, vis_img)
        processed.append(vis_img)

    # 5) 비디오 합치기
    out_video = os.path.join(output_dir, "result_masked_op.mp4")
    if not save_video(processed, out_video, fps, size):
        raise IOError(f"비디오 저장 실패: {out_video}")
    print(f"✅ 처리 완료: {out_video}")

if __name__ == "__main__":
    start      = time.time()
    base_dir   = os.path.dirname(os.path.abspath(__file__))
    video_file = os.path.join(base_dir, "data", "test.mp4")
    output_dir = os.path.join(base_dir, "output")

    process_video(video_file, family_embeddings_string, output_dir)
    print(f"전체 소요: {time.time()-start:.2f}초")
