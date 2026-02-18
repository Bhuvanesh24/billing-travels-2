import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AuthContextType {
    isLoggedIn: boolean;
    login: (username: string, password: string) => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const VALID_USERNAME = 'gokilam';
const VALID_PASSWORD = 'Sai@2015';
const AUTH_KEY = 'gokilam_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
        return sessionStorage.getItem(AUTH_KEY) === 'true';
    });

    useEffect(() => {
        if (isLoggedIn) {
            sessionStorage.setItem(AUTH_KEY, 'true');
        } else {
            sessionStorage.removeItem(AUTH_KEY);
        }
    }, [isLoggedIn]);

    const login = (username: string, password: string): boolean => {
        if (username === VALID_USERNAME && password === VALID_PASSWORD) {
            setIsLoggedIn(true);
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsLoggedIn(false);
    };

    return (
        <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
