import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUser } from "@/services/userCreationService";
import { checkTableExists } from "@/services/userDatabaseUtils";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Create a schema for form validation
const formSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
  role: z.enum(["farmer", "organization", "regional"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'checking' | 'ready' | 'not_ready'>('checking');
  const navigate = useNavigate();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "farmer"
    },
  });

  // Check if database tables are ready
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        const usersTableExists = await checkTableExists('users');
        const credentialsTableExists = await checkTableExists('user_credentials');
        
        if (usersTableExists && credentialsTableExists) {
          setDbStatus('ready');
        } else {
          setDbStatus('not_ready');
        }
      } catch (err) {
        console.error("Error checking database status:", err);
        setDbStatus('not_ready');
      }
    };
    
    checkDatabase();
  }, []);

  async function onSubmit(values: FormData) {
    try {
      setLoading(true);
      setError(null);
      
      // Convert role to the format expected by the database
      const roleMap: Record<string, 'farmer' | 'org_admin' | 'regional_admin' | 'superadmin'> = {
        farmer: "farmer",
        organization: "org_admin", 
        regional: "regional_admin"
      };
      
      // Use our direct database user creation
      const result = await createUser({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        role: roleMap[values.role],
        // For regional_admin, you would need to select a region
        regionId: values.role === 'regional' ? 'luzon-R1' : undefined
      });
      
      if (result.success) {
        toast.success("Registration successful! Please log in to continue.");
        navigate("/login");
      } else {
        const errorMessage = result.error?.message || "Unknown error";
        setError(errorMessage);
        toast.error("Failed to register: " + errorMessage);
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      setError(error.message || "Unknown error");
      toast.error(`Failed to register: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/50 p-4">
      <Link to="/" className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-full bg-[#4F772D] flex items-center justify-center">
          <span className="text-white font-bold text-lg">D</span>
        </div>
        <span className="text-2xl font-bold">DAgriKonek</span>
      </Link>
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Join DAgriKonek and start managing your agricultural operations</CardDescription>
        </CardHeader>
        <CardContent>
          {dbStatus === 'not_ready' && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Database not ready</AlertTitle>
              <AlertDescription>
                The database tables required for registration are not set up properly.
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate("/test-connection")}
                  >
                    Fix Database
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 mb-4 text-sm">
              {error}
            </div>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="your@email.com" type="email" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="farmer">Farmer</SelectItem>
                        <SelectItem value="organization">Organization</SelectItem>
                        <SelectItem value="regional">Regional Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-[#4F772D] hover:bg-[#2F5233]"
                disabled={loading || dbStatus === 'not_ready'}
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
              
              {dbStatus === 'not_ready' && (
                <div className="text-center text-sm text-red-600">
                  Registration is disabled until database issues are fixed
                </div>
              )}
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground text-center w-full">
            Already have an account?{" "}
            <Link to="/login" className="text-[#4F772D] hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
