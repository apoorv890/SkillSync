import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthSplitScreen } from '../components/auth/AuthSplitScreen';
import { useAuth } from '../hooks/useAuth';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return <AuthSplitScreen mode="register" />;
};

export default RegisterPage;
