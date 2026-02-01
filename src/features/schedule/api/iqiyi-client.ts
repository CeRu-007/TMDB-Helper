import {
  IQIYI_BASE_URL,
  IQIYI_DETAIL_API_URL,
  IQIYI_BASE_PARAMS,
  IQIYI_HEADERS,
  IQIYI_DETAIL_HEADERS
} from './iqiyi-constants'
import type {
  IqiyiTabResponse,
  IqiyiContentResponse,
  IqiyiDetailResponse
} from './iqiyi-types'

export class IqiyiApiClient {
  static async fetchTab(): Promise<IqiyiTabResponse> {
    const url = `${IQIYI_BASE_URL}/daily_hot_tab`

    const params = {
      ...IQIYI_BASE_PARAMS,
      page_t: 'daily_hot_tab',
      page_st: '4',
      title: '追番表',
      req_sn: String(Date.now())
    }

    return this.makeRequest<IqiyiTabResponse>(url, params, IQIYI_HEADERS)
  }

  static async fetchContent(date: string): Promise<IqiyiContentResponse> {
    const url = `${IQIYI_BASE_URL}/daily_hot_content`

    const params = {
      ...IQIYI_BASE_PARAMS,
      date,
      tab_default_channel: '4',
      rpage_suffix: 'category_4_3',
      req_sn: String(Date.now())
    }

    return this.makeRequest<IqiyiContentResponse>(url, params, IQIYI_HEADERS)
  }

  static async fetchDetail(albumId: string): Promise<IqiyiDetailResponse> {
    const params = {
      ...IQIYI_BASE_PARAMS,
      albumId,
      req_sn: String(Date.now())
    }

    const queryString = new URLSearchParams(params).toString()
    const url = `${IQIYI_DETAIL_API_URL}?${queryString}`

    return this.makeRequest<IqiyiDetailResponse>(url, {}, IQIYI_DETAIL_HEADERS, false)
  }

  private static async makeRequest<T>(
    url: string,
    params: Record<string, any>,
    headers: HeadersInit,
    useQueryString = true
  ): Promise<T> {
    const finalUrl = useQueryString ? `${url}?${new URLSearchParams(params).toString()}` : url

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers,
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`Iqiyi API error: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }
}