import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import Auth from '../../src/components/Auth';

// Mock Supabase
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
  },
}));

// Mock React Native modules
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
}));

describe('Auth Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form by default', () => {
    render(<Auth />);
    
    expect(screen.getByText('Sign In to Galeguia Editor')).toBeTruthy();
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
  });

  it('switches to signup form when toggle is pressed', () => {
    render(<Auth />);
    
    const toggleButton = screen.getByText('Não tem conta? Registar');
    fireEvent.press(toggleButton);
    
    expect(screen.getByText('Create an Account')).toBeTruthy();
  });

  it('validates email and password inputs', async () => {
    const { supabase } = require('../../src/lib/supabase');
    render(<Auth />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const signInButton = screen.getByText('Entrar');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(signInButton);
    
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows error message on login failure', async () => {
    const { supabase } = require('../../src/lib/supabase');
    const { Alert } = require('react-native');
    
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid credentials' },
    });
    
    render(<Auth />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const signInButton = screen.getByText('Entrar');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(signInButton);
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invalid credentials');
    });
  });

  it('validates password length on signup', async () => {
    const { Alert } = require('react-native');
    
    render(<Auth />);
    
    // Switch to signup
    const toggleButton = screen.getByText('Não tem conta? Registar');
    fireEvent.press(toggleButton);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const signUpButton = screen.getByText('Criar Conta');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, '123'); // Too short
    fireEvent.press(signUpButton);
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Password must be at least 6 characters');
    });
  });
});