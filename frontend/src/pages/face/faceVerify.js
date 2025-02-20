import React, { useState } from "react";
import { useUser } from "../../components/context/UserContext"; // ✅ 로그인된 사용자 정보 사용
import "../../styles/faceVerify.css";

const API_BASE_URL = process.env.REACT_APP_API_URL; // ✅ 환경 변수 통일

const FaceVerify = () => {
    const { userInfo, token } = useUser(); // ✅ 사용자 정보 및 토큰 가져오기
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState("");

    // 파일 선택 핸들러
    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
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
        formData.append("face_image", selectedFile);
        formData.append("user_id", userInfo?.id); // ✅ 로그인된 사용자 ID 자동 입력

        try {
            const response = await fetch(`${API_BASE_URL}/face-verify/`, {
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
                setMessage(`❌ 오류: ${data.message}`);
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
            <button onClick={handleFaceVerify} className="face-verify-button">얼굴 인증</button>
            {message && <p className="result-message">{message}</p>}
        </div>
    );
};

export default FaceVerify;
