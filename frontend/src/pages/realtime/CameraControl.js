import React, { useState } from "react";
import { useUser } from "../../components/context/UserContext";

const API_BASE_URL = process.env.REACT_APP_API_URL;

const CameraControl = () => {
    const { token } = useUser();
    const [cameraOn, setCameraOn] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const toggleCamera = async () => {
        if (!token) {
            setErrorMessage("로그인이 필요합니다.");
            return;
        }

        const newState = !cameraOn;
        setCameraOn(newState);

        try {
            const response = await fetch(`${API_BASE_URL}/realtime/camera-control/`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Token ${token}`,
                },
                body: JSON.stringify({ state: newState ? "on" : "off" }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage(`✅ 홈캠이 ${newState ? "켜졌습니다" : "꺼졌습니다"}.`);
            } else {
                setErrorMessage(data.message || "⚠ 홈캠 상태 변경에 실패했습니다.");
                setCameraOn(!newState);  // rollback
            }
        } catch (error) {
            console.error("홈캠 제어 오류:", error);
            setErrorMessage("⚠ 서버와 연결할 수 없습니다. 다시 시도해주세요.");
            setCameraOn(!newState);  // rollback
        }
    };

    // ✅ 실제 스트림 URL (https 포함)
    const STREAM_URL = `${API_BASE_URL}/realtime/stream`;

    return (
        <div className="camera-control-container">
            <p><strong>홈캠 실시간 스트림:</strong> {cameraOn ? "ON" : "OFF"}</p>
            <button className="button" onClick={toggleCamera}>
                {cameraOn ? "홈캠 끄기" : "홈캠 켜기"}
            </button>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {successMessage && <p className="success-message">{successMessage}</p>}

            {/* ✅ cameraOn일 때만 스트림 표시 */}
            {cameraOn && (
                <div className="stream-container">
                    <img src={STREAM_URL} alt="Live Stream" style={{ width: '100%', maxWidth: '640px' }} />
                </div>
            )}
        </div>
    );
};

export default CameraControl;
