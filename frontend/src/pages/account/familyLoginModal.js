import React, { useState } from "react";
import "../../styles/modal.css";
import { useUser } from "../../components/context/UserContext";

const API_BASE_URL = process.env.REACT_APP_API_URL;

const FamilyLoginModal = ({ onClose }) => {
    const { token, login } = useUser(); // ✅ UserContext에서 `token`, `login` 가져오기
    const [familyCode, setFamilyCode] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    const handleLogin = async () => {
        if (!token) {
            setMessage("로그인이 필요합니다.");
            setIsSuccess(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/family-login/`, { // ✅ 올바른 API 엔드포인트 사용
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Token ${token}`, // ✅ `Bearer` → `Token`으로 수정
                },
                body: JSON.stringify({
                    family_code: familyCode,
                    password, 
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("가족 로그인에 성공했습니다!");
                setIsSuccess(true);

                // ✅ `UserContext`에 `user` & `family` 정보 저장
                login(token, { ...data.user, family: data.family });
            } else {
                if (response.status === 401) {
                    setMessage("가족 코드 또는 비밀번호가 일치하지 않습니다.");
                } else if (response.status === 404) {
                    setMessage("등록되지 않은 가족입니다.");
                } else {
                    setMessage(data.message || "로그인에 실패했습니다.");
                }
                setIsSuccess(false);
            }
        } catch (error) {
            console.error("가족 로그인 오류:", error);
            setMessage("서버와 연결할 수 없습니다. 다시 시도해주세요.");
            setIsSuccess(false);
        }
    };

    return (
        <div className="modal-container">
            <div className="modal-content">
                <h2>가족 로그인</h2>
                {!isSuccess ? (
                    <>
                        <input
                            type="text"
                            placeholder="가족 코드를 입력하세요"
                            value={familyCode}
                            onChange={(e) => setFamilyCode(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="비밀번호를 입력하세요"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {message && <p className="modal-message">{message}</p>}
                        <div className="modal-buttons">
                            <button onClick={handleLogin} className="submit-button">로그인</button>
                            <button onClick={onClose} className="cancel-button">닫기</button>
                        </div>
                    </>
                ) : (
                    <div>
                        <p className="modal-message">{message}</p>
                        <button onClick={onClose} className="submit-button">닫기</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FamilyLoginModal;
