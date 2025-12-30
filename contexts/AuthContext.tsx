import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { authService } from '../services/authService';
import type { User } from '../types';

interface AuthContextType {
    user: SupabaseUser | null;
    profile: User | null;
    loading: boolean;
    signUp: (email: string, password: string, username: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [profile, setProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and subscribe to auth changes
        const initAuth = async () => {
            try {
                const currentUser = await authService.getCurrentUser();
                setUser(currentUser);

                if (currentUser) {
                    const userProfile = await authService.getUserProfile(currentUser.id);
                    setProfile(userProfile);
                }
            } catch (error) {
                console.error('Error loading user:', error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        // Subscribe to auth changes
        const { data: { subscription } } = authService.onAuthStateChange(async (newUser) => {
            setUser(newUser);

            if (newUser) {
                try {
                    const userProfile = await authService.getUserProfile(newUser.id);
                    setProfile(userProfile);
                } catch (error) {
                    console.error('Error loading profile:', error);
                }
            } else {
                setProfile(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signUp = async (email: string, password: string, username: string) => {
        await authService.signUp(email, password, username);
    };

    const signIn = async (email: string, password: string) => {
        await authService.signIn(email, password);
    };

    const signOut = async () => {
        await authService.signOut();
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
