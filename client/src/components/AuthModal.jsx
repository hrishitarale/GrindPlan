import { useState } from 'react'
import { ArrowRight, Dumbbell, X } from 'lucide-react'
import { authApi, setToken } from '../api/client.js'

export default function AuthModal({ onClose, onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const result = await (mode === 'login' ? authApi.login({ email: form.email, password: form.password }) : authApi.register(form))
      setToken(result.token); await onAuthenticated(result.user); onClose()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <div className="modal-backdrop" onClick={onClose}><div className="auth-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close"><X size={17} /></button><div className="auth-mark"><Dumbbell size={22} /></div><span className="section-kicker">YOUR TRAINING, YOUR STORY</span><h2>{mode === 'login' ? 'GOOD TO SEE YOU.' : 'LET’S GET STRONGER.'}</h2><p>Sign in to keep your plans and progress with you.</p><form onSubmit={submit}>{mode === 'register' && <label>Name<input required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jordan Davis" /></label>}<label>Email<input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label><label>Password<input required minLength={8} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /></label>{error && <div className="form-error">{error}</div>}<button className="auth-submit" disabled={busy}>{busy ? 'PLEASE WAIT…' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'} <ArrowRight size={15} /></button></form><div className="auth-switch">{mode === 'login' ? 'New to GrindPlan?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div></div></div>
}
