import { createContext, useReducer, useEffect } from "react";
import { getProfileAPI } from "../services/authAPI";
import { setUnauthorizedHandler } from "../utils/axiosInstance";

export const AuthContext = createContext();

export const authReducer = (state, action) => {
    switch (action.type) {
        case "LOGIN":
            return { user: action.payload, ready: true };
        case "LOGOUT":
            return { user: null, ready: true };
        default:
            return state;
    }
};

export const AuthContextProvider = ({ children }) => {
    // The session lives in an HttpOnly cookie; ask the server who we are.
    const [state, dispatch] = useReducer(authReducer, {
        user: null,
        ready: false,
    });

    useEffect(() => {
        setUnauthorizedHandler(() => dispatch({ type: "LOGOUT" }));
        getProfileAPI()
            .then((data) => dispatch({ type: "LOGIN", payload: data.user }))
            .catch(() => dispatch({ type: "LOGOUT" }));
    }, []);

    return (
        <AuthContext.Provider value={{ ...state, dispatch }}>
            {children}
        </AuthContext.Provider>
    );
};
