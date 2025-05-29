import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import {IGoal, IUser, IUserPhysicalStats} from '../lib/interfaces';

// Define the shape of the context
interface ThemeContextType {
  isDark: boolean;
  toggleTheme: (mode?: boolean) => Promise<void>;
  user: IUser | null;
  setUser: React.Dispatch<React.SetStateAction<IUser | null>>;
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
  goal: IGoal | null;
  setGoal: React.Dispatch<React.SetStateAction<IGoal | null>>;
  userPreferences: IUserPhysicalStats | null;
  setUserPreferences: React.Dispatch<
    React.SetStateAction<IUserPhysicalStats | null>
  >;
}

// Create the context with the defined type
export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

// Props for the ThemeProvider component
interface ThemeProviderProps {
  children: ReactNode;
}

// ThemeProvider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({children}) => {
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [goal, setGoal] = useState<IGoal | null>(null);
  const [userPreferences, setUserPreferences] =
    useState<IUserPhysicalStats | null>(null);
  useEffect(() => {
    const loadTheme = async () => {
      const saved = await AsyncStorage.getItem('darkMode');
      setIsDark(saved === 'true');
    };
    loadTheme();
  }, []);

  const toggleTheme = async (mode?: boolean) => {
    const newMode = mode ?? !isDark; // Default to toggling if mode is not provided
    setIsDark(newMode);
    await AsyncStorage.setItem('darkMode', newMode.toString());
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleTheme,
        user,
        setUser,
        token,
        setToken,
        goal,
        setGoal,
        userPreferences,
        setUserPreferences,
      }}>
      {children}
    </ThemeContext.Provider>
  );
};
export const useHook = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
