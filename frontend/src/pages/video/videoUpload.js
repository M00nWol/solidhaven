import React, { useState } from "react";
import "../../styles/videoUpload.css";
import { useUser } from "../../components/context/UserContext";

const API_BASE_URL = process.env.REACT_APP_API_URL;

const VideoUpload = () => {
    const { token } = useUser();
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState("");

    // 파일 선택 핸들러
    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    // 업로드 버튼 클릭 시 실행
    const handleUpload = async () => {
        if (!selectedFile) {
            setMessage("⚠️ 파일을 선택해주세요!");
            return;
        }
    
        // 현재 날짜와 시간을 기반으로 파일명 생성 (YYYY-MM-DD_HH-MM-SS.mp4)
        const now = new Date();
        const formattedDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
        const formattedTime = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
        const fileName = `${formattedDate}_${formattedTime}.mp4`; // 최종 파일명
    
        const formData = new FormData();
        formData.append("title", fileName); // 자동 생성된 제목
        formData.append("file", selectedFile);
    
        try {
            const response = await fetch(`${API_BASE_URL}/videos/upload/`, {
                method: "POST",
                headers: {
                    "Authorization": `Token ${token}`,
                },
                body: formData,
            });
    
            const data = await response.json();
    
            if (response.ok) {
                setMessage(`✅ 영상이 성공적으로 업로드되었습니다! 파일명: ${fileName}`);
            } else if (response.status === 400 && data.file) {
                setMessage("⚠️ 파일을 선택해주세요.");
            } else {
                setMessage(data.message || "❌ 업로드에 실패했습니다.");
            }
        } catch (error) {
            console.error("API 호출 오류:", error);
            setMessage("❌ 서버와 연결할 수 없습니다.");
        }
    };
    

    return (
        <div className="video-upload-container">
            <h1>🎥 영상 업로드</h1>
            <input type="file" accept="video/*" onChange={handleFileChange} />
            <button onClick={handleUpload} className="button">업로드</button>
            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default VideoUpload;
