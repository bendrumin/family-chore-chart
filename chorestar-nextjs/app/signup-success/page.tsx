'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function SignupSuccessPage() {
  const [email, setEmail] = useState('');
  const [emailProvider, setEmailProvider] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email') || sessionStorage.getItem('signup_email') || '';
    setEmail(emailParam);

    if (emailParam.includes('@gmail.com')) {
      setEmailProvider('gmail');
    } else if (emailParam.includes('@outlook.com') || emailParam.includes('@hotmail.com') || emailParam.includes('@live.com')) {
      setEmailProvider('outlook');
    } else if (emailParam.includes('@yahoo.com')) {
      setEmailProvider('yahoo');
    } else if (emailParam.includes('@icloud.com') || emailParam.includes('@me.com')) {
      setEmailProvider('icloud');
    }
  }, []);

  const getProviderLink = () => {
    switch (emailProvider) {
      case 'gmail':
        return 'https://mail.google.com';
      case 'outlook':
        return 'https://outlook.live.com';
      case 'yahoo':
        return 'https://mail.yahoo.com';
      case 'icloud':
        return 'https://www.icloud.com/mail';
      default:
        return null;
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setResent(true);
        setTimeout(() => setResent(false), 5000);
      }
    } catch (error) {
      console.error('Failed to resend confirmation:', error);
    } finally {
      setResending(false);
    }
  };

  const providerLink = getProviderLink();

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
    }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            >
              <Mail className="w-20 h-20 text-indigo-600 dark:text-indigo-400" />
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1"
            >
              <CheckCircle className="w-8 h-8 text-white" />
            </motion.div>
          </div>
        </motion.div>

        <h1 className="text-3xl font-black text-gray-900 dark:text-white text-center mb-3">
          Check Your Email!
        </h1>

        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
          We&apos;ve sent a confirmation link to:
        </p>

        <div className="bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-200 dark:border-indigo-700 rounded-lg p-4 mb-6 text-center">
          <p className="font-semibold text-indigo-900 dark:text-indigo-200 break-all">{email}</p>
        </div>

        {providerLink && (
          <a
            href={providerLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full mb-4 px-6 py-3 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg hover:opacity-90 text-center"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            Open {emailProvider === 'gmail' ? 'Gmail' : emailProvider === 'outlook' ? 'Outlook' : emailProvider === 'yahoo' ? 'Yahoo Mail' : 'iCloud Mail'}
          </a>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-500 p-4 mb-6">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Next steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300">
                <li>Open your email inbox</li>
                <li>Look for an email from ChoreStar</li>
                <li>Click the confirmation link</li>
                <li>Come back here to sign in!</li>
              </ol>
            </div>
          </div>
        </div>

        <details className="mb-6">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-2">
            Don&apos;t see the email? Click here 👇
          </summary>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>✓ Check your spam or junk folder</p>
            <p>✓ Wait a few minutes - it may be delayed</p>
            <p>✓ Make sure you entered the correct email</p>
            <p>✓ Add noreply@chorestar.app to your contacts</p>
          </div>
        </details>

        {resent ? (
          <div className="flex items-center justify-center px-6 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold rounded-lg mb-4">
            <CheckCircle className="w-5 h-5 mr-2" />
            Email sent! Check your inbox
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mb-4"
          >
            {resending ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Resend Confirmation Email
              </>
            )}
          </button>
        )}

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold"
          >
            ← Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
