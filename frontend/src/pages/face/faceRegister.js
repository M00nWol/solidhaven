import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../components/context/UserContext";
import "../../styles/faceRegister.css";

const API_BASE_URL = process.env.API_BASE_URL;

const FaceRegister = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState("");
    const { token, logout } = useUser();
    const navigate = useNavigate();
    const location = useLocation();

    // ✅ MyPage에서 실행된 경우를 확인
    const isFromMyPage = location.state?.fromMyPage || false;

    // 파일 선택 핸들러
    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    // 얼굴 사진 업로드 요청
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
                setMessage("얼굴 등록이 완료되었습니다!");

                // ✅ MyPage에서 온 경우 → 다시 MyPage로 이동
                if (isFromMyPage) {
                    navigate("/mypage");
                } 
                // ✅ 회원가입 후 최초 등록인 경우 → 마스킹 설정 페이지로 이동
                else {
                    navigate("/maskingselection");
                }
            } else {
                if (response.status === 400) {
                    setMessage("이미지가 누락되었습니다.");
                } else if (response.status === 401) {
                    alert("세션이 만료되었습니다. 다시 로그인해주세요.");
                    logout();
                    navigate("/userlogin");
                } else {
                    setMessage(data.message || "얼굴 등록에 실패했습니다.");
                }
            }
        } catch (error) {
            console.error("API 호출 오류:", error);
            setMessage("서버와 연결할 수 없습니다. 다시 시도해주세요.");
        }
    };

    // 실시간 얼굴 등록 요청
    const handleRealtimeRegister = async () => {
        const formData = new FormData();
        formData.append("face_video", "realtime_video_data");

        try {
            const response = await fetch(`${API_BASE_URL}/face-register/realtime/`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("실시간 얼굴 등록이 완료되었습니다!");

                // ✅ MyPage에서 실행된 경우 → 다시 MyPage로 이동
                if (isFromMyPage) {
                    navigate("/mypage");
                } 
                // ✅ 회원가입 후 최초 등록인 경우 → 마스킹 설정 페이지로 이동
                else {
                    navigate("/maskingselection");
                }
            } else {
                if (response.status === 400) {
                    setMessage("실시간 영상 데이터가 누락되었습니다.");
                } else if (response.status === 401) {
                    alert("세션이 만료되었습니다. 다시 로그인해주세요.");
                    logout();
                    navigate("/userlogin");
                } else {
                    setMessage(data.message || "실시간 등록에 실패했습니다.");
                }
            }
        } catch (error) {
            console.error("API 호출 오류:", error);
            setMessage("서버와 연결할 수 없습니다. 다시 시도해주세요.");
        }
    };

    // ✅ 대시보드로 이동 버튼 핸들러
    const handleGoToDashboard = () => {
        navigate("/dashboard");
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
                <button onClick={handleRealtimeRegister} className="button">
                    실시간 얼굴 등록 시작
                </button>
            </div>

            <div className="button-group">
                {/* ✅ 대시보드로 이동하는 버튼 추가 */}
                <button onClick={handleGoToDashboard} className="button dashboard-button">
                    대시보드로 이동
                </button>
            </div>

            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default FaceRegister;
