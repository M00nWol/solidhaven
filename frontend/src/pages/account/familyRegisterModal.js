import React, { useState } from "react";
import "../../styles/modal.css";
import { useUser } from "../../components/context/UserContext"; 

const API_BASE_URL = process.env.REACT_APP_API_URL;

const FamilyRegisterModal = ({ onClose }) => {
    const { token } = useUser();
    const [familyName, setFamilyName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [familyCode, setFamilyCode] = useState("");

    const handleRegister = async () => {
        if (!token) {
            setMessage("로그인이 필요합니다.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/family-register/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Token ${token}`,
                },
                body: JSON.stringify({
                    name: familyName,
                    email,
                    password,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setFamilyCode(data.family?.family_code || "가족 코드 생성 실패");
                setMessage(`가족 회원가입이 완료되었습니다! 가족 목록: ${data.user.family.join(", ")}`);
            } else {
                setMessage(data.message || "이미 존재하는 가족 이메일입니다.");
            }
        } catch (error) {
            console.error("가족 회원가입 오류:", error);
            setMessage("서버와 연결할 수 없습니다. 다시 시도해주세요.");
        }
    };

    return (
        <div className="modal-container">
            <div className="modal-content">
                <button className="modal-close-button" onClick={onClose}>✖</button>
                <h2>가족 회원가입</h2>
                {!familyCode ? (
                    <>
                        <input
                            type="text"
                            placeholder="가족 이름을 입력하세요"
                            value={familyName}
                            onChange={(e) => setFamilyName(e.target.value)}
                        />
                        <input
                            type="email"
                            placeholder="가족 대표 이메일을 입력하세요"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="비밀번호를 입력하세요"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {message && <p className="modal-message">{message}</p>}
                        <button onClick={handleRegister} className="submit-button">회원가입</button>
                    </>
                ) : (
                    <div>
                        <p className="modal-message">{message}</p>
                        <p><strong>가족 코드:</strong> {familyCode}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FamilyRegisterModal;
