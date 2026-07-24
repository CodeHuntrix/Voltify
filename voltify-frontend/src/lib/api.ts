import axios from 'axios'

export const api = axios.create({
  baseURL: '/api'
})

export const apiService = {
  login: async (data: any) => {
    const res = await api.post('/auth/login', data)
    return res.data
  },
  signup: async (data: any) => {
    const res = await api.post('/auth/signup', data)
    return res.data
  }
}
