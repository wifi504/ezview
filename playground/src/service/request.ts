import EzRequest from '@ezview/request'

export const request = new EzRequest('i-kun', {
  baseURL: 'http://localhost:8080/api',
  timeout: 3000,
})
