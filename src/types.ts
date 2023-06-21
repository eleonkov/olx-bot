export type OfferResponse = {
  data: Offer[]
  metadata: unknown
}

export type OfferParam = {
  key: 'price' | 'm' | 'rent'
  value: {
    key?: string
    value?: number
  }
}

export type Offer = {
  id: number
  url: string
  title: string
  created_time: string
  description: string
  location: {
    city: {
      id: string
      name: string
      normalized_name: string
    }
    district: {
      id: string
      name: string
    }
  }
  params: OfferParam[]
}
