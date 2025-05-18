import React, { useEffect, useState } from "react";
import { useUser } from "../../components/context/UserContext";

const API_BASE_URL = process.env.REACT_APP_API_URL;

const CameraControl = () => {
    const { token, userInfo } = useUser();
    const familyCode = userInfo?.current_family;
    const [cameraOn, setCameraOn] = useState(false);
    const [streamSrc, setStreamSrc] = useState(null);

    const toggleCamera = async () => {
        if (!token) return;

        const newState = !cameraOn;
        setCameraOn(newState);

        await fetch(`${API_BASE_URL}/realtime/camera-control/`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${token}`,
            },
            body: JSON.stringify({ state: newState ? "on" : "off" }),
        });
    };

    useEffect(() => {
        if (cameraOn && familyCode) {
            const url = `${API_BASE_URL}/realtime/stream?family_code=${familyCode}`;
            setStreamSrc(url);
        } else {
            setStreamSrc(null);
        }
    }, [cameraOn, familyCode]);

    return (
        <div>
            <button onClick={toggleCamera}>
                {cameraOn ? "홈캠 끄기" : "홈캠 켜기"}
            </button>

            {streamSrc && (
                <img
                    src={streamSrc}
                    alt="Live Stream"
                    style={{ width: "640px" }}
                />
            )}
        </div>
    );
};

export default CameraControl;
