import React, { useEffect, useState } from "react";
import { useUser } from "../../components/context/UserContext";

const API_BASE_URL = process.env.REACT_APP_API_URL;

const CameraStream = () => {
    const { userInfo } = useUser();
    const familyCode = userInfo?.current_family;
    const [streamSrc, setStreamSrc] = useState(null);

    useEffect(() => {
        if (familyCode) {
            const url = `${API_BASE_URL}/realtime/stream?family_code=${familyCode}`;
            setStreamSrc(url);
        }
    }, [familyCode]);

    return (
        <div>
            <h3>실시간 홈캠 스트리밍</h3>
            {streamSrc && (
                <img
                    src={streamSrc}
                    alt="Live Stream"
                    style={{ width: "640px", border: "1px solid #ccc" }}
                />
            )}
        </div>
    );
};

export default CameraStream;
