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

    // Simular delay de rede
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
    <div className={cn('w-full max-w-sm', className)}>
      {/* Header */}
      <div className="mb-10">
        <p className="text-black text-sm mb-1 font-medium">Sistema de gestão</p>
        <h1 className="text-3xl font-semibold" style={{ color: '#F7BB05' }}>Thiago Imports</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Username Field */}
        <div className="space-y-1">
          <div className="relative">
            <input
              {...register('username')}
              type="text"
              placeholder="Usuário"
              autoComplete="username"
              className={cn(
                'w-full bg-transparent border-0 border-b-2 border-gray-200 px-0 py-3 text-foreground placeholder:text-gray-400',
                'focus:outline-none focus:border-gray-900 transition-colors duration-200',
                errors.username && 'border-red-400 focus:border-red-500'
              )}
            />
          </div>
          {errors.username && (
            <p className="text-red-500 text-xs">{errors.username.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1">
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              autoComplete="current-password"
              className={cn(
                'w-full bg-transparent border-0 border-b-2 border-gray-200 px-0 py-3 pr-10 text-foreground placeholder:text-gray-400',
                'focus:outline-none focus:border-gray-900 transition-colors duration-200',
                errors.password && 'border-red-400 focus:border-red-500'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs">{errors.password.message}</p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Login Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            'w-full py-4 rounded-xl font-medium text-white transition-all duration-200',
            'bg-gradient-to-r from-gray-800 to-black hover:from-gray-900 hover:to-gray-800',
            'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'shadow-lg hover:shadow-xl'
          )}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            'Entrar'
          )}
        </button>

        {/* Forgot Password Link */}
        <div className="text-center pt-4">
          <button
            type="button"
            className="text-gray-500 text-sm hover:text-gray-700 transition-colors"
          >
            Esqueceu a senha?
          </button>
        </div>
      </form>
    </div>
  );
};
