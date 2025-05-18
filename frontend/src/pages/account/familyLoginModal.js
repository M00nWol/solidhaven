import React, { useState } from "react";
import { useUser } from "../../components/context/UserContext";
import { useNavigate } from "react-router-dom";
import FamilyRegisterModal from "./familyRegisterModal"; // 회원가입 모달 가져오기

const API_BASE_URL = process.env.REACT_APP_API_URL;

const FamilyLoginModal = ({ onClose }) => {
    const { token, updateFamilyCode } = useUser();
    const [familyCode, setFamilyCode] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [showRegisterModal, setShowRegisterModal] = useState(false); // ✅ 내부 상태로 제어
    const navigate = useNavigate();

    const handleLogin = async () => {
        if (!token) {
            setMessage("로그인이 필요합니다.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/family-login/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Token ${token}`,
                },
                body: JSON.stringify({ family_code: familyCode, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("가족 로그인에 성공했습니다!");
                await updateFamilyCode();
                onClose();
            } else {
                const errorMessage = data?.error || "가족 코드 또는 비밀번호가 일치하지 않습니다.";
                setMessage(errorMessage);
            }
        } catch (error) {
            console.error("가족 로그인 오류:", error);
            setMessage("서버와 연결할 수 없습니다. 다시 시도해주세요.");
        }
    };

    // 🔁 회원가입 모달 닫고 다시 로그인 모달로 돌아오는 함수
    const handleBackToLogin = () => {
        setShowRegisterModal(false);
    };

    return (
        <>
            {showRegisterModal ? (
                <FamilyRegisterModal onClose={onClose} onBackToLogin={handleBackToLogin} />
            ) : (
                <div className="modal-container">
                    <div className="modal-content">
                        <button className="modal-close-button" onClick={onClose}>✖</button>
                        <h2>가족 로그인</h2>
                        <input 
                            type="text" 
                            placeholder="가족 코드" 
                            value={familyCode} 
                            onChange={(e) => setFamilyCode(e.target.value)} 
                        />
                        <input 
                            type="password" 
                            placeholder="비밀번호" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                        />
                        {message && <p className="modal-message">{message}</p>}
                        <button onClick={handleLogin} className="submit-button">가족 로그인</button>
                        <button onClick={() => setShowRegisterModal(true)} className="submit-button">
                            가족 회원가입
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default FamilyLoginModal;
