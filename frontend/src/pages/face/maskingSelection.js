import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../components/context/UserContext"; // Context 사용
import "../../styles/maskingSelection.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

const MaskingSelection = () => {
    const [faceMasking, setFaceMasking] = useState(false);
    const [bodyMasking, setBodyMasking] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    
    const { token } = useUser();
    const navigate = useNavigate();

    // ✅ 마스킹 설정 저장 요청
    const handleSaveSelection = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/masking-settings/`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Token ${token}`, // ✅ 인증 방식 통일
                },
                body: JSON.stringify({
                    face_masking: faceMasking,
                    body_masking: bodyMasking,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage("✅ 마스킹 설정이 성공적으로 저장되었습니다.");
                setTimeout(() => navigate("/dashboard"), 1000); // ✅ 설정 완료 후 대시보드 이동
            } else {
                setErrorMessage(data.message || "⚠ 마스킹 설정 저장에 실패했습니다.");
            }
        } catch (error) {
            console.error("API 호출 오류:", error);
            setErrorMessage("⚠ 서버와 연결할 수 없습니다. 다시 시도해주세요.");
        }
    };

    return (
        <div className="masking-selection-container">
            <h1>마스킹 여부 설정</h1>

            
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {successMessage && <p className="success-message">{successMessage}</p>}


            <div className="selection-group">
                <h2>얼굴 마스킹</h2>
                <div className="button-group">
                    <button
                        className={faceMasking ? "selected" : ""}
                        onClick={() => setFaceMasking(true)}
                    >
                        마스킹 적용
                    </button>
                    <button
                        className={!faceMasking ? "selected" : ""}
                        onClick={() => setFaceMasking(false)}
                    >
                        마스킹 미적용
                    </button>
                </div>
            </div>

            <div className="selection-group">
                <h2>신체 마스킹</h2>
                <div className="button-group">
                    <button
                        className={bodyMasking ? "selected" : ""}
                        onClick={() => setBodyMasking(true)}
                    >
                        마스킹 적용
                    </button>
                    <button
                        className={!bodyMasking ? "selected" : ""}
                        onClick={() => setBodyMasking(false)}
                    >
                        마스킹 미적용
                    </button>
                </div>
            </div>

            <button className="save-button" onClick={handleSaveSelection}>저장</button>
        </div>
    );
};

export default MaskingSelection;
