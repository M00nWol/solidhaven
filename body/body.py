import os
import cv2
import json
import numpy as np
import tensorflow as tf
import mediapipe as mp
from ultralytics import YOLO
from collections import defaultdict



base_dir = os.path.dirname(__file__)
yolo_path = os.path.join(base_dir, "model", "yolov8s.pt")
tflite_path = os.path.join(base_dir, "model", "2.tflite")

# YOLOv8 모델 로드 (모델 파일 경로를 필요에 따라 수정)
model = YOLO(yolo_path)

# MediaPipe Pose 초기화
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=True,
    model_complexity=2,
    enable_segmentation=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# TFLite 세그멘테이션 모델 로드 (모델 경로 수정)
interpreter = tf.lite.Interpreter(model_path=tflite_path)
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# 파라미터
RADIUS = 20                  # 노출 판정 원 반경
EXPOSURE_THRESHOLD = 0.5     # 50% 이상 skin이면 노출 판정
MASK_COLOR = (128, 128, 128) # 마스킹 색상 (회색)
MASK_PADDING = 60


###########################
# 1. 신체 랜드마크 및 노출 판별 관련 함수들
###########################

# 이미지 로드
def segment_image(image_path):
    input_shape = input_details[0]['shape'][1:3]

    img = cv2.imread(image_path)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, tuple(input_shape)) / 255.0
    img = np.expand_dims(img, axis=0).astype(np.float32)


    interpreter.set_tensor(input_details[0]['index'], img)
    interpreter.invoke()
    seg_map = interpreter.get_tensor(output_details[0]['index'])[0]
    return np.argmax(seg_map, axis=-1).astype(np.uint8)


# 피부 분리
def get_skin_mask(image_path, seg_map):
    person_mask = (seg_map > 0).astype(np.uint8)
    original_img = cv2.imread(image_path)
    h, w, _ = original_img.shape
    hsv = cv2.cvtColor(original_img, cv2.COLOR_BGR2HSV)
    lower_skin = np.array([0, 30, 60], dtype=np.uint8)
    upper_skin = np.array([35, 255, 255], dtype=np.uint8)
    skin_mask = cv2.inRange(hsv, lower_skin, upper_skin)
    skin_mask = cv2.resize(skin_mask, (w, h), interpolation=cv2.INTER_NEAREST)
    person_mask = cv2.resize(person_mask, (w, h), interpolation=cv2.INTER_NEAREST)
    skin_mask = cv2.bitwise_and(skin_mask, skin_mask, mask=person_mask)
    return skin_mask

def detect_persons_yolo(image):
    results = model.predict(image, conf=0.5)
    rects = []
    for result in results:
        for box in result.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            if cls_id == 0 and conf >= 0.5:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                rects.append((int(x1), int(y1), int(x2), int(y2)))
    return rects

def get_landmarks_multi(image):
    rects = detect_persons_yolo(image)
    all_landmarks = []
    all_bboxes = []
    for (x1, y1, x2, y2) in rects:
        crop = image[y1:y2, x1:x2]
        crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        results = pose.process(crop_rgb)
        if results.pose_landmarks:
            landmarks = {}
            crop_h, crop_w, _ = crop.shape
            for idx, lm in enumerate(results.pose_landmarks.landmark):
                x_coord = int(lm.x * crop_w) + x1
                y_coord = int(lm.y * crop_h) + y1
                landmarks[idx] = {"x": x_coord, "y": y_coord, "name": f"Landmark_{idx}"}
            if all(k in landmarks for k in [11, 12, 23, 24]):
                ls = landmarks[11]; rs = landmarks[12]
                lh = landmarks[23]; rh = landmarks[24]
                genital_x = (lh["x"] + rh["x"]) // 2
                genital_y = (lh["y"] + rh["y"]) // 2
                landmarks[36] = {"x": genital_x, "y": genital_y, "name": "Genital"}
                torso_center_x = (ls["x"] + rs["x"] + lh["x"] + rh["x"]) // 4
                torso_center_y = (ls["y"] + rs["y"] + lh["y"] + rh["y"]) // 4
                landmarks[37] = {"x": torso_center_x, "y": torso_center_y, "name": "Torso Center"}
                left_nipple_x = (ls["x"] + torso_center_x) // 2
                left_nipple_y = (ls["y"] + torso_center_y) // 2
                landmarks[38] = {"x": left_nipple_x, "y": left_nipple_y, "name": "Left Nipple"}
                right_nipple_x = (rs["x"] + torso_center_x) // 2
                right_nipple_y = (rs["y"] + torso_center_y) // 2
                landmarks[39] = {"x": right_nipple_x, "y": right_nipple_y, "name": "Right Nipple"}
                if 38 in landmarks and 39 in landmarks:
                    ln = landmarks[38]; rn = landmarks[39]
                    chest_center_x = (ln["x"] + rn["x"]) // 2
                    chest_center_y = (ln["y"] + rn["y"]) // 2
                    landmarks[40] = {"x": chest_center_x, "y": chest_center_y, "name": "Chest Center"}
            if 23 in landmarks and 25 in landmarks:
                lh = landmarks[23]; lk = landmarks[25]
                l_mid_x = (lh["x"] + lk["x"]) // 2
                l_mid_y = (lh["y"] + lk["y"]) // 2
                landmarks[41] = {"x": l_mid_x, "y": l_mid_y, "name": "Left Upper Thigh"}
            if 24 in landmarks and 26 in landmarks:
                rh = landmarks[24]; rk = landmarks[26]
                r_mid_x = (rh["x"] + rk["x"]) // 2
                r_mid_y = (rh["y"] + rk["y"]) // 2
                landmarks[42] = {"x": r_mid_x, "y": r_mid_y, "name": "Right Upper Thigh"}
            if 23 in landmarks and 41 in landmarks:
                lh = landmarks[23]; l_thigh = landmarks[41]
                l_upper2_x = (lh["x"] + l_thigh["x"]) // 2
                l_upper2_y = (lh["y"] + l_thigh["y"]) // 2
                landmarks[43] = {"x": l_upper2_x, "y": l_upper2_y, "name": "Left Upper Thigh 2"}
            if 24 in landmarks and 42 in landmarks:
                rh = landmarks[24]; r_thigh = landmarks[42]
                r_upper2_x = (rh["x"] + r_thigh["x"]) // 2
                r_upper2_y = (rh["y"] + r_thigh["y"]) // 2
                landmarks[44] = {"x": r_upper2_x, "y": r_upper2_y, "name": "Right Upper Thigh 2"}
            if 40 in landmarks and 37 in landmarks:
                chest_center = landmarks[40]; torso_center = landmarks[37]
                ratio = 0.5
                ubc_x = int(chest_center["x"] * ratio + torso_center["x"] * (1 - ratio))
                ubc_y = int(chest_center["y"] * ratio + torso_center["y"] * (1 - ratio))
                landmarks[45] = {"x": ubc_x, "y": ubc_y, "name": "Underbust Center"}
            if 38 in landmarks and 23 in landmarks:
                ln = landmarks[38]; lh = landmarks[23]
                ratio = 0.8
                lu_x = int(ln["x"] * ratio + lh["x"] * (1 - ratio))
                lu_y = int(ln["y"] * ratio + lh["y"] * (1 - ratio))
                landmarks[46] = {"x": lu_x, "y": lu_y, "name": "Left Underbust"}
            if 39 in landmarks and 24 in landmarks:
                rn = landmarks[39]; rh = landmarks[24]
                ratio = 0.8
                ru_x = int(rn["x"] * ratio + rh["x"] * (1 - ratio))
                ru_y = int(rn["y"] * ratio + rh["y"] * (1 - ratio))
                landmarks[47] = {"x": ru_x, "y": ru_y, "name": "Right Underbust"}
            if 36 in landmarks and 37 in landmarks:
                genital = landmarks[36]; torso_center = landmarks[37]
                ratio = 0.5
                ab_x = int(torso_center["x"] * ratio + genital["x"] * (1 - ratio))
                ab_y = int(torso_center["y"] * ratio + genital["y"] * (1 - ratio))
                landmarks[48] = {"x": ab_x, "y": ab_y, "name": "Abdomen Center"}
            if 9 in landmarks and 10 in landmarks and 11 in landmarks and 12 in landmarks:
                ml = landmarks[9]; mr = landmarks[10]
                mouth_mid_x = (ml["x"] + mr["x"]) / 2
                mouth_mid_y = (ml["y"] + mr["y"]) / 2
                ls = landmarks[11]; rs = landmarks[12]
                shoulder_mid_x = (ls["x"] + rs["x"]) / 2
                shoulder_mid_y = (ls["y"] + rs["y"]) / 2
                neck_x = int((mouth_mid_x + shoulder_mid_x) / 2)
                neck_y = int((mouth_mid_y + shoulder_mid_y) / 2)
                landmarks[49] = {"x": neck_x, "y": neck_y, "name": "Neck"}
                print("Computed Neck:", (neck_x, neck_y))
            all_landmarks.append(landmarks)
            all_bboxes.append((x1, y1, x2, y2))
    return all_landmarks, all_bboxes

def is_exposed(landmark, skin_mask, landmarks):
    x, y = landmark["x"], landmark["y"]
    h, w = skin_mask.shape
    if not (0 <= x < w and 0 <= y < h):
        return False
    y_idx, x_idx = np.ogrid[-RADIUS:RADIUS+1, -RADIUS:RADIUS+1]
    msk = x_idx**2 + y_idx**2 <= RADIUS**2
    reg = skin_mask[max(0, y-RADIUS):min(h, y+RADIUS+1),
                    max(0, x-RADIUS):min(w, x+RADIUS+1)]
    valid = msk[:reg.shape[0], :reg.shape[1]]
    skin_cnt = np.sum(reg[valid] == 255)
    tot = np.sum(valid)
    if 15 in landmarks and 16 in landmarks:
        lh = landmarks[15]; rh = landmarks[16]
        dlh = np.sqrt((x - lh["x"])**2 + (y - lh["y"])**2)
        drh = np.sqrt((x - rh["x"])**2 + (y - rh["y"])**2)
        if dlh < RADIUS * 1.5 or drh < RADIUS * 1.5:
            return False
    return (skin_cnt / tot) >= EXPOSURE_THRESHOLD

def create_json_and_visualize(image_path, json_path, masked_output_path):
    seg_map = segment_image(image_path)
    skin_mask = get_skin_mask(image_path, seg_map)
    img = cv2.imread(image_path)
    landmarks_list, bboxes = get_landmarks_multi(img)
    full_output = []
    important_ids = [38, 39, 36, 23, 24, 40, 43, 44, 45, 46, 47, 48, 49]
    for person_idx, (landmarks, bbox) in enumerate(zip(landmarks_list, bboxes)):
        person_data = {"person": person_idx, "bbox": list(bbox), "landmarks": []}
        for idx in important_ids:
            if idx not in landmarks:
                continue
            coord = landmarks[idx]
            exposed = is_exposed(coord, skin_mask, landmarks)
            label = "exposed" if exposed else "covered"
            person_data["landmarks"].append({
                "id": idx,
                "x": int(coord["x"]),
                "y": int(coord["y"]),
                "name": coord["name"],
                "exposure": label
            })
            col = (0, 0, 255) if exposed else (0, 255, 0)
            cv2.circle(img, (int(coord["x"]), int(coord["y"])), RADIUS, col, 2)
            cv2.putText(img, label, (int(coord["x"]) - 10, int(coord["y"]) - RADIUS - 3),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, col, 1, cv2.LINE_AA)
        full_output.append(person_data)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(full_output, f, indent=4)
    cv2.imwrite(masked_output_path, img)
    print(f"✅ Landmark & Exposure JSON 저장: {json_path}")
    print(f"✅ 노출 판단 이미지 저장: {masked_output_path}")

###########################
# 2. 얼굴 & 신체 bbox 비교 관련 함수들
###########################
def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

def compute_bbox(bbox):
    return tuple(bbox)

def compute_face_bbox(bbox):
    return tuple(bbox)

def bbox_contains(bbox_outer, bbox_inner):
    return (bbox_inner[0] >= bbox_outer[0] and
            bbox_inner[1] >= bbox_outer[1] and
            bbox_inner[2] <= bbox_outer[2] and
            bbox_inner[3] <= bbox_outer[3])

# 수정: face_bbox가 단일 튜플이 아니라 리스트일 경우 처리
def visualize_body_bbox(image_path, body_data, face_bbox, output_path):
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not load image {image_path}")
        return
    # 얼굴 bbox들 그리기 (노란색)
    if isinstance(face_bbox, list):
        for fb in face_bbox:
            cv2.rectangle(img, (fb[0], fb[1]), (fb[2], fb[3]), (0, 255, 255), 2)
            cv2.putText(img, "Face BBox", (fb[0], max(0, fb[1]-10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
    else:
        cv2.rectangle(img, (face_bbox[0], face_bbox[1]), (face_bbox[2], face_bbox[3]), (0, 255, 255), 2)
        cv2.putText(img, "Face BBox", (face_bbox[0], max(0, face_bbox[1]-10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
    for person in body_data:
        p_id = person.get("person", 0)
        raw_bbox = person.get("bbox", None)
        lms = person.get("landmarks", [])
        if not raw_bbox:
            continue
        bbox = compute_bbox(raw_bbox)
        x1, y1, x2, y2 = bbox
        cv2.rectangle(img, (x1, y1), (x2, y2), (255, 0, 0), 2)
        cv2.putText(img, f"Person {p_id} BBox", (x1, max(0, y1-10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
        for lm in lms:
            lx, ly = lm["x"], lm["y"]
            cv2.circle(img, (lx, ly), 3, (0, 255, 0), -1)
            cv2.putText(img, lm.get("name", ""), (lx+5, ly-5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
    cv2.imwrite(output_path, img)
    print(f"📸 바운딩 박스 시각화 이미지 저장: {output_path}")

###########################
# 3. 노출 부위 강한 블러 마스킹 관련 함수들
###########################

def repeated_gaussian_blur(img, x1, y1, x2, y2, kernel_size=(151, 151), iterations=5):
    h, w = img.shape[:2]
    x1 = max(0, x1)
    y1 = max(0, y1)
    x2 = min(w, x2)
    y2 = min(h, y2)
    if x1 >= x2 or y1 >= y2:
        return
    roi = img[y1:y2, x1:x2]
    for _ in range(iterations):
        roi = cv2.GaussianBlur(roi, kernel_size, 0)
    img[y1:y2, x1:x2] = roi

def mask_exposed_regions_with_blur(json_path, input_image_path, output_image_path):
    img = cv2.imread(input_image_path)
    if img is None:
        print(f"이미지를 불러올 수 없습니다: {input_image_path}")
        return
    h, w, _ = img.shape
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    persons_landmarks = defaultdict(list)
    for person in data:
        pid = person["person"]
        for lm in person.get("landmarks", []):
            persons_landmarks[pid].append(lm)
    upper_ids = {38, 39, 40, 45, 46, 47, 48}
    lower_ids = {36, 23, 24, 43, 44}
    horizontal_margin = 50
    vertical_margin = 30
    for person_id, lm_list in persons_landmarks.items():
        upper_x_min, upper_y_min = w, h
        upper_x_max, upper_y_max = 0, 0
        lower_x_min, lower_y_min = w, h
        lower_x_max, lower_y_max = 0, 0
        upper_exposed = False
        lower_exposed = False
        for lm in lm_list:
            x, y = lm["x"], lm["y"]
            id_val = lm["id"]
            exp = lm["exposure"].lower()
            if id_val in upper_ids:
                upper_x_min = min(upper_x_min, x)
                upper_y_min = min(upper_y_min, y)
                upper_x_max = max(upper_x_max, x)
                upper_y_max = max(upper_y_max, y)
                if exp == "exposed":
                    upper_exposed = True
            if id_val in lower_ids:
                lower_x_min = min(lower_x_min, x)
                lower_y_min = min(lower_y_min, y)
                lower_x_max = max(lower_x_max, x)
                lower_y_max = max(lower_y_max, y)
                if exp == "exposed":
                    lower_exposed = True
        upper_x_min = max(upper_x_min - horizontal_margin, 0)
        upper_y_min = max(upper_y_min - vertical_margin, 0)
        upper_x_max = min(upper_x_max + horizontal_margin, w)
        upper_y_max = min(upper_y_max + vertical_margin, h)
        lower_x_min = max(lower_x_min - horizontal_margin, 0)
        lower_y_min = max(lower_y_min - vertical_margin, 0)
        lower_x_max = min(lower_x_max + horizontal_margin, w)
        lower_y_max = min(lower_y_max + vertical_margin, h)
        nipple_y = [lm["y"] for lm in lm_list if lm["id"] in {38, 39}]
        if nipple_y:
            new_upper_y_min = max(min(nipple_y) - 80, 0)
            upper_y_min = min(upper_y_min, new_upper_y_min)
        print(f"\n--- Person {person_id} ---")
        print(f"Upper_exposed: {upper_exposed}, Upper_bbox: ({upper_x_min}, {upper_y_min}) ~ ({upper_x_max}, {upper_y_max})")
        print(f"Lower_exposed: {lower_exposed}, Lower_bbox: ({lower_x_min}, {lower_y_min}) ~ ({lower_x_max}, {lower_y_max})")
        if upper_exposed:
            print("상체 영역 블러 처리 적용")
            repeated_gaussian_blur(img, upper_x_min, upper_y_min, upper_x_max, upper_y_max,
                                   kernel_size=(151, 151), iterations=5)
        if lower_exposed:
            print("하체 영역 블러 처리 적용")
            repeated_gaussian_blur(img, lower_x_min, lower_y_min, lower_x_max, lower_y_max,
                                   kernel_size=(151, 151), iterations=5)
    cv2.imwrite(output_image_path, img)
    print(f"\n✅ 최종 블러(마스킹) 이미지 저장: {output_image_path}")

###########################
# 4. 파이프라인 통합 및 자동 경로 생성 함수
###########################

def pipeline(face_json_path, image_path, json_output_path, masked_output_path,
             bbox_output_path, blur_output_path, matched_face_bbox=None):
    print("\n🔄 [Step 1] 신체 랜드마크 및 노출 판별 실행...")
    create_json_and_visualize(image_path, json_output_path, masked_output_path)
    face_data = load_json(face_json_path)
    body_data = load_json(json_output_path)

    if matched_face_bbox:
        face_bboxes = [matched_face_bbox]
    else:
        face_bboxes = [tuple(face["bbox"]) for face in face_data if "bbox" in face]

    if not face_bboxes:
        print("❌ 얼굴 bbox 정보 없음")
        return None, None, None, "", "", ""

    matched_person_idx = None
    for person in body_data:
        person_bbox = tuple(person.get("bbox"))
        for fb in face_bboxes:
            if bbox_contains(person_bbox, fb):
                matched_person_idx = person["person"]
                break
        if matched_person_idx is not None:
            break

    if matched_person_idx is not None:
        print("✅ 동일 인물 판단 → 강한 블러 적용")
        target_person_data = [p for p in body_data if p["person"] == matched_person_idx]
        visualize_body_bbox(image_path, target_person_data, face_bboxes, bbox_output_path)
        temp_json_path = os.path.join(os.path.dirname(image_path), "_temp_target_landmark.json")
        save_json(temp_json_path, target_person_data)
        mask_exposed_regions_with_blur(temp_json_path, image_path, blur_output_path)
        final_img_path = blur_output_path
        exposed_parts = {
            lm["name"]
            for person in target_person_data
            for lm in person.get("landmarks", [])
            if lm.get("exposure") == "exposed"
        }
    else:
        print("❌ 동일 인물 아님 → 마스킹 미진행")
        visualize_body_bbox(image_path, body_data, face_bboxes, bbox_output_path)
        final_img_path = masked_output_path
        exposed_parts = set()

    bbox_msg = "동일 인물입니다." if matched_person_idx is not None else "동일 인물이 아닙니다."
    exposure_msg = "노출 되었습니다.\n노출 부위: " + ", ".join(sorted(exposed_parts)) if exposed_parts else "노출되지 않았습니다."
    final_msg = "마스킹 완료" if matched_person_idx is not None else "마스킹 미진행"

    return bbox_output_path, masked_output_path, final_img_path, bbox_msg, exposure_msg, final_msg


def run_pipeline(image_path, matched_face_bbox=None):
    directory = os.path.dirname(image_path)
    base_name = os.path.splitext(os.path.basename(image_path))[0]

    face_json_path = os.path.join(directory, base_name + "_multi_embedding.json")
    json_output_path = os.path.join(directory, base_name + "_landmark.json")
    masked_output_path = os.path.join(directory, "masked_" + os.path.basename(image_path))
    bbox_output_path = os.path.join(directory, base_name + "_bbox.jpg")
    blur_output_path = os.path.join(directory, base_name + "_masked.jpg")

    return pipeline(face_json_path, image_path, json_output_path, masked_output_path,
                    bbox_output_path, blur_output_path, matched_face_bbox=matched_face_bbox)
