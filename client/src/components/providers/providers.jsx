import { AuthProvider } from "@/contexts/auth-context";
import { ProjectMembersProvider } from "@/contexts/project-members-context";
import { SearchProvider } from "@/contexts/search-context";
import { ThemeProvider } from "@/contexts/theme-context";

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProjectMembersProvider>
          <SearchProvider>{children}</SearchProvider>
        </ProjectMembersProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
