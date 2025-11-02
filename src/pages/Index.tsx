import FocusApp from '@/components/FocusApp';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center">
      <FocusApp />

      <div className="absolute top-6 right-6">
        <Link to="/login">
          <Button>Login</Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;
