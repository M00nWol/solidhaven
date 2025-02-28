import React, { createContext, useContext, useEffect, useState } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [userInfo, setUserInfo] = useState(null);

    useEffect(() => {
        const storedToken = localStorage.getItem("authToken");
        const storedUserInfo = localStorage.getItem("userInfo");

        if (storedToken && storedUserInfo) {
            setToken(storedToken);
            setUserInfo(JSON.parse(storedUserInfo));
        }
    }, []);

    const login = (authToken, userData) => {
        localStorage.setItem("authToken", authToken);
        localStorage.setItem("userInfo", JSON.stringify(userData));
        setToken(authToken);
        setUserInfo(userData);
    };

    const logout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userInfo");
        setToken(null);
        setUserInfo(null);
    };

    return (
        <UserContext.Provider value={{ token, userInfo, login, logout }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
