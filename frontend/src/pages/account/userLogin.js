import React, { useState } from "react";
import { useNavigate} from "react-router-dom"; // useLocation으로 전달받은 state 읽기
import { useUser } from "../../components/context/UserContext"; // UserContext 사용
import "../../styles/login.css";
const API_BASE_URL = process.env.REACT_APP_API_URL;

const UserLogin = () => {
    const [email, setEmail] = useState(""); //
    const [password, setPassword] = useState(""); // 비밀번호 입력 값 이메일 입력 값
    const [errorMessage, setErrorMessage] = useState(""); // 오류 메시지 상태
    const { login } = useUser(); // Context에서 login 함수 가져오기
    const navigate = useNavigate(); // 페이지 이동 훅

    const handleLogin = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/login/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                const { token, user, is_face_registered } = data; 

                login(token, user);

                if (is_face_registered) {
                    navigate("/dashboard"); // 얼굴 등록 완료 → 대시보드 이동
                } else {
                    navigate("/faceregister"); // 얼굴 등록 필요 → 얼굴 등록 페이지 이동
                }
            } else {
                if (response.status === 401) {
                    setErrorMessage("이메일 또는 비밀번호가 일치하지 않습니다.");
                } else if (response.status === 404) {
                    setErrorMessage("사용자가 존재하지 않습니다.");
                } else {
                    setErrorMessage(data.message || "로그인에 실패했습니다. 다시 시도해주세요.");
                }
            }
        } catch (error) {
            console.error("API 호출 오류:", error);
            setErrorMessage("서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
        }
    };

    const handleRegister = () => {
        // 회원가입 페이지로 이동
        navigate("/userregister");
    };


    return (
        <div className="login-container">
            <h1>사용자 로그인</h1>
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
                    placeholder="비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                />
            </div>
            {errorMessage && <p className="error">{errorMessage}</p>}
            <div className="button-group">
                <button onClick={handleLogin} className="button">
                    로그인
                </button>
                <button onClick={handleRegister} className="button">
                    회원가입
                </button>
            </div>
        </div>
    );
};

export default UserLogin;
