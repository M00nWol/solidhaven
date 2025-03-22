# 1. Python 3.9 이미지를 기반으로 사용
FROM python:3.9

# 2. 작업 디렉토리 설정
WORKDIR /app

# 3. 필수 시스템 라이브러리 및 FFmpeg 설치
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 4. Python 의존성 파일을 복사
COPY requirements.txt .

# 5. 일반 패키지 설치 (기본 PyPI 사용)
RUN pip install --no-cache-dir -r requirements.txt

# 6. PyTorch만 CPU 버전 강제 설치
RUN pip install --no-cache-dir torch==2.6.0+cpu torchvision==0.21.0+cpu --index-url https://download.pytorch.org/whl/cpu

# 7. 애플리케이션 소스 복사
COPY . .

# 8. FastAPI 실행 (포트 8080에서 실행)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
