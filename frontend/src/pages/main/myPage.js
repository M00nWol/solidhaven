import React, { useEffect, useState } from "react";
import "../../styles/myPage.css";
import { useUser } from "../../components/context/UserContext";
import { useNavigate } from "react-router-dom";
import FamilyLoginModal from "../account/familyLoginModal";
import FamilyRegisterModal from "../account/familyRegisterModal";

const API_BASE_URL = process.env.API_BASE_URL;

const MyPage = () => {
    const { userId, token, logout } = useUser();
    const [userName, setUserName] = useState("");
    const [email, setEmail] = useState("");
    const [familyCode, setFamilyCode] = useState("");
    const [isFaceRegistered, setIsFaceRegistered] = useState(false);
    const [faceMasking, setFaceMasking] = useState(false);
    const [bodyMasking, setBodyMasking] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showFamilyLogin, setShowFamilyLogin] = useState(false);
    const [showFamilyRegister, setShowFamilyRegister] = useState(false);

    const navigate = useNavigate();

    // ✅ 사용자 정보 가져오기
    useEffect(() => {
        const fetchUserInfo = async () => {
            if (!userId || !token) {
                setErrorMessage("로그인이 필요합니다.");
                navigate("/userlogin");
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/user/${userId}/`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                });

                const data = await response.json();

                if (response.ok) {
                    setUserName(data.data.username || "[정보 없음]");
                    setEmail(data.data.email || "[정보 없음]");
                    setFamilyCode(data.data.family_code || "등록된 가족이 없습니다");
                    setIsFaceRegistered(data.data.face_registered || false);
                    setFaceMasking(data.data.face_masking || false);
                    setBodyMasking(data.data.body_masking || false);
                    setErrorMessage("");
                } else if (response.status === 401) {
                    alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
                    logout();
                    navigate("/userlogin");
                } else if (response.status === 404) {
                    setErrorMessage("사용자 정보를 찾을 수 없습니다.");
                } else {
                    setErrorMessage(data.message || "정보를 불러오지 못했습니다.");
                }
            } catch (error) {
                console.error("API 호출 오류:", error);
                setErrorMessage("서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
            }
        };

        if (userId && token) {
            fetchUserInfo();
        }
    }, [userId, token, navigate, logout]);

    // ✅ 마스킹 설정 업데이트 함수
    const updateMaskingSettings = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/user/${userId}/masking/`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    face_masking: faceMasking,
                    body_masking: bodyMasking,
                }),
            });

            if (response.ok) {
                alert("마스킹 설정이 성공적으로 변경되었습니다.");
            } else {
                alert("마스킹 설정 변경에 실패했습니다.");
            }
        } catch (error) {
            console.error("API 호출 오류:", error);
            alert("서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
        }
    };

    // ✅ 얼굴 등록 페이지로 이동
    const handleFaceRegister = () => {
        navigate("/faceregister", { state: { fromMyPage: true } });
    };

    return (
        <div className="my-page-container">
            <h1>마이 페이지</h1>
            {errorMessage && <p className="error-message">{errorMessage}</p>}

            <div className="user-info">
                <p><strong>사용자 이름:</strong> {userName}</p>
                <p><strong>이메일:</strong> {email}</p>
                <p><strong>가족 코드:</strong> {familyCode}</p>

                {/* 가족 로그인 / 가입 버튼 */}
                <div className="family-action-buttons-inline">
                    <button className="button" onClick={() => setShowFamilyLogin(true)}>가족 로그인</button>
                    <button className="button" onClick={() => setShowFamilyRegister(true)}>가족 회원가입</button>
                </div>

                {/* 얼굴 등록 여부 */}
                <p><strong>얼굴 등록 여부:</strong> {isFaceRegistered ? "등록 완료" : "등록되지 않음"}</p>
                <button className="button" onClick={handleFaceRegister}>
                    얼굴 재등록
                </button>

                {/* 마스킹 적용 여부 & 토글 스위치 */}
                <p><strong>마스킹 적용 여부:</strong></p>
                <div className="masking-options">
                    <label className="toggle-switch">
                        얼굴 마스킹 적용
                        <input type="checkbox" checked={faceMasking} onChange={() => setFaceMasking(!faceMasking)} />
                        <span className="slider"></span>
                    </label>

                    <label className="toggle-switch">
                        신체 마스킹 적용
                        <input type="checkbox" checked={bodyMasking} onChange={() => setBodyMasking(!bodyMasking)} />
                        <span className="slider"></span>
                    </label>
                </div>

                <button className="button" onClick={updateMaskingSettings}>
                    마스킹 설정 변경 저장
                </button>
            </div>

            <p className="info-message">가족이 등록되지 않았다면 가족 회원가입을 진행해주세요.</p>

            {showFamilyLogin && <FamilyLoginModal onClose={() => setShowFamilyLogin(false)} />}
            {showFamilyRegister && <FamilyRegisterModal onClose={() => setShowFamilyRegister(false)} />}
        </div>
    );
};

export default MyPage;
