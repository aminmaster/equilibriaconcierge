import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background with gradient and pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 -z-10" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -z-10" />
      
      <div className="max-w-4xl text-center space-y-8 z-10">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Conversational <span className="text-primary">AI</span> Platform
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Explore knowledge through natural conversation. Access information instantly with our intelligent AI assistant.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button 
            size="lg" 
            className="text-lg px-8 py-6"
            onClick={() => navigate("/concierge")}
          >
            Start Conversation
          </Button>
          
          <Button 
            size="lg" 
            variant="outline" 
            className="text-lg px-8 py-6"
            onClick={() => navigate("/auth")}
          >
            Create Account
          </Button>
        </div>
        
        <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-background/30 backdrop-blur-sm p-6 rounded-xl border">
            <h3 className="font-semibold text-lg mb-2">Instant Access</h3>
            <p className="text-muted-foreground">
              Start exploring without any sign-up required. Begin your journey immediately.
            </p>
          </div>
          
          <div className="bg-background/30 backdrop-blur-sm p-6 rounded-xl border">
            <h3 className="font-semibold text-lg mb-2">Secure & Private</h3>
            <p className="text-muted-foreground">
              Your conversations are encrypted and never shared with third parties.
            </p>
          </div>
          
          <div className="bg-background/30 backdrop-blur-sm p-6 rounded-xl border">
            <h3 className="font-semibold text-lg mb-2">Knowledgeable</h3>
            <p className="text-muted-foreground">
              Access vast knowledge bases with accurate and up-to-date information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}