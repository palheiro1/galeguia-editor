import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SessionDebugProps {
  visible?: boolean;
}

export function SessionDebug({ visible = false }: SessionDebugProps) {
  const { session, profile, isLoading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    if (!visible) return;

    const checkSessionStatus = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        const info = {
          timestamp: new Date().toISOString(),
          hasSession: !!session,
          hasProfile: !!profile,
          isLoading,
          sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A',
          supabaseSessionExists: !!currentSession,
          supabaseSessionExpiry: currentSession?.expires_at ? new Date(currentSession.expires_at * 1000).toISOString() : 'N/A',
          userId: session?.user?.id || 'N/A',
          userEmail: session?.user?.email || 'N/A',
          error: error?.message || 'None',
          platform: Platform.OS,
          localStorage: Platform.OS === 'web' ? !!window.localStorage : 'N/A',
        };
        
        setDebugInfo(info);
      } catch (error) {
        setDebugInfo({ error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() });
      }
    };

    checkSessionStatus();
    const interval = setInterval(checkSessionStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [session, profile, isLoading, visible]);

  if (!visible || Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Debug Info</Text>
      <View style={styles.infoContainer}>
        {Object.entries(debugInfo).map(([key, value]) => (
          <Text key={key} style={styles.infoText}>
            <Text style={styles.infoKey}>{key}:</Text> {String(value)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 5,
    maxWidth: 300,
    zIndex: 9999,
  },
  title: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoContainer: {
    maxHeight: 200,
    overflow: 'scroll',
  },
  infoText: {
    color: '#fff',
    fontSize: 10,
    marginBottom: 2,
  },
  infoKey: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});
