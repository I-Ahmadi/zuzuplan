import { AuthProvider } from "@/features/auth/context/auth-context";
import { ProjectMembersProvider } from "@/features/projects/context/project-members-context";
import { SearchProvider } from "@/features/search/context/search-context";
import { ThemeProvider } from "@/stores/theme-context";
import { GlobalLoadingIndicator } from "@/config/global-loading-indicator";

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProjectMembersProvider>
          <SearchProvider>
            <GlobalLoadingIndicator />
            {children}
          </SearchProvider>
        </ProjectMembersProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
