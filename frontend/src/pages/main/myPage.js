import React, { useEffect, useState } from "react";
import "../../styles/myPage.css";
import { useUser } from "../../components/context/UserContext";
import { useNavigate } from "react-router-dom";
import FamilyLoginModal from "../account/familyLoginModal";
import FamilyRegisterModal from "../account/familyRegisterModal";

const API_BASE_URL = process.env.REACT_APP_API_URL;

const MyPage = () => {
    const { token, logout } = useUser();
    const [userName, setUserName] = useState("");
    const [email, setEmail] = useState("");
    const [familyList, setFamilyList] = useState([]); // 전체 가족 목록
    const [currentFamilyCode, setCurrentFamilyCode] = useState(null); // 현재 로그인된 가족 코드
    const [isFaceRegistered, setIsFaceRegistered] = useState(false);
    const [faceMasking, setFaceMasking] = useState(false);
    const [bodyMasking, setBodyMasking] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [showFamilyLogin, setShowFamilyLogin] = useState(false);
    const [showFamilyRegister, setShowFamilyRegister] = useState(false);

    const navigate = useNavigate();

    // ✅ 사용자 정보 가져오기
    const fetchUserInfo = async () => {
        if (!token) {
            setErrorMessage("로그인이 필요합니다.");
            navigate("/userlogin");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/me`, {
                method: "GET",
                credentials: "include",  // ✅ Django 세션 쿠키 포함
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Token ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok) {
                setUserName(data.name || "[정보 없음]");
                setEmail(data.email || "[정보 없음]");
                setIsFaceRegistered(data.face_registered ?? false);
                setFaceMasking(data.face_masking ?? false);
                setBodyMasking(data.body_masking ?? false);

                // ✅ 현재 로그인된 가족 코드 업데이트
                setCurrentFamilyCode(data.current_family_code || null);

                // ✅ 전체 가족 리스트 업데이트
                if (data.families && Array.isArray(data.families)) {
                    setFamilyList(data.families.map(fam => ({
                        name: fam.name,
                        code: fam.family_code
                    })));
                } else {
                    setFamilyList([]);
                }
            } else if (response.status === 401) {
                alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
                logout();
                navigate("/userlogin");
            } else {
                setErrorMessage(data.message || "정보를 불러오지 못했습니다.");
            }
        } catch (error) {
            console.error("API 호출 오류:", error);
            setErrorMessage("서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
        }
    };

    // ✅ useEffect: 로그인 & 가족 코드 변경 시 자동 업데이트
    useEffect(() => {
        if (token) {
            fetchUserInfo();
        }
    }, [token, currentFamilyCode]);

    // ✅ 가족 로그인 성공 후 사용자 정보 갱신
    const handleFamilyLoginSuccess = () => {
        fetchUserInfo();  // 로그인 후 사용자 정보 다시 가져오기
        setShowFamilyLogin(false);
    };

    // ✅ 마스킹 설정 업데이트 함수
    const updateMaskingSettings = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/masking-settings/`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Token ${token}`,
                },
                body: JSON.stringify({
                    face_masking: faceMasking,
                    body_masking: bodyMasking,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage("✅ 마스킹 설정이 업데이트 되었습니다.");
                setFaceMasking(data.user?.face_masking ?? faceMasking);
                setBodyMasking(data.user?.body_masking ?? bodyMasking);
            } else {
                setErrorMessage(data.message || "⚠ 마스킹 설정 변경에 실패했습니다.");
            }
        } catch (error) {
            console.error("API 호출 오류:", error);
            setErrorMessage("⚠ 서버와 연결할 수 없습니다. 다시 시도해주세요.");
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
            {successMessage && <p className="success-message">{successMessage}</p>}

            <div className="user-info">
                <p><strong>사용자 이름:</strong> {userName}</p>
                <p><strong>이메일:</strong> {email}</p>

                {/* ✅ 현재 로그인된 가족 표시 */}
                <p><strong>현재 로그인된 가족:</strong> {currentFamilyCode ? (
                    <span className="highlighted-family">{currentFamilyCode}</span>
                ) : "가족 로그인 필요"}</p>

                {/* ✅ 전체 가족 목록 */}
                <p><strong>전체 가족 목록:</strong></p>
                <div className="family-list">
                    {familyList.length > 0 ? (
                        familyList.map((fam, index) => (
                            <div 
                                key={index} 
                                className={`family-card ${fam.code === currentFamilyCode ? "current" : ""}`}
                            >
                                <p><strong>{fam.name}</strong></p>
                                <p>{fam.code}</p>
                            </div>
                        ))
                    ) : (
                        <p>등록된 가족이 없습니다.</p>
                    )}
                </div>

                {/* ✅ 가족 관리 버튼 */}
                <div className="family-action-buttons-inline">
                    {currentFamilyCode ? (
                        <button className="button" onClick={() => setShowFamilyLogin(true)}>가족 변경</button>
                    ) : (
                        <>
                            <button className="button" onClick={() => setShowFamilyLogin(true)}>가족 로그인</button>
                            <button className="button" onClick={() => setShowFamilyRegister(true)}>가족 회원가입</button>
                        </>
                    )}
                </div>

                {/* ✅ 얼굴 등록 여부 */}
                <p><strong>얼굴 등록 여부:</strong> {isFaceRegistered ? "등록 완료" : "등록되지 않음"}</p>
                <button className="button" onClick={handleFaceRegister}>얼굴 재등록</button>

                {/* ✅ 마스킹 설정 */}
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

                <button className="button" onClick={updateMaskingSettings}>마스킹 설정 변경 저장</button>
            </div>

            {/* ✅ 가족 로그인 모달 */}
            {showFamilyLogin && <FamilyLoginModal onClose={() => setShowFamilyLogin(false)} onSuccess={handleFamilyLoginSuccess} />}
            {showFamilyRegister && <FamilyRegisterModal onClose={() => setShowFamilyRegister(false)} />}
        </div>
    );
};

export default MyPage;
