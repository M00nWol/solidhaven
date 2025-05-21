import os
import cv2
import json
import numpy as np
import tensorflow as tf
import mediapipe as mp
from ultralytics import YOLO

# 경로 및 모델 초기화
BASE_DIR = os.path.dirname(__file__)
YOLO_MODEL = YOLO(os.path.join(BASE_DIR, "model", "yolov8s.pt"))

# TFLite 세그멘테이션 초기화
TFLITE = tf.lite.Interpreter(model_path=os.path.join(BASE_DIR, "model", "2.tflite"))
TFLITE.allocate_tensors()
_IN = TFLITE.get_input_details()[0]
_OUT = TFLITE.get_output_details()[0]

# MediaPipe Pose 초기화
POSE = mp.solutions.pose.Pose(
    static_image_mode=True,
    model_complexity=2,
    enable_segmentation=False,
    min_detection_confidence=0.5
)

# 파라미터
RADIUS = 20
EXPOSURE_THRESHOLD = 0.5
MASK_PADDING = 60

# 제외할 얼굴 랜드마크 ID (0~10)
FACE_IDS = set(range(0, 11))

# 유틸 함수
def load_json(path: str):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path: str, data) -> None:
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

def repeated_blur(img: np.ndarray, coords: list[tuple], padding: int = MASK_PADDING) -> np.ndarray:
    h, w = img.shape[:2]
    xs, ys = zip(*coords)
    x1 = max(min(xs) - padding, 0)
    y1 = max(min(ys) - padding, 0)
    x2 = min(max(xs) + padding, w)
    y2 = min(max(ys) + padding, h)
    roi = img[y1:y2, x1:x2]
    for _ in range(5):
        roi = cv2.GaussianBlur(roi, (151, 151), 0)
    img[y1:y2, x1:x2] = roi
    return img

# 프레임 처리 함수
def segment_frame(frame: np.ndarray) -> np.ndarray:
    h, w = frame.shape[:2]
    ih, iw = _IN['shape'][1:3]
    inp = cv2.resize(frame, (iw, ih)).astype(np.float32) / 255.0
    TFLITE.set_tensor(_IN['index'], inp[np.newaxis])
    TFLITE.invoke()
    seg = TFLITE.get_tensor(_OUT['index'])[0]
    return cv2.resize(np.argmax(seg, -1).astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST)

def get_skin_mask(frame: np.ndarray, seg_map: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    skin = cv2.inRange(hsv, (0, 30, 60), (35, 255, 255))
    person_mask = (seg_map > 0).astype(np.uint8) * 255
    return cv2.bitwise_and(skin, person_mask)

def detect_persons(frame: np.ndarray) -> list[tuple]:
    res = YOLO_MODEL.predict(frame, conf=0.5)[0]
    return [tuple(map(int, box.xyxy[0].tolist()))
            for box in res.boxes if int(box.cls[0]) == 0]

def extract_landmarks(frame: np.ndarray, bboxes: list[tuple]) -> tuple[list[dict], list[tuple]]:
    lm_list, bb_list = [], []
    for x1, y1, x2, y2 in bboxes:
        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            continue
        res = POSE.process(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
        if not res.pose_landmarks:
            continue
        pts = {}
        ch, cw = crop.shape[:2]
        for i, lm in enumerate(res.pose_landmarks.landmark):
            pts[i] = {'x': int(lm.x * cw) + x1, 'y': int(lm.y * ch) + y1}
        lm_list.append(pts)
        bb_list.append((x1, y1, x2, y2))
    return lm_list, bb_list

# 노출 판정: 얼굴 랜드마크(0~10) 제외

def evaluate_exposure(pts: dict, skin_mask: np.ndarray) -> list[int]:
    yy, xx = np.ogrid[-RADIUS:RADIUS+1, -RADIUS:RADIUS+1]
    circle = (xx**2 + yy**2) <= RADIUS**2
    exposed_ids = []
    # 얼굴 ID 제외
    for pid in set(pts.keys()) - FACE_IDS:
        x, y = pts[pid]['x'], pts[pid]['y']
        reg = skin_mask[max(0, y-RADIUS):y+RADIUS+1,
                        max(0, x-RADIUS):x+RADIUS+1]
        mask = circle[:reg.shape[0], :reg.shape[1]]
        if mask.sum() > 0 and (reg[mask] > 0).sum() / mask.sum() >= EXPOSURE_THRESHOLD:
            exposed_ids.append(pid)
    return exposed_ids

# 통합 파이프라인
def process_image(image_path: str, face_json: str, output_dir: str) -> tuple[str, np.ndarray]:
    os.makedirs(output_dir, exist_ok=True)
    frame = cv2.imread(image_path)
    seg_map = segment_frame(frame)
    skin_mask = get_skin_mask(frame, seg_map)

    # 얼굴 bbox 로드
    faces = load_json(face_json)
    face_bb = None
    if faces:
        x, y, w, h = faces[0]['bbox']
        face_bb = (x, y, x + w, y + h)

    persons = detect_persons(frame)
    lm_list, bb_list = extract_landmarks(frame, persons)

    results = []
    blur_img = frame.copy()
    for pts, bb in zip(lm_list, bb_list):
        # 얼굴 프레임 제외
        if face_bb and not (bb[0] <= face_bb[0] <= bb[2] and bb[1] <= face_bb[1] <= bb[3]):
            continue
        exposed_ids = evaluate_exposure(pts, skin_mask)
        coords = [(pts[i]['x'], pts[i]['y']) for i in exposed_ids]
        if coords:
            blur_img = repeated_blur(blur_img, coords)
        results.append({'bbox': bb, 'exposed': exposed_ids})

    # 저장
    json_path = os.path.join(output_dir, 'landmarks.json')
    save_json(json_path, results)
    masked_path = os.path.join(output_dir, 'masked.jpg')
    cv2.imwrite(masked_path, blur_img)
    return json_path, blur_img
