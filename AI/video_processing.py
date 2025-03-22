# video_processing.py
import cv2
import subprocess
import os

def extract_frames(video_path):
    """비디오에서 프레임을 추출하는 함수"""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None, None, None

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_size = (int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))

    frames = []
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(frame)

    cap.release()
    return frames, fps, frame_size


def save_video(frames, output_path, fps, frame_size):
    """OpenCV로 비디오 저장 후 FFmpeg을 사용해 변환"""
    temp_output_path = output_path.replace(".mp4", "_temp.mp4")  # 임시 저장 파일

    # ✅ OpenCV로 임시 MP4 저장
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(temp_output_path, fourcc, fps, frame_size)

    if not out.isOpened():
        return False

    for frame in frames:
        out.write(frame)

    out.release()

    # ✅ FFmpeg으로 변환 (H.264 + AAC)
    try:
        ffmpeg_command = [
            "ffmpeg", "-y",  # 기존 파일 덮어쓰기
            "-i", temp_output_path,  # 입력 파일
            "-vcodec", "libx264",  # H.264 변환
            "-acodec", "aac",  # AAC 오디오 코덱 사용
            "-strict", "-2",  # AAC 코덱 호환성 설정
            output_path  # 최종 출력 파일
        ]
        subprocess.run(ffmpeg_command, check=True)

        # ✅ 변환 후 임시 파일 삭제
        os.remove(temp_output_path)
        return True
    except subprocess.CalledProcessError as e:
        print(f"🚨 FFmpeg 변환 실패: {e}")
        return False
