# main.py
import os
import uuid
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Form
from fastapi.responses import FileResponse, JSONResponse
from video_processing import extract_frames, save_video
from face_detection import detect_faces
from pydantic import BaseModel
from pydantic import BaseModel
from typing import List
from embedding_extractor import extract_faces_and_embeddings
import numpy as np
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
    title: str = "processed_video.mp4"
):
    # 🔹 로컬에서 저장할 폴더 경로 설정
    temp_input_path = os.path.join(LOCAL_VIDEO_DIR, f"input_{uuid.uuid4().hex}.mp4")
    temp_output_path = os.path.join(LOCAL_VIDEO_DIR, title)

    try:
        # 🔹 업로드된 파일을 저장
        with open(temp_input_path, "wb") as buffer:
            while chunk := file.file.read(1024 * 1024):  # 1MB 단위로 읽기
                buffer.write(chunk)

        # 🔹 프레임 추출
        frames, fps, frame_size = extract_frames(temp_input_path)

        if frames is None:
            return JSONResponse({"error": "🚨 비디오 처리 실패"}, status_code=400)


        # ✅ 얼굴 감지 최적화 (모델을 매번 로드하지 않고 사용)
        def detect_faces_optimized(frame):
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)

            for (x, y, w, h) in faces:
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

            return frame


        # 🔹 얼굴 인식 추가: 각 프레임에서 얼굴을 감지하고 박스를 그리기
        processed_frames = [detect_faces_optimized(frame) for frame in frames]

        # 🔹 처리된 비디오 저장
        success = save_video(processed_frames, temp_output_path, fps, frame_size)

        if not success:
            return JSONResponse({"error": "🚨 비디오 저장 실패"}, status_code=500)

        # 🔹 처리된 비디오와 원본 비디오를 비동기 삭제
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
