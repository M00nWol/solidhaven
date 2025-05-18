import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/dashboard.css";
import { useUser } from "../../components/context/UserContext";

const Dashboard = () => {
    const { userInfo, logout } = useUser();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <div className="dashboard-container">
            <h1>대시보드</h1>
            <p>안녕하세요, {userInfo?.name || "사용자"}님!</p>
            <div className="button-group">
                <button onClick={() => navigate("/videodashboard")} className="button">
                    영상 관리
                </button>
                <button onClick={() => navigate("/mypage")} className="button">
                    마이 페이지
                </button>
                <button onClick={handleLogout} className="button logout">
                    로그아웃
                </button>
            </div>

            {/* ✅ 얼굴 체크 버튼 추가 */}
            <div className="face-check-container">
                <button onClick={() => navigate("/faceverify")} className="face-check-button">
                    얼굴 체크
                </button>
            </div>

            {/* ✅ 실시간 카메라 제어 페이지로 가는 버튼 */}
            <div className="camera-control-button-container">
                <button onClick={() => navigate("/camera-control")} className="button">
                    실시간 카메라 제어
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
