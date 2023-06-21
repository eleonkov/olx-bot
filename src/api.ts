import axios from 'axios'
import { OfferResponse } from './types'

const http = axios.create({
  baseURL: 'https://www.olx.pl/api',
})

export const getOffers = async (params: Record<string, unknown>): Promise<OfferResponse> => {
  const { data } = await http.get('/v1/offers/', { params })

  return data
}
