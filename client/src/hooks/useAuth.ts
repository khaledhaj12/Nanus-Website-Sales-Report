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

  const { data: permissions = {}, isLoading: permissionsLoading } = useQuery({
    queryKey: ["/api/auth/permissions"],
    enabled: Boolean(user),
    retry: false,
  });

  // Safe computation of authentication state
  const isAuthenticated = Boolean(user);
  const isAdmin = Boolean(permissions?.isAdmin || (user && user.role === 'admin'));

  return {
    user,
    permissions,
    isLoading: isLoading || permissionsLoading,
    isAuthenticated,
    isAdmin,
  };
}
