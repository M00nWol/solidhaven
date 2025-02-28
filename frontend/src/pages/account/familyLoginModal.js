import React, { useState } from "react";
import "../../styles/modal.css";
import { useUser } from "../../components/context/UserContext";
import FamilyRegisterModal from "./familyRegisterModal";

const API_BASE_URL = process.env.REACT_APP_API_URL;

const FamilyLoginModal = ({ onClose }) => {
    const { token, login } = useUser();
    const [familyCode, setFamilyCode] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [showRegister, setShowRegister] = useState(false);

    const handleLogin = async () => {
        if (!token) {
            setMessage("로그인이 필요합니다.");
            setIsSuccess(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/family-login/`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Token ${token}`,
                },
                body: JSON.stringify({ family_code: familyCode, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("가족 로그인에 성공했습니다!");
                setIsSuccess(true);
                login(token, { ...data.user, family: data.user.family }); // family 정보 업데이트
            } else {
                setMessage(response.status === 401 ? "가족 코드 또는 비밀번호가 일치하지 않습니다." : "로그인에 실패했습니다.");
                setIsSuccess(false);
            }
        } catch (error) {
            console.error("가족 로그인 오류:", error);
            setMessage("서버와 연결할 수 없습니다. 다시 시도해주세요.");
            setIsSuccess(false);
        }
    };

    return (
        <>
            {!showRegister ? (
                <div className="modal-container">
                    <div className="modal-content">
                        <button className="modal-close-button" onClick={onClose}>✖</button>
                        <h2>가족 로그인</h2>
                        <input type="text" placeholder="가족 코드" value={familyCode} onChange={e => setFamilyCode(e.target.value)} />
                        <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} />
                        {message && <p className="modal-message">{message}</p>}
                        <div className="modal-button-group">
                            <button onClick={handleLogin} className="submit-button">로그인</button>
                            <button onClick={() => setShowRegister(true)} className="register-button">회원가입</button>
                        </div>
                    </div>
                </div>
            ) : (
                <FamilyRegisterModal onClose={() => setShowRegister(false)} />
            )}
        </>
    );
};

export default FamilyLoginModal;
