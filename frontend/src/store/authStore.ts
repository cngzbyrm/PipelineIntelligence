import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const API_BASE = import.meta.env.PROD ? 'http://194.99.74.2:8091' : ''

interface UserDto {
  id: number
  username: string
  email: string
  fullName: string
  role: 'Admin' | 'Developer' | 'Viewer'
  avatarUrl?: string
  lastLoginAt?: string
}

interface AuthState {
  user: UserDto | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  login:    (emailOrUsername: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, fullName?: string) => Promise<void>
  logout:   () => Promise<void>
  refresh:  () => Promise<boolean>
  updateUser: (user: UserDto) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      isAuthenticated: false,

      login: async (emailOrUsername, password) => {
        const { data } = await axios.post(`${API_BASE}/api/auth/login`, { emailOrUsername, password })
        if (!data.success) throw new Error(data.error)
        set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, isAuthenticated: true })
        setAxiosToken(data.accessToken)
      },

      register: async (username, email, password, fullName = '') => {
        const { data } = await axios.post(`${API_BASE}/api/auth/register`, { username, email, password, fullName })
        if (!data.success) throw new Error(data.error)
        set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, isAuthenticated: true })
        setAxiosToken(data.accessToken)
      },

      logout: async () => {
        try {
          const rt = get().refreshToken
          if (rt) await axios.post(`${API_BASE}/api/auth/logout`, { refreshToken: rt })
        } catch {}
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
        setAxiosToken(null)
      },

      refresh: async () => {
        const rt = get().refreshToken
        if (!rt) return false
        try {
          const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken: rt })
          if (!data.success) { set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }); return false }
          set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, isAuthenticated: true })
          setAxiosToken(data.accessToken)
          return true
        } catch { return false }
      },

      updateUser: (user) => set({ user }),
    }),
    {
      name: 'pipeline-auth',
      partialState: (s: AuthState) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken, isAuthenticated: s.isAuthenticated }),
    } as any
  )
)

// Axios interceptor — her istekte token ekle, 401'de refresh dene
export function setAxiosToken(token: string | null) {
  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete axios.defaults.headers.common['Authorization']
}

// Token'ı uygulama açılışında yeniden yükle
export function initAuth() {
  const state = useAuthStore.getState()
  if (state.accessToken) setAxiosToken(state.accessToken)

  // 401 interceptor
  axios.interceptors.response.use(
    res => res,
    async err => {
      if (err.response?.status === 401) {
        const ok = await state.refresh()
        if (ok) {
          err.config.headers['Authorization'] = `Bearer ${useAuthStore.getState().accessToken}`
          return axios.request(err.config)
        }
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
      return Promise.reject(err)
    }
  )
}