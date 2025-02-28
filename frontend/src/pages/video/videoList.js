import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../components/context/UserContext";
import "../../styles/videoList.css"; // 스타일 유지

const API_BASE_URL = process.env.REACT_APP_API_URL;

const VideoList = () => {
    const { token } = useUser(); 
    const navigate = useNavigate();
    const [videos, setVideos] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const [expandedDates, setExpandedDates] = useState({}); // 날짜별 펼침 상태
    const [expandedHours, setExpandedHours] = useState({}); // 시간별 펼침 상태

    // ✅ 날짜 → 시간 → 5분 간격으로 정렬하는 함수
    const groupVideosByDateAndTime = (videos) => {
        const grouped = {};

        videos.forEach((video) => {
            const date = video.uploaded_at.split("T")[0]; // YYYY-MM-DD 추출
            const time = new Date(video.uploaded_at);
            const hour = time.getHours(); // 24시간 형식
            const minute = Math.floor(time.getMinutes() / 5) * 5; // 5분 단위 정리

            if (!grouped[date]) grouped[date] = {};
            if (!grouped[date][hour]) grouped[date][hour] = {};
            if (!grouped[date][hour][minute]) grouped[date][hour][minute] = [];

            grouped[date][hour][minute].push(video);
        });

        return grouped;
    };

    // ✅ 영상 목록 가져오기
    useEffect(() => {
        const fetchVideos = async () => {
            if (!token) {
                setErrorMessage("로그인이 필요합니다.");
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/videos/`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Token ${token}`, // ✅ 백엔드 요구사항에 맞춤
                    },
                });

                const data = await response.json();

                if (response.ok) {
                    setVideos(data || []); // ✅ 백엔드 응답 구조에 맞게 수정
                } else {
                    setErrorMessage(data.message || "영상 목록을 불러오지 못했습니다.");
                }
            } catch (error) {
                console.error("API 호출 오류:", error);
                setErrorMessage("서버와 연결할 수 없습니다. 다시 시도해주세요.");
            }
        };

        fetchVideos();
    }, [token]);

    const groupedVideos = groupVideosByDateAndTime(videos);

    return (
        <div className="video-list-container">
            <h1>📂 영상 목록</h1>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            
            {Object.keys(groupedVideos).length === 0 ? (
                <p>등록된 영상이 없습니다.</p>
            ) : (
                Object.keys(groupedVideos).map((date) => (
                    <div key={date} className="video-date-group">
                        <h2 onClick={() => setExpandedDates({ ...expandedDates, [date]: !expandedDates[date] })}>
                            {expandedDates[date] ? "📂" : "📁"} {date}
                        </h2>
                        {expandedDates[date] &&
                            Object.keys(groupedVideos[date]).map((hour) => (
                                <div key={`${date}-${hour}`} className="video-hour-group">
                                    <h3 onClick={() => setExpandedHours({ ...expandedHours, [`${date}-${hour}`]: !expandedHours[`${date}-${hour}`] })}>
                                        {expandedHours[`${date}-${hour}`] ? "📂" : "📁"} {hour}:00
                                    </h3>
                                    {expandedHours[`${date}-${hour}`] &&
                                        Object.keys(groupedVideos[date][hour]).map((minute) => (
                                            <div key={`${date}-${hour}-${minute}`} className="video-minute-group">
                                                <h4>{hour}:{minute.toString().padStart(2, "0")}</h4>
                                                {groupedVideos[date][hour][minute].map((video) => (
                                                    <div 
                                                        key={video.id} 
                                                        className="video-item" 
                                                        onClick={() => navigate(`/videos/${video.id}`, { state: { video } })} // ✅ video 데이터 전달
                                                    >
                                                        <p>📹 {video.title} ({video.user_name})</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ))} 
                                </div>
                            ))}
                    </div>
                ))
            )}
        </div>
    );
};

export default VideoList;
