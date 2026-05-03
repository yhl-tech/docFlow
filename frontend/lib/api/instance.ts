import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { parseApiError, type ApiErrorDetail } from './error-handler'

/**
 * 创建 API 实例
 * 包含统一的超时配置和 JWT 认证拦截器
 */
function createApiInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: process.env.NODE_ENV === 'production'
      ? '/docFlow'
      : (process.env.NEXT_PUBLIC_API_URL_DEV ?? 'http://localhost:8000'),
    timeout: 120_000, // 导出操作可能较慢，设 120s
  })

  // 请求拦截器：自动附加 JWT Token 和 Request-ID
  instance.interceptors.request.use(
    (config) => {
      if (typeof window === 'undefined') return config
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      // 添加 Request-ID 用于链路追踪
      config.headers['X-Request-ID'] = crypto.randomUUID()
      return config
    },
    (error) => Promise.reject(error),
  )

  // 响应拦截器：统一错误处理
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const apiError = parseApiError(error)
      // 在开发环境打印错误详情
      if (process.env.NODE_ENV === 'development') {
        console.error('[API Error]', apiError)
      }
      return Promise.reject(error)
    },
  )

  return instance
}

// 导出默认实例
export const api = createApiInstance()

// 导出创建实例的工厂函数，便于测试或创建多个实例
export function createApi(config?: AxiosRequestConfig): AxiosInstance {
  const instance = createApiInstance()
  return Object.assign(instance, config)
}

export type { ApiErrorDetail }
export { parseApiError }
export default api
