import os
import json
import cv2
import numpy as np
import torch
from insightface.app import FaceAnalysis


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
