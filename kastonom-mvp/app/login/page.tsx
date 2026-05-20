'use client';
import { useAppStore } from '../../lib/store';
import { useRouter } from 'next/navigation';
import { Button, Card } from '../../components/ui-components'; 
import { Rocket } from 'lucide-react';

export default function Login() {
  const login = useAppStore((state: any) => state.login);
  const router = useRouter();

  const handleDemoLogin = () => {
    login();
    router.push('/dashboard');
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0B132B]">
      <Card className="w-full max-w-md p-8 text-center space-y-6 border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-slate-850 rounded-2xl flex items-center justify-center border border-slate-700 shadow-inner">
            <Rocket className="h-8 w-8 text-teal-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Welcome to Kastonom</h1>
        <p className="text-slate-400 text-sm">Autonomous AI advertising engine for KOBİs.</p>
        <div className="pt-4 space-y-4">
          <Button className="w-full py-6 text-lg font-semibold" onClick={handleDemoLogin}>
            Continue as Demo
          </Button>
          <p className="text-xs text-slate-500">By continuing, you load the local mock state.</p>
        </div>
      </Card>
    </div>
  );
}