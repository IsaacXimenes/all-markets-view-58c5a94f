import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
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
    <div className={cn('w-full max-w-sm', className)} style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-white mb-1">Bem-vindo</h1>
        <p className="text-base" style={{ color: '#7F7F7F' }}>Acesse sua conta para continuar</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Username */}
        <div className="space-y-1">
          <input
            {...register('username')}
            type="text"
            placeholder="Usuário"
            autoComplete="username"
            className={cn(
              'w-full rounded-xl px-4 py-3.5 text-white placeholder:text-[#7F7F7F] border-2 border-transparent transition-all duration-200 outline-none',
              'focus:border-[#F7BB05] focus:ring-2 focus:ring-[#F7BB05]/30',
              errors.username && 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
            )}
            style={{ backgroundColor: '#212121', fontFamily: 'Inter, sans-serif' }}
          />
          {errors.username && (
            <p className="text-red-400 text-xs pl-1">{errors.username.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1">
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              autoComplete="current-password"
              className={cn(
                'w-full rounded-xl px-4 py-3.5 pr-12 text-white placeholder:text-[#7F7F7F] border-2 border-transparent transition-all duration-200 outline-none',
                'focus:border-[#F7BB05] focus:ring-2 focus:ring-[#F7BB05]/30',
                errors.password && 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
              )}
              style={{ backgroundColor: '#212121', fontFamily: 'Inter, sans-serif' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
              style={{ color: '#7F7F7F' }}
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
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            'w-full py-4 rounded-xl font-bold text-base transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-[#F7BB05]/50 focus:ring-offset-2 focus:ring-offset-[#111111]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'hover:shadow-[0_0_20px_rgba(247,187,5,0.4)]'
          )}
          style={{
            backgroundColor: '#F7BB05',
            color: '#111111',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            'Entrar'
          )}
        </button>

        {/* Forgot password */}
        <div className="text-center pt-2">
          <button
            type="button"
            className="text-sm transition-colors hover:text-white"
            style={{ color: '#7F7F7F', fontFamily: 'Inter, sans-serif' }}
          >
            Esqueceu a senha?
          </button>
        </div>
      </form>
    </div>
  );
};
