import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const handleGoBack = () => {
    navigate(-1);
  };
  
  const handleGoHome = () => {
    if (user) {
      // Redirect based on role
      switch (user.role) {
        case 'superadmin':
          navigate('/superadmin');
          break;
        case 'regional_admin':
          navigate('/regional');
          break;
        case 'org_admin':
          navigate('/organization');
          break;
        case 'farmer':
          navigate('/farmer');
          break;
        default:
          navigate('/');
      }
    } else {
      navigate('/');
    }
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/50 p-4">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">Unauthorized</h1>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-semibold mb-4">Access Denied</h2>
          <p className="mb-6 text-gray-600">
            You don't have permission to access this page. This might be because:
          </p>
          <ul className="list-disc text-left mb-6 pl-6 text-gray-600">
            <li>You're not logged in</li>
            <li>Your role doesn't have the necessary permissions</li>
            <li>The resource you're trying to access is restricted</li>
          </ul>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={handleGoBack}>
              Go Back
            </Button>
            <Button variant="default" onClick={handleGoHome} className="bg-[#4F772D] hover:bg-[#2F5233]">
              Go to Dashboard
            </Button>
            <Button variant="destructive" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
