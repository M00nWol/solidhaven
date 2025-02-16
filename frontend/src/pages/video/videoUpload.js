import React, { useState } from "react";
import "../../styles/videoUpload.css";
import { useUser } from "../../components/context/UserContext";

const API_BASE_URL = process.env.API_BASE_URL;

const VideoUpload = () => {
    const { token } = useUser();
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState("");

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            alert("파일을 선택해주세요!");
            return;
        }

        const formData = new FormData();
        formData.append("video_file", selectedFile);

        try {
            const response = await fetch(`${API_BASE_URL}/videos/upload`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("영상이 성공적으로 업로드되었습니다!");
            } else {
                setMessage(data.message || "업로드에 실패했습니다.");
            }
        } catch (error) {
            console.error("API 호출 오류:", error);
            setMessage("서버와 연결할 수 없습니다.");
        }
    };

    return (
        <div className="video-upload-container">
            <h1>영상 업로드</h1>
            <input type="file" accept="video/*" onChange={handleFileChange} />
            <button onClick={handleUpload} className="button">업로드</button>
            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default VideoUpload;
