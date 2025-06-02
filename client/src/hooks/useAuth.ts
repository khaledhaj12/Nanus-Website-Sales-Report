import { useQuery } from "@tanstack/react-query";

export interface User {
  id: number;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Safe computation of authentication state
  const isAuthenticated = Boolean(user);
  const isAdmin = Boolean(user && user.role === 'admin');

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
  };
}
