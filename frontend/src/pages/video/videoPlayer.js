import React from "react";
import { useLocation } from "react-router-dom";
import "../../styles/videoPlayer.css"; // 스타일 유지

const VideoPlayer = () => {
    const location = useLocation();
    const videoData = location.state?.video; // ✅ `VideoList.js`에서 전달된 데이터 사용

    return (
        <div className="video-player-container">
            <h1>📺 영상 재생</h1>
            {!videoData ? (
                <p className="error-message">해당 영상을 찾을 수 없습니다.</p>
            ) : (
                <div className="video-content">
                    <h2>{videoData.title}</h2>
                    <video controls>
                        <source src={videoData.file} type="video/mp4" />
                        해당 브라우저에서는 동영상을 재생할 수 없습니다.
                    </video>
                    <p>📅 업로드 시간: {new Date(videoData.uploaded_at).toLocaleString()}</p>
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;
