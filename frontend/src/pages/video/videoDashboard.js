import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/videoDashboard.css";

const VideoDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="video-dashboard-container">
            <h1>영상 관리</h1>
            <div className="button-group">
                <button onClick={() => navigate("/videolist")} className="button">
                    영상 리스트
                </button>
                <button onClick={() => navigate("/videoupload")} className="button">
                    영상 업로드
                </button>
            </div>
        </div>
    );
};

export default VideoDashboard;
