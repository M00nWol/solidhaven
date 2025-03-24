import os
import json
import cv2
import numpy as np
import torch
from insightface.app import FaceAnalysis
import time


# ✅ 기본 경로 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")
INSIGHTFACE_DIR = os.path.join(MODEL_DIR, "insightface")

# ✅ InsightFace가 다운로드하지 않도록 강제 설정
os.environ["INSIGHTFACE_HOME"] = INSIGHTFACE_DIR

# ✅ YOLOv5 모델 로드 (로컬에서 불러오기)
YOLO_MODEL_PATH = os.path.join(MODEL_DIR, "yolo", "yolov5s.pt")
yolo_model = torch.hub.load("ultralytics/yolov5", "custom", path=YOLO_MODEL_PATH, force_reload=False)

# ✅ ArcFace 모델 로드 (로컬에서 불러오기, **name="buffalo_l"으로 설정해야 함**)
arcface_app = FaceAnalysis(name="buffalo_l", root=INSIGHTFACE_DIR)  # ✅ 모델 이름을 명확하게 지정
arcface_app.prepare(ctx_id=-1)  # CPU 사용

print("✅ YOLO 및 ArcFace 모델이 정상적으로 로드되었습니다.")

EMBEDDING_DIR = os.path.join(BASE_DIR, "embeddings")
os.makedirs(EMBEDDING_DIR, exist_ok=True)

MAX_CAPTURE = 5  # 최대 5장 평균

def adjust_bbox_for_retina(yolo_bbox, scale_factor=1.2):
    """ YOLO의 바운딩 박스를 20% 확대하여 RetinaFace와 유사한 크기로 변환 """
    x, y, w, h = yolo_bbox
    cx, cy = x + w / 2, y + h / 2
    new_w, new_h = w * scale_factor, h * scale_factor
    return [max(0, cx - new_w / 2), max(0, cy - new_h / 2), new_w, new_h]

def extract_faces_and_embeddings(image):
    """ 사용자의 얼굴을 YOLO로 검출 후 임베딩 추출하고 평균 계산 """
    embeddings_list = []

    # YOLO 얼굴 검출
    results = yolo_model(image)
    
    if results is None or len(results.pred[0]) == 0:
        return None  # 얼굴이 감지되지 않으면 None 반환

    # 가장 큰 얼굴 선택
    detected_faces = sorted(results.pred[0].cpu().numpy(), key=lambda x: (x[2] - x[0]) * (x[3] - x[1]), reverse=True)
    
    for face in detected_faces[:MAX_CAPTURE]:
        x, y, w, h, conf, cls = face
        x, y, w, h = adjust_bbox_for_retina([x, y, w - x, h - y])  # 바운딩 박스 확대

        # 얼굴 크롭
        face_crop = image[int(y):int(y + h), int(x):int(x + w)]

        # ArcFace 임베딩 추출
        face_data = arcface_app.get(face_crop)
        if face_data:
            embeddings_list.append(face_data[0].normed_embedding)

        if len(embeddings_list) >= MAX_CAPTURE:
            break

    if len(embeddings_list) == 0:
        return None

    # 평균 임베딩 계산
    avg_embedding = np.mean(embeddings_list, axis=0).tolist()
    return avg_embedding

def mask_matching_face(image, family_embeddings, mask_type="black", threshold=0.5, emojis=None):
    faces = arcface_app.get(image)
    print(f"🔍 얼굴 감지됨: {len(faces)}개")

    if not faces:
        return image

    for face in faces:
        if "embedding" not in face:
            continue

        face_embedding = np.array(face["embedding"])
        face_embedding = face_embedding / np.linalg.norm(face_embedding)

        for user_id, emb in family_embeddings.items():
            sim = np.dot(face_embedding, emb)
            if sim >= threshold:
                print(f"✅ 유사한 가족 구성원 탐지됨 (user_id={user_id}, sim={sim:.3f})")

                # 마스킹 적용
                x_min, y_min, x_max, y_max = map(int, face["bbox"])
                w, h = x_max - x_min, y_max - y_min

                if mask_type == "black":
                    cv2.rectangle(image, (x_min, y_min), (x_max, y_max), (0, 0, 0), -1)
                elif mask_type == "blur":
                    face_roi = image[y_min:y_max, x_min:x_max]
                    face_roi = cv2.GaussianBlur(face_roi, (55, 55), 30)
                    image[y_min:y_max, x_min:x_max] = face_roi
                elif mask_type in emojis and emojis[mask_type] is not None:
                    emoji = cv2.resize(emojis[mask_type], (w, h))
                    image[y_min:y_max, x_min:x_max] = emoji

                break  # ✅ 해당 얼굴은 마스킹했으니 다음 얼굴로

    return image