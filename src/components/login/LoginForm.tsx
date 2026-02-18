import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, User, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  username: z.string().min(1, 'Nome de usuário é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onLoginSuccess: () => void;
  className?: string;
}

export const LoginForm = ({ onLoginSuccess, className }: LoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const success = login(data.username, data.password);
    if (success) {
      onLoginSuccess();
    } else {
      setError('Credenciais inválidas. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('w-full', className)} style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-[#F7BB05] tracking-tighter uppercase mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Bem-vindo</h1>
        <p className="text-sm tracking-wide" style={{ color: '#9CA3AF' }}>
          Acesse sua conta para continuar
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Username */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9CA3AF' }}>
            Usuário
          </label>
          <div className="relative">
            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
            <input
              {...register('username')}
              type="text"
              placeholder="Digite seu usuário"
              autoComplete="username"
              className={cn(
                'w-full rounded-xl pl-11 pr-4 py-3.5 text-white text-sm',
                'border border-white/10 outline-none transition-all duration-300',
                'focus:border-[#F7BB05] focus:shadow-[0_0_0_3px_rgba(247,187,5,0.15)]',
                errors.username && 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
              )}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.07)',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>
          {errors.username && (
            <p className="text-red-400 text-xs pl-1">{errors.username.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9CA3AF' }}>
            Senha
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              className={cn(
                'w-full rounded-xl pl-11 pr-12 py-3.5 text-white text-sm',
                'border border-white/10 outline-none transition-all duration-300',
                'focus:border-[#F7BB05] focus:shadow-[0_0_0_3px_rgba(247,187,5,0.15)]',
                errors.password && 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
              )}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.07)',
                fontFamily: 'Inter, sans-serif',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 rounded-md transition-colors hover:bg-white/10"
              style={{ color: '#6B7280' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-400 text-xs pl-1">{errors.password.message}</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all duration-300',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'hover:shadow-[0_0_25px_rgba(247,187,5,0.45)] hover:brightness-110',
              'active:scale-[0.98]'
            )}
            style={{ backgroundColor: '#F7BB05', color: '#111111' }}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Entrar'}
          </button>
        </div>

        {/* Forgot */}
        <div className="text-center pt-1">
          <button
            type="button"
            className="text-sm transition-colors duration-200 hover:text-[#F7BB05]"
            style={{ color: '#6B7280' }}
          >
            Esqueceu a senha?
          </button>
        </div>
      </form>
    </div>
  );
};
