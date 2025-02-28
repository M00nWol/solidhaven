import React from "react";
import { useNavigate } from "react-router-dom"; // 페이지 이동을 위해 사용
import "../../styles/accountMain.css"; // 스타일 적용 (필요 시)

const AccountMain = () => {
    const navigate = useNavigate();

    return (
        <div className="account-main-container">
            <h1>Solid Haven</h1>
            <div className="button-group">
                {/* 사용자 로그인 버튼 */}
                <button onClick={() => navigate("/userlogin")} className="button">
                    사용자 로그인
                </button>

                {/* 사용자 회원가입 버튼 */}
                <button onClick={() => navigate("/userregister")} className="button">
                    사용자 회원가입
                </button>
            </div>
        </div>
    );
};

export default AccountMain;
