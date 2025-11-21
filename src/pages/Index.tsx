import FocusApp from "@/components/FocusApp";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type UserProfile = {
  id: number;
  name: string;
  email: string;
};

const Index = () => {
  const queryClient = useQueryClient();
  const token = localStorage.getItem("authToken");

  const { data: user, isLoading: isLoadingUser } = useQuery<UserProfile>({
    queryKey: ["userProfile"],
    queryFn: () => api.get("/user").then((res) => res.data),
    retry: 1,
    enabled: !!token,
  });

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    queryClient.clear();
    window.location.reload();
  };

  if (!token) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0F1115]">
        <Link to="/login">
          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
            Login
          </Button>
        </Link>
      </div>
    );
  }

  return <FocusApp />;
};

export default Index;
