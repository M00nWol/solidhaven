import React, { useState } from "react";
import { useUser } from "../../components/context/UserContext"; // ✅ 로그인된 사용자 정보 사용
import "../../styles/faceVerify.css";

const API_BASE_URL = process.env.REACT_APP_API_URL; // ✅ 환경 변수 통일


const FaceVerify = () => {
    const { userInfo, token } = useUser(); // ✅ 사용자 정보 및 토큰 가져오기
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState("");
    const [previewUrl, setPreviewUrl] = useState(""); // ✅ 미리보기용 URL


    // 파일 선택 핸들러
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
    
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else {
            setPreviewUrl("");
        }
    };

    // 얼굴 인증 요청
    const handleFaceVerify = async () => {
        if (!selectedFile) {
            alert("⚠️ 사진을 선택해주세요.");
            return;
        }

        if (!token) {
            alert("⚠️ 로그인이 필요합니다.");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("user_id", userInfo?.id); // ✅ 로그인된 사용자 ID 자동 입력

        try {
            const response = await fetch(`${API_BASE_URL}/detection/check-similarity/`, {
                method: "POST",
                headers: {
                    "Authorization": `Token ${token}`, // ✅ 인증 토큰 포함
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`✅ 결과: ${data.message} (유사도: ${data.similarity.toFixed(3)})`);
            } else {
                setMessage(`❌ 오류: ${data.message || data.error}`);
            }
        } catch (error) {
            console.error("API 호출 오류:", error);
            setMessage("❌ 서버와 연결할 수 없습니다.");
        }
    };

    return (
        <div className="face-verify-container">
            <h1>얼굴 인증</h1>
            <p>현재 로그인된 사용자: <strong>{userInfo?.name || "알 수 없음"}</strong></p>

            <input type="file" accept="image/*" onChange={handleFileChange} />

            {/* ✅ 이미지 미리보기 */}
            {previewUrl && (
                <div className="image-preview" style={{ marginTop: "16px" }}>
                    <img
                        src={previewUrl}
                        alt="선택한 이미지"
                        width="400"
                        style={{
                            borderRadius: "8px",
                            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                        }}
                    />
                </div>
            )}

            <button onClick={handleFaceVerify} className="face-verify-button">
                얼굴 인증
            </button>

            {message && <p className="result-message">{message}</p>}
        </div>
        
    );
};

export default FaceVerify;
