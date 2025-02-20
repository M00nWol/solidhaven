import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/login.css"; // 로그인 페이지 스타일과 통일

const API_BASE_URL = process.env.REACT_APP_API_URL;

const UserRegister = () => {
    const [name, setName] = useState(""); // 사용자 이름
    const [email, setEmail] = useState(""); // 사용자 이메일
    const [password, setPassword] = useState(""); // 사용자 비밀번호
    const [errorMessage, setErrorMessage] = useState(""); // 오류 메시지
    const navigate = useNavigate(); // 페이지 이동 훅

    const handleSubmit = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/register/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    email,
                    password
                }),
            });

            const data = await response.json();

            if (response.ok) {
                alert("회원가입이 완료되었습니다!");
                navigate("/userlogin");
            } else {
                if (response.status === 400) {
                    if (data?.error?.email && Array.isArray(data.error.email) && data.error.email.length > 0) {
                        setErrorMessage(data.error.email[0]); // 서버에서 응답된 에러 메시지 표시
                    } else if (data.message && data.message.includes("이미 존재하는 사용자")) {
                        setErrorMessage("이미 가입된 이메일입니다.");
                    } else {
                        setErrorMessage(data.message || "요청이 올바르지 않습니다.");
                    }
                } else {
                    setErrorMessage(data.message || "회원가입에 실패했습니다. 다시 시도해주세요.");
                }
            }
        } catch (error) {
            console.error("API 호출 오류:", error);
            setErrorMessage("서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
        }
    };

    return (
        <div className="login-container"> {/* 로그인 페이지와 동일한 스타일 적용 */}
            <h1>사용자 회원가입</h1>

            <div className="form-group">
                <label htmlFor="name">사용자 이름</label>
                <input
                    type="text"
                    id="name"
                    placeholder="사용자 이름을 입력하세요"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                />
            </div>
            <div className="form-group">
                <label htmlFor="email">이메일</label>
                <input
                    type="email"
                    id="email"
                    placeholder="이메일을 입력하세요"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                />
            </div>
            <div className="form-group">
                <label htmlFor="password">비밀번호</label>
                <input
                    type="password"
                    id="password"
                    placeholder="8자리 이상 비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                />
            </div>
            {errorMessage && <p className="error">{errorMessage}</p>}
            <div className="button-group">
                <button onClick={handleSubmit} className="button">
                    회원가입
                </button>
            </div>
        </div>
    );
};

export default UserRegister;