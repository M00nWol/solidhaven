# main.py
import os
import uuid
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Form
from fastapi.responses import FileResponse, JSONResponse
from video_processing import extract_frames, save_video
from pydantic import BaseModel
from pydantic import BaseModel
from typing import List
from embedding_extractor import *
import cv2
import json

app = FastAPI()

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# 🔹 로컬 테스트용 저장 폴더 설정
LOCAL_VIDEO_DIR = "videos"
os.makedirs(LOCAL_VIDEO_DIR, exist_ok=True)  # 폴더 없으면 생성

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EMBEDDING_DIR = os.path.join(BASE_DIR, "embeddings")
os.makedirs(EMBEDDING_DIR, exist_ok=True)

MAX_CAPTURE = 8  # 최대 사진 수 (5장)

class RegisterFaceRequest(BaseModel):
    user_id: str
    # 파일은 List[UploadFile] 형식으로 받기
    face_images: List[UploadFile]

def delete_file(file_path: str):
    """파일을 안전하게 삭제하는 함수"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"🗑️ 삭제 완료: {file_path}")
    except Exception as e:
        print(f"🚨 파일 삭제 실패: {file_path} | {str(e)}")

@app.post("/process_video/")
async def process_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    family_embeddings: str = Form(...),
    user_id: str = Form(...),
    # mask_type: str = Form("black")
):
    
    title = f"{user_id}_masked.mp4"

    # 🔹 로컬에서 저장할 폴더 경로 설정
    temp_input_path = os.path.join(LOCAL_VIDEO_DIR, f"input_{uuid.uuid4().hex}.mp4")
    temp_output_path = os.path.join(LOCAL_VIDEO_DIR,  title)

    try:
        # 🔹 업로드된 파일을 저장
        print("📥 [1] 영상 파일 저장 중...")
        with open(temp_input_path, "wb") as buffer:
            while chunk := file.file.read(1024 * 1024):  # 1MB 단위로 읽기
                buffer.write(chunk)

        # 🔹 프레임 추출
        print("🎞️ [2] 프레임 추출 중...")
        frames, fps, frame_size = extract_frames(temp_input_path)
        if frames is None:
            return JSONResponse({"error": "🚨 비디오 처리 실패"}, status_code=400)
        print(f"✅ 총 {len(frames)}개 프레임 추출 완료 (FPS: {fps}, Size: {frame_size})")


        print("📄 [3] 사용자 임베딩 로드 중...")
        family_embeddings = json.loads(family_embeddings)
        normalized_embeddings = {
            user_id: np.array(vec) / np.linalg.norm(vec)
            for user_id, vec in family_embeddings.items()
        }


        print("🧠 [4] 프레임별 마스킹 처리 시작...")
        processed_frames = []
        for idx, frame in enumerate(frames):
            print(f"프레임 {idx + 1}/{len(frames)} 처리 중...")
            masked_frame = mask_matching_face(
                frame,
                normalized_embeddings,
                # mask_type="black"
            )
            processed_frames.append(masked_frame)
        print("✅ 모든 프레임 마스킹 완료")

        # 🔹 처리된 비디오 저장
        print("💾 [5] 비디오 저장 중...")
        success = save_video(processed_frames, temp_output_path, fps, frame_size)
        if not success:
            return JSONResponse({"error": "🚨 비디오 저장 실패"}, status_code=500)

        background_tasks.add_task(delete_file, temp_input_path)
        background_tasks.add_task(delete_file, temp_output_path)

        return FileResponse(temp_output_path, media_type="video/mp4", filename=title)

    except Exception as e:
        return JSONResponse({"error": f"🚨 서버 내부 오류: {str(e)}"}, status_code=500)


@app.post("/register_face/")
async def register_face(
    user_id: str = Form(...),  # user_id는 Form으로 받기
    face_images: List[UploadFile] = File(...),  # 여러 파일을 받는 필드
):
    """새로운 얼굴 등록 경로 (임베딩만 반환)"""
    try:
        embeddings_list = []
        
        for image_file in face_images:
            image_bytes = await image_file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            avg_embedding = extract_faces_and_embeddings(image)

            if avg_embedding is None:
                return JSONResponse({"error": "🚨 얼굴 임베딩 추출 실패"}, status_code=400)


        return JSONResponse({
            "message": "✅ 얼굴 등록 완료!",
            "embedding": avg_embedding
        }, status_code=200)

    except Exception as e:
        return JSONResponse({"error": f"🚨 서버 내부 오류: {str(e)}"}, status_code=500)


@app.post("/check_similarity/")
async def check_similarity(
    file: UploadFile = File(...),
    embedding: str = Form(...),
):
    try:
        # 🔹 업로드된 이미지 읽기
        contents = await file.read()
        np_arr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # 🔹 업로드된 임베딩 파싱 및 정규화
        target_embedding = np.array(json.loads(embedding))
        target_embedding = target_embedding / np.linalg.norm(target_embedding)

        # 🔹 얼굴 인식 및 임베딩 추출 (평균)
        extracted_embedding = extract_faces_and_embeddings(image)
        if extracted_embedding is None:
            return JSONResponse({"error": "얼굴을 감지하지 못했습니다."}, status_code=400)

        extracted_embedding = np.array(extracted_embedding)
        extracted_embedding = extracted_embedding / np.linalg.norm(extracted_embedding)

        # 🔹 유사도 계산 (코사인 유사도)
        similarity = float(np.dot(extracted_embedding, target_embedding))
        print(f"🔍 유사도 계산됨: {similarity:.4f}")

        return {"similarity": similarity}

    except Exception as e:
        return JSONResponse({"error": f"🚨 서버 오류: {str(e)}"}, status_code=500)