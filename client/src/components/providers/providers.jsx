import { AuthProvider } from "@/contexts/auth-context";
import { ProjectMembersProvider } from "@/contexts/project-members-context";
import { SearchProvider } from "@/contexts/search-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { GlobalLoadingIndicator } from "@/components/ui/global-loading-indicator";

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
