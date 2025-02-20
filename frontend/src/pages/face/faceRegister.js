import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../components/context/UserContext";
import "../../styles/faceRegister.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

const FaceRegister = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState("");
    const { token, logout } = useUser();
    const navigate = useNavigate();
    const location = useLocation();

    // ✅ MyPage에서 실행된 경우 확인
    const isFromMyPage = location.state?.fromMyPage || false;

    // ✅ 웹캠 관련 상태 및 참조값
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [captureCount, setCaptureCount] = useState(0);

    const CAPTURE_COUNT = 8;  // 8장 촬영
    const CAPTURE_INTERVAL = 500; // 0.5초 간격


        // ✅ 파일 업로드 핸들러 (기존 기능 유지)
    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            alert("사진 파일을 선택해주세요!");
            return;
        }

        const formData = new FormData();
        formData.append("face_image", selectedFile);

        try {
            const response = await fetch(`${API_BASE_URL}/face-register/photo/`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("✅ 얼굴 등록이 완료되었습니다!");
                if (isFromMyPage) {
                    navigate("/mypage");
                } else {
                    navigate("/maskingselection");
                }
            } else {
                setMessage(data.message || "⚠ 얼굴 등록에 실패했습니다.");
            }
        } catch (error) {
            console.error("API 호출 오류:", error);
            setMessage("⚠ 서버와 연결할 수 없습니다. 다시 시도해주세요.");
        }
    };

    // ✅ 웹캠 켜기 (모바일 대응)
    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRef.current.srcObject = stream;
            setIsCameraOn(true);

            // ✅ 모바일에서도 자동 재생되도록 play() 실행
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.play().catch(error => console.error("자동 재생 실패:", error));
                }
            }, 500); // 일부 기기에서 play() 호출이 지연될 수 있어 setTimeout 사용
        } catch (error) {
            console.error("웹캠 접근 오류:", error);
            setMessage("웹캠을 사용할 수 없습니다. 브라우저 설정을 확인하세요.");
        }
    };

    // ✅ 웹캠 끄기
    const stopWebcam = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            let tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraOn(false);
    };

    // ✅ 0.5초 간격으로 8장 촬영 후 서버로 전송
    const captureMultipleImages = async () => {
        if (!videoRef.current || !videoRef.current.srcObject) {
            alert("웹캠을 먼저 켜주세요!");
            return;
        }

        setIsCapturing(true);
        setCaptureCount(0);
        setMessage("📸 얼굴 이미지를 촬영 중...");

        let images = [];

        for (let i = 0; i < CAPTURE_COUNT; i++) {
            await new Promise((resolve) => setTimeout(resolve, CAPTURE_INTERVAL));

            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");
            context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            images.push(new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    setCaptureCount(prevCount => prevCount + 1);
                    resolve(blob);
                }, "image/jpeg");
            }));
        }

        const capturedBlobs = await Promise.all(images);
        sendImagesToServer(capturedBlobs);
    };

    // ✅ 서버로 촬영한 이미지 전송
    const sendImagesToServer = async (images) => {
        const formData = new FormData();

        images.forEach((image, index) => {
            formData.append("face_images", image, `face_${index}.jpg`);
        });

        try {
            const response = await fetch(`${API_BASE_URL}/face-register/realtime/`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData,
            });

            const data = await response.json();
            setIsCapturing(false);

            if (response.ok) {
                setMessage("✅ 실시간 얼굴 등록이 완료되었습니다!");

                // ✅ MyPage에서 실행된 경우 → 다시 MyPage로 이동
                if (isFromMyPage) {
                    navigate("/mypage");
                } 
                // ✅ 회원가입 후 최초 등록인 경우 → 마스킹 설정 페이지로 이동
                else {
                    navigate("/maskingselection");
                }
            } else {
                setMessage(data.message || "⚠ 실시간 등록에 실패했습니다.");
            }
        } catch (error) {
            console.error("API 호출 오류:", error);
            setMessage("⚠ 서버와 연결할 수 없습니다. 다시 시도해주세요.");
            setIsCapturing(false);
        }
    };



    return (
        <div className="face-register-container">
            <h1>얼굴 등록</h1>

            <div className="register-section">
                <h2>사진으로 등록하기</h2>
                <div className="file-upload">
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                    <button onClick={handleFileUpload} className="button">
                        사진 업로드
                    </button>
                </div>
            </div>

            <div className="register-section">
                <h2>실시간 등록</h2>
                <div className="webcam-container">
                    <video ref={videoRef} autoPlay width="400" height="300" style={{ display: isCameraOn ? "block" : "none" }} />
                    <canvas ref={canvasRef} width="400" height="300" style={{ display: "none" }} />
                </div>
                <div className="button-group">
                    <button onClick={isCameraOn ? stopWebcam : startWebcam} disabled={isCapturing}>
                        {isCameraOn ? "웹캠 끄기" : "웹캠 켜기"}
                    </button>
                    <button onClick={captureMultipleImages} disabled={!isCameraOn || isCapturing}>
                        {isCapturing ? `📸 촬영 중... (${captureCount}/${CAPTURE_COUNT})` : "실시간 얼굴 등록 시작"}
                    </button>
                </div>
            </div>

            <div className="button-group">
                <button onClick={() => navigate("/dashboard")} className="button dashboard-button">
                    대시보드로 이동
                </button>
            </div>

            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default FaceRegister;
