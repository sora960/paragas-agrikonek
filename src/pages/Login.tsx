// Update just the import line, rest stays the same
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/AuthContext";
import { createTestUsers } from "@/services/testDataService";

// Create a schema for form validation
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." })
});

type FormData = z.infer<typeof formSchema>;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [testUsersCreated, setTestUsersCreated] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: ""
    },
  });

  async function onSubmit(values: FormData) {
    try {
      setLoading(true);
      const result = await signIn(values.email, values.password);
      
      if (result.success) {
        toast.success("Logged in successfully");
        
        // Get user from localStorage to determine role
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          
          // Redirect based on role
          switch (user.role) {
            case 'superadmin':
              navigate('/superadmin');
              break;
            case 'regional_admin':
              navigate('/regional');
              break;
            case 'org_admin':
              navigate('/organization-admin');
              break;
            case 'farmer':
              navigate('/farmer');
              break;
            default:
              navigate('/');
              break;
          }
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTestUsers() {
    try {
      setLoading(true);
      toast.info("Creating test users...");
      
      const result = await createTestUsers();
      
      if (result.success) {
        toast.success(
          "Test users created successfully. You can login with any of these accounts using password 'password123':",
          {
            description: (
              <ul className="mt-2 list-disc pl-4">
                <li>farmer@test.com (Farmer)</li>
                <li>regional@test.com (Regional Admin)</li>
                <li>organization@test.com (Org Admin)</li>
                <li>superadmin@test.com (Super Admin)</li>
              </ul>
            ),
            duration: 10000,
          }
        );
        setTestUsersCreated(true);
      } else {
        toast.error("Failed to create test users: " + (result.error?.message || "Unknown error"));
        
        // Show specific errors for each user if available
        if (result.results) {
          result.results.forEach(item => {
            if (!item.result.success) {
              toast.error(`Error creating ${item.email}: ${item.result.error?.message || "Unknown error"}`);
            }
          });
        }
      }
    } catch (error: any) {
      console.error("Error creating test users:", error);
      toast.error(`Failed to create test users: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/50 p-4">
      <Link to="/" className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-full bg-[#4F772D] flex items-center justify-center">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <span className="text-2xl font-bold">AgriKonek</span>
      </Link>
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your AgriKonek account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="your@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link to="/forgot-password" className="text-xs text-[#4F772D] hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-[#4F772D] hover:bg-[#2F5233]"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
          
          {!testUsersCreated && (
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="w-full mt-2" 
                onClick={handleCreateTestUsers}
              >
                Create Test Users
              </Button>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Click to create test accounts for all roles
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Separator />
          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#4F772D] hover:underline">
              Create one
            </Link>
          </div>
          <div className="text-center text-xs text-muted-foreground">
            <Link to="/test-auth" className="text-gray-400 hover:underline">
              Admin Auth Tools
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
