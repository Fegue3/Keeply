import React, { useState } from 'react';
import { CognitoUserSession } from 'amazon-cognito-identity-js';
import UserPool from '../auth/UserPool';
import './EmailChangeWidget.css';

type Props = {
  currentEmail: string;
  onClose: () => void;
  onSuccess: (newEmail: string) => void;
};

const EmailChangeWidget: React.FC<Props> = ({ currentEmail, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);

  const clearMessages = () => {
    setMsg('');
    setErr('');
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const newEmail = email.trim();
    if (!newEmail) {
      setErr('Introduz um email válido.');
      return;
    }

    const user = UserPool.getCurrentUser();
    if (!user) {
      setErr('Sessão inválida. Faz login novamente.');
      return;
    }

    setSending(true);
    user.getSession((sessionErr: Error | null, session: CognitoUserSession | null) => {
      if (sessionErr || !session?.isValid()) {
        setSending(false);
        setErr('Sessão inválida. Faz login novamente.');
        return;
      }

      // 1) Atualiza o atributo "email" com o novo valor
      user.updateAttributes([{ Name: 'email', Value: newEmail }], (updErr?: any) => {
        if (updErr) {
          setSending(false);
          setErr(updErr.message || 'Não foi possível atualizar o email.');
          return;
        }

        // 2) Força envio do código de verificação para o novo email
        user.getAttributeVerificationCode('email', {
          onSuccess: (_success: string) => {
            setSending(false);
            setSent(true);
            setMsg('Código enviado para o novo email. Verifica a tua caixa de entrada.');
          },
          onFailure: (error: Error) => {
            setSending(false);
            setErr((error as any)?.message || 'Falha ao enviar o código.');
          }
        });
      });
    });
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!sent) {
      setErr('Envia primeiro o código para o novo email.');
      return;
    }
    if (!code.trim()) {
      setErr('Introduz o código que recebeste por email.');
      return;
    }

    const user = UserPool.getCurrentUser();
    if (!user) {
      setErr('Sessão inválida. Faz login novamente.');
      return;
    }

    setConfirming(true);
    user.getSession((sessionErr: Error | null, session: CognitoUserSession | null) => {
      if (sessionErr || !session?.isValid()) {
        setConfirming(false);
        setErr('Sessão inválida. Faz login novamente.');
        return;
      }

      // 3) Confirma o código recebido
      user.verifyAttribute('email', code.trim(), {
        onSuccess: (_success: string) => {
          setConfirming(false);
          setMsg('Email confirmado com sucesso!');
          onSuccess(email.trim());
        },
        onFailure: (error: Error) => {
          setConfirming(false);
          setErr((error as any)?.message || 'Falha ao confirmar o email.');
        }
      });
    });
  };

  return (
    <div className="email-widget-overlay" role="dialog" aria-modal="true" aria-label="Change Email">
      <div className="email-widget-card">
        <button className="email-widget-close" onClick={onClose} aria-label="Fechar">×</button>

        <h2 className="email-widget-title">Change Email</h2>
        <p className="email-widget-subtitle">
          Current: <strong>{currentEmail}</strong>
        </p>

        {/* Linha: Email + botão Send */}
        <form onSubmit={handleSend} className="email-row">
          <label className="sr-only" htmlFor="newEmail">New Email</label>
          <input
            id="newEmail"
            type="email"
            className="email-input"
            placeholder="novo.email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <button type="submit" className="email-send-btn" disabled={sending}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>

        {/* Linha: Código + botão Confirm */}
        <form onSubmit={handleConfirm} className="code-column">
          <label className="code-label" htmlFor="code">Confirmation Code</label>
          <input
            id="code"
            type="text"
            className="code-input"
            placeholder="Enter the code you received"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <button type="submit" className="confirm-btn" disabled={confirming}>
            {confirming ? 'Verifying…' : 'Confirm'}
          </button>
        </form>

        {/* Mensagens */}
        {err && <div className="email-widget-error">{err}</div>}
        {msg && <div className="email-widget-success">{msg}</div>}
      </div>
    </div>
  );
};

export default EmailChangeWidget;
